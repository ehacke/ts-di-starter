import { Redis } from '@ehacke/redis';
import { EventEmitter2 } from 'eventemitter2';
import { Redis as IORedis } from 'ioredis';
import { isFunction, isString } from 'lodash';

import log from '@/logger';
import { ACTIONS, CreateEventInterface, Event, EVENT_NAMESPACES, EventListenerInterface } from '@/models/event';
import { DateTime } from 'luxon';

interface ServiceInterface {
  redis: Redis;
}

const CONSTANTS = {
  COLLECTION_NAME: 'events',
  // eslint-disable-next-line no-magic-numbers
  REPEAT_MS: 1000 * 60 * 60 * 1, // 1 hrs
  JOB_TYPE: 'events-delete-job-v1',
  JOB_ID: 'events-clean',
  CLEAN_CONCURRENCY: 20,

  PUBSUB_CHANNEL: 'global-events',
};

/**
 * @class
 */
export class Events {
  static readonly CONSTANTS = CONSTANTS;

  private readonly localEventEmitter: EventEmitter2;

  private readonly globalEventEmitter: EventEmitter2;

  private globalListener: boolean;

  private pubRedis: IORedis;

  private subRedis: IORedis;

  /**
   * @param {ServiceInterface} services
   */
  constructor(services: ServiceInterface) {
    this.localEventEmitter = new EventEmitter2({
      wildcard: true,
      maxListeners: 20,
      verboseMemoryLeak: true,
    });

    this.globalEventEmitter = new EventEmitter2({
      wildcard: true,
      maxListeners: 20,
      verboseMemoryLeak: true,
    });

    this.pubRedis = services.redis.duplicate();
    this.subRedis = services.redis.duplicate();

    this.globalListener = false;
  }

  /**
   * Register pubsub listener
   *
   * @returns {Promise<void>}
   */
  private async registerGlobalListener(): Promise<void> {
    if (this.globalListener) {
      log.error('Already registered a global event listener');
      return;
    }

    const handleGlobalEvent = async (channel, message): Promise<void> => {
      try {
        const event = new Event(JSON.parse(message));
        const eventName = `${event.namespace}.${event.action}`;
        await this.globalEventEmitter.emitAsync(eventName, event).catch((error) => {
          log.error(`Error while emitting global event: ${error.stack}`);
        });
      } catch {
        log.error(`Error while processing global event message: ${message}`);
      }
    };

    await this.subRedis.subscribe(CONSTANTS.PUBSUB_CHANNEL);
    await this.subRedis.on('message', handleGlobalEvent.bind(this));
    this.globalListener = true;
  }

  /**
   * Remove pubsub listener
   *
   * @returns {Promise<void>}
   */
  private async unregisterGlobalListener(): Promise<void> {
    if (this.globalListener) {
      await this.subRedis.unsubscribe(CONSTANTS.PUBSUB_CHANNEL);
      this.globalListener = false;
    }
  }

  /**
   * Start listening for events to write
   *
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    await this.registerGlobalListener();
  }

  /**
   * Stop heartbeat
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    await this.unregisterGlobalListener();
  }

  /**
   * Emit event locally
   *
   * @param {CreateEventInterface} eventParams
   * @param {Date} [curDate]
   * @returns {Promise<void>}
   */
  async emit(eventParams: CreateEventInterface, curDate = DateTime.utc().toJSDate()): Promise<void> {
    const event = Event.create(eventParams, curDate);
    const eventName = `${event.namespace}.${event.action}`;

    await this.pubRedis.publish(CONSTANTS.PUBSUB_CHANNEL, JSON.stringify(event)).catch((error) => {
      log.error(`Error while emitting global event: ${error.stack}`);
    });

    await this.localEventEmitter.emitAsync(eventName, event).catch((error) => {
      log.error(`Error while emitting local event: ${error.stack}`);
      throw error;
    });
  }

  /**
   * Add local listener for event
   *
   * @param {EVENT_NAMESPACES} namespace
   * @param {ACTIONS | EventListenerInterface} actionOrListener
   * @param {EventListenerInterface} listener
   * @returns {void}
   */
  onLocal(namespace: EVENT_NAMESPACES, actionOrListener: ACTIONS | EventListenerInterface, listener?: EventListenerInterface): void {
    if (listener && isFunction(listener) && isString(actionOrListener)) {
      this.localEventEmitter.on([namespace, actionOrListener], listener);
    } else if (isFunction(actionOrListener)) {
      this.localEventEmitter.on([namespace, '*'], actionOrListener);
    } else {
      log.error(`Unexpected parameters to "onLocal" in namespace: ${namespace}`);
    }
  }

  /**
   * Add global listener for event.
   * NOTE: Also will include local events. They are just written to pubsub first before being received
   *
   * @param {EVENT_NAMESPACES} namespace
   * @param {ACTIONS | EventListenerInterface} actionOrListener
   * @param {EventListenerInterface} listener
   * @returns {void}
   */
  onGlobal(namespace: EVENT_NAMESPACES, actionOrListener: ACTIONS | EventListenerInterface, listener?: EventListenerInterface): void {
    if (listener && isFunction(listener) && isString(actionOrListener)) {
      this.globalEventEmitter.on([namespace, actionOrListener], listener);
    } else if (isFunction(actionOrListener)) {
      this.globalEventEmitter.on([namespace, '*'], actionOrListener);
    } else {
      log.error(`Unexpected parameters to "onGlobal" in namespace: ${namespace}`);
    }
  }

  /**
   * Remove local listener for event
   *
   * @param {EVENT_NAMESPACES} namespace
   * @param {ACTIONS | EventListenerInterface} actionOrListener
   * @param {EventListenerInterface} listener
   * @returns {void}
   */
  removeLocalListener(namespace: EVENT_NAMESPACES, actionOrListener: ACTIONS | EventListenerInterface, listener?: EventListenerInterface): void {
    if (listener && isFunction(listener) && isString(actionOrListener)) {
      this.localEventEmitter.removeListener([namespace, actionOrListener], listener);
    } else if (isFunction(actionOrListener)) {
      this.localEventEmitter.removeListener([namespace, '*'], actionOrListener);
    } else {
      log.error(`Unexpected parameters to "removeListener" in namespace: ${namespace}`);
    }
  }

  /**
   * Remove global listener for event
   *
   * @param {EVENT_NAMESPACES} namespace
   * @param {ACTIONS | EventListenerInterface} actionOrListener
   * @param {EventListenerInterface} listener
   * @returns {void}
   */
  removeGlobalListener(namespace: EVENT_NAMESPACES, actionOrListener: ACTIONS | EventListenerInterface, listener?: EventListenerInterface): void {
    if (listener && isFunction(listener) && isString(actionOrListener)) {
      this.globalEventEmitter.removeListener([namespace, actionOrListener], listener);
    } else if (isFunction(actionOrListener)) {
      this.globalEventEmitter.removeListener([namespace, '*'], actionOrListener);
    } else {
      log.error(`Unexpected parameters to "removeListener" in namespace: ${namespace}`);
    }
  }
}
