import SocketIO from 'socket.io';

import { SocketControllersInterface, SocketMiddlewareInterface } from '@/serviceManager';

/**
 * @class
 */
export class SocketMiddleware {
  /**
   * Attach socket middleware
   *
   * @param {SocketIO.Server} io
   * @param {SocketMiddlewareInterface} middleware
   * @param {SocketControllersInterface} controllers
   * @returns {void}
   */
  static attach(io: SocketIO.Server, middleware: SocketMiddlewareInterface, controllers: SocketControllersInterface): void {
    // Middleware first
    io.use((socket, next) => middleware.user.attach(socket, next));

    // Controllers
    io.on('connection', (socket) => {
      controllers.userData.onConnect(socket);

      socket.on('disconnect', () => {
        controllers.userData.onDisconnect(socket);
      });
    });
  }
}
