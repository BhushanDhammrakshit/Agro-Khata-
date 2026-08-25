import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum ContactMessageType {
  CONTACT = 'contact',
  FEEDBACK = 'feedback',
}

export class CreateContactMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsEnum(ContactMessageType)
  type: ContactMessageType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}
