import { AuthGuard } from '@nestjs/passport';

export class SuperadminAuthGuard extends AuthGuard('superadmin-jwt') {}
