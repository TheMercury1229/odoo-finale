export type NavItem = {
  title: string;
  url: string;
  icon: string; // lucide-react icon name
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const dashboardNav: NavSection[] = [
  {
    title: "Master Data",
    items: [
      { title: "Contacts", url: "/contacts", icon: "Users" },
      { title: "Products", url: "/products", icon: "Package" },
      {
        title: "Chart of Accounts",
        url: "/chart-of-accounts",
        icon: "BookOpen",
      },
      {
        title: "Journals",
        url: "/journals",
        icon: "BookText",
      },
      {
        title: "Journal Entries",
        url: "/journal-entries",
        icon: "FileSpreadsheet",
      },
    ],
  },
  {
    title: "Purchases",
    items: [
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: "ShoppingCart",
      },
      { title: "Vendor Bills", url: "/vendor-bills", icon: "FileText" },
    ],
  },
  {
    title: "Sales",
    items: [
      { title: "Sales Orders", url: "/sales-orders", icon: "ClipboardList" },
      {
        title: "Customer Invoices",
        url: "/customer-invoices",
        icon: "Receipt",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      { title: "Balance Sheet", url: "/reports/balance-sheet", icon: "Scale" },
      {
        title: "Profit & Loss",
        url: "/reports/profit-loss",
        icon: "TrendingUp",
      },
    ],
  },
];

export const adminOnlyNav: NavSection = {
  title: "Settings",
  items: [{ title: "Users", url: "/settings/users", icon: "ShieldCheck" }],
};

export const portalNav: NavItem[] = [
  { title: "My Invoices", url: "/portal/invoices", icon: "Receipt" },
  { title: "My Bills", url: "/portal/bills", icon: "FileText" },
];
