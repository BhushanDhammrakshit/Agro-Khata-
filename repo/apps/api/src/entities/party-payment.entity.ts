import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMode } from './payment-mode.enum';

export enum PartyPaymentDirection {
  PAID = 'paid',
  RECEIVED = 'received',
}

// Standalone, record-only ledger entry for a party (not tied to any invoice).
@Entity('party_payments')
export class PartyPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ type: 'enum', enum: PartyPaymentDirection, enumName: 'party_payment_direction' })
  direction: PartyPaymentDirection;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'paid_date', type: 'date' })
  paidDate: string;

  @Column({ name: 'payment_mode', type: 'enum', enum: PaymentMode, enumName: 'payment_mode', default: PaymentMode.CASH })
  paymentMode: PaymentMode;

  @Column({ name: 'reference_no', nullable: true })
  referenceNo?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
