import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { labelKey: "nav.dashboard", path: "/portal/dashboard" },
  { labelKey: "nav.shop", path: "/portal/shop" },
  { labelKey: "nav.orders", path: "/portal/orders" },
  { labelKey: "nav.wallet", path: "/portal/wallet" },
];

export function PortalLayout() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="" className="size-7 object-contain" />
          <span className="text-lg font-semibold">{t("appName")}</span>
          <nav className="hidden items-center gap-4 sm:flex">
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
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>
      {open && (
        <nav className="flex flex-col border-b border-border bg-card px-4 pb-3 sm:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "py-2 text-sm font-medium",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      )}
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
