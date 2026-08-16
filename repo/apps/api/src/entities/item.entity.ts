import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column()
  uom: string;

  // NUMERIC — returned as a string by the pg driver to avoid precision loss.
  @Column({ name: 'default_rate', type: 'numeric', precision: 12, scale: 2, nullable: true })
  defaultRate?: string;

  @Column({ name: 'hsn_code', nullable: true })
  hsnCode?: string;

  @Column({ name: 'gst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  gstRate: string;

  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  salePrice?: string;

  @Column({ name: 'opening_stock', type: 'numeric', precision: 12, scale: 3, default: 0 })
  openingStock: string;

  @Column({ name: 'current_stock', type: 'numeric', precision: 12, scale: 3, default: 0 })
  currentStock: string;

  @Column({ name: 'low_stock_alert_qty', type: 'numeric', precision: 12, scale: 3, nullable: true })
  lowStockAlertQty?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
