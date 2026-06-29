import { NavLink, Outlet } from "react-router-dom";
import { History, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

const TABS = [
  { labelKey: "nav.active", path: "/driver/active", icon: Truck },
  { labelKey: "nav.history", path: "/driver/history", icon: History },
];

export function DriverLayout() {
  const { t } = useTranslation("common");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="size-6 object-contain" />
          <span className="font-semibold">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <nav className="flex shrink-0 border-t border-border">
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
