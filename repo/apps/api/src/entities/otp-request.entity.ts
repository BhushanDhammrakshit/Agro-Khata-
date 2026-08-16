import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum OtpPurpose {
  LOGIN = 'login',
}

@Entity('otp_requests')
export class OtpRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column()
  phone: string;

  @Column({ type: 'enum', enum: OtpPurpose, enumName: 'otp_purpose', default: OtpPurpose.LOGIN })
  purpose: OtpPurpose;

  @Column({ name: 'otp_hash' })
  otpHash: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt?: Date;

  @Column({ name: 'requested_ip', type: 'inet', nullable: true })
  requestedIp?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
