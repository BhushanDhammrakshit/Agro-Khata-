import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMode } from '../../entities/payment-mode.enum';
import { PartyPaymentDirection } from '../../entities/party-payment.entity';

export class CreatePartyPaymentDto {
  @IsEnum(PartyPaymentDirection)
  direction: PartyPaymentDirection;

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
