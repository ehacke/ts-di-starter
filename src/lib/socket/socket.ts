import { Socket } from 'socket.io';

export interface LocalSocket extends Socket {
  locals?: { [k: string]: any };
}
