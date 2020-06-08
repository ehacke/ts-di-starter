import { Router } from 'express';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

import health from './health';
import user from './user';
import records from './records';

export default (middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): Router => {
  const router = Router();
  router.use(middleware.limiter.checkLimit);
  router.use('/health', health(middleware, controllers));
  router.use(middleware.user.attach);
  router.use('/user', user(middleware, controllers));
  router.use('/records', records(middleware, controllers));

  return router;
};
