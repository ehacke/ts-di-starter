import Bluebird from 'bluebird';
import Err from 'err';
import { isError } from 'lodash';
import { RateLimiterRes } from 'rate-limiter-flexible';

import { Limiter, LimitResultInterface } from '@/models/limiter';

/**
 * @class
 */
export class LimiterGroup {
  readonly limiters: Limiter[];

  /**
   * @param {Limiter[]} limiters
   */
  constructor(limiters: Limiter[]) {
    if (limiters.length === 0) throw new Err('Must have at least one limiter');

    this.limiters = limiters;
  }

  /**
   * Handle rejection from limiter
   *
   * @param {Error|RateLimiterRes} error
   * @returns {RateLimiterRes}
   */
  static handleRejection(error): RateLimiterRes {
    if (isError(error)) {
      throw error;
    }

    return error;
  }

  /**
   * Get limit result from response
   *
   * @param {RateLimiterRes|null} response
   * @param {Limiter} limiter
   * @returns {LimitResultInterface}
   */
  static getLimitResult(response: RateLimiterRes | null, limiter: Limiter): LimitResultInterface {
    const blocked = response && response.consumedPoints >= limiter.max;

    return {
      name: limiter.name,
      limit: limiter.max,
      remaining: response?.remainingPoints || limiter.max,
      // eslint-disable-next-line no-magic-numbers
      resetMs: response?.msBeforeNext || limiter.blockDurationSec * 1000,
      blockReason: blocked ? limiter.reason : null,
    };
  }

  /* eslint-disable sonarjs/cognitive-complexity */
  /**
   * Reduce results to most relevant
   *
   * @param {any} results
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {LimitResultInterface}
   */
  static reduceLimitResults(
    results: { response: RateLimiterRes | null; limiter: Limiter }[],
    curLimitResult?: LimitResultInterface
  ): LimitResultInterface {
    if (results.length === 0) throw new Err('results empty');

    return results.reduce((result, { response, limiter }) => {
      const limitResult = LimiterGroup.getLimitResult(response, limiter);

      if (!result) return limitResult;
      if (result.blockReason && !limitResult.blockReason) return result;
      if (!result.blockReason && limitResult.blockReason) return limitResult;
      if (result.remaining !== limitResult.remaining) {
        return result.remaining < limitResult.remaining ? result : limitResult;
      }
      if (result.resetMs !== limitResult.resetMs) {
        return result.resetMs < limitResult.resetMs ? limitResult : result;
      }
      return result;
    }, curLimitResult || LimiterGroup.getLimitResult(results[0].response, results[0].limiter));
  }
  /* eslint-enable sonarjs/cognitive-complexity */

  /**
   * Check limits
   *
   * @param {any} body
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async check(body, ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    const results = await Bluebird.map(this.limiters, async (limiter) => ({
      response: await limiter.limiter.get(limiter.getKey(body, ipAddress)).catch(LimiterGroup.handleRejection),
      limiter,
    }));

    return LimiterGroup.reduceLimitResults(results, curLimitResult);
  }

  /**
   * Consume limits
   *
   * @param {any} body
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async consume(body, ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    const results = await Bluebird.map(this.limiters, async (limiter) => ({
      response: (await limiter.shouldConsume(body, ipAddress))
        ? await limiter.limiter.consume(limiter.getKey(body, ipAddress)).catch(LimiterGroup.handleRejection)
        : null,
      limiter,
    }));

    return LimiterGroup.reduceLimitResults(results, curLimitResult);
  }

  /**
   * Reset limits
   *
   * @param {any} body
   * @param {string} ipAddress
   * @param {LimitResultInterface} [curLimitResult]
   * @returns {Promise<LimitResultInterface>}
   */
  async reset(body, ipAddress: string, curLimitResult?: LimitResultInterface): Promise<LimitResultInterface> {
    const results = await Bluebird.map(this.limiters, async (limiter) => ({
      response: (await limiter.shouldReset(body, ipAddress))
        ? await limiter.limiter
            .delete(limiter.getKey(body, ipAddress))
            .catch(LimiterGroup.handleRejection)
            .then(() => null)
        : null,
      limiter,
    }));

    return LimiterGroup.reduceLimitResults(results, curLimitResult);
  }
}
