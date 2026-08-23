import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { OtpService } from './otp.service';
import { OtpPurpose, OtpRequest } from '../entities/otp-request.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { SUPERADMIN_CONNECTION } from '../superadmin/superadmin-database.module';

export interface CompanyChoice {
  tenantId: string;
  companyName: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    @InjectDataSource(SUPERADMIN_CONNECTION) private readonly preAuthDataSource: DataSource,
  ) {}

  async listCompanies(email: string): Promise<CompanyChoice[]> {
    return this.preAuthDataSource.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin(Tenant, 'tenant', 'tenant.id = user.tenant_id AND tenant.is_active = true')
      .select('user.tenant_id', 'tenantId')
      .addSelect('tenant.name', 'companyName')
      .addSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .andWhere('user.is_active = true')
      .orderBy('tenant.name', 'ASC')
      .getRawMany<CompanyChoice>();
  }

  async passwordLogin(
    email: string,
    tenantId: string,
    password: string,
  ): Promise<{ accessToken: string; user: Partial<User> & { hasPassword: boolean } }> {
    const manager = this.tenantContext.getManager();
    await this.tenantContext.setTenantId(tenantId);
    const user = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .andWhere('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.isActive = true')
      .getOne();

    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid company, email, or password.');
    }

    return this.completeLogin(user);
  }

  async requestOtp(email: string, tenantId?: string): Promise<{ message: string }> {
    const manager = this.tenantContext.getManager();
    const companies = await this.listCompanies(email);
    if (!tenantId && companies.length > 1) {
      throw new BadRequestException('Select a company before requesting an OTP.');
    }
    const selectedTenantId = tenantId ?? companies[0]?.tenantId;
    if (selectedTenantId) {
      await this.tenantContext.setTenantId(selectedTenantId);
    }
    const user = selectedTenantId
      ? await manager.getRepository(User).findOne({
          where: { email, tenantId: selectedTenantId, isActive: true },
        })
      : null;
    if (!user) {
      throw new NotFoundException(
        'No account found for this email address. Register your company first.',
      );
    }

    const code = this.otpService.generateCode();
    const otpHash = await this.otpService.hash(code);
    const expiresAt = new Date(Date.now() + this.otpService.getTtlMinutes() * 60_000);

    await manager.getRepository(OtpRequest).save(
      manager.getRepository(OtpRequest).create({
        tenantId: user.tenantId,
        userId: user.id,
        email,
        purpose: OtpPurpose.LOGIN,
        otpHash,
        expiresAt,
      }),
    );

    await this.otpService.deliver(email, code);
    return { message: 'OTP sent.' };
  }

  async verifyOtp(
    email: string,
    code: string,
    tenantId?: string,
  ): Promise<{ accessToken: string; user: Partial<User> & { hasPassword: boolean } }> {
    const manager = this.tenantContext.getManager();
    const companies = await this.listCompanies(email);
    const selectedTenantId = tenantId ?? (companies.length === 1 ? companies[0].tenantId : undefined);
    if (!selectedTenantId) {
      throw new BadRequestException('Select a company before verifying an OTP.');
    }
    await this.tenantContext.setTenantId(selectedTenantId);
    const user = await manager.getRepository(User).findOne({
      where: { email, tenantId: selectedTenantId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP.');
    }

    const otpRequest = await manager.getRepository(OtpRequest).findOne({
      where: { email, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!otpRequest || otpRequest.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('OTP expired or not found. Request a new one.');
    }
    if (otpRequest.attempts >= this.otpService.getMaxAttempts()) {
      throw new UnauthorizedException('Too many incorrect attempts. Request a new OTP.');
    }

    const matches = await this.otpService.compare(code, otpRequest.otpHash);
    if (!matches) {
      await manager.getRepository(OtpRequest).update(otpRequest.id, { attempts: otpRequest.attempts + 1 });
      throw new UnauthorizedException('Incorrect OTP.');
    }

    await manager.getRepository(OtpRequest).update(otpRequest.id, { consumedAt: new Date() });
    return this.completeLogin(user);
  }

  async setPassword(userId: string, password: string): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(password, 12);
    await this.tenantContext.getManager().getRepository(User).update(userId, { passwordHash });
    return { message: 'Password updated.' };
  }

  // Re-authenticates into another company the same email already has an
  // active account in — no password/OTP needed, since the caller is already
  // verified (holds a valid JWT) for that email.
  async switchCompany(
    email: string,
    tenantId: string,
  ): Promise<{ accessToken: string; user: Partial<User> & { hasPassword: boolean } }> {
    const target = await this.preAuthDataSource.manager
      .getRepository(User)
      .findOne({ where: { email, tenantId, isActive: true } });
    if (!target) {
      throw new UnauthorizedException('You do not have access to that company.');
    }
    await this.tenantContext.setTenantId(tenantId);
    return this.completeLogin(target);
  }

  private async completeLogin(
    user: User,
  ): Promise<{ accessToken: string; user: Partial<User> & { hasPassword: boolean } }> {
    const manager = this.tenantContext.getManager();
    await manager.getRepository(User).update(user.id, { lastLoginAt: new Date() });
    // passwordHash is select:false on the entity, so re-fetch it explicitly to tell
    // the frontend whether this account still needs an initial password set.
    const withHash = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: user.id })
      .getOne();
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        hasPassword: !!withHash?.passwordHash,
      },
    };
  }
}
