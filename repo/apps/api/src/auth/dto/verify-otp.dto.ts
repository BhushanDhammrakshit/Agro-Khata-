import { IsEmail, IsOptional, IsUUID, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  email: string;

  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
