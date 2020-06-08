import Err from 'err';
import admin from 'firebase-admin';
import HTTP_STATUS from 'http-status';

import log from '@/logger';
import { User } from '@/models/user';

interface ServicesInterface {
  auth: admin.auth.Auth;
}

/**
 * @class
 */
export class Users {
  private readonly services: ServicesInterface;

  /**
   * @param {ServicesInterface} services
   */
  constructor(services: ServicesInterface) {
    this.services = services;
  }

  /**
   * Get user by ID token
   *
   * @param {string} token
   * @returns {Promise<User | null>}
   */
  async getByToken(token: string): Promise<User | null> {
    const userId = await this.services.auth
      .verifyIdToken(token)
      .then(({ uid }) => uid)
      .catch((error) => {
        log.error(`Error: ${error.message} while verifying token: ${token}`);
        return null;
      });

    if (!userId) return null;
    return this.get(userId);
  }

  /**
   * Get user for id
   *
   * @param {string} id
   * @returns {Promise<admin.auth.UserRecord | null>}
   */
  async get(id: string): Promise<User | null> {
    const user = await this.services.auth.getUser(id).catch((error) => {
      log.error(`Error: ${error.message} while fetching user for id: ${id}`);
      return null;
    });

    return user ? new User(user) : null;
  }

  /**
   * Get or throw user
   *
   * @param {string} id
   * @returns {Promise<User>}
   */
  async getOrThrow(id: string): Promise<User> {
    const user = await this.get(id);

    if (!user) {
      throw new Err(`No user for ID: ${id}`, HTTP_STATUS.NOT_FOUND);
    }

    return user;
  }

  /**
   * User exists
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id: string): Promise<boolean> {
    return !!(await this.get(id));
  }

  /**
   * Get by email
   *
   * @param {string} email
   * @returns {Promise<User | null>}
   */
  async getByEmail(email: string): Promise<User | null> {
    const user = await this.services.auth.getUserByEmail(email).catch((error) => {
      log.error(`Error: ${error.message} while fetching user for email: ${email}`);
      return null;
    });

    return user ? new User(user) : null;
  }

  /**
   * Remove user if possible
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id: string): Promise<void> {
    await this.services.auth.deleteUser(id);
  }
}
