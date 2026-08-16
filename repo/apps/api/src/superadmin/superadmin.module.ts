import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperadminDatabaseModule } from './superadmin-database.module';
import { SuperadminAuthController } from './auth/superadmin-auth.controller';
import { SuperadminAuthService } from './auth/superadmin-auth.service';
import { SuperadminJwtStrategy } from './auth/superadmin-jwt.strategy';
import { SuperadminBootstrapService } from './auth/superadmin-bootstrap.service';
import { SuperadminTenantsController } from './tenants/superadmin-tenants.controller';
import { SuperadminTenantsService } from './tenants/superadmin-tenants.service';

@Module({
  imports: [
    SuperadminDatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('superadmin.jwtSecret') ?? 'dev-secret-change-me',
        signOptions: { expiresIn: (config.get<string>('superadmin.expiresIn') ?? '8h') as never },
      }),
    }),
  ],
  controllers: [SuperadminAuthController, SuperadminTenantsController],
  providers: [SuperadminAuthService, SuperadminJwtStrategy, SuperadminBootstrapService, SuperadminTenantsService],
})
export class SuperadminModule {}
