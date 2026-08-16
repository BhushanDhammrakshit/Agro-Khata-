import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'legal_name' })
  legalName: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone?: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  pan?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  gstin?: string;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'bank_account', nullable: true })
  bankAccount?: string;

  @Column({ name: 'bank_ifsc', nullable: true })
  bankIfsc?: string;

  @Column({ name: 'bank_upi', nullable: true })
  bankUpi?: string;

  @Column({ name: 'invoice_prefix', nullable: true })
  invoicePrefix?: string;

  @Column({ name: 'terms_conditions', type: 'text', nullable: true })
  termsConditions?: string;

  @Column({ name: 'signature_url', nullable: true })
  signatureUrl?: string;

  @Column({ name: 'default_language', default: 'en' })
  defaultLanguage: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
