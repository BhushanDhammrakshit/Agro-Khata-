import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { SuperadminDatabaseModule } from '../superadmin/superadmin-database.module';

@Module({
  imports: [SuperadminDatabaseModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
