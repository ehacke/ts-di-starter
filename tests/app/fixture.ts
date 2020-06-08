import { expect } from 'chai';
import { has, isObject, noop } from 'lodash';
import sinon from 'sinon';

import { ServiceManager } from '@/serviceManager';

const serviceFake = (req, res): void => res.json({ done: 'done' });

const hasConstructor = (obj): boolean => obj.constructor !== Object;

const getFakedInstance = (target) =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(target))
    .filter((key) => key !== 'constructor')
    .reduce((result, key) => {
      result[key] = sinon.stub().callsFake(serviceFake);
      return result;
    }, {});

const getStubbedInstance = (target) =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(target))
    .filter((key) => key !== 'constructor')
    .reduce((result, key) => {
      result[key] = sinon.stub().callsArg(2);
      return result;
    }, {});

const traverseObject = (target, useStub) => {
  if (!target) return target;

  if (hasConstructor(target)) {
    return useStub ? getStubbedInstance(target) : getFakedInstance(target);
  }

  return Object.keys(target).reduce((result, key) => {
    result[key] = traverseObject(target[key], useStub);
    return result;
  }, {});
};

const createFixture = () => {
  sinon.restore();

  const config = { port: 9001, stripeWebhookSecret: 'foo', slackSigningSecret: 'foo' };
  const services = { limiters: {}, responseBuilder: { wrap: (func) => func } } as any;
  const middleware = ServiceManager.buildExpressMiddleware(config as any, {} as any, services);
  const controllers = ServiceManager.buildExpressControllers(config as any, {} as any, services);

  return {
    config,
    start: noop,
    stop: noop,
    expressMiddleware: traverseObject(middleware, true),
    expressControllers: traverseObject(controllers, false),
    clients: {},
  };
};

const checkFixture = (fixture, expected): void => {
  const { expressMiddleware, expressControllers } = fixture;

  const updateExpectationsFromFixture = (fixtureObj, expectedObj) => {
    return Object.keys(fixtureObj).reduce((_expectedObj, key) => {
      const isStub = has(fixtureObj[key], 'callsFake');

      if (isStub) {
        fixtureObj[key] = fixtureObj[key].callCount;
      }

      if (!has(_expectedObj, key)) {
        if (isStub) {
          _expectedObj[key] = 0;
        } else {
          _expectedObj[key] = {};
        }
      }

      if (isObject(fixtureObj[key])) {
        updateExpectationsFromFixture(fixtureObj[key], _expectedObj[key]);
      }

      return _expectedObj;
    }, expectedObj);
  };

  updateExpectationsFromFixture(expressControllers, expected.controllers);
  updateExpectationsFromFixture(expressMiddleware, expected.middleware);

  expect(expressControllers).to.deep.equal(expected.controllers);
  expect(expressMiddleware).to.deep.equal(expected.middleware);
};

export { createFixture, checkFixture };
