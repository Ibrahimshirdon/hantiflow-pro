
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Menu, PanelLeft, Truck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listDeliveries, listDeliveryIssues } from "@/api/delivery.api";
import { UserMenu } from "@/components/shared/UserMenu";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { AttendanceReminderDialog } from "@/components/shared/AttendanceReminderDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardNavSections } from "./nav-config";

export function DashboardLayout() {
  const { profile } = useAuth();
  const { t } = useTranslation("common");
  const canSeeDeliveryIssues = profile?.role === "admin" || profile?.role === "manager";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: openIssues } = useQuery({
    queryKey: ["deliveryIssues", "open"],
    queryFn: () => listDeliveryIssues("open"),
    enabled: canSeeDeliveryIssues,
    refetchInterval: 30_000,
  });
  const openIssueCount = openIssues?.length ?? 0;

  // Global new-delivery alert — polls from the layout so it fires on every page
  const canSeeDeliveries = ["admin", "manager", "staff"].includes(profile?.role ?? "");
  const { data: deliveries } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => listDeliveries(),
    enabled: canSeeDeliveries,
    refetchInterval: 20_000,
  });
  const knownDeliveryIdsRef = useRef<Set<string> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deliveryAlert, setDeliveryAlert] = useState<{ count: number } | null>(null);

  useEffect(() => {
    if (!deliveries) return;
    const currentIds = new Set(deliveries.map((d) => d.id));
    if (knownDeliveryIdsRef.current === null) {
      knownDeliveryIdsRef.current = currentIds;
      return;
    }
    const freshCount = deliveries.filter(
      (d) => !knownDeliveryIdsRef.current!.has(d.id) && d.status === "unassigned",
    ).length;
    if (freshCount > 0) {
      setDeliveryAlert({ count: freshCount });
      try {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        [0, 0.22].forEach((delay, i) => {
          const osc = ctx.createOscillator();
          osc.connect(gain);
          osc.type = "sine";
          osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.5);
        });
      } catch (_) { /* audio not supported */ }
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setDeliveryAlert(null), 8_000);
    }
    knownDeliveryIdsRef.current = currentIds;
  }, [deliveries]);

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const sections = dashboardNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(profile.role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-screen">
      <AttendanceReminderDialog />
      {/* Global new-delivery alert — visible on every page */}
      {deliveryAlert && (
        <div className="fixed inset-x-0 top-4 z-[100] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-2xl border-2 border-orange-400 bg-orange-50 px-5 py-4 shadow-2xl shadow-orange-300/40 animate-in slide-in-from-top-4 duration-300 dark:bg-orange-950/60 dark:border-orange-500">
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                <Truck className="size-6" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-orange-900 dark:text-orange-100 leading-tight">
                {t("newDeliveryAlert.title")}
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 leading-snug">
                {t("newDeliveryAlert.subtitle", { count: deliveryAlert.count })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 rounded-full text-orange-700 hover:bg-orange-200 dark:text-orange-300 dark:hover:bg-orange-800/50"
              onClick={() => {
                setDeliveryAlert(null);
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <nav
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 print:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          sidebarCollapsed
            ? "lg:static lg:w-0 lg:overflow-hidden lg:translate-x-0"
            : "lg:static lg:w-64 lg:translate-x-0",
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
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() => setSidebarCollapsed((c) => !c)}
          >
            <PanelLeft className="size-5" />
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
