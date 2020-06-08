import { Router } from 'express';

import { ExpressControllersInterface, ExpressMiddlewareInterface } from '@/serviceManager';

import v1 from './v1';

export default (middleware: ExpressMiddlewareInterface, controllers: ExpressControllersInterface): Router => {
  const router = Router();
  router.use('/v1', v1(middleware, controllers));
  router.get('/', (req, res) => res.json({ message: 'hello' }));
  return router;
};
