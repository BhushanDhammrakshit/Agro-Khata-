import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  vehicleNo: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  loadCapacity?: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() @MinLength(1) vehicleNo?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() loadCapacity?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
