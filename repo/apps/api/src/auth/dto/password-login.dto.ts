import { IsPhoneNumber, IsString, IsUUID, MinLength } from 'class-validator';

export class PasswordLoginDto {
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone: string;

  @IsUUID()
  tenantId: string;

  @IsString()
  @MinLength(8)
  password: string;
}