import { IsUUID } from 'class-validator';

export class SwitchCompanyDto {
  @IsUUID()
  tenantId: string;
}
