import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PartyType } from '../../entities/party.entity';

export class CreatePartyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(PartyType)
  partyType: PartyType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  fssaiNo?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  poPrefix?: string;

  @IsOptional()
  @IsString()
  farmerCode?: string;
}
