import { expect } from 'chai';
import { omit } from 'lodash';
import { DateTime } from 'luxon';
import sinon from 'sinon';

import { Events } from '@/services/events';
import { Event, EVENT_NAMESPACES, RECORDS_ACTIONS } from '@/models/event';

const curDate = DateTime.fromISO('2018-01-01T00:00:00.000Z').toJSDate();

describe('events service unit tests', () => {
  it('emit and receive local events with action', async () => {
    const redis = { publish: sinon.stub().resolves() };

    const services = {
      redis: {
        duplicate: () => redis,
      } as any,
    };

    const events = new Events(services);

    const eventFoundPromise = new Promise((resolve) =>
      events.onLocal(EVENT_NAMESPACES.RECORDS, RECORDS_ACTIONS.CREATED, (result) => resolve(result))
    );

    const eventParams = {
      namespace: EVENT_NAMESPACES.RECORDS,
      action: RECORDS_ACTIONS.CREATED,
      metadata: {
        modelId: 'foo-id',
        userId: 'user-id',
      },
      payload: { something: 1 },
    };

    events.emit(eventParams, curDate);

    const eventFound = await eventFoundPromise;

    expect(omit(eventFound as any, ['id', 'createdAt', 'updatedAt'])).to.eql(eventParams);

    expect(redis.publish.callCount).to.eql(1);
    expect(redis.publish.args[0][0]).to.eql('global-events');

    expect(redis.publish.args[0][0]).to.eql('global-events');

    const publishedEvent = new Event(JSON.parse(redis.publish.args[0][1]));
    expect(omit(publishedEvent, 'id')).to.eql({
      namespace: 'records',
      action: 'created',
      metadata: {
        modelId: 'foo-id',
        userId: 'user-id',
      },
      payload: { something: 1 },
      createdAt: curDate,
    });
  });

  it('emit and receive local events without action', async () => {
    const redis = { publish: sinon.stub().resolves() };

    const services = {
      redis: {
        duplicate: () => redis,
      } as any,
    };

    const events = new Events(services);

    const eventFoundPromise = new Promise((resolve) => events.onLocal(EVENT_NAMESPACES.RECORDS, (result) => resolve(result)));

    const eventParams = {
      namespace: EVENT_NAMESPACES.RECORDS,
      action: RECORDS_ACTIONS.CREATED,
      metadata: {
        modelId: 'foo-id',
        userId: 'user-id',
      },
      payload: { something: 1 },
    };

    events.emit(eventParams, curDate);

    const eventFound = await eventFoundPromise;

    expect(omit(eventFound as any, ['id', 'createdAt', 'updatedAt'])).to.eql(eventParams);

    expect(redis.publish.args[0][0]).to.eql('global-events');

    const publishedEvent = new Event(JSON.parse(redis.publish.args[0][1]));
    expect(omit(publishedEvent, 'id')).to.eql({
      namespace: 'records',
      action: 'created',
      metadata: {
        modelId: 'foo-id',
        userId: 'user-id',
      },
      payload: { something: 1 },
      createdAt: curDate,
    });
  });
});
