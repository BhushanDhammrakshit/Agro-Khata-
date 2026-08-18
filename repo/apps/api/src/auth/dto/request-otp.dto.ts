import { IsOptional, IsPhoneNumber, IsUUID } from 'class-validator';

export class RequestOtpDto {
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
