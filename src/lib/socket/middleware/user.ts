import Err from 'err';
import HTTP_STATUS from 'http-status';

import { LocalSocket } from '@/lib/socket/socket';
import log from '@/logger';
import { Users } from '@/services/users';

interface ServiceInterface {
  users: Users;
}

/**
 * @class
 */
export class User {
  private readonly services: ServiceInterface;

  /**
   * @param {ServiceInterface} services
   */
  constructor(services: ServiceInterface) {
    this.services = services;
  }

  /**
   * Authenticate socket connection
   *
   * @param {LocalSocket} socket
   * @param {Function} next
   * @returns {Promise<void>}
   */
  async attach(socket: LocalSocket, next): Promise<any> {
    socket.locals = { ...socket.locals };
    const { headers } = socket.handshake;
    const authHeader = headers.Authorization || headers.authorization;

    // When the socket is upgraded to websocket from polling, the header goes stale
    // this avoids that
    if (socket.locals.user) return next();

    if (!authHeader) {
      log.error(`No auth header on socket: ${JSON.stringify(headers)}`);
      return next(new Err('Unauthorized', HTTP_STATUS.UNAUTHORIZED));
    }

    try {
      const token = authHeader.replace(/^bearer(:)?\s+/i, '');
      const user = await this.services.users.getByToken(token);

      if (!user) {
        throw new Err('Could not find user for token', HTTP_STATUS.UNAUTHORIZED);
      }

      socket.locals.user = user;
    } catch (error) {
      return next(error);
    }

    return next();
  }
}
