import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarRange, PackageCheck, XCircle, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listDeliveries, updateDeliveryStatus } from "@/api/delivery.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIVE_STATUSES = ["assigned", "picked_up", "in_transit"];

const STATUS_VARIANT = {
  unassigned: "warning",
  assigned: "info",
  picked_up: "info",
  in_transit: "info",
  delivered: "success",
  failed: "destructive",
} as const;

function msAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  purple: "bg-purple/10 text-purple",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3">
        {Icon && (
          <div className={`flex size-7 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="size-3.5" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const NEXT_STATUS: Record<string, "picked_up" | "in_transit" | "delivered"> = {
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

export function DriverActivePage() {
  const { t } = useTranslation(["driverPortal"]);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries", "mine"],
    queryFn: () => listDeliveries(),
  });
  const active = deliveries?.find((d) => ACTIVE_STATUSES.includes(d.status));

  const deliveredToday = useMemo(
    () =>
      (deliveries ?? []).filter(
        (d) => d.status === "delivered" && d.deliveredAt && d.deliveredAt._seconds * 1000 >= msAgo(1),
      ).length,
    [deliveries],
  );
  const deliveredThisWeek = useMemo(
    () =>
      (deliveries ?? []).filter(
        (d) => d.status === "delivered" && d.deliveredAt && d.deliveredAt._seconds * 1000 >= msAgo(7),
      ).length,
    [deliveries],
  );
  const deliveredThisMonth = useMemo(
    () =>
      (deliveries ?? []).filter(
        (d) => d.status === "delivered" && d.deliveredAt && d.deliveredAt._seconds * 1000 >= msAgo(30),
      ).length,
    [deliveries],
  );
  const failedThisMonth = useMemo(
    () =>
      (deliveries ?? []).filter((d) => d.status === "failed" && d.createdAt._seconds * 1000 >= msAgo(30))
        .length,
    [deliveries],
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["deliveries", "mine"] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ status, photo }: { status: "picked_up" | "in_transit" | "delivered" | "failed"; photo?: File }) =>
      updateDeliveryStatus(active!.id, status, undefined, photo),
    onSuccess: () => {
      toast.success(t("activePage.toasts.statusUpdated"));
      setPendingPhoto(null);
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("activePage.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">
          {t("activePage.greeting", { name: profile?.displayName })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("activePage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label={t("activePage.stats.deliveredToday")}
          value={String(deliveredToday)}
          icon={PackageCheck}
          tone="success"
        />
        <StatCard
          label={t("activePage.stats.deliveredThisWeek")}
          value={String(deliveredThisWeek)}
          icon={CalendarDays}
          tone="primary"
        />
        <StatCard
          label={t("activePage.stats.deliveredThisMonth")}
          value={String(deliveredThisMonth)}
          icon={CalendarRange}
          tone="purple"
        />
        <StatCard
          label={t("activePage.stats.failedLast30Days")}
          value={String(failedThisMonth)}
          icon={XCircle}
          tone="warning"
        />
      </div>

      {!active ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("activePage.noActiveDelivery.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("activePage.noActiveDelivery.body")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("activePage.activeDelivery.orderLabel", { orderNumber: active.orderNumber })}
              <Badge variant={STATUS_VARIANT[active.status]}>{t(`statuses.${active.status}`)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="text-sm">
              <p className="font-medium">{t("activePage.activeDelivery.dropoffLabel")}</p>
              <p className="text-muted-foreground">
                {active.dropoffAddress.line1}, {active.dropoffAddress.city}
              </p>
            </div>
            {active.notes && (
              <div className="text-sm">
                <p className="font-medium">{t("activePage.activeDelivery.notesLabel")}</p>
                <p className="text-muted-foreground">{active.notes}</p>
              </div>
            )}

            {active.status === "in_transit" && (
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPendingPhoto(e.target.files?.[0] ?? null)}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {pendingPhoto
                    ? t("activePage.activeDelivery.photoSelected", { fileName: pendingPhoto.name })
                    : t("activePage.activeDelivery.attachProof")}
                </Button>
              </div>
            )}

            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  status: NEXT_STATUS[active.status]!,
                  photo: pendingPhoto ?? undefined,
                })
              }
            >
              {statusMutation.isPending
                ? t("activePage.activeDelivery.updating")
                : t(`activePage.nextAction.${active.status}`)}
            </Button>
            <Button
              variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ status: "failed" })}
            >
              {t("activePage.activeDelivery.reportFailed")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
