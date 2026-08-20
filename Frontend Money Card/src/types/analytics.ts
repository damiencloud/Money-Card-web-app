export interface BranchPerformanceMetric {
  branchId: string;
  branchName: string;
  status: 'ACTIVE' | 'INACTIVE';
  transactionCount: number;
  purchaseCount: number;
  purchaseVolume: number;
  rechargeCount: number;
  rechargeVolume: number;
  refundCount: number;
  refundVolume: number;
  totalRevenue: number;
  sessionCount: number;
  activeSessionsCount: number;
  settledSessionsCount: number;
  avgTransactionValue: number;
  avgPurchaseValue: number;
  productsSoldCount: number;
  inventoryItemCount: number;
  lowStockItemCount: number;
}

export interface AnalyticsOverview {
  totalTransactions: number;
  totalRechargeVolume: number;
  totalPurchaseVolume: number;
  totalRefundVolume: number;
  activeSessionsCount: number;
  activeCardsCount: number;
  lowStockItemsCount: number;
  branchPerformance?: BranchPerformanceMetric[];
}

export interface AnalyticsFilter {
  organizationId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

export interface AnalyticsExportResponseData {
  filename: string;
  content: string;
  mimeType: string;
}

export interface ReportItem {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  downloadUrl: string;
}

export interface HourlyActivityMetric {
  hour: number;
  hourLabel: string;
  transactionCount: number;
  rechargeCount: number;
  purchaseCount: number;
  sessionCount: number;
  totalVolume: number;
  isPeak: boolean;
}

export interface ProductDemandMetric {
  productId: string;
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
  peakHourQuantity: number;
  offPeakQuantity: number;
  stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK';
}

export interface PeakPeriodComparison {
  peakHoursRange: string;
  peakTransactions: number;
  offPeakTransactions: number;
  peakVolume: number;
  offPeakVolume: number;
  busiestHour: string;
  busiestBranchName: string;
}

export interface PeakAnalyticsOverview {
  hourlyDistribution: HourlyActivityMetric[];
  productDemand: ProductDemandMetric[];
  comparison: PeakPeriodComparison;
  totalTransactions: number;
  totalPurchaseVolume: number;
  totalRechargeVolume: number;
  busiestDay?: string;
}
