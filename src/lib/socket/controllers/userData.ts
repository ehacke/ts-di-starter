import { Events } from '@/services/events';
import log from '@/logger';
import { ACTIONS, Event, EVENT_NAMESPACES } from '@/models/event';
import { LocalSocket } from '@/socket/socket';

interface ServiceInterface {
  events: Events;
}

const SOCKET_EMIT_EVENTS: { namespace: EVENT_NAMESPACES; action: ACTIONS | undefined }[] = [
  {
    namespace: EVENT_NAMESPACES.RECORDS,
    action: undefined, // All for this namespace
  },
];

/**
 * @class
 */
export class UserData {
  readonly services: ServiceInterface;

  /**
   * @param {object} services
   */
  constructor(services: ServiceInterface) {
    this.services = services;
  }

  /**
   * @param {any} socket
   * @returns {void}
   */
  onConnect(socket: LocalSocket): void {
    if (!socket.locals || !socket.locals.user) {
      log.error('local.user not on socket during runRecords connect');
      return;
    }

    if (!socket.locals.userListeners) {
      socket.locals.userListeners = [];
    }

    const completeListener = async (event: Event): Promise<void> => {
      const {
        namespace,
        action,
        metadata: { userId },
      } = event;

      const emitEvent = SOCKET_EMIT_EVENTS.find(({ namespace: ns, action: act }) => ns === namespace && (!act || act === action));
      if (!emitEvent) return;

      if (socket.locals?.user.id === userId) {
        socket.emit(`${event.namespace}.${event.action}`, event);
      }
    };

    SOCKET_EMIT_EVENTS.forEach(({ namespace, action }) => {
      if (action) {
        this.services.events.onGlobal(namespace, action, completeListener);
      } else {
        this.services.events.onGlobal(namespace, completeListener);
      }
    });
    socket.locals.userListeners.push(completeListener);
  }

  /**
   * @param {any} socket
   * @returns {void}
   */
  onDisconnect(socket: LocalSocket): void {
    if (!socket.locals || !socket.locals.user) {
      log.error('local.user not on socket during user disconnect');
    }

    if (socket.locals?.userListeners) {
      socket.locals.userListeners.forEach((listener) => {
        SOCKET_EMIT_EVENTS.forEach(({ namespace }) => this.services.events.removeGlobalListener(namespace, listener));
      });
    }
  }
}
