import { Redis } from '@ehacke/redis';
import { expect } from 'chai';
import { config } from 'dotenv';
import getenv from 'getenv';
import { omit } from 'lodash';
import sinon from 'sinon';

import { Events } from '@/services/events';
import { Event, EVENT_NAMESPACES, RECORDS_ACTIONS } from '@/models/event';
import { DateTime } from 'luxon';

config();

const REDIS_HOST = getenv('REDIS_HOST');
const REDIS_PORT = getenv('REDIS_PORT');

describe('events integration tests', () => {
  let redis;

  afterEach(async () => {
    if (redis) {
      await redis.flushdb();
      await redis.disconnect();
    }
    redis = null;
  });

  beforeEach(async () => {
    sinon.restore();
    redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    await redis.flushdb();
  });

  it('emit global event', async () => {
    const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z').toJSDate();

    const event = Event.create(
      {
        namespace: EVENT_NAMESPACES.RECORDS,
        action: RECORDS_ACTIONS.CREATED,
        metadata: {
          modelId: 'foo-id',
        },
      },
      curDate
    );

    const services = { redis };
    const events = new Events(services);
    await (events as any).registerGlobalListener();

    const eventFoundPromise = new Promise((resolve) => events.onGlobal(EVENT_NAMESPACES.RECORDS, (result) => resolve(result)));
    await events.emit(event);

    const eventFound = await eventFoundPromise;
    expect(omit(eventFound as any, 'id')).to.eql(omit(event, 'id'));
  });
});
