import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  Boxes,
  CalendarCheck,
  FileSpreadsheet,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Percent,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  UserCheck,
  UserSquare2,
  Users,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/types/auth.types";

export interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export interface NavSection {
  sectionKey: string;
  items: NavItem[];
}

export const dashboardNavSections: NavSection[] = [
  {
    sectionKey: "nav.sections.overview",
    items: [
      {
        labelKey: "nav.dashboard",
        path: "/app/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "manager", "staff"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.inventory",
    items: [
      {
        labelKey: "nav.products",
        path: "/app/inventory/products",
        icon: Boxes,
        roles: ["admin", "manager", "staff"],
      },
      {
        labelKey: "nav.categories",
        path: "/app/inventory/categories",
        icon: Tags,
        roles: ["admin", "manager", "staff"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.sales",
    items: [
      {
        labelKey: "nav.pos",
        path: "/app/sales/pos",
        icon: ShoppingCart,
        roles: ["admin", "manager", "staff"],
      },
      {
        labelKey: "nav.orders",
        path: "/app/sales/orders",
        icon: Receipt,
        roles: ["admin", "manager", "staff"],
      },
      {
        labelKey: "nav.discounts",
        path: "/app/sales/discounts",
        icon: Percent,
        roles: ["admin", "manager"],
      },
      {
        labelKey: "nav.taxRates",
        path: "/app/sales/tax-rates",
        icon: Percent,
        roles: ["admin"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.customers",
    items: [
      {
        labelKey: "nav.customers",
        path: "/app/customers",
        icon: UserSquare2,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.suppliers",
    items: [
      {
        labelKey: "nav.supplierStock",
        path: "/app/suppliers/stock",
        icon: Store,
        roles: ["admin", "manager", "staff"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.delivery",
    items: [
      {
        labelKey: "nav.dispatchBoard",
        path: "/app/delivery",
        icon: MapPin,
        roles: ["admin", "manager", "staff"],
      },
      {
        labelKey: "nav.deliveryIssues",
        path: "/app/delivery-issues",
        icon: AlertTriangle,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.finance",
    items: [
      {
        labelKey: "nav.expenses",
        path: "/app/finance/expenses",
        icon: Wallet,
        roles: ["admin", "manager"],
      },
      {
        labelKey: "nav.financeReports",
        path: "/app/finance/reports",
        icon: BarChart3,
        roles: ["admin", "manager"],
      },
      {
        labelKey: "nav.loans",
        path: "/app/finance/loans",
        icon: HandCoins,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.hr",
    items: [
      {
        labelKey: "nav.staffSalaries",
        path: "/app/hr/salaries",
        icon: Banknote,
        roles: ["admin", "manager"],
      },
      {
        labelKey: "nav.attendance",
        path: "/app/hr/attendance",
        icon: CalendarCheck,
        roles: ["admin", "manager"],
      },
      {
        labelKey: "nav.myAttendance",
        path: "/app/hr/my-attendance",
        icon: UserCheck,
        roles: ["staff"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.reports",
    items: [
      {
        labelKey: "nav.salesReport",
        path: "/app/reports/sales",
        icon: FileSpreadsheet,
        roles: ["admin", "manager", "staff"],
      },
      {
        labelKey: "nav.inventoryReport",
        path: "/app/reports/inventory",
        icon: FileSpreadsheet,
        roles: ["admin", "manager", "staff"],
      },
    ],
  },
  {
    sectionKey: "nav.sections.settings",
    items: [
      {
        labelKey: "nav.users",
        path: "/app/settings/users",
        icon: Users,
        roles: ["admin"],
      },
      {
        labelKey: "nav.auditLogs",
        path: "/app/settings/audit-logs",
        icon: ShieldCheck,
        roles: ["admin"],
      },
      {
        labelKey: "nav.activityLog",
        path: "/app/settings/activity-logs",
        icon: Activity,
        roles: ["admin"],
      },
      {
        labelKey: "nav.dangerZone",
        path: "/app/settings/danger-zone",
        icon: AlertTriangle,
        roles: ["admin"],
      },
    ],
  },
];
