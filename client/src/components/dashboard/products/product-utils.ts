import type { ProductType } from "@/components/dashboard/products/products-api";

export const productTypeLabels: Record<ProductType, string> = {
  goods: "Goods",
  service: "Service",
  combo: "Combo",
};

export function formatPrice(value: string | number) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}
