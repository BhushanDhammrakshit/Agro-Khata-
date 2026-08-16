import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { InvoiceStatus } from './invoice-status.enum';

@Entity('purchase_invoices')
export class PurchaseInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'party_id' })
  partyId: string;

  @Column({ name: 'invoice_no' })
  invoiceNo: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ name: 'is_gst_invoice', default: false })
  isGstInvoice: boolean;

  @Column({ name: 'place_of_supply', nullable: true })
  placeOfSupply?: string;

  @Column({ name: 'sub_total', type: 'numeric', precision: 14, scale: 2, default: 0 })
  subTotal: string;

  @Column({ name: 'cgst_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  cgstAmount: string;

  @Column({ name: 'sgst_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  sgstAmount: string;

  @Column({ name: 'igst_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  igstAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  paidAmount: string;

  // GENERATED ALWAYS AS (total_amount - paid_amount) STORED — DB-computed, never write.
  @Column({ name: 'balance_amount', type: 'numeric', precision: 14, scale: 2, insert: false, update: false })
  balanceAmount: string;

  @Column({ type: 'enum', enum: InvoiceStatus, enumName: 'invoice_status', default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ nullable: true })
  notes?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
