import { Redis } from '@ehacke/redis';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

export interface LimitResultInterface {
  name: string;
  limit: number;
  remaining: number;
  resetMs: number;
  blockReason: string | null;
}

export interface CreateLimiterInterface {
  redis: Redis;

  points: number;
  durationSec: number;
  blockDurationSec: number;

  name: string;
  reason: string;

  getKey(body, ipAddress: string): string;
  shouldConsume(body, ipAddress: string): Promise<boolean>;
  shouldReset(body, ipAddress: string): Promise<boolean>;

  execEvenly?: boolean;
  execEvenlyMinDelayMs?: number;
}

interface LimiterInterface {
  limiter: RateLimiterRedis;
  name: string;
  max: number;
  reason: string;
  blockDurationSec: number;
  getKey(body, ipAddress): string;
  shouldConsume(body, ipAddress: string): Promise<boolean>;
  shouldReset(body, ipAddress: string): Promise<boolean>;
}

const CONSTANTS = {
  WORKER_COUNT: 1,
};

/**
 * @class
 */
export class Limiter implements LimiterInterface {
  /**
   * @param {LimiterInterface} params
   */
  constructor(params: LimiterInterface) {
    this.limiter = params.limiter;

    this.name = params.name;
    this.reason = params.reason;
    this.max = params.max;
    this.getKey = params.getKey;
    this.shouldConsume = params.shouldConsume;
    this.shouldReset = params.shouldReset;
    this.blockDurationSec = params.blockDurationSec;
  }

  readonly name: string;

  readonly reason: string;

  readonly max: number;

  readonly blockDurationSec: number;

  // eslint-disable-next-line no-unused-vars,class-methods-use-this,@typescript-eslint/no-unused-vars,require-jsdoc
  getKey(body: any, ipAddress: string): string {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this,@typescript-eslint/no-unused-vars,require-jsdoc
  shouldConsume(body: any, ipAddress: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this,@typescript-eslint/no-unused-vars,require-jsdoc
  shouldReset(body: any, ipAddress: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  readonly limiter: RateLimiterRedis;

  /**
   * Create instance
   *
   * @param {CreateLimiterInterface} params
   * @returns {Limiter}
   */
  static create(params: CreateLimiterInterface): Limiter {
    const rateLimiterMemory = new RateLimiterMemory({
      keyPrefix: params.name,
      points: Math.round(params.points / CONSTANTS.WORKER_COUNT),
      duration: params.durationSec,
      blockDuration: params.blockDurationSec,
      execEvenly: params.execEvenly,
      execEvenlyMinDelayMs: params.execEvenlyMinDelayMs,
    });

    return new Limiter({
      name: params.name,
      reason: params.reason,
      getKey: params.getKey,
      shouldConsume: params.shouldConsume,
      shouldReset: params.shouldReset,
      max: params.points,
      blockDurationSec: params.blockDurationSec,
      limiter: new RateLimiterRedis({
        storeClient: params.redis,
        keyPrefix: params.name,
        points: params.points,
        duration: params.durationSec,
        blockDuration: params.blockDurationSec,
        execEvenly: params.execEvenly,
        execEvenlyMinDelayMs: params.execEvenlyMinDelayMs,
        insuranceLimiter: rateLimiterMemory,
      }),
    });
  }
}
