import bodyParser from 'body-parser';
import compression from 'compression';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Err from 'err';
import { Application } from 'express';
import { isObject } from 'lodash';
import { DateTime } from 'luxon';
import methodOverride from 'method-override';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

import api from './api';

/* eslint-disable no-magic-numbers */
const REQ_TIMEOUT_SEC = 29 * 1000;
/* eslint-enable no-magic-numbers */

const NON_JSON_ENDPOINTS = [];
const RAW_BODY_ENDPOINTS = ['/billing/webhook'];

const defaultContentTypeMiddleware = (req, res, next): void => {
  if (NON_JSON_ENDPOINTS.some((urlPath) => req?.url?.includes(urlPath))) {
    return next();
  }

  req.headers['content-type'] = 'application/json';

  return next();
};

// This is necessary for stripe, intercom, and slack signature testing
const rawBodyVerify = (req, res, buf): void => {
  if (RAW_BODY_ENDPOINTS.some((urlPath) => req?.url?.includes(urlPath))) {
    req.rawBody = buf;
  }
};

/**
 * @class
 */
export class ExpressMiddleware {
  /**
   * Attach express middleware to app
   *
   * @param {app} app
   * @param {object} middleware
   * @param {object} controllers
   * @returns {void}
   */
  static attach(app: Application, middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): void {
    if (!isObject(app) || !isObject(middleware) || !isObject(controllers)) {
      throw new Err('must have app, middleware, and controllers');
    }

    // app.use(logger);
    app.use(defaultContentTypeMiddleware);

    app.use(middleware.logger.log);
    app.use(compression());
    app.use(
      bodyParser.json({
        limit: '50mb',
        verify: rawBodyVerify,
      })
    );
    app.use(bodyParser.urlencoded({ extended: true, verify: rawBodyVerify }));
    app.use(methodOverride());
    app.use(cookieParser());
    app.use(
      cors({
        exposedHeaders: ['demo-id', 'Date', 'ETag', 'timestamp', 'x-ratelimit-reset', 'x-ratelimit-remaining', 'x-ratelimit-limit', 'retry-after'],
      })
    );
    app.use((request, response, next) => {
      const token = request.get('authorization')?.replace(/^bearer(:)?\s+/i, '');
      if (token) {
        (request as any).token = token;
      }

      next();
    });
    app.enable('trust proxy');
    app.disable('x-powered-by');

    const haltOnTimedout = (req, res, next): void => !req.timedout && next();

    app.use(timeout(REQ_TIMEOUT_SEC));
    app.use(haltOnTimedout);

    app.use(async (err, req, res, next) => middleware.exceptionHandler.handleJsonParseError(err, req, res, next));

    // Set timestamp on response to calibrate client time
    app.use((request, response, next) => {
      response.set('timestamp', `${DateTime.utc().valueOf()}`);
      next();
    });

    // Add locals, so we don't have to check everywhere
    app.use((request, response, next) => {
      (request as any).locals = { ...(request as any).locals };
      next();
    });

    // All valid routes handled here
    app.use(api(middleware, controllers));

    // Handle errors that are otherwise unhandled for some reason
    app.use(async (err, req, res, next) => middleware.exceptionHandler.handleError(err, req, res, next));

    // Everything else is a 404
    app.use(async (req, res) => middleware.exceptionHandler.handleNotFound(req, res));
  }
}
