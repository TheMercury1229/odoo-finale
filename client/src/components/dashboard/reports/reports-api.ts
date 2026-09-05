import api from "@/lib/axios";

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

export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = Math.abs(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (num < 0) {
    return `-Rs. ${formatted}`;
  }
  return `Rs. ${formatted}`;
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
