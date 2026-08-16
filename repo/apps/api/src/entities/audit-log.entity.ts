import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column()
  action: string; // e.g. 'vendor.created', 'user.role_changed'

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData?: unknown;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData?: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
