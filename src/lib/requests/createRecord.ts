import { enumError, ValidatedBase } from 'validated-base';
import { RECORD_TYPE } from '@/models/record';
import { IsEnum, IsNumber, IsString } from 'class-validator';

interface CreateRecordInterface {
  type: RECORD_TYPE;
  userId: string;
  value: number;
}

/**
 * @class
 */
export class CreateRecord extends ValidatedBase implements CreateRecordInterface {
  /**
   * @param {CreateRecordInterface} params
   * @param {boolean} validate
   */
  constructor(params: CreateRecordInterface, validate = true) {
    super();

    this.type = params.type;
    this.userId = params.userId;
    this.value = params.value;

    if (validate) {
      this.validate();
    }
  }

  @IsEnum(RECORD_TYPE, { message: enumError(RECORD_TYPE) })
  type: RECORD_TYPE;

  @IsString()
  userId: string;

  @IsNumber()
  value: number;
}
