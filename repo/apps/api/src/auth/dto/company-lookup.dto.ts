import { IsPhoneNumber } from 'class-validator';

export class CompanyLookupDto {
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone: string;
}