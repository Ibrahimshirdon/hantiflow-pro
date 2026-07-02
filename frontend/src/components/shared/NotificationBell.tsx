import {
  Bell,
  BellOff,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications.api";
import type { Notification } from "@/types/customer.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function relativeTime(seconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(seconds * 1000).toLocaleDateString();
}

const TYPE_CONFIG: Record<
  Notification["type"],
  { icon: React.ElementType; bg: string; iconCls: string }
> = {
  order:    { icon: ShoppingCart, bg: "bg-blue-500/10",   iconCls: "text-blue-500" },
  delivery: { icon: Truck,        bg: "bg-emerald-500/10", iconCls: "text-emerald-500" },
  stock:    { icon: Package,      bg: "bg-amber-500/10",  iconCls: "text-amber-500" },
  wallet:   { icon: Wallet,       bg: "bg-violet-500/10", iconCls: "text-violet-500" },
  system:   { icon: Settings,     bg: "bg-muted",         iconCls: "text-muted-foreground" },
};

export function NotificationBell() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["myNotifications"],
    queryFn: listMyNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myNotifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myNotifications"] }),
  });

  const visible = notifications?.slice(0, 10) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <span className="font-semibold">{t("notifications.title")}</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllReadMutation.mutate();
              }}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <BellOff className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{t("notifications.empty")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("notifications.emptySubtitle")}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60 ${
                      !n.isRead ? "bg-primary/[0.03]" : ""
                    }`}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id);
                    }}
                  >
                    {/* Type icon */}
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}
                    >
                      <Icon className={`size-4 ${cfg.iconCls}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${
                            n.isRead ? "text-foreground" : "font-semibold text-foreground"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(n.createdAt._seconds)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {(notifications?.length ?? 0) > 10 && (
          <div className="border-t bg-muted/40 px-4 py-2.5 text-center">
            <span className="text-xs text-muted-foreground">
              {t("notifications.andMore", { count: (notifications?.length ?? 0) - 10 })}
            </span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
