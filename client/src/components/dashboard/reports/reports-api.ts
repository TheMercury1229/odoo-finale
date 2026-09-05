import api from "@/lib/axios";
export { formatCurrency } from "@/lib/utils";

export interface ReportAccountLine {
  accountId: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheetResponse {
  asOf: string;
  assets: ReportAccountLine[];
  totalAssets: number;
  liabilities: ReportAccountLine[];
  totalLiabilities: number;
  capital: ReportAccountLine[];
  totalCapital: number;
  totalLiabilitiesAndCapital: number;
}

export interface ProfitLossResponse {
  from: string;
  to: string;
  income: ReportAccountLine[];
  totalIncome: number;
  expenses: ReportAccountLine[];
  totalExpenses: number;
  netProfit: number;
}

export async function fetchBalanceSheet(params?: { asOf?: string }) {
  const { data } = await api.get<BalanceSheetResponse>(
    "/api/reports/balance-sheet",
    {
      params: {
        asOf: params?.asOf || undefined,
      },
    },
  );
  return data;
}

export async function fetchProfitLoss(params?: { from?: string; to?: string }) {
  const { data } = await api.get<ProfitLossResponse>(
    "/api/reports/profit-loss",
    {
      params: {
        from: params?.from || undefined,
        to: params?.to || undefined,
      },
    },
  );
  return data;
}

export interface BudgetReportItem {
  budgetId: string;
  budgetName: string;
  analyticAccountName: string;
  periodStart: string;
  periodEnd: string;
  responsiblePersonName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  percentUsed: number;
}

export async function fetchBudgetReport(params?: {
  asOf?: string;
}): Promise<BudgetReportItem[]> {
  const { data } = await api.get<BudgetReportItem[]>("/api/reports/budget", {
    params: {
      asOf: params?.asOf || undefined,
    },
  });
  return data || [];
}

export interface StockReportItem {
  id: string;
  name: string;
  category: string;
  type: string;
  costPrice: number;
  salesPrice: number;
  purchasedQty: number;
  soldQty: number;
  currentStock: number;
  valuation: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

export interface StockReportResponse {
  products: StockReportItem[];
  totalItems: number;
  totalStockUnits: number;
  totalValuation: number;
}

export async function fetchStockReport(): Promise<StockReportResponse> {
  const { data } = await api.get<StockReportResponse>("/api/reports/stock");
  return data;
}
