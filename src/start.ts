/* eslint no-process-exit: "off" */
import log from '@/logger';

import Bluebird from 'bluebird';
import * as app from './app';
import ConfigLoader from './configLoader';
import { Server } from './server';

const { ServiceManager } = app;
const startingConfig = ConfigLoader.load();

(async (): Promise<void> => {
  const serviceManager = new ServiceManager(startingConfig);
  const server = new Server(serviceManager);

  // Graceful shutdown from SIGTERM
  process.on('SIGTERM', async () => {
    log.warn('SIGTERM received stopping server...');

    await server.stop();
    process.exit(0);
  });

  process.on('unhandledRejection', (r, p) => {
    log.warn('Unhandled rejection at: ', p);
    process.exit(1);
  });

  // This is dumb, but sometimes everything starts before redis has connected
  // Rather than tricking ioredis into connecting manually, easier to just wait a bit
  // eslint-disable-next-line no-magic-numbers
  await Bluebird.delay(500);
  await server.start();
})();
