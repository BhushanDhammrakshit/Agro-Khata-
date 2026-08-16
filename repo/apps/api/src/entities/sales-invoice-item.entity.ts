import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sales_invoice_items')
export class SalesInvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'sales_invoice_id' })
  salesInvoiceId: string;

  @Column({ name: 'line_no', type: 'smallint' })
  lineNo: number;

  @Column({ name: 'item_id', nullable: true })
  itemId?: string;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column()
  uom: string;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  qty: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  rate: string;

  @Column({ name: 'gst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  gstRate: string;

  // GENERATED columns — DB-computed, never write.
  @Column({ name: 'taxable_value', type: 'numeric', precision: 14, scale: 2, insert: false, update: false })
  taxableValue: string;

  @Column({ name: 'gst_amount', type: 'numeric', precision: 14, scale: 2, insert: false, update: false })
  gstAmount: string;

  @Column({ name: 'line_total', type: 'numeric', precision: 14, scale: 2, insert: false, update: false })
  lineTotal: string;
}
