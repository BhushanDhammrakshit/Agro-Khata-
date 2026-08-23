import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class PasswordLoginDto {
  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  email: string;

  @IsUUID()
  tenantId: string;

  @IsString()
  @MinLength(8)
  password: string;
}