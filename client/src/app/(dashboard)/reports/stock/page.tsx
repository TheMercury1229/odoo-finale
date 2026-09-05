import { StockReportView } from "@/components/dashboard/reports/stock-report-view";

export const metadata = {
  title: "Stock & Inventory Report | Urban Furniture",
  description: "Real-time stock on hand, units purchased vs sold, and inventory valuation",
};

export default function StockReportPage() {
  return <StockReportView />;
}
