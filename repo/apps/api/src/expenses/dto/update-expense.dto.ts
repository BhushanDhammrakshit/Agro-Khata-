import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsISO8601()
  expenseDate?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;
}