import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';

export class UpdateTransactionDto {
  @IsOptional()
  @IsISO8601()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  payerName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  payeeName?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
