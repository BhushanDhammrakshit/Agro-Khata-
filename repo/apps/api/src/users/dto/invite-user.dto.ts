import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class InviteUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsPhoneNumber(undefined, { message: 'Enter a valid mobile number, e.g. +919876543210' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(UserRole)
  role: UserRole;
}
