import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { TenantContextModule } from './common/tenant-context/tenant-context.module';
import { AuditLogModule } from './common/audit/audit-log.module';
import { MailModule } from './common/mail/mail.module';
import { TenantTransactionInterceptor } from './common/interceptors/tenant-transaction.interceptor';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { PartiesModule } from './parties/parties.module';
import { SalesInvoicesModule } from './sales-invoices/sales-invoices.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ContactModule } from './contact/contact.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    TenantContextModule,
    AuditLogModule,
    MailModule,
    DatabaseModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ItemsModule,
    AuditLogsModule,
    SuperadminModule,
    PartiesModule,
    SalesInvoicesModule,
    PurchaseInvoicesModule,
    ExpensesModule,
    ReportsModule,
    DriversModule,
    VehiclesModule,
    TransactionsModule,
    ContactModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
  ],
})
export class AppModule {}
