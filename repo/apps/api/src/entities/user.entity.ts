import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  OWNER = 'owner',
  STAFF = 'staff',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  name: string;

  // Required, unique-per-tenant login identifier (password + OTP-on-email).
  @Column()
  email: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role', default: UserRole.STAFF })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
