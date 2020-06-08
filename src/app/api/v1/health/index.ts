import { Router } from 'express';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

export default (middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): Router => {
  const router = Router();
  router.all('/', controllers.health.check);
  return router;
};
