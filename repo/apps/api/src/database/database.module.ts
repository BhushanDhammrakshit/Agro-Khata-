import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { OtpRequest } from '../entities/otp-request.entity';
import { Item } from '../entities/item.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Party } from '../entities/party.entity';
import { PartyPayment } from '../entities/party-payment.entity';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../entities/sales-invoice-item.entity';
import { SalesInvoicePayment } from '../entities/sales-invoice-payment.entity';
import { PurchaseInvoice } from '../entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../entities/purchase-invoice-item.entity';
import { PurchaseInvoicePayment } from '../entities/purchase-invoice-payment.entity';
import { Expense } from '../entities/expense.entity';
import { StockLedger } from '../entities/stock-ledger.entity';
import { Driver } from '../entities/driver.entity';
import { Vehicle } from '../entities/vehicle.entity';

const ENTITIES = [
  Tenant, User, OtpRequest, Item, AuditLog,
  Party, PartyPayment,
  SalesInvoice, SalesInvoiceItem, SalesInvoicePayment,
  PurchaseInvoice, PurchaseInvoiceItem, PurchaseInvoicePayment,
  Expense, StockLedger,
  Driver,
  Vehicle,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        entities: ENTITIES,
        // Schema (tables, enums, RLS policies) is owned by docs/schema.sql, run
        // manually against the DB. TypeORM never generates/alters schema here.
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
