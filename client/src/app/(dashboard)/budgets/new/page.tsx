import { BudgetForm } from "@/components/dashboard/budgets/budget-form";

export const metadata = {
  title: "New Budget | Urban Furniture",
  description: "Create a new financial budget",
};

export default function NewBudgetPage() {
  return <BudgetForm />;
}
