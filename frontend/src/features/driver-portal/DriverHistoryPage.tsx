import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  PackageCheck,
  Percent,
  Search,
  Star,
  Timer,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { listDeliveries } from "@/api/delivery.api";
import type { Delivery } from "@/types/delivery.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DONE_STATUSES = ["delivered", "failed"];

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

function formatTs(ts: { _seconds: number } | null | undefined) {
  if (!ts) return "—";
  return new Date(ts._seconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(ts: { _seconds: number } | null | undefined) {
  if (!ts) return "—";
  return new Date(ts._seconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calcDuration(d: Delivery): string | null {
  if (!d.assignedAt || !d.deliveredAt) return null;
  const mins = Math.round((d.deliveredAt._seconds - d.assignedAt._seconds) / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3",
            n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export function DriverHistoryPage() {
  const { t } = useTranslation(["driverPortal"]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries", "mine"],
    queryFn: () => listDeliveries(),
  });

  const past = useMemo(
    () =>
      (deliveries ?? [])
        .filter((d) => DONE_STATUSES.includes(d.status))
        .sort((a, b) => b.createdAt._seconds - a.createdAt._seconds),
    [deliveries],
  );

  const filtered = useMemo(() => {
    return past.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (search && !d.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [past, search, statusFilter]);

  const totalDelivered = past.filter((d) => d.status === "delivered").length;
  const totalFailed = past.filter((d) => d.status === "failed").length;
  const successRate =
    totalDelivered + totalFailed > 0
      ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100)
      : 0;

  const avgDuration = useMemo(() => {
    const durations = past
      .filter((d) => d.status === "delivered" && d.assignedAt && d.deliveredAt)
      .map((d) => d.deliveredAt!._seconds - d.assignedAt!._seconds);
    if (durations.length === 0) return null;
    const avgMins = Math.round(durations.reduce((s, v) => s + v, 0) / durations.length / 60);
    return avgMins < 60 ? `${avgMins}m` : `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
  }, [past]);

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("historyPage.title")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label={t("historyPage.stats.totalDelivered")}
          value={String(totalDelivered)}
          icon={PackageCheck}
          tone="success"
        />
        <StatCard
          label={t("historyPage.stats.totalFailed")}
          value={String(totalFailed)}
          icon={XCircle}
          tone="warning"
        />
        <StatCard
          label={t("historyPage.stats.successRate")}
          value={`${successRate}%`}
          icon={Percent}
          tone="primary"
        />
        <StatCard
          label={t("historyPage.stats.avgDuration")}
          value={avgDuration ?? "—"}
          icon={Timer}
          tone="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder={t("historyPage.filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("historyPage.filters.all")}</SelectItem>
            <SelectItem value="delivered">{t("statuses.delivered")}</SelectItem>
            <SelectItem value="failed">{t("statuses.failed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delivery cards */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("historyPage.empty")}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((delivery) => {
          const isOpen = expanded === delivery.id;
          const duration = calcDuration(delivery);

          return (
            <div
              key={delivery.id}
              className="overflow-hidden rounded-xl border bg-card transition-colors"
            >
              {/* Card header — always visible */}
              <button
                type="button"
                className="flex w-full items-start gap-3 p-3 text-left"
                onClick={() => toggle(delivery.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{delivery.orderNumber}</span>
                    <Badge
                      variant={delivery.status === "delivered" ? "success" : "destructive"}
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {t(`statuses.${delivery.status}`)}
                    </Badge>
                    {delivery.rating !== null && (
                      <StarRating rating={delivery.rating} />
                    )}
                  </div>

                  {/* Customer */}
                  {delivery.customerName && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-3 shrink-0" />
                      <span className="font-medium text-foreground">{delivery.customerName}</span>
                    </div>
                  )}

                  {/* Pickup → Dropoff summary */}
                  <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 size-3 shrink-0" />
                    <span className="truncate">
                      {delivery.pickupAddress.city} → {delivery.dropoffAddress.city}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{formatDate(delivery.createdAt)}</span>
                    {duration && (
                      <span className="flex items-center gap-0.5">
                        <Timer className="size-3" />
                        {duration}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                )}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t px-3 pb-3 pt-2.5 flex flex-col gap-3">

                  {/* Addresses */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {t("historyPage.detail.pickup")}
                      </p>
                      <p className="text-xs font-medium">{delivery.pickupAddress.line1}</p>
                      <p className="text-xs text-muted-foreground">{delivery.pickupAddress.city}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {t("historyPage.detail.dropoff")}
                      </p>
                      <p className="text-xs font-medium">{delivery.dropoffAddress.line1}</p>
                      <p className="text-xs text-muted-foreground">{delivery.dropoffAddress.city}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("historyPage.detail.timeline")}
                    </p>
                    {[
                      { label: t("historyPage.detail.assigned"), ts: delivery.assignedAt },
                      { label: t("historyPage.detail.pickedUp"), ts: delivery.pickedUpAt },
                      { label: t("historyPage.detail.delivered"), ts: delivery.deliveredAt },
                    ].map(({ label, ts }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{formatTs(ts)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {delivery.notes && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
                      <p className="font-semibold text-muted-foreground mb-0.5">
                        {t("historyPage.detail.notes")}
                      </p>
                      <p>{delivery.notes}</p>
                    </div>
                  )}

                  {/* Proof of delivery photo */}
                  {delivery.proofOfDeliveryUrl && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                        {t("historyPage.detail.proofOfDelivery")}
                      </p>
                      <a href={delivery.proofOfDeliveryUrl} target="_blank" rel="noreferrer">
                        <img
                          src={delivery.proofOfDeliveryUrl}
                          alt="Proof of delivery"
                          className="h-36 w-full rounded-lg border object-cover"
                        />
                      </a>
                    </div>
                  )}

                  {/* Customer rating */}
                  {delivery.rating !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("historyPage.detail.customerRating")}</span>
                      <StarRating rating={delivery.rating} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
