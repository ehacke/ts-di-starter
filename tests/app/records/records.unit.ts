import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import { ServiceManager } from '@/serviceManager';

import GetApp from '../../getAppForTest';
import { checkFixture, createFixture } from '../fixture';

const tests = [
  {
    method: 'post',
    calledPath: '/v1/records',
    expected: {
      controllers: {
        records: {
          create: 1,
        },
      },
      middleware: {
        limiter: {
          checkLimit: 1,
        },
        user: {
          attach: 1,
        },
        logger: {
          log: 1,
        },
      },
    },
    namedPath: null,
  },
  {
    method: 'get',
    calledPath: '/v1/records/some-id',
    expected: {
      controllers: {
        records: {
          get: 1,
        },
      },
      middleware: {
        limiter: {
          checkLimit: 1,
        },
        user: {
          attach: 1,
        },
        logger: {
          log: 1,
        },
      },
    },
    namedPath: null,
  },
  {
    method: 'put',
    calledPath: '/v1/records/some-id',
    expected: {
      controllers: {
        records: {
          patch: 1,
        },
      },
      middleware: {
        limiter: {
          checkLimit: 1,
        },
        user: {
          attach: 1,
        },
        logger: {
          log: 1,
        },
      },
    },
    namedPath: null,
  },
  {
    method: 'delete',
    calledPath: '/v1/records/some-id',
    expected: {
      controllers: {
        records: {
          remove: 1,
        },
      },
      middleware: {
        limiter: {
          checkLimit: 1,
        },
        user: {
          attach: 1,
        },
        logger: {
          log: 1,
        },
      },
    },
    namedPath: null,
  },
];

describe('records route unit tests', () => {
  let app;
  let server;

  afterEach(async () => {
    sinon.restore();
    // eslint-disable-next-line no-unused-expressions
    server && (await server.stop());
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  tests.forEach((test) => {
    it(`${test.method} ${test.namedPath || test.calledPath}`, async () => {
      const fixture = createFixture();

      ({ app, server } = await GetApp((fixture as unknown) as ServiceManager));

      const response = await request(app)[test.method](test.calledPath).expect(200);

      checkFixture(fixture, test.expected);
      expect(response.body).to.eql({ done: 'done' });
    });
  });
});
