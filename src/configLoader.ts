/* eslint no-process-env: "off" */
import getenv from 'getenv';

import pjson from '../package.json';
import { Config } from './config';

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
      host: getenv('CACHE_REDIS_HOST'),
      port: getenv.int('CACHE_REDIS_PORT'),
      ttlSec: getenv.int('CACHE_REDIS_TTL_SEC'),
    },

    apiHost: getenv('API_HOST'),
    appHost: getenv('APP_HOST'),

    gcp: {
      databaseURL: getOptionalProcessEnv('DATABASE_URL'),
      projectId: getenv('PROJECT_ID'),
      serviceAccountPath: getenv('SERVICE_ACCOUNT_PATH'),
      pubsubEmulator: getenv('PUBSUB_EMULATOR_HOST', 'not-found') !== 'not-found',
    },

    sendEmail: getenv.bool('SEND_EMAIL'),

    sendNotifications: getenv.bool('SEND_NOTIFICATIONS'),

    stripe: {
      keyPath: getenv('STRIPE_KEY_PATH'),
      webhookSecretPath: getenv('STRIPE_WEBHOOK_SECRET_PATH'),
    },

    notificationWebhook: getenv('NOTIFICATION_WEBHOOK'),

    debugKey: getenv('DEBUG_KEY'),
  };

  return new Config(config);
};

export default { load };
