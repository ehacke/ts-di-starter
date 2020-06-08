import autoBind from 'auto-bind';
import Err from 'err';
import HTTP_STATUS from 'http-status';

import { Users } from '@/services/users';

import { ResponseBuilder } from '../responseBuilder';

interface ServicesInterface {
  responseBuilder: ResponseBuilder;
  users: Users;
}

/**
 * @class
 */
export class User {
  private readonly services: ServicesInterface;

  /**
   * @param {object} services
   * @param {ConfigInterface} config
   * @param {boolean} [doAutoBind=true]
   */
  constructor(services: ServicesInterface, config?, doAutoBind = true) {
    this.services = services;

    if (doAutoBind) {
      autoBind(this);
    }
  }

  /**
   * Attach user to req object
   *
   * @param {Request} request express request
   * @param {Response} response express response
   * @param {Function} next
   * @returns {Promise<*>}
   */
  async attach(request, response, next): Promise<void> {
    try {
      if (!request.token) {
        return this.services.responseBuilder.respond(response, new Err('No token on request', HTTP_STATUS.UNAUTHORIZED));
      }

      const user = await this.services.users.getByToken(request.token);

      if (!user) {
        return this.services.responseBuilder.respond(response, new Err('Unrecognized token', HTTP_STATUS.UNAUTHORIZED));
      }

      request.locals.user = user;

      return next();
    } catch (error) {
      return this.services.responseBuilder.respond(response, error);
    }
  }
}
