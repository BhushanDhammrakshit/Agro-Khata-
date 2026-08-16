import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StockMovementType } from './stock-movement-type.enum';

@Entity('stock_ledger')
export class StockLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'movement_type', type: 'enum', enum: StockMovementType, enumName: 'stock_movement_type' })
  movementType: StockMovementType;

  @Column({ name: 'qty_change', type: 'numeric', precision: 12, scale: 3 })
  qtyChange: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
