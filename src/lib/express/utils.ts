import assert from 'assert';
import { isNil, isObject } from 'lodash';
import { DateTime } from 'luxon';

import { LimitResultInterface } from '@/models/limiter';

/**
 * Attach limit headers
 *
 * @param {Request} request
 * @param {Response} response
 * @param {Date} curDate
 * @returns {void}
 */
export function attachLimitToRequest(request, response, curDate = DateTime.utc().toJSDate()): void {
  const { limitResult }: { limitResult: LimitResultInterface } = request?.locals || {};
  if (!limitResult) return;

  response.set('X-RateLimit-Limit', limitResult.limit);
  response.set('X-RateLimit-Remaining', limitResult.remaining);
  response.set('X-RateLimit-Reset', DateTime.fromJSDate(curDate).plus({ milliseconds: limitResult.resetMs }).toISO());

  if (limitResult.blockReason) {
    // eslint-disable-next-line no-magic-numbers
    response.set('Retry-After', Math.round(limitResult.resetMs / 1000));
  }
}

/**
 * Assert properties of object
 *
 * @param {{}} obj
 * @param {string[]} properties
 * @returns {void}
 */
export function assertProperties(obj: any, properties: string[]): void {
  if (!isObject(obj)) throw new Error('not object');
  if (properties.length === 0) throw new Error('no properties provided');

  properties.map((prop) => assert(!isNil(obj[prop]), `${prop} not found on obj`));
}
