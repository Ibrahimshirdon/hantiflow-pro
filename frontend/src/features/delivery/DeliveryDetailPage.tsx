import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { assignDriver, getDelivery, getDeliveryHistory } from "@/api/delivery.api";
import { listUsers } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { StarRating } from "@/components/shared/StarRating";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_VARIANT = {
  unassigned: "warning",
  assigned: "info",
  picked_up: "info",
  in_transit: "info",
  delivered: "success",
  failed: "destructive",
} as const;

export function DeliveryDetailPage() {
  const { t } = useTranslation(["delivery"]);
  const { id } = useParams<{ id: string }>();
  const deliveryId = id!;
  const queryClient = useQueryClient();

  const { data: delivery } = useQuery({
    queryKey: ["delivery", deliveryId],
    queryFn: () => getDelivery(deliveryId),
  });
  const { data: history } = useQuery({
    queryKey: ["deliveryHistory", deliveryId],
    queryFn: () => getDeliveryHistory(deliveryId),
  });
  const { data: drivers } = useQuery({
    queryKey: ["users", "driver"],
    queryFn: () => listUsers("driver"),
  });

  const assignMutation = useMutation({
    mutationFn: (driverId: string) => assignDriver(deliveryId, driverId),
    onSuccess: () => {
      toast.success(t("deliveryDetailPage.toasts.driverAssigned"));
      queryClient.invalidateQueries({ queryKey: ["delivery", deliveryId] });
      queryClient.invalidateQueries({ queryKey: ["deliveryHistory", deliveryId] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!delivery) {
    return <p className="text-muted-foreground">{t("deliveryDetailPage.loading")}</p>;
  }

  const driverName =
    drivers?.find((d) => d.uid === delivery.driverId)?.displayName ??
    t("deliveryDetailPage.unassignedDriver");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("deliveryDetailPage.title", { orderNumber: delivery.orderNumber })}
          </h1>
          <p className="text-muted-foreground">
            {t("deliveryDetailPage.driverLabel", { driverName })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {delivery.status === "unassigned" && (
            <Select onValueChange={(driverId) => assignMutation.mutate(driverId)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("deliveryDetailPage.assignDriverPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {drivers?.map((d) => (
                  <SelectItem key={d.uid} value={d.uid}>
                    {d.displayName}
                  </SelectItem>
                ))}
                {drivers?.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t("deliveryDetailPage.noDriversAvailable")}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
          <Badge variant={STATUS_VARIANT[delivery.status]}>{t(`statuses.${delivery.status}`)}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("deliveryDetailPage.pickup.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {delivery.pickupAddress.label} — {delivery.pickupAddress.line1}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("deliveryDetailPage.dropoff.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {delivery.dropoffAddress.line1}, {delivery.dropoffAddress.city}
          </CardContent>
        </Card>
      </div>

      {delivery.proofOfDeliveryUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("deliveryDetailPage.proofOfDelivery.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={delivery.proofOfDeliveryUrl}
              alt={t("deliveryDetailPage.proofOfDelivery.alt")}
              className="max-h-64 rounded-md"
            />
          </CardContent>
        </Card>
      )}

      {delivery.status === "delivered" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("deliveryDetailPage.customerConfirmation.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            {delivery.customerConfirmedAt ? (
              <>
                <span className="text-muted-foreground">
                  {t("deliveryDetailPage.customerConfirmation.confirmedOn", {
                    date: new Date(delivery.customerConfirmedAt._seconds * 1000).toLocaleString(),
                  })}
                </span>
                <StarRating value={delivery.rating ?? 0} />
              </>
            ) : (
              <span className="text-muted-foreground">
                {t("deliveryDetailPage.customerConfirmation.notConfirmedYet")}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("deliveryDetailPage.statusTimeline.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {history?.map((event) => (
            <div key={event.id} className="flex items-start justify-between border-b border-border pb-2">
              <div>
                <p className="text-sm font-medium capitalize">{t(`statuses.${event.status}`)}</p>
                {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(event.createdAt._seconds * 1000).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
