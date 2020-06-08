import { Router } from 'express';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

export default (middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): Router => {
  const router = Router();
  router.post('/', controllers.records.create);
  router.get('/:recordId', controllers.records.get);
  router.put('/:recordId', controllers.records.patch);
  router.delete('/:recordId', controllers.records.remove);
  return router;
};
