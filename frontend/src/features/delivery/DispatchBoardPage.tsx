import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Truck, X } from "lucide-react";
import { assignDriver, listDeliveries } from "@/api/delivery.api";
import { listUsers } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function playChime() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    // Two ascending tones — "ding ding"
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
  } catch (_) {
    // AudioContext not supported — silent fail
  }
}

export function DispatchBoardPage() {
  const { t } = useTranslation(["delivery"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // New-delivery detection
  const knownIdsRef = useRef<Set<string> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!deliveries) return;
    const currentIds = new Set(deliveries.map((d) => d.id));
    if (knownIdsRef.current === null) {
      // First load — snapshot without alerting
      knownIdsRef.current = currentIds;
      return;
    }
    const fresh = deliveries.filter(
      (d) => !knownIdsRef.current!.has(d.id) && d.status === "unassigned",
    );
    if (fresh.length > 0) {
      setNewCount(fresh.length);
      setShowAlert(true);
      playChime();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setShowAlert(false), 8_000);
    }
    knownIdsRef.current = currentIds;
  }, [deliveries]);

  function dismissAlert() {
    setShowAlert(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }

  const driverName = (id: string | null) => drivers?.find((d) => d.uid === id)?.displayName ?? "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Incoming-delivery alert */}
      {showAlert && (
        <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-2xl border-2 border-orange-400 bg-orange-50 px-5 py-4 shadow-2xl shadow-orange-300/40 animate-in slide-in-from-top-4 duration-300 dark:bg-orange-950/60 dark:border-orange-500 dark:shadow-orange-900/30">
            {/* Pulsing ring + truck icon */}
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
                <Truck className="size-6" />
              </div>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-orange-900 dark:text-orange-100 leading-tight">
                {t("dispatchBoardPage.newDeliveryAlert.title")}
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 leading-snug">
                {t("dispatchBoardPage.newDeliveryAlert.subtitle", { count: newCount })}
              </p>
            </div>
            {/* Dismiss */}
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 rounded-full text-orange-700 hover:bg-orange-200 dark:text-orange-300 dark:hover:bg-orange-800/50"
              onClick={dismissAlert}
              aria-label={t("dispatchBoardPage.newDeliveryAlert.dismiss")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("dispatchBoardPage.title")}</h1>
          <p className="text-muted-foreground">{t("dispatchBoardPage.subtitle")}</p>
        </div>
        <CreateDeliveryDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dispatchBoardPage.table.orderNumber")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.dropoff")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.driver")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.status")}</TableHead>
            <TableHead className="text-end">{t("dispatchBoardPage.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("dispatchBoardPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && deliveries?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("dispatchBoardPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {deliveries?.map((delivery) => (
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
