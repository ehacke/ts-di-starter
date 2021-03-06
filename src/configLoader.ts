/* eslint no-process-env: "off" */
import getenv from 'getenv';

import { Config } from '@/config';
import pjson from '../package.json';

const getOptionalProcessEnv = (name): string | undefined => {
  try {
    return getenv(name);
  } catch {
    return undefined;
  }
};

const load = (): Config => {
  const config = {
    port: 9000,
    version: pjson.version,
    name: pjson.name.replace(/^@[\d-AZa-z-]+\//g, ''),

    redis: {
      host: getenv('REDIS_HOST'),
      port: getenv.int('REDIS_PORT'),
      ttlSec: getenv.int('REDIS_TTL_SEC'),
    },

    gcp: {
      databaseURL: getOptionalProcessEnv('DATABASE_URL'),
      projectId: getenv('PROJECT_ID'),
      serviceAccountPath: getenv('SERVICE_ACCOUNT_PATH'),
      pubsubEmulator: getenv('PUBSUB_EMULATOR_HOST', 'not-found') !== 'not-found',
    },
  };

  return new Config(config);
};

export default { load };
