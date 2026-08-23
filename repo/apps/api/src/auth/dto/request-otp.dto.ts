import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class RequestOtpDto {
  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  email: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
