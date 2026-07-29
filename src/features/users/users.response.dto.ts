import { Role } from '../../database';

export class ResponseUserDto {
  public readonly id!: string;
  public readonly name!: string;
  public readonly email!: string;
  public readonly phone!: string | null;
  public readonly role!: Role;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}
