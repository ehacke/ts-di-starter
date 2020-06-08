import { Redis } from '@ehacke/redis';
import Err from 'err';

import { LimiterGroup } from '@/services/limiters/limiterGroup';
import { Limiter, LimitResultInterface } from '@/lib/models/limiter';

interface ServiceInterface {
  redis: Redis;
}

/**
 * @class
 */
export class Error {
  readonly services: ServiceInterface;

  readonly limiterGroup: LimiterGroup;

  /**
   * @param {object} services
   */
  constructor(services: ServiceInterface) {
    this.services = services;

    this.limiterGroup = Error.createLimiterGroup(services.redis);
  }

  /**
   * Create limiter group
   *
   * @param {Redis} redis
   * @returns {LimiterGroup}
   */
  static createLimiterGroup(redis: Redis): LimiterGroup {
    /* eslint-disable no-magic-numbers */

    const WINDOW_SEC = 10;
    const MAX_PER_SECOND = 5;

    return new LimiterGroup([
      Limiter.create({
        redis,
        name: 'error-rate-limit',
        reason: 'Too many errors',
        points: WINDOW_SEC * MAX_PER_SECOND,
        durationSec: WINDOW_SEC,
        blockDurationSec: WINDOW_SEC * 6,
        getKey: (body, ipAddress) => {
          if (!ipAddress) throw new Err('Missing ipAddress');
          return ipAddress;
        },
        shouldConsume: async (): Promise<boolean> => true,
        shouldReset: async (): Promise<boolean> => false,
      }),
    ]);
    /* eslint-enable no-magic-numbers */
  }

  /**
   * Check limits
   *
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async check(ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    return this.limiterGroup.check({}, ipAddress, curLimitResult);
  }

  /**
   * Consume limits
   *
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async consume(ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    return this.limiterGroup.consume({}, ipAddress, curLimitResult);
  }

  /**
   * Reset limits
   *
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async delete(ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    return this.limiterGroup.reset({}, ipAddress, curLimitResult);
  }
}
