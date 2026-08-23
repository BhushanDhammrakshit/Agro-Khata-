import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

/**
 * Generates, hashes and delivers OTP codes via email (SMTP). Falls back to a
 * console log when no SMTP credentials are configured (local dev).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    const host = this.config.get<string>('otp.smtp.host');
    const user = this.config.get<string>('otp.smtp.user');
    const pass = this.config.get<string>('otp.smtp.pass');
    if (!host || !user || !pass) return null;

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('otp.smtp.port'),
        secure: this.config.get<boolean>('otp.smtp.secure'),
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

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

  async deliver(email: string, code: string): Promise<void> {
    const brevoApiKey = this.config.get<string>('otp.brevo.apiKey');
    if (brevoApiKey) {
      await this.deliverViaBrevo(email, code, brevoApiKey);
      return;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`[OTP] ${email} -> ${code} (dev stub, no BREVO_API_KEY or SMTP_* env vars set)`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${this.config.get<string>('otp.smtp.fromName')}" <${this.config.get<string>('otp.smtp.from')}>`,
        to: email,
        subject: 'Your AgroKhata login OTP',
        text: `Your OTP is ${code}. It is valid for ${this.getTtlMinutes()} minutes. Do not share this with anyone.`,
      });
    } catch (err) {
      this.logger.error(`OTP email failed for ${email}: ${(err as Error).message}`);
    }
  }

  private async deliverViaBrevo(email: string, code: string, apiKey: string): Promise<void> {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.config.get<string>('otp.brevo.from'),
            name: this.config.get<string>('otp.brevo.fromName'),
          },
          to: [{ email }],
          subject: 'Your AgroKhata login OTP',
          textContent: `Your OTP is ${code}. It is valid for ${this.getTtlMinutes()} minutes. Do not share this with anyone.`,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Brevo OTP email failed for ${email}: ${response.status} ${body}`);
      }
    } catch (err) {
      this.logger.error(`Brevo OTP email request errored for ${email}: ${(err as Error).message}`);
    }
  }
}
