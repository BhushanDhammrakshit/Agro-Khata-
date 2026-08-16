import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsISO8601()
  paidDate: string;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
