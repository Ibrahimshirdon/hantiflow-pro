import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative rounded-lg p-2 hover:bg-muted">
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -end-1 size-5 justify-center p-0">
            {unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          {t("notifications.title")}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications?.length === 0 && (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
        )}
        {notifications?.slice(0, 10).map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className="flex flex-col items-start gap-0.5 whitespace-normal"
            onClick={() => {
              if (!notification.isRead) markReadMutation.mutate(notification.id);
            }}
          >
            <span className={notification.isRead ? "text-sm" : "text-sm font-medium"}>
              {notification.title}
            </span>
            <span className="text-xs text-muted-foreground">{notification.message}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
