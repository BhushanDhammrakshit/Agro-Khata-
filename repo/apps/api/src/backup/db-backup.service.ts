import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { gzipSync } from 'node:zlib';
import { SUPERADMIN_CONNECTION } from '../superadmin/superadmin-database.module';

// Every tenant-owned table — snapshotted as plain rows (no DDL/schema), purely for disaster recovery.
// otp_requests deliberately excluded (transient, short-lived codes, no backup value).
const BACKUP_TABLES = [
  'tenants', 'users', 'items', 'parties', 'party_payments',
  'sales_invoices', 'sales_invoice_items', 'sales_invoice_payments',
  'purchase_invoices', 'purchase_invoice_items', 'purchase_invoice_payments',
  'expenses', 'stock_ledger', 'drivers', 'vehicles', 'transactions', 'audit_logs',
];

/**
 * Weekly logical DB backup: dumps every table above to a single gzipped JSON
 * blob in Azure Blob Storage. Uses the superadmin (BYPASSRLS) connection so
 * the snapshot covers ALL tenants in one file. Runs in-process (no separate
 * WebJob/Function) via @nestjs/schedule — requires the App Service plan to
 * support "Always On" to fire reliably.
 */
@Injectable()
export class DbBackupService {
  private readonly logger = new Logger(DbBackupService.name);

  constructor(
    @InjectDataSource(SUPERADMIN_CONNECTION) private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  private getContainerClient(): ContainerClient | null {
    const connectionString = this.config.get<string>('backup.azureStorageConnectionString');
    if (!connectionString) return null;
    const containerName = this.config.get<string>('backup.containerName') ?? 'db-backups';
    return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
  }

  // Sunday 2:00 AM server time.
  @Cron('0 0 2 * * 0')
  async runWeeklyBackup(): Promise<void> {
    const container = this.getContainerClient();
    if (!container) {
      this.logger.warn('Skipping DB backup: AZURE_STORAGE_CONNECTION_STRING is not configured.');
      return;
    }

    try {
      await container.createIfNotExists();

      const snapshot: Record<string, unknown[]> = {};
      for (const table of BACKUP_TABLES) {
        snapshot[table] = await this.dataSource.query(`SELECT * FROM ${table}`);
      }

      const gzipped = gzipSync(Buffer.from(JSON.stringify(snapshot)));
      const blobName = `backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
      await container.getBlockBlobClient(blobName).uploadData(gzipped, {
        blobHTTPHeaders: { blobContentType: 'application/gzip' },
      });
      this.logger.log(`DB backup uploaded: ${blobName} (${(gzipped.length / 1024).toFixed(1)} KB)`);

      await this.pruneOldBackups(container);
    } catch (err) {
      this.logger.error(`DB backup failed: ${(err as Error).message}`);
    }
  }

  // Keeps every backup younger than the retention window (default 730 days / 2 years); only
  // deletes ones that have aged past it, regardless of how many weekly backups exist in between.
  private async pruneOldBackups(container: ContainerClient): Promise<void> {
    const retentionDays = this.config.get<number>('backup.retentionDays') ?? 730;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for await (const blob of container.listBlobsFlat()) {
      if (!blob.name.startsWith('backup-') || !blob.name.endsWith('.json.gz')) continue;
      const createdOn = blob.properties.createdOn?.getTime() ?? 0;
      if (createdOn < cutoff) {
        await container.getBlockBlobClient(blob.name).deleteIfExists();
        this.logger.log(`Pruned backup older than ${retentionDays} days: ${blob.name}`);
      }
    }
  }
}
