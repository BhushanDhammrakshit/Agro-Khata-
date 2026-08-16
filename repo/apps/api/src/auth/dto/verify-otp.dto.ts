import { IsPhoneNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone: string;

  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}
