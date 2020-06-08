import { Record } from '@/models/record';

import { Firestore, FirestoreCacheConfigInterface, FirestoreConfigInterface } from 'simple-cached-firestore';
import { DeepPartial } from 'ts-essentials';
import { Users } from '@/services/users';
import Err from 'err';
import HTTP_STATUS from 'http-status';
import { DateTime } from 'luxon';
import { Events } from '@/services/events';
import { EVENT_NAMESPACES, RECORDS_ACTIONS } from '@/models/event';

interface ServiceInterface {
  firestore: Firestore<Record>;
  users: Users;
  events: Events;
}

interface ConfigInterface {
  cacheTtlSec?: number;
}

/**
 * @class
 * Example service/dal
 */
export class Records {
  static CONSTANTS = {
    COLLECTION_NAME: 'records',
  };

  private readonly services: ServiceInterface;

  /**
   * Get firestore configs
   *
   * @param {ServiceInterface} services
   * @param {ConfigInterface} config
   * @returns {{ firestoreConfig: FirestoreConfigInterface<Record>, cacheConfig: FirestoreCacheConfigInterface<Record> }}
   */
  private static getFirestoreConfigs(
    services: ServiceInterface,
    config: ConfigInterface
  ): { firestoreConfig: FirestoreConfigInterface<Record>; cacheConfig: FirestoreCacheConfigInterface<Record> | undefined } {
    return {
      firestoreConfig: {
        collection: Records.CONSTANTS.COLLECTION_NAME,
        convertFromDb: (params): Record => new Record(params),
        convertForDb: (instance: DeepPartial<Record>): any => instance,
      },
      cacheConfig: config.cacheTtlSec
        ? {
            cacheTtlSec: config.cacheTtlSec,
            parseFromCache: (stringified) => new Record(JSON.parse(stringified)),
            stringifyForCache: (instance) => JSON.stringify(instance),
          }
        : undefined,
    };
  }

  /**
   * @param {ServiceInterface} services
   * @param {ConfigInterface} config
   */
  constructor(services: ServiceInterface, config: ConfigInterface) {
    this.services = services;

    const { firestoreConfig, cacheConfig } = Records.getFirestoreConfigs(services, config);
    this.services.firestore.configure(firestoreConfig, cacheConfig);
  }

  /**
   * Assert that user exists
   *
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async assertUserExists(userId: string): Promise<void> {
    if (!(await this.services.users.exists(userId))) {
      throw new Err(`user: ${userId} not found`, HTTP_STATUS.NOT_FOUND);
    }
  }

  /**
   * Assert that user owns record
   *
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async assertUserRecord(id: string, userId: string): Promise<void> {
    const record = await this.get(id);

    if (!record) {
      throw new Err('record not found', HTTP_STATUS.BAD_REQUEST);
    }

    if (record.userId !== userId) {
      throw new Err('user does not own record', HTTP_STATUS.FORBIDDEN);
    }
  }

  /**
   * Create record in db
   *
   * @param {Record} record
   * @returns {Promise<Record>}
   */
  async create(record: Record): Promise<Record> {
    await this.assertUserExists(record.userId);

    const created = await this.services.firestore.create(record);

    await this.services.events.emit({
      namespace: EVENT_NAMESPACES.RECORDS,
      action: RECORDS_ACTIONS.CREATED,
      metadata: {
        modelId: created.id,
      },
    });

    return created;
  }

  /**
   * Get record
   *
   * @param {string} id
   * @returns {Promise<Record | null>}
   */
  async get(id: string): Promise<Record | null> {
    return this.services.firestore.get(id);
  }

  /**
   * Patch field on record
   *
   * @param {string} id
   * @param {number} value
   * @param {Date} curDate
   * @returns {Promise<Record>}
   */
  async patch(id: string, value: number, curDate = DateTime.utc().toJSDate()): Promise<Record> {
    const updated = await this.services.firestore.patch(id, { value }, curDate);

    await this.services.events.emit({
      namespace: EVENT_NAMESPACES.RECORDS,
      action: RECORDS_ACTIONS.UPDATED,
      metadata: {
        modelId: updated.id,
      },
    });

    return updated;
  }

  /**
   * Remove record
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id: string): Promise<void> {
    const found = await this.get(id);

    // Just so that we can emit the remove event
    if (found) {
      await this.services.firestore.remove(id);
      await this.services.events.emit({
        namespace: EVENT_NAMESPACES.RECORDS,
        action: RECORDS_ACTIONS.UPDATED,
        metadata: {
          modelId: found.id,
        },
      });
    }
  }
}
