import { enumError, ValidatedBase } from 'validated-base';
import { Allow, IsDate, IsEnum, IsInstance, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DateTime } from 'luxon';
import shortid from 'shortid';
import { toDate } from 'simple-cached-firestore';

export enum EVENT_NAMESPACES {
  RECORDS = 'records',
}

export enum RECORDS_ACTIONS {
  CREATED = 'created',
  UPDATED = 'updated',
  REMOVED = 'removed',
}

export type ACTIONS = RECORDS_ACTIONS;

export interface EventMetadataInterface {
  modelId: string;
  userId?: string | null;
}

export interface EventListenerInterface {
  (event: Event): void;
}

/**
 * @class
 */
export class EventMetadata extends ValidatedBase implements EventMetadataInterface {
  /**
   * @param {EventMetadataInterface} params
   * @param {boolean} [validate=true]
   */
  constructor(params: EventMetadataInterface, validate = true) {
    super();

    this.modelId = params.modelId;
    this.userId = params.userId || null;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  userId: string | null;
}

export interface EventInterface {
  id: string;
  namespace: EVENT_NAMESPACES;
  action: ACTIONS;
  metadata: EventMetadataInterface;
  payload: { [k: string]: string | number | null | boolean } | null;
  createdAt: Date;
}

export interface CreateEventInterface extends Omit<EventInterface, 'id' | 'payload' | 'createdAt'> {
  payload?: { [k: string]: string | number | null | boolean } | null;
}

/**
 * @class
 */
export class Event extends ValidatedBase implements EventInterface {
  static readonly CONSTANTS = { ID_PREFIX: 'ev-' };

  /**
   * @param {EventInterface} params
   * @param {boolean} [validate=true]
   */
  constructor(params: EventInterface, validate = true) {
    super();

    this.id = params.id;
    this.namespace = params.namespace;
    this.action = params.action;
    this.metadata = new EventMetadata(params.metadata, true);
    this.payload = params.payload || null;
    this.createdAt = toDate(params.createdAt);

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  id: string;

  @IsEnum(EVENT_NAMESPACES, { message: enumError(EVENT_NAMESPACES) })
  namespace: EVENT_NAMESPACES;

  @IsString()
  action: ACTIONS;

  @ValidateNested()
  @IsInstance(EventMetadata)
  metadata: EventMetadataInterface;

  @Allow()
  payload: { [p: string]: string | number | boolean | null } | null;

  @IsDate()
  createdAt: Date;

  /**
   * Create instance of model
   *
   * @param {CreateEventInterface} params
   * @param {Date} curDate
   * @returns {Event}
   */
  static create(params: CreateEventInterface, curDate = DateTime.utc().toJSDate()): Event {
    const computedProperties = {
      id: Event.CONSTANTS.ID_PREFIX + shortid.generate(),
      createdAt: curDate,
    };

    return new Event({ ...computedProperties, ...params, payload: params.payload || null });
  }
}
