import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  list(@Query('page', new DefaultValuePipe('1'), ParseIntPipe) page: number) {
    return this.transactionsService.list(page);
  }

  @Get('suggestions')
  suggestions(@Query('field') field: string, @Query('q') query?: string) {
    return this.transactionsService.suggestions(field, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
