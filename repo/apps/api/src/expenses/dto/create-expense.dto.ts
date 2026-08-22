import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';

export class CreateExpenseDto {
  @IsString()
  @MinLength(1)
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsISO8601()
  expenseDate: string;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
