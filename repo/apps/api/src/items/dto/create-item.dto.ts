import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  uom: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultRate?: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAlertQty?: number;
}
