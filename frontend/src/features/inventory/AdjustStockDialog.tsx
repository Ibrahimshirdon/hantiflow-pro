import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createStockAdjustment } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import type { Batch } from "@/types/inventory.types";
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

interface AdjustStockDialogProps {
  productId: string;
  batches: Batch[];
}

const TYPE_OPTIONS = [
  { value: "damage", labelKey: "adjustStockDialog.types.damage" },
  { value: "loss", labelKey: "adjustStockDialog.types.loss" },
  { value: "correction", labelKey: "adjustStockDialog.types.correction" },
  { value: "recount", labelKey: "adjustStockDialog.types.recount" },
] as const;

export function AdjustStockDialog({ productId, batches }: AdjustStockDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>("damage");
  const [quantityChange, setQuantityChange] = useState(-1);
  const [reason, setReason] = useState("");

  const selectedBatch = batches.find((b) => b.id === batchId);

  const mutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: () => {
      toast.success(t("adjustStockDialog.toasts.adjusted"));
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["batches", productId] });
      queryClient.invalidateQueries({ queryKey: ["adjustments", productId] });
      setBatchId("");
      setQuantityChange(-1);
      setReason("");
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedBatch) {
      toast.error(t("adjustStockDialog.selectBatchError"));
      return;
    }
    mutation.mutate({
      productId,
      batchId,
      type,
      quantityChange,
      reason,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("adjustStockDialog.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("adjustStockDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batch">{t("adjustStockDialog.batch")}</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger id="batch" className="w-full">
                <SelectValue placeholder={t("adjustStockDialog.selectBatchPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {t("adjustStockDialog.batchOption", {
                      number: batch.batchNumber,
                      qty: batch.quantity,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">{t("adjustStockDialog.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantityChange">
              {t("adjustStockDialog.quantityChangeLabel")}
            </Label>
            <Input
              id="quantityChange"
              type="number"
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">{t("adjustStockDialog.reason")}</Label>
            <Input id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common:actions.saving") : t("adjustStockDialog.saveAdjustment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
