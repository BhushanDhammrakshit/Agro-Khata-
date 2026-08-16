import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PlatformAdmin } from '../../entities/platform-admin.entity';
import { SUPERADMIN_CONNECTION } from '../superadmin-database.module';

@Injectable()
export class SuperadminAuthService {
  constructor(
    @InjectRepository(PlatformAdmin, SUPERADMIN_CONNECTION)
    private readonly adminsRepo: Repository<PlatformAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; admin: Partial<PlatformAdmin> }> {
    const admin = await this.adminsRepo.findOne({ where: { email, isActive: true } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.adminsRepo.update(admin.id, { lastLoginAt: new Date() });
    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      type: 'superadmin',
      email: admin.email,
    });

    return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email } };
  }
}
