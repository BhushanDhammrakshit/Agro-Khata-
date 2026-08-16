import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { InvoiceLineItemDto } from '../../common/dto/invoice-line-item.dto';

export class CreatePurchaseInvoiceDto {
  @IsUUID()
  partyId: string;

  @IsString()
  invoiceNo: string;

  @IsISO8601()
  invoiceDate: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  isGstInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  isInterState?: boolean;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items: InvoiceLineItemDto[];
}
