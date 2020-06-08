import { ValidatedBase } from 'validated-base';
import { IsBoolean, IsInstance, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

/* eslint-disable require-jsdoc */

interface GcpConfigInterface {
  serviceAccountPath: string;
  projectId: string;
  pubsubEmulator: boolean;
  databaseURL?: string;
}

/**
 * @class
 */
class GcpConfig extends ValidatedBase implements GcpConfigInterface {
  constructor(params: GcpConfigInterface, validate = true) {
    super();

    this.serviceAccountPath = params.serviceAccountPath;
    this.projectId = params.projectId;
    this.databaseURL = params.databaseURL;
    this.pubsubEmulator = params.pubsubEmulator;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  serviceAccountPath: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  databaseURL?: string;

  @IsBoolean()
  pubsubEmulator: boolean;
}

interface RedisConfigInterface {
  host: string;
  port: number;
  ttlSec: number;
}

/**
 * @class
 */
class RedisConfig extends ValidatedBase implements RedisConfigInterface {
  constructor(params: RedisConfigInterface, validate = true) {
    super();

    this.host = params.host;
    this.port = params.port;
    this.ttlSec = params.ttlSec;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsNumber()
  ttlSec: number;
}

interface StripeInterface {
  keyPath: string;
  webhookSecretPath: string;
}

/**
 * @class
 */
class Stripe extends ValidatedBase implements StripeInterface {
  constructor(params: StripeInterface, validate = true) {
    super();

    this.keyPath = params.keyPath;
    this.webhookSecretPath = params.webhookSecretPath;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  keyPath: string;

  @IsString()
  webhookSecretPath: string;
}

export interface ConfigInterface {
  port: number;
  name: string;
  version: string;
  gcp: GcpConfigInterface;
  redis: RedisConfigInterface;
  apiHost: string;
  appHost: string;
  sendEmail: boolean;
  sendNotifications: boolean;
  stripe: StripeInterface;
  notificationWebhook: string;
  debugKey: string;
}

/**
 * @class
 */
export class Config extends ValidatedBase implements ConfigInterface {
  constructor(params: ConfigInterface, validate = true) {
    super();

    this.gcp = new GcpConfig(params.gcp, false);
    this.port = params.port;
    this.name = params.name;
    this.version = params.version;
    this.redis = new RedisConfig(params.redis, false);
    this.apiHost = params.apiHost;
    this.appHost = params.appHost;
    this.sendEmail = params.sendEmail;
    this.sendNotifications = params.sendNotifications;
    this.stripe = new Stripe(params.stripe);
    this.notificationWebhook = params.notificationWebhook;
    this.debugKey = params.debugKey;

    if (validate) {
      this.validate();
    }
  }

  @IsNumber()
  port: number;

  @IsString()
  name: string;

  @IsString()
  version: string;

  @IsInstance(RedisConfig)
  @ValidateNested()
  redis: RedisConfigInterface;

  @IsInstance(GcpConfig)
  @ValidateNested()
  gcp: GcpConfigInterface;

  /* eslint-disable @typescript-eslint/camelcase */
  @IsUrl({ require_tld: false }) // This allows localhost urls
  appHost: string;

  @IsUrl({ require_tld: false }) // This allows localhost urls
  apiHost: string;
  /* eslint-enable @typescript-eslint/camelcase */

  @IsBoolean()
  sendEmail: boolean;

  @IsBoolean()
  sendNotifications: boolean;

  @IsInstance(Stripe)
  @ValidateNested()
  stripe: StripeInterface;

  @IsString()
  notificationWebhook: string;

  @IsString()
  debugKey: string;
}

/* eslint-enable require-jsdoc */
