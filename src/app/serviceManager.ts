import admin from 'firebase-admin';
import SocketRedisAdapter from 'socket.io-redis';

import fs from 'fs-extra';

import * as expressControllers from '@/express/controllers';
import * as expressMiddleware from '@/express/middleware';
import * as socketControllers from '@/socket/controllers';
import * as socketMiddleware from '@/socket/middleware';
import { Redis } from '@ehacke/redis';
import { Error } from '@/services/limiters/error';
import { General } from '@/services/limiters/general';
import { Events } from '@/services/events';
import { Records } from '@/services/records';
import { Users } from '@/services/users';
import { ConfigInterface } from '@/config';

import log from '@/logger';
import { ResponseBuilder } from '@/lib/express/responseBuilder';
import { Firestore } from 'simple-cached-firestore';
import { Record } from '@/models/record';
import { createAndWrapClasses } from 'instawrap';
import { Healthz } from '@ehacke/healthz';

export interface ClientsInterface {
  googleFirestore: admin.firestore.Firestore;
  cacheRedis: Redis;
  rateLimitRedis: Redis;
  auth: admin.auth.Auth;
  socketRedisAdapter: SocketRedisAdapter.RedisAdapter;
}

interface LimitersInterface {
  error: Error;
  general: General;
}

export interface ServicesInterface {
  limiters: LimitersInterface;
  events: Events;
  records: Records;
  users: Users;
  responseBuilder: ResponseBuilder;
  healthz: Healthz;
}

export interface ExpressMiddlewareInterface {
  limiter: expressMiddleware.Limiter;
  exceptionHandler: expressMiddleware.ExceptionHandler;
  user: expressMiddleware.User;
  logger: expressMiddleware.Logger;
}

export interface ExpressControllersInterface {
  health: expressControllers.Health;
  user: expressControllers.User;
  records: expressControllers.Records;
}

export interface SocketMiddlewareInterface {
  user: socketMiddleware.User;
}

export interface SocketControllersInterface {
  userData: socketControllers.UserData;
}

/**
 * @class
 */
export class ServiceManager {
  readonly config: ConfigInterface;

  readonly clients: ClientsInterface;

  readonly services: ServicesInterface;

  readonly expressMiddleware: ExpressMiddlewareInterface;

  readonly expressControllers: ExpressControllersInterface;

  readonly socketMiddleware: SocketMiddlewareInterface;

  readonly socketControllers: SocketControllersInterface;

  /**
   * @param {Config} config service configuration
   */
  constructor(config: ConfigInterface) {
    this.config = config;
    this.clients = ServiceManager.buildClients(config);
    this.services = ServiceManager.buildServices(this.clients, this.config);
    this.expressMiddleware = ServiceManager.buildExpressMiddleware(config, this.clients, this.services);
    this.expressControllers = ServiceManager.buildExpressControllers(config, this.clients, this.services);
    this.socketMiddleware = ServiceManager.buildSocketMiddleware(config, this.clients, this.services);
    this.socketControllers = ServiceManager.buildSocketControllers(config, this.clients, this.services);
  }

  /**
   * Build services
   *
   * @param {ClientsInterface} clients
   * @param {ConfigInterface} config
   * @returns {ServicesInterface}
   */
  static buildServices(clients: ClientsInterface, config: ConfigInterface): ServicesInterface {
    const { rateLimitRedis, cacheRedis, auth, googleFirestore } = clients;

    const healthz = new Healthz([cacheRedis, rateLimitRedis]);

    const limiters = {
      error: new Error({ redis: rateLimitRedis }),
      general: new General({ redis: rateLimitRedis }),
    };

    const responseBuilder = new ResponseBuilder({ limiters: { error: limiters.error } }, {});

    const events = new Events({ redis: cacheRedis });

    const users = new Users({ auth });

    const records = new Records(
      {
        firestore: new Firestore<Record>({ firestore: googleFirestore, redis: cacheRedis }),
        events,
        users,
      },
      { cacheTtlSec: config.redis.ttlSec }
    );

    return {
      healthz,
      records,
      limiters,
      users,
      events,
      responseBuilder,
    };
  }

  /**
   * Build all clients
   *
   * @param {Config} config
   * @returns {ClientsInterface}
   */
  static buildClients(config: ConfigInterface): ClientsInterface {
    let firebaseConfig: admin.AppOptions; // & GcpSettings;

    if (config.gcp.databaseURL) {
      firebaseConfig = {
        projectId: 'asserted-dev',
        databaseURL: config.gcp.databaseURL,
      };
      log.warn('--------------------------------');
      log.warn('Connecting to Firestore emulator');
      log.warn('--------------------------------');
    } else {
      firebaseConfig = {
        credential: admin.credential.cert(fs.readJsonSync(config.gcp.serviceAccountPath)),
        projectId: config.gcp.projectId,
      };
      log.warn('------------------------------');
      log.warn('Connecting to hosted Firestore');
      log.warn('------------------------------');
    }

    log.warn('');

    const cacheRedis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      dropBufferSupport: true,
      enableOfflineQueue: false,
    });

    const rateLimitRedis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      dropBufferSupport: true,
      enableOfflineQueue: false,
      db: 10,
    });

    const app = admin.initializeApp(firebaseConfig);

    return {
      socketRedisAdapter: SocketRedisAdapter({ pubClient: cacheRedis.duplicate(), subClient: cacheRedis.duplicate() }),
      googleFirestore: app.firestore(),
      cacheRedis,
      rateLimitRedis,
      auth: app.auth(),
    };
  }

  /**
   * Build all controllers
   *
   * @param {ConfigInterface} config
   * @param {ClientsInterface} clients
   * @param {ServicesInterface} services
   * @returns {ExpressControllersInterface}
   */
  static buildExpressControllers(config: ConfigInterface, clients: ClientsInterface, services: ServicesInterface): ExpressControllersInterface {
    const controllerInstances = createAndWrapClasses((func) => services.responseBuilder.wrap(func), expressControllers, services, {
      ...config,
    });

    return {
      ...controllerInstances,
    };
  }

  /**
   * Build all middleware
   *
   * @param {ConfigInterface} config
   * @param {ClientsInterface} clients
   * @param {ServicesInterface} services
   * @returns {ExpressMiddlewareInterface}
   */
  static buildExpressMiddleware(config: ConfigInterface, clients: ClientsInterface, services: ServicesInterface): ExpressMiddlewareInterface {
    const { limiters, responseBuilder, users } = services;

    return {
      limiter: new expressMiddleware.Limiter({ responseBuilder, limiters: { error: limiters.error, general: limiters.general } }),
      exceptionHandler: new expressMiddleware.ExceptionHandler({ responseBuilder }),
      logger: new expressMiddleware.Logger(),
      user: new expressMiddleware.User({ users, responseBuilder }),
    };
  }

  /**
   * Build all controllers
   *
   * @param {ConfigInterface} config
   * @param {ClientsInterface} clients
   * @param {ServicesInterface} services
   * @returns {SocketMiddlewareInterface}
   */
  static buildSocketControllers(config: ConfigInterface, clients: ClientsInterface, services: ServicesInterface): SocketControllersInterface {
    return {
      userData: new socketControllers.UserData({ events: services.events }),
    };
  }

  /**
   * Build all middleware
   *
   * @param {ConfigInterface} config
   * @param {ClientsInterface} clients
   * @param {ServicesInterface} services
   * @returns {SocketMiddlewareInterface}
   */
  static buildSocketMiddleware(config: ConfigInterface, clients: ClientsInterface, services: ServicesInterface): SocketMiddlewareInterface {
    return {
      user: new socketMiddleware.User({ users: services.users }),
    };
  }

  /**
   * Start services
   *
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    await this.services.events.start();
  }

  /**
   * Stop services
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    log.info('Now stopping services....');
    await this.services.events.stop();
    log.info('Done stopping services');
  }
}
