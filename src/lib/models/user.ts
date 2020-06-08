import { ValidatedBase } from 'validated-base';
import { IsDefined, IsString } from 'class-validator';
import admin from 'firebase-admin';

interface UserInterface {
  id: string;
  user: admin.auth.UserRecord;
}

/**
 * @class
 */
export class User extends ValidatedBase implements UserInterface {
  /**
   * @param {UserInterface} params
   * @param {boolean} [validate=true]
   */
  constructor(params: admin.auth.UserRecord, validate = true) {
    super();

    this.id = params.uid;
    this.user = params;

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  id: string;

  @IsDefined()
  user: admin.auth.UserRecord;
}
