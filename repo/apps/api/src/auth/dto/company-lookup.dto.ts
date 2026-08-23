import { IsEmail } from 'class-validator';

export class CompanyLookupDto {
  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  email: string;
}