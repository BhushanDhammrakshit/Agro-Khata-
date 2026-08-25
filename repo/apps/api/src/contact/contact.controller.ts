import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

// Public endpoint (no auth guard) — used by the pre-login landing page's Contact/Feedback forms.
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async submit(@Body() dto: CreateContactMessageDto): Promise<{ message: string }> {
    await this.contactService.submit(dto);
    return { message: 'Thanks — your message has been sent.' };
  }
}
