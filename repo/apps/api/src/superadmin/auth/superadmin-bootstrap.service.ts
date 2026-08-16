import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PlatformAdmin } from '../../entities/platform-admin.entity';
import { SUPERADMIN_CONNECTION } from '../superadmin-database.module';

/** Seeds the first platform admin account from env vars if none exists yet. */
@Injectable()
export class SuperadminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SuperadminBootstrapService.name);

  constructor(
    @InjectRepository(PlatformAdmin, SUPERADMIN_CONNECTION)
    private readonly adminsRepo: Repository<PlatformAdmin>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingCount = await this.adminsRepo.count();
    if (existingCount > 0) {
      return;
    }

    const email = this.config.get<string>('superadmin.bootstrapEmail');
    const password = this.config.get<string>('superadmin.bootstrapPassword');
    if (!email || !password) {
      this.logger.warn(
        'No platform admin exists and SUPERADMIN_BOOTSTRAP_EMAIL/PASSWORD are not set — superadmin panel has no way to log in yet.',
      );
      return;
    }

    const name = this.config.get<string>('superadmin.bootstrapName') ?? 'Platform Admin';
    const passwordHash = await bcrypt.hash(password, 10);
    await this.adminsRepo.save(this.adminsRepo.create({ name, email, passwordHash }));
    this.logger.log(`Bootstrapped first platform admin account: ${email}`);
  }
}
