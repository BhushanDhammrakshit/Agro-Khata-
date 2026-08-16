import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsNull } from 'typeorm';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';
import { OtpService } from './otp.service';
import { OtpPurpose, OtpRequest } from '../entities/otp-request.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Phone numbers are unique system-wide for MVP (see docs/schema.sql), so we
   * can resolve the owning tenant before a tenant session is established.
   * This lookup intentionally runs without `app.tenant_id` set.
   */
  async requestOtp(phone: string): Promise<{ message: string }> {
    const manager = this.tenantContext.getManager();
    const user = await manager.getRepository(User).findOne({ where: { phone, isActive: true } });
    if (!user) {
      throw new NotFoundException(
        'No account found for this mobile number. Register your company first.',
      );
    }

    // Bind the transaction to this user's tenant so the OTP row insert passes RLS.
    await this.tenantContext.setTenantId(user.tenantId);

    const code = this.otpService.generateCode();
    const otpHash = await this.otpService.hash(code);
    const expiresAt = new Date(Date.now() + this.otpService.getTtlMinutes() * 60_000);

    await manager.getRepository(OtpRequest).save(
      manager.getRepository(OtpRequest).create({
        tenantId: user.tenantId,
        userId: user.id,
        phone,
        purpose: OtpPurpose.LOGIN,
        otpHash,
        expiresAt,
      }),
    );

    await this.otpService.deliver(phone, code);
    return { message: 'OTP sent.' };
  }

  async verifyOtp(phone: string, code: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const manager = this.tenantContext.getManager();
    const user = await manager.getRepository(User).findOne({ where: { phone, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('Invalid mobile number or OTP.');
    }

    await this.tenantContext.setTenantId(user.tenantId);

    const otpRequest = await manager.getRepository(OtpRequest).findOne({
      where: { phone, consumedAt: IsNull() },
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
    await manager.getRepository(User).update(user.id, { lastLoginAt: new Date() });

    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, phone: user.phone };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, tenantId: user.tenantId },
    };
  }
}
