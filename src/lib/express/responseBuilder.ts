import Bluebird from 'bluebird';
import Err from 'err';
import HTTP_STATUS from 'http-status';
import { isFunction, isInteger, isNil, isString, omit, size } from 'lodash';
import { DateTime } from 'luxon';

import { Error as ErrorLimiter } from '@/services/limiters/error';
import { attachLimitToRequest } from '@/express/utils';
import log from '@/logger';

export interface ResponseInterface {
  code: number;
  status: string;
  dateTime: string;
  timestamp: number;
  message?: string;
  versions?: any;
  data?: any;
}

interface NextInterface {
  (): void;
}

interface ServiceInterface {
  limiters: {
    error: ErrorLimiter;
  };
}

interface ConfigInterface {
  versions?: any;
}

/**
 * @class
 */
export class ResponseBuilder {
  readonly config: ConfigInterface;

  readonly services: ServiceInterface;

  /**
   * @param {ServiceInterface} services
   * @param {ConfigInterface} config
   */
  constructor(services: ServiceInterface, config: ConfigInterface) {
    this.services = services;
    this.config = config;
  }

  /**
   * Determine http code from error
   *
   * @param {Error} error error object or something and inheirits from it
   * @returns {number} http code
   * @private
   */
  private static getCodeFromError(error): number {
    // eslint-disable-next-line no-magic-numbers
    if (error.code && isInteger(error.code) && error.code >= 100 && error.code < 600) {
      return error.code;
    }

    if (error.code) {
      log.warn(`Unexpected error code: ${error.code}`);
    }

    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  /**
   * Handle normal response
   *
   * @param {*} data data to be returned from the endpoint
   * @param {number} [codeOverride] optionally override the default OK-200 code
   * @returns {{versions: *, code: number, status: string, dateTime: string, timestamp: number, message: *, data: *}}
   * @private
   */
  private okResponse(data, codeOverride?: number): ResponseInterface {
    const dateTime = DateTime.utc();
    const code = codeOverride || HTTP_STATUS.OK;
    const response = {
      code,
      status: HTTP_STATUS[code],
      dateTime: dateTime.toISO(),
      timestamp: dateTime.valueOf(),
    } as ResponseInterface;

    if (this.config.versions) {
      response.versions = this.config.versions;
    }

    if (data) {
      response.data = data;
    }

    return response;
  }

  /**
   * Handle error response
   *
   * @param {Error} error error object or something and inheirits from it
   * @param {number} [codeOverride] optionally override the code specified in the error
   * @returns {{versions: *, code: number, status: string, dateTime: string, timestamp: number, message: *, data: *}}
   * @private
   */
  private errorResponse(error, codeOverride): ResponseInterface {
    // eslint-disable-next-line lodash/prefer-lodash-typecheck
    if (!(error instanceof Error)) {
      if (isString(error)) {
        return this.errorResponse(new Err(error), codeOverride);
      }

      return this.errorResponse(new Err('Unexpected error'), codeOverride);
    }

    const dateTime = DateTime.utc();
    const code = codeOverride || ResponseBuilder.getCodeFromError(error);
    const response = {
      code,
      status: HTTP_STATUS[code],
      dateTime: dateTime.toISO(),
      timestamp: dateTime.valueOf(),
    } as ResponseInterface;

    if (this.config.versions) {
      response.versions = this.config.versions;
    }

    if (error.message) {
      response.message = error.message;
    }

    const data = omit(error, ['message', 'code']);

    if (size(data) > 0) {
      response.data = data;
    }

    if (response.code >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      log.error(`500+ error: ${error.stack}`);
    }

    return response;
  }

  /**
   * Use express response object to respond with data or error
   *
   * @param {object} response express response object
   * @param {Promise|Function} dataPromise promise that will resolve into a response or reject with an error
   * @param {number} [successCodeOverride] optionally override the success code specified in the error or the default OK
   * @param {number} [failureCodeOverride] optionally override the code specified in the error or the default 500
   * @returns {Promise<void>}
   */
  async respond(response, dataPromise, successCodeOverride?, failureCodeOverride?): Promise<void> {
    if (successCodeOverride && !Object.values(HTTP_STATUS).includes(successCodeOverride)) {
      log.error('successCodeOverride must be a valid HTTP code, ignoring');
      successCodeOverride = undefined;
    }

    if (failureCodeOverride && !Object.values(HTTP_STATUS).includes(failureCodeOverride)) {
      log.error('failureCodeOverride must be a valid HTTP code, ignoring');
      failureCodeOverride = undefined;
    }

    await Bluebird.try(() => (isFunction(dataPromise) ? dataPromise() : dataPromise))
      .then((data) => {
        // eslint-disable-next-line lodash/prefer-lodash-typecheck
        if (data instanceof Error) {
          return this.errorResponse(data, failureCodeOverride);
        }

        return this.okResponse(data, successCodeOverride);
      })
      .catch((error) => this.errorResponse(error, failureCodeOverride))
      .then((output) => response.status(output.code).json(output));
  }

  /* eslint-disable sonarjs/cognitive-complexity */
  /**
   * Wrap controller function in response builder
   *
   * @param {Promise|Function} controllerFunction promise that will resolve into a response or reject with an error
   * @param {number} [successCodeOverride] optionally override the success code specified in the error or the default OK
   * @param {number} [failureCodeOverride] optionally override the code specified in the error or the default 500
   * @returns {Function}
   */
  wrap(controllerFunction, successCodeOverride?, failureCodeOverride?): (request, response, next?) => Promise<void> {
    if (!isFunction(controllerFunction)) {
      throw new TypeError('controllerFunction must be a function');
    }

    successCodeOverride = successCodeOverride || (controllerFunction as any).successCodeOverride;
    failureCodeOverride = failureCodeOverride || (controllerFunction as any).failureCodeOverride;

    return async (request, response, next): Promise<void> => {
      if (isNil(request)) throw new Error('request must be an object');
      if (isNil(response)) throw new Error('response must be an object');

      if (successCodeOverride && !Object.values(HTTP_STATUS).includes(successCodeOverride)) {
        log.error('successCodeOverride must be a valid HTTP code, ignoring');
        successCodeOverride = undefined;
      }

      if (failureCodeOverride && !Object.values(HTTP_STATUS).includes(failureCodeOverride)) {
        log.error('failureCodeOverride must be a valid HTTP code, ignoring');
        failureCodeOverride = undefined;
      }

      let nextCalled = null as null | NextInterface;
      const nextCheck = (route): void => {
        nextCalled = (): void => next(route);
      };

      await Bluebird.try(() => (isFunction(controllerFunction) ? controllerFunction(request, response as any, nextCheck) : controllerFunction))
        // eslint-disable-next-line sonarjs/no-identical-functions
        .then((data) => {
          // eslint-disable-next-line lodash/prefer-lodash-typecheck
          if (data instanceof Error) {
            return this.errorResponse(data, failureCodeOverride);
          }

          return this.okResponse(data, successCodeOverride);
        })
        .catch((error) => this.errorResponse(error, failureCodeOverride))
        .then(async (output) => {
          if (response.headersSent) {
            return;
          }

          if (output.code >= HTTP_STATUS.BAD_REQUEST) {
            request.locals.limitResult = await this.services.limiters.error.consume(request.ip, request.locals.limitResult);
          }

          if (nextCalled) {
            nextCalled();
            return;
          }

          attachLimitToRequest(request, response);

          if (request.locals?.limitResult?.blockReason) {
            log.warn(`Overriding code: ${output.code} due to rate limit: ${request.locals?.limitResult?.blockReason} from IP: ${request.ip}`);
            output.message = request.locals?.limitResult?.blockReason;
            output.code = HTTP_STATUS.TOO_MANY_REQUESTS;
            response.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(output);
          } else {
            response.status(output.code).json(output);
          }
        });
    };
  }

  /* eslint-enable sonarjs/cognitive-complexity */
}
