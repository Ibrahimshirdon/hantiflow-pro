
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listDeliveryIssues } from "@/api/delivery.api";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardNavSections } from "./nav-config";

export function DashboardLayout() {
  const { profile } = useAuth();
  const { t } = useTranslation("common");
  const canSeeDeliveryIssues = profile?.role === "admin" || profile?.role === "manager";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: openIssues } = useQuery({
    queryKey: ["deliveryIssues", "open"],
    queryFn: () => listDeliveryIssues("open"),
    enabled: canSeeDeliveryIssues,
    refetchInterval: 30_000,
  });
  const openIssueCount = openIssues?.length ?? 0;

  if (!profile) return null;

  const sections = dashboardNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(profile.role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-screen">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <nav
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 print:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary-foreground p-1">
            <img src="/favicon.png" alt="" className="size-full object-contain" />
          </div>
          <span className="text-base font-semibold">{t("appName")}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ms-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section.sectionKey} className="mb-6">
              <p className="mb-2 px-2 text-xs font-medium tracking-wide text-sidebar-muted-foreground uppercase">
                {t(section.sectionKey)}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {t(item.labelKey)}
                    {item.path === "/app/delivery-issues" && openIssueCount > 0 && (
                      <Badge variant="destructive" className="ms-auto size-5 justify-center p-0">
                        {openIssueCount}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <UserMenu className="hover:bg-sidebar-accent">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile.displayName}</p>
              <p className="truncate text-xs text-sidebar-muted-foreground">{profile.email}</p>
            </div>
          </UserMenu>
        </div>
      </nav>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 sm:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
