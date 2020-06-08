/* eslint no-process-exit: "off", no-process-env: "off" */
import Bluebird from 'bluebird';
import express, { Application } from 'express';
import http from 'http';
import HTTP_STATUS from 'http-status';
import SocketIO from 'socket.io';

import log from '@/logger';

import { ExpressMiddleware, ServiceManager, SocketMiddleware } from './app';
import { ConfigInterface } from './config';

/**
 * @class
 */
export class Server {
  readonly serviceManager: ServiceManager;

  readonly config: ConfigInterface;

  server: http.Server | null;

  app: Application | null;

  io: SocketIO.Server | null;

  /**
   * @param {ServiceManager} serviceManager
   * @param {object} serviceManager.services
   * @param {object} serviceManager.middleware
   * @param {object} serviceManager.clients
   * @param {object} serviceManager.controllers
   */
  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
    this.config = serviceManager.config;

    this.app = null;
    this.server = null;
    this.io = null;
  }

  /**
   * Start server
   * - Creates express app and services
   *
   * @param {boolean} silent
   * @returns {Promise<void>}
   */
  async start(silent = false): Promise<void> {
    const logger = silent ? (...args): void => log.trace(...args) : (...args): void => log.info(...args);

    // eslint-disable-next-line no-magic-numbers
    logger(`Starting config: ${JSON.stringify(this.config, null, 2)}`);
    logger(`NODE_ENV: ${process.env.NODE_ENV}`);

    // Start services. This way if pubsub doesn't connect, it'll hang
    await this.serviceManager.start();

    this.app = express();
    this.server = http.createServer(this.app);
    this.io = SocketIO(this.server, {
      path: '/v1/socket',
      // Looks like this gets removed in 4.0
      handlePreflightRequest: (req: any, res: any) => {
        res.writeHead(HTTP_STATUS.OK, {
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Origin': req.headers.origin,
          'Access-Control-Allow-Credentials': true,
        } as any);
        res.end();
      },
    });

    const { expressMiddleware, expressControllers, socketMiddleware, socketControllers, clients } = this.serviceManager;

    // Basically just to make unit testing the express routes easier
    if (clients.socketRedisAdapter) {
      this.io.adapter(clients.socketRedisAdapter);
    }

    ExpressMiddleware.attach(this.app, expressMiddleware, expressControllers);
    SocketMiddleware.attach(this.io, socketMiddleware, socketControllers);

    // errors are usually caused by an invalid query string or url
    // This is caught before Node creates req and res objects, so we have to manually write to the socket in response
    this.server.on('clientError', (err, socket) => {
      if (socket.readyStatus !== 'closed') {
        log.error(`Error during request: ${err}`);
        const error = 'Error: Invalid request format or query string\r\n\r\n';
        socket.write('HTTP/1.1 400 Bad Request\r\n');
        socket.write('Content-Type: text/plain\r\n');
        socket.write(`Content-Length: ${Buffer.byteLength(error)}\r\n`);
        socket.write('Connection: close\r\n');
        socket.write(error);
        socket.end();
      }
    });

    await Bluebird.fromCallback((cb: any) => this.server && this.server.listen(this.config.port, cb));
    logger(`${this.config.name} listening on port ${this.config.port}`);
  }

  /**
   * Stop server
   * - Stops services first, then server
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    // Stop services
    await this.serviceManager.stop();
    await Bluebird.fromCallback((cb) => this.server && this.server.close(cb));
  }
}
