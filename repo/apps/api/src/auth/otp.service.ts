import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/**
 * Generates, hashes and "delivers" OTP codes. Delivery is stubbed to a log
 * line for now — Phase 2 wires this to the WhatsApp BSP (primary) with email
 * fallback, per the notification_logs table in docs/schema.sql.
 */
@Injectable()
export class OtpService {
  constructor(private readonly config: ConfigService) {}

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async hash(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  async compare(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }

  getTtlMinutes(): number {
    return this.config.get<number>('otp.ttlMinutes') ?? 5;
  }

  getMaxAttempts(): number {
    return this.config.get<number>('otp.maxAttempts') ?? 5;
  }

  async deliver(phone: string, code: string): Promise<void> {
    // TODO(Phase 2): send via WhatsApp BSP, fall back to email, log to notification_logs.
    console.log(`[OTP] ${phone} -> ${code} (dev stub, not actually sent)`);
  }
}
