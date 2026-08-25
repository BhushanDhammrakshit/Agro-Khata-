import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Generic transactional email sender (Brevo REST API first, SMTP fallback),
 * shared by any feature that needs to email a user (invites, notifications).
 * Falls back to a console log when no Brevo/SMTP credentials are configured.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
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

  async send(options: SendMailOptions): Promise<void> {
    const brevoApiKey = this.config.get<string>('otp.brevo.apiKey');
    if (brevoApiKey) {
      await this.sendViaBrevo(options, brevoApiKey);
      return;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`[MAIL] -> ${options.to}: ${options.subject} (dev stub, no BREVO_API_KEY or SMTP_* env vars set)`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${this.config.get<string>('otp.smtp.fromName')}" <${this.config.get<string>('otp.smtp.from')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });
    } catch (err) {
      this.logger.error(`Mail send failed for ${options.to}: ${(err as Error).message}`);
    }
  }

  private async sendViaBrevo(options: SendMailOptions, apiKey: string): Promise<void> {
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
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
          ...(options.replyTo ? { replyTo: { email: options.replyTo } } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Brevo mail failed for ${options.to}: ${response.status} ${body}`);
      }
    } catch (err) {
      this.logger.error(`Brevo mail request errored for ${options.to}: ${(err as Error).message}`);
    }
  }
}
