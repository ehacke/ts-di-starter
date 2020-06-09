import { ValidatedBase } from 'validated-base';
import { IsBoolean, IsInstance, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

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

export interface ConfigInterface {
  port: number;
  name: string;
  version: string;
  gcp: GcpConfigInterface;
  redis: RedisConfigInterface;
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
}

/* eslint-enable require-jsdoc */
