import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { createReturn } from "@/api/sales.api";
import { getApiErrorMessage } from "@/api/client";
import type { SalesOrder } from "@/types/sales.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  order: SalesOrder;
  alreadyReturnedQty: Map<string, number>;
}

export function ReturnOrderDialog({ order, alreadyReturnedQty }: Props) {
  const { t } = useTranslation(["sales", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const returnableItems = order.items.filter((item) => {
    const returned = alreadyReturnedQty.get(item.productId) ?? 0;
    return item.quantity - returned > 0;
  });

  function maxFor(productId: string) {
    const oi = order.items.find((i) => i.productId === productId)!;
    return oi.quantity - (alreadyReturnedQty.get(productId) ?? 0);
  }

  const selectedItems = returnableItems
    .map((item) => ({ item, qty: quantities[item.productId] ?? 0 }))
    .filter(({ qty }) => qty > 0);

  const refundPreview = selectedItems.reduce(
    (sum, { item, qty }) => sum + item.unitPrice * qty,
    0,
  );

  const mutation = useMutation({
    mutationFn: () =>
      createReturn(order.id, {
        reason,
        items: selectedItems.map(({ item, qty }) => ({
          productId: item.productId,
          batchId: item.batchId,
          quantity: qty,
        })),
      }),
    onSuccess: (result) => {
      toast.success(
        t("returnDialog.toasts.success", {
          amount: result.refundTotal.toFixed(2),
          method: result.refundMethod === "wallet"
            ? t("returnDialog.toasts.wallet")
            : t("returnDialog.toasts.cash"),
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["salesOrder", order.id] });
      queryClient.invalidateQueries({ queryKey: ["returns", order.id] });
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      setOpen(false);
      setReason("");
      setQuantities({});
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleOpen(o: boolean) {
    if (!o) {
      setReason("");
      setQuantities({});
    }
    setOpen(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="size-4" />
          {t("returnDialog.trigger")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("returnDialog.title", { orderNumber: order.orderNumber })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("returnDialog.product")}</TableHead>
                <TableHead className="text-center">{t("returnDialog.maxReturnable")}</TableHead>
                <TableHead className="w-28 text-center">{t("returnDialog.returnQty")}</TableHead>
                <TableHead className="text-end">{t("returnDialog.refund")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnableItems.map((item) => {
                const max = maxFor(item.productId);
                const qty = quantities[item.productId] ?? 0;
                return (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{max}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={max}
                        value={qty === 0 ? "" : qty}
                        placeholder="0"
                        className="w-20 text-center mx-auto"
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value) || 0, max);
                          setQuantities((prev) => ({ ...prev, [item.productId]: val }));
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-end text-sm">
                      {qty > 0 ? `$${(item.unitPrice * qty).toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {selectedItems.length > 0 && (
            <div className="flex justify-between rounded-lg bg-muted px-4 py-2 text-sm font-medium">
              <span>{t("returnDialog.estimatedRefund")}</span>
              <span className="text-emerald-600">${refundPreview.toFixed(2)}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-reason">{t("returnDialog.reasonLabel")}</Label>
            <Textarea
              id="return-reason"
              placeholder={t("returnDialog.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {order.paymentMethod === "wallet"
              ? t("returnDialog.refundHintWallet")
              : t("returnDialog.refundHintCash")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common:actions.cancel")}
          </Button>
          <Button
            disabled={
              selectedItems.length === 0 ||
              reason.trim().length < 3 ||
              mutation.isPending
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? t("returnDialog.processing")
              : t("returnDialog.confirm", { amount: refundPreview.toFixed(2) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
