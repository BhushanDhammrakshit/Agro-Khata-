import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { PlatformAdmin } from '../entities/platform-admin.entity';
import { AuditLog } from '../entities/audit-log.entity';

const ENTITIES = [Tenant, User, PlatformAdmin, AuditLog];
export const SUPERADMIN_CONNECTION = 'superadmin';

/**
 * Separate DB connection intended to authenticate as the `app_superadmin`
 * BYPASSRLS role from docs/schema.sql, so the superadmin panel can see and
 * manage data across ALL tenants. Falls back to the main app credentials for
 * local dev (see config/configuration.ts) where that role usually doesn't
 * exist yet — works there only because the local dev user is a superuser.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: SUPERADMIN_CONNECTION,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.superadminUsername'),
        password: config.get<string>('database.superadminPassword'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        entities: ENTITIES,
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES, SUPERADMIN_CONNECTION),
  ],
  exports: [TypeOrmModule],
})
export class SuperadminDatabaseModule {}
