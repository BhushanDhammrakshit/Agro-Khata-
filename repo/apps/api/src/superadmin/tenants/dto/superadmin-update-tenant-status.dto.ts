import { IsBoolean } from 'class-validator';

export class SuperadminUpdateTenantStatusDto {
  @IsBoolean()
  isActive: boolean;
}
