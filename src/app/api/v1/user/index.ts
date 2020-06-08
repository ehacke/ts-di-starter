import { Router } from 'express';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

export default (middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): Router => {
  const router = Router();
  router.get('/', controllers.user.get);
  router.delete('/', controllers.user.remove);
  return router;
};
