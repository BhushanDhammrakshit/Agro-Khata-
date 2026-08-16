import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class InvoiceLineItemDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsString()
  @MinLength(1)
  itemName: string;

  @IsString()
  @MinLength(1)
  uom: string;

  @IsNumber()
  @Min(0.001)
  qty: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;
}
