import autoBind from 'auto-bind';

import { Error as ErrorLimiter } from '@/services/limiters/error';
import { General } from '@/services/limiters/general';
import { ResponseBuilder } from '@/express/responseBuilder';

interface ServiceInterface {
  responseBuilder: ResponseBuilder;
  limiters: {
    general: General;
    error: ErrorLimiter;
  };
}

/**
 * @class
 */
export class Limiter {
  readonly services: ServiceInterface;

  /**
   * @param {object} services
   * @param {object} config
   * @param {boolean} [doAutoBind=true]
   */
  constructor(services: ServiceInterface, config?, doAutoBind = true) {
    this.services = services;

    if (doAutoBind) {
      autoBind(this);
    }
  }

  /**
   * Attach roleup user to req object
   *
   * @param {Request} request express request
   * @param {Response} res express response
   * @param {Function} next
   * @returns {Promise<*>}
   */
  async checkLimit(request, res, next: () => void): Promise<void> {
    try {
      request.locals.limitResult = await this.services.limiters.error.check(request.ip);

      if (request.locals.limitResult.blockReason) {
        request.locals.limitResult = await this.services.limiters.general.consume(request.ip, request.locals.limitResult);
        return undefined;
      }

      request.locals.limitResult = await this.services.limiters.general.consume(request.ip);

      return next();
    } catch (error) {
      return this.services.responseBuilder.respond(res, error);
    }
  }
}
