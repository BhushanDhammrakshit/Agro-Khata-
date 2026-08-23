import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';

export class CreateTransactionDto {
  @IsISO8601()
  transactionDate: string;

  @IsString()
  @MinLength(1)
  payerName: string;

  @IsString()
  @MinLength(1)
  payeeName: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
