import { HEALTH_STATUS, Healthz } from '@ehacke/healthz';
import autoBind from 'auto-bind';
import HTTP_STATUS from 'http-status';

interface ServicesInterface {
  healthz: Healthz;
}

/**
 * @class
 */
export class Health {
  private readonly services: ServicesInterface;

  /**
   * @param {ServicesInterface} services
   * @param {any} config
   * @param {boolean} doAutoBind
   */
  constructor(services: ServicesInterface, config?, doAutoBind = true) {
    this.services = services;

    if (doAutoBind) {
      autoBind(this);
    }
  }

  /**
   * Check health of services
   *
   * @param {Request} request
   * @param {Response} response
   * @returns {Promise<any>}
   */
  async check(request, response): Promise<any> {
    const { isDebug } = request.locals;

    const result = await this.services.healthz.check();
    const summary = isDebug ? result : { status: result.status };

    if (result.status === HEALTH_STATUS.UNHEALTHY) {
      return response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(summary);
    }

    return response.status(HTTP_STATUS.OK).json(summary);
  }
}
