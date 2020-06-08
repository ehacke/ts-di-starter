import { enumError, ValidatedBase } from "validated-base";
import { IsDate, IsEnum, IsNumber, IsString } from "class-validator";
import shorthash from 'shorthash';
import { DateTime } from "luxon";

export enum RECORD_TYPE {
  BIG_THING = 'bigThing',
  LITTLE_THING = 'littleThing',
}

interface RecordInterface {
  id: string;
  userId: string;
  value: number;
  type: RECORD_TYPE;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @class
 */
export class Record extends ValidatedBase implements RecordInterface {
  /**
   * @param {RecordInterface} params
   * @param {boolean} validate
   */
  constructor(params: RecordInterface, validate = true) {
    super();

    this.id = params.id;
    this.userId = params.userId;
    this.value = params.value;
    this.type = params.type;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsNumber()
  value: number;

  @IsEnum(RECORD_TYPE, { message: enumError(RECORD_TYPE) })
  type: RECORD_TYPE;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  /**
   * Generate ID for model based on userId, type and createdAt
   * @param {string} userId
   * @param {RECORD_TYPE} type
   * @param {Date} createdAt
   * @returns {string}
   */
  static generateId(userId: string, type: RECORD_TYPE, createdAt: Date): string {
    return shorthash.unique(userId + type + createdAt.toISOString())
  }

  /**
   * Create instance of model
   * @param {string} userId
   * @param {number} value
   * @param {RECORD_TYPE} type
   * @param {DateTime} curDate
   * @returns {Record}
   */
  static create(userId: string, value: number, type: RECORD_TYPE, curDate = DateTime.utc().toJSDate()): Record {
    return new Record({ id: Record.generateId(userId, type, curDate), userId, type, value, createdAt: curDate, updatedAt: curDate });
  }
}
