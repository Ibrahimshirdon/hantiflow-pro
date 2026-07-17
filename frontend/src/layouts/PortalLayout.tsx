import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Receipt, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

const TABS = [
  { labelKey: "nav.dashboard", path: "/portal/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.orders",    path: "/portal/orders",    icon: Receipt },
  { labelKey: "nav.wallet",    path: "/portal/wallet",    icon: Wallet },
];

export function PortalLayout() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — full width on all screens */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="" className="size-6 object-contain" />
          <span className="font-semibold">{t("appName")}</span>

          {/* Desktop nav — inline in header */}
          <nav className="ms-4 hidden items-center gap-0.5 md:flex">
            {TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <tab.icon className="size-4" />
                {t(tab.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Mobile-only bottom tab bar */}
      <nav className="flex shrink-0 border-t border-border md:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <tab.icon className="size-5" />
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
