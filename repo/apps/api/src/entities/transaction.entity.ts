import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMode } from './payment-mode.enum';

// Standalone, freeform "log a payment to/from anyone" entry — not tied to a
// Party/invoice; payer/payee are plain text so any name can be recorded.
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: string;

  @Column({ name: 'payer_name' })
  payerName: string;

  @Column({ name: 'payee_name' })
  payeeName: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'payment_mode', type: 'enum', enum: PaymentMode, enumName: 'payment_mode', default: PaymentMode.CASH })
  paymentMode: PaymentMode;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  remark?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
