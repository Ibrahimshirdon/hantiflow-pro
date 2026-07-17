import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { assignDriver, listDeliveries } from "@/api/delivery.api";
import { listUsers } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateDeliveryDialog } from "./CreateDeliveryDialog";

const STATUS_VARIANT = {
  unassigned: "warning",
  assigned: "info",
  picked_up: "info",
  in_transit: "info",
  delivered: "success",
  failed: "destructive",
} as const;

export function DispatchBoardPage() {
  const { t } = useTranslation(["delivery"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Shares the same queryKey as the global poll in DashboardLayout — no double fetch
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => listDeliveries(),
    refetchInterval: 20_000,
  });

  const { data: drivers } = useQuery({
    queryKey: ["users", "driver"],
    queryFn: () => listUsers("driver"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string }) => assignDriver(id, driverId),
    onSuccess: () => {
      toast.success(t("dispatchBoardPage.toasts.driverAssigned"));
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const driverName = (id: string | null) => drivers?.find((d) => d.uid === id)?.displayName ?? "—";

  const hasFilters = search || dateFrom || dateTo || driverFilter !== "all" || statusFilter !== "all";

  const filtered = useMemo(() => {
    if (!deliveries) return [];
    return deliveries.filter((d) => {
      if (search && !d.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (driverFilter !== "all" && d.driverId !== driverFilter) return false;
      if (dateFrom || dateTo) {
        const ts = new Date(d.createdAt._seconds * 1000);
        ts.setHours(0, 0, 0, 0);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (ts < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (ts > to) return false;
        }
      }
      return true;
    });
  }, [deliveries, search, statusFilter, driverFilter, dateFrom, dateTo]);

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setDriverFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("dispatchBoardPage.title")}</h1>
          <p className="text-muted-foreground">{t("dispatchBoardPage.subtitle")}</p>
        </div>
        <CreateDeliveryDialog />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder={t("dispatchBoardPage.filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <input
          type="date"
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title={t("dispatchBoardPage.filters.dateFrom")}
          placeholder={t("dispatchBoardPage.filters.dateFrom")}
        />
        <span className="text-xs text-muted-foreground">→</span>
        <input
          type="date"
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title={t("dispatchBoardPage.filters.dateTo")}
        />

        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("dispatchBoardPage.filters.allDrivers")}</SelectItem>
            {drivers?.map((d) => (
              <SelectItem key={d.uid} value={d.uid}>
                {d.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("dispatchBoardPage.filters.allStatuses")}</SelectItem>
            {["unassigned", "assigned", "picked_up", "in_transit", "delivered", "failed"].map((s) => (
              <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={clearFilters}>
            <X className="size-3" />
            {t("dispatchBoardPage.filters.clear")}
          </Button>
        )}

        <span className="ms-auto text-xs text-muted-foreground">
          {t("dispatchBoardPage.filters.resultCount", { count: filtered.length })}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dispatchBoardPage.table.orderNumber")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.dropoff")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.driver")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.status")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.date")}</TableHead>
            <TableHead className="text-end">{t("dispatchBoardPage.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("dispatchBoardPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {hasFilters ? t("dispatchBoardPage.filters.noResults") : t("dispatchBoardPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {filtered.map((delivery) => (
            <TableRow
              key={delivery.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/delivery/${delivery.id}`)}
            >
              <TableCell className="font-medium">{delivery.orderNumber}</TableCell>
              <TableCell>
                {delivery.dropoffAddress.line1}, {delivery.dropoffAddress.city}
              </TableCell>
              <TableCell>{driverName(delivery.driverId)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[delivery.status]}>
                  {t(`statuses.${delivery.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {new Date(delivery.createdAt._seconds * 1000).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                {delivery.status === "unassigned" && (
                  <Select
                    onValueChange={(driverId) => assignMutation.mutate({ id: delivery.id, driverId })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("dispatchBoardPage.assignDriverPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map((d) => (
                        <SelectItem key={d.uid} value={d.uid}>
                          {d.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
