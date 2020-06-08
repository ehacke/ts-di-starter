import autoBind from 'auto-bind';

import { User as UserModel } from '@/models/user';
import { Users } from '@/services/users';

import { assertProperties } from '../utils';

interface ServicesInterface {
  users: Users;
}

/**
 * @class
 */
export class User {
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
   * Get user
   *
   * @param {Request} request
   * @returns {Promise<any>}
   */
  async get(request): Promise<any> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;

    return user;
  }

  /**
   * Remove user
   *
   * @param {Request} request
   * @returns {Promise<void>}
   */
  async remove(request): Promise<void> {
    assertProperties(request.locals, ['user']);
    const { user }: { user: UserModel } = request.locals;
    return this.services.users.remove(user.id);
  }
}
