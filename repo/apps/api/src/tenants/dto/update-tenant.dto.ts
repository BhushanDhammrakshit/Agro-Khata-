import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(2) legalName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankIfsc?: string;
  @IsOptional() @IsString() bankUpi?: string;
  @IsOptional() @IsString() invoicePrefix?: string;
  @IsOptional() @IsString() termsConditions?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() signatureUrl?: string;
  @IsOptional() @IsIn(['en', 'mr']) defaultLanguage?: string;
}
