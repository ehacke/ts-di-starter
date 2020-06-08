import autoBind from 'auto-bind';
import { isNumber } from 'lodash';
import Err from 'err';
import HTTP_STATUS from 'http-status';

import { User as UserModel } from '@/models/user';

import { Records as RecordsService } from '@/services/records';
import { Record } from '@/models/record';
import { CreateRecord } from '@/requests/createRecord';
import { assertProperties } from '../utils';

interface ServicesInterface {
  records: RecordsService;
}

/**
 * @class
 */
export class Records {
  private readonly services: ServicesInterface;

  /**
   * @param {ServicesInterface} services
   * @param {any} config
   * @param {boolean} doAutoBind
   */
  constructor(services: ServicesInterface, config?, doAutoBind = true) {
    this.services = services;

    if (doAutoBind) {
      autoBind(this);
    }
  }

  /**
   * Create record
   *
   * @param {Request} request
   * @returns {Promise<Record>}
   */
  async create(request): Promise<Record> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;

    const { value, type } = new CreateRecord(request.body);

    return this.services.records.create(Record.create(user.id, value, type));
  }

  /**
   * Get record
   *
   * @param {Request} request
   * @returns {Promise<Record>}
   */
  async get(request): Promise<Record> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;
    assertProperties(request.params, ['recordId']);
    const { recordId }: { recordId: string } = request.params;

    await this.services.records.assertUserRecord(recordId, user.id);

    const record = await this.services.records.get(recordId);

    if (!record) {
      throw new Err('record not found', HTTP_STATUS.NOT_FOUND);
    }

    return record;
  }

  /**
   * Patch record
   *
   * @param {Request} request
   * @returns {Promise<Record>}
   */
  async patch(request): Promise<Record> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;
    assertProperties(request.params, ['recordId']);
    const { recordId }: { recordId: string } = request.params;

    const { value } = request.body;

    if (!isNumber(value)) {
      throw new Err('value must be a number', HTTP_STATUS.BAD_REQUEST);
    }

    await this.services.records.assertUserRecord(recordId, user.id);

    return this.services.records.patch(recordId, value);
  }

  /**
   * Remove record
   *
   * @param {Request} request
   * @returns {Promise<void>}
   */
  async remove(request): Promise<void> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;
    assertProperties(request.params, ['recordId']);
    const { recordId }: { recordId: string } = request.params;

    await this.services.records.assertUserRecord(recordId, user.id);

    return this.services.records.remove(user.id);
  }
}
