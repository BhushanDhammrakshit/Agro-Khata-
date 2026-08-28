import { Module } from '@nestjs/common';
import { SuperadminDatabaseModule } from '../superadmin/superadmin-database.module';
import { DbBackupService } from './db-backup.service';
import { MonthlyReportService } from './monthly-report.service';

@Module({
  imports: [SuperadminDatabaseModule],
  providers: [DbBackupService, MonthlyReportService],
})
export class BackupModule {}
