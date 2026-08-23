import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @MinLength(2)
  companyName: string;

  @IsString()
  @MinLength(2)
  legalName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsString()
  @MinLength(2)
  ownerName: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  ownerPhone?: string;

  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  password: string;
}
