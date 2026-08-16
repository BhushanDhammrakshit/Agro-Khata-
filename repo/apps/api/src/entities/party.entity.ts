import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PartyType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  BOTH = 'both',
}

@Entity('parties')
export class Party {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ name: 'party_type', type: 'enum', enum: PartyType, enumName: 'party_type', default: PartyType.CUSTOMER })
  partyType: PartyType;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  gstin?: string;

  @Column({ nullable: true })
  pan?: string;

  @Column({ name: 'fssai_no', nullable: true })
  fssaiNo?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 14, scale: 2, default: 0 })
  openingBalance: string;

  @Column({ name: 'credit_limit', type: 'numeric', precision: 14, scale: 2, nullable: true })
  creditLimit?: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'bank_account', nullable: true })
  bankAccount?: string;

  @Column({ name: 'bank_ifsc', nullable: true })
  bankIfsc?: string;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress?: string;

  @Column({ name: 'invoice_prefix', nullable: true, default: 'INV-' })
  invoicePrefix?: string;

  @Column({ name: 'next_invoice_seq', type: 'bigint', nullable: true, default: 1 })
  nextInvoiceSeq?: string;

  @Column({ name: 'po_prefix', nullable: true, default: 'PO-' })
  poPrefix?: string;

  @Column({ name: 'next_po_seq', type: 'bigint', nullable: true, default: 1 })
  nextPoSeq?: string;

  @Column({ name: 'farmer_code', nullable: true })
  farmerCode?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
