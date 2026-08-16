import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  licenceNo?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  licenceNo?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
