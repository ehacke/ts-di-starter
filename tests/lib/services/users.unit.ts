import { expect } from 'chai';
import { Users } from '@/services/users';
import sinon from 'sinon';

describe('users unit test', () => {
  it('found getByToken', async () => {
    const services = {
      auth: { verifyIdToken: sinon.stub().resolves({ uid: 'user-id' }) } as any,
    };

    const user = { id: 'ogt-id' } as any;

    const users = new Users(services);
    const getStub = sinon.stub(users, 'get').resolves(user);

    expect(await users.getByToken('token')).to.eql(user);
    expect(getStub.args).to.eql([['user-id']]);
  });

  it('not found getByToken', async () => {
    const services = {
      auth: { verifyIdToken: sinon.stub().rejects('boom verify') } as any,
    };

    const users = new Users(services);
    const getStub = sinon.stub(users, 'get').rejects('boom');

    expect(await users.getByToken('token')).to.eql(null);
    expect(getStub.args).to.eql([]);
  });

  it('get found', async () => {
    const services = {
      auth: { getUser: sinon.stub().resolves({ uid: 'user-id' }) } as any,
    };

    const users = new Users(services);
    expect(await users.get('token')).to.eql({ id: 'user-id', user: { uid: 'user-id' } });
  });

  it('get not found', async () => {
    const services = {
      auth: { getUser: sinon.stub().rejects('boom') } as any,
    };

    const users = new Users(services);
    expect(await users.get('token')).to.eql(null);
  });
});
