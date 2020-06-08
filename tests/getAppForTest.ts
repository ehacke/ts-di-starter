import { ServiceManager } from '@/serviceManager';

import ConfigLoader from '../src/configLoader';
import { Server } from '../src/server';

export default async (serviceManager) => {
  if (!serviceManager) {
    const config = { ...ConfigLoader.load(), port: 12000 };
    serviceManager = new ServiceManager(config);
  }

  const server = new Server(serviceManager);

  await server.start(true);
  const { app } = server;

  return {
    app,
    server,
  };
};
