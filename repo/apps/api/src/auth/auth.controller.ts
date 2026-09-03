import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompanyLookupDto } from './dto/company-lookup.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

const ACCESS_TOKEN_COOKIE = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email, dto.tenantId);
  }

  @Post('companies')
  @HttpCode(HttpStatus.OK)
  listCompanies(@Body() dto: CompanyLookupDto) {
    return this.authService.listCompanies(dto.email);
  }

  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  async passwordLogin(
    @Req() req: Request,
    @Body() dto: PasswordLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const longLived = this.isDesktopClient(req);
    const { accessToken, user } = await this.authService.passwordLogin(
      dto.email,
      dto.tenantId,
      dto.password,
      longLived,
    );
    this.setAccessTokenCookie(res, accessToken, longLived);
    return { user };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Req() req: Request, @Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const longLived = this.isDesktopClient(req);
    const { accessToken, user } = await this.authService.verifyOtp(
      dto.email,
      dto.otp,
      dto.tenantId,
      longLived,
    );
    this.setAccessTokenCookie(res, accessToken, longLived);
    return { user };
  }

  @Post('switch-company')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchCompany(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const longLived = this.isDesktopClient(req);
    const { accessToken, user: switchedUser } = await this.authService.switchCompany(
      user.email,
      dto.tenantId,
      longLived,
    );
    this.setAccessTokenCookie(res, accessToken, longLived);
    return { user: switchedUser };
  }

  // identifies the Tauri desktop shell via its configured User-Agent string
  private isDesktopClient(req: Request): boolean {
    return (req.headers['user-agent'] ?? '').includes('VajaBakiDesktop');
  }

  private setAccessTokenCookie(res: Response, accessToken: string, longLived = false) {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = longLived ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      // 'none' is required for cross-site cookies (separate frontend/API domains in prod).
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    return { message: 'Logged out.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.usersService.findById(user.sub);
    } catch (err) {
      // Token is valid but its user no longer exists (deleted/reseeded DB) — treat as unauthenticated.
      if (err instanceof NotFoundException) throw new UnauthorizedException('Session is no longer valid.');
      throw err;
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { name?: string; email?: string },
  ) {
    return this.usersService.updateSelf(user.sub, dto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  setPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(user.sub, dto.password);
  }
}
