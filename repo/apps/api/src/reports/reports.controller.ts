import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboardKpis() {
    return this.reportsService.getDashboardKpis();
  }

  @Get('sales')
  getSales(@Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
    return this.reportsService.getSalesReport(from, to, partyId);
  }

  @Get('purchases')
  getPurchases(@Query('from') from?: string, @Query('to') to?: string, @Query('partyId') partyId?: string) {
    return this.reportsService.getPurchasesReport(from, to, partyId);
  }

  @Get('stock-summary')
  getStockSummary() {
    return this.reportsService.getStockSummary();
  }

  @Get('outstanding')
  getOutstanding(@Query('type') type: 'receivable' | 'payable' = 'receivable') {
    return this.reportsService.getOutstandingReport(type);
  }

  @Get('profit-loss')
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getProfitLoss(from, to);
  }

  @Get('expenses')
  getExpenses(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getExpensesReport(from, to);
  }

  @Get('party/:id/ledger')
  getPartyLedger(@Param('id') id: string) {
    return this.reportsService.getPartyLedger(id);
  }
}
