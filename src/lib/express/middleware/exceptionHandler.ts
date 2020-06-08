import autoBind from 'auto-bind';
import Err from 'err';
import HTTP_STATUS from 'http-status';

import log from '@/logger';

interface ServiceInterface {
  responseBuilder: any;
}

/**
 * @class
 */
export class ExceptionHandler {
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
   * Express middleware for json body parser errors.
   * From here: {@link https://github.com/expressjs/body-parser/issues/122#issuecomment-328190379}
   *
   * @param {Error|RError|object} error unhandled error
   * @param {Request} request express request
   * @param {Response} response express response
   * @param {Function} next
   * @returns {Promise<void>}
   */
  async handleJsonParseError(error, request, response, next): Promise<void> {
    if (error.type && error.type === 'entity.parse.failed') {
      await this.services.responseBuilder.respond(response, new Err('Could not parse JSON input', HTTP_STATUS.BAD_REQUEST, error.body));
      return;
    }

    next(error);
  }

  /**
   * Express middleware for catching unhandled errors and returning a 500
   *
   * @param {Error|RError|object} error unhandled error
   * @param {Request} request express request
   * @param {Response} response express response
   * @param {Function} next
   * @returns {Promise<void>}
   */
  async handleError(error, request, response, next): Promise<void> {
    // If the error object doesn't exist
    if (!error) {
      next();
      return;
    }

    if (error.stack) {
      log.error(`Unhandled error: ${error.stack}`);
    } else {
      log.error(`Unhandled error without stack: ${JSON.stringify(error)}`);
    }

    await this.services.responseBuilder.respond(response, new Err('Unhandled error occurred', HTTP_STATUS.INTERNAL_SERVER_ERROR));
  }

  /**
   * Express middleware for catching all unhandled requests and returning 404
   *
   * @param {Request} request express request
   * @param {Response} response express response
   * @returns {Promise<void>}
   */
  async handleNotFound(request, response): Promise<void> {
    const url = request.originalUrl;
    const { method } = request;

    await this.services.responseBuilder.respond(response, new Err(`URL: ${url} with method: ${method} is not a valid path`, HTTP_STATUS.NOT_FOUND));
  }
}
