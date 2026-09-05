import { BudgetReportView } from "@/components/dashboard/reports/budget-report-view";

export const metadata = {
  title: "Budget Report | Urban Furniture",
  description: "Planned budget vs actual achieved expenditure and income",
};

export default function BudgetReportPage() {
  return <BudgetReportView />;
}
