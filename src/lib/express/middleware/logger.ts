import { middleware as expressLogger } from '@ehacke/express-bunyan-logger';
import autoBind from 'auto-bind';
import PrettyStream from 'bunyan-prettystream';
import getenv from 'getenv';
import HTTP_STATUS from 'http-status';

import pjson from '../../../../package.json';

const showColors = getenv.bool('LOG_COLORS', false);
const name = pjson.name.replace(/^@[\d-AZa-z-]+\//g, '');

const prettyStdOut = new PrettyStream({ mode: 'dev', useColor: showColors });
prettyStdOut.pipe(process.stdout);

const CONSTANTS = {
  ERROR_RESPONSE_MS: 10000,
  WARN_RESPONSE_MS: 5000,
};

/**
 * @class
 */
export class Logger {
  /**
   * @param {object} services
   * @param {object} config
   * @param {boolean} [doAutoBind=true]
   */
  constructor(services?, config?, doAutoBind = true) {
    if (doAutoBind) {
      autoBind(this);
    }
  }

  /**
   * Attach roleup user to req object
   *
   * @param {Request} request express request
   * @param {Response} response express response
   * @param {Function} next
   * @returns {Promise<*>}
   */
  async log(request, response, next): Promise<void> {
    const middleware = expressLogger({
      name: `${name}-express`,
      format: ':status-code - :method :url - response-time: :response-time',
      streams: [
        {
          level: 'info',
          stream: prettyStdOut,
        },
      ],
      levelFn: (status, err, meta) => {
        if (meta['response-time'] > CONSTANTS.ERROR_RESPONSE_MS) {
          return 'error';
        }
        if (meta['response-time'] > CONSTANTS.WARN_RESPONSE_MS) {
          return 'warn';
        }
        if (meta['status-code'] >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
          return 'error';
        }
        if (meta['status-code'] >= HTTP_STATUS.BAD_REQUEST) {
          return 'warn';
        }
        return 'trace'; // Do not log 200
      },
    });

    return middleware(request, response, next);
  }
}
