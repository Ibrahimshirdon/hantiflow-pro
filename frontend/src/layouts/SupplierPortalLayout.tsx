import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { labelKey: "nav.dashboard", path: "/supplier/dashboard" },
  { labelKey: "nav.companies", path: "/supplier/companies" },
  { labelKey: "nav.supplierProducts", path: "/supplier/products" },
  { labelKey: "nav.categories", path: "/supplier/categories" },
  { labelKey: "nav.stockRequests", path: "/supplier/stock-requests" },
];

export function SupplierPortalLayout() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="" className="size-7 object-contain" />
            <span className="text-lg font-semibold">{t("appNameSupplier")}</span>
          </div>
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
