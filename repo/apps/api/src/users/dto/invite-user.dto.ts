import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class InviteUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail(undefined, { message: 'Enter a valid email address.' })
  email: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole;
}
