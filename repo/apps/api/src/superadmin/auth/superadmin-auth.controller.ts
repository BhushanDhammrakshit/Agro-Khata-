import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SuperadminAuthService } from './superadmin-auth.service';
import { SuperadminLoginDto } from './dto/superadmin-login.dto';

const COOKIE_NAME = 'superadmin_access_token';

@Controller('superadmin/auth')
export class SuperadminAuthController {
  constructor(private readonly superadminAuthService: SuperadminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: SuperadminLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, admin } = await this.superadminAuthService.login(dto.email, dto.password);
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { admin };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME);
    return { message: 'Logged out.' };
  }
}
