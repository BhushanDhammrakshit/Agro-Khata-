import { Injectable } from '@nestjs/common';
import { MailService } from '../common/mail/mail.service';
import { ContactMessageType, CreateContactMessageDto } from './dto/create-contact-message.dto';

const SUPPORT_EMAIL = 'agrokhataservices@gmail.com';

function esc(value: string): string {
  return value.replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch]!);
}

@Injectable()
export class ContactService {
  constructor(private readonly mail: MailService) {}

  async submit(dto: CreateContactMessageDto): Promise<void> {
    const label = dto.type === ContactMessageType.FEEDBACK ? 'Feedback' : 'Contact';
    const subject = `VajaBaki ${label} from ${dto.name}`;
    const text = `Type: ${label}\nName: ${dto.name}\nEmail: ${dto.email}\n\nMessage:\n${dto.message}`;
    const html = `
      <p><strong>Type:</strong> ${esc(label)}</p>
      <p><strong>Name:</strong> ${esc(dto.name)}</p>
      <p><strong>Email:</strong> ${esc(dto.email)}</p>
      <p><strong>Message:</strong></p>
      <p>${esc(dto.message).replace(/\n/g, '<br/>')}</p>
    `;

    await this.mail.send({
      to: SUPPORT_EMAIL,
      subject,
      html,
      text,
      replyTo: dto.email,
    });
  }
}
