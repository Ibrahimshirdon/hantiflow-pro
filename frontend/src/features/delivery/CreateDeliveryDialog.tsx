import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createDelivery } from "@/api/delivery.api";
import { listSalesOrders } from "@/api/sales.api";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateDeliveryDialog() {
  const { t } = useTranslation(["delivery"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [salesOrderId, setSalesOrderId] = useState("");
  const [pickupLine1, setPickupLine1] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["salesOrders", "withCustomer"],
    queryFn: () => listSalesOrders(),
  });
  const deliverableOrders = orders?.filter((o) => o.customerId) ?? [];

  const mutation = useMutation({
    mutationFn: createDelivery,
    onSuccess: () => {
      toast.success(t("createDeliveryDialog.toasts.deliveryCreated"));
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      setSalesOrderId("");
      setPickupLine1("");
      setPickupCity("");
      setLine1("");
      setCity("");
      setNotes("");
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!salesOrderId) {
      toast.error(t("createDeliveryDialog.toasts.selectOrder"));
      return;
    }
    mutation.mutate({
      salesOrderId,
      pickupAddress: {
        label: t("createDeliveryDialog.defaultPickupLabel"),
        line1: pickupLine1,
        city: pickupCity,
      },
      dropoffAddress: { label: t("createDeliveryDialog.defaultDropoffLabel"), line1, city },
      notes: notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t("createDeliveryDialog.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDeliveryDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="order">{t("createDeliveryDialog.salesOrder.label")}</Label>
            <Select value={salesOrderId} onValueChange={setSalesOrderId}>
              <SelectTrigger id="order" className="w-full">
                <SelectValue placeholder={t("createDeliveryDialog.salesOrder.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {deliverableOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.orderNumber} · {order.customerName ?? order.customerId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("createDeliveryDialog.pickupAddress.sectionLabel")}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pickupLine1">{t("createDeliveryDialog.pickupAddress.addressLabel")}</Label>
            <Input
              id="pickupLine1"
              required
              value={pickupLine1}
              onChange={(e) => setPickupLine1(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pickupCity">{t("createDeliveryDialog.pickupAddress.cityLabel")}</Label>
            <Input
              id="pickupCity"
              required
              value={pickupCity}
              onChange={(e) => setPickupCity(e.target.value)}
            />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("createDeliveryDialog.dropoffAddress.sectionLabel")}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="line1">{t("createDeliveryDialog.dropoffAddress.addressLabel")}</Label>
            <Input id="line1" required value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">{t("createDeliveryDialog.dropoffAddress.cityLabel")}</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("createDeliveryDialog.notes.label")}</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("createDeliveryDialog.creating") : t("createDeliveryDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
