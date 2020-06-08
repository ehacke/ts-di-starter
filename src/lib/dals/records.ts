import { Record, RECORD_TYPE } from '@/models/record'

import { Firestore, FirestoreCacheConfigInterface, FirestoreConfigInterface } from 'simple-cached-firestore';
import { DeepPartial } from "ts-essentials";
import { Users } from "@/dals/users";
import Err from 'err';
import HTTP_STATUS from 'http-status';
import { DateTime } from "luxon";

interface ServiceInterface {
  firestore: Firestore<Record>;
  users: Users;
}

interface ConfigInterface {
  cacheTtlSec?: number;
}

export class Records {
  static CONSTANTS = {
    COLLECTION_NAME: 'records',
  }

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

  constructor(services: ServiceInterface, config: ConfigInterface) {
    this.services = services;

    const { firestoreConfig, cacheConfig } = Records.getFirestoreConfigs(services, config);
    this.services.firestore.configure(firestoreConfig, cacheConfig);
  }

  async assertUserExists(userId: string): Promise<void> {
    if (!(await this.services.users.exists(userId))) {
      throw new Err('user: ' + userId + ' not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  async create(record: Record): Promise<Record> {
    await this.assertUserExists(record.userId);
    return this.services.firestore.create(record);
  }

  async get(id: string): Promise<Record | null> {
    return this.services.firestore.get(id);
  }

  async patchType(id: string, type: RECORD_TYPE, curDate = DateTime.utc().toJSDate()): Promise<Record> {
    return this.services.firestore.patch(id, { type });
  }

  async patchValue(id: string, value: number, curDate = DateTime.utc().toJSDate()): Promise<Record> {
    return this.services.firestore.patch(id, { value });
  }

  async remove(id: string): Promise<void> {
    await this.services.firestore.remove(id);
  }
}
