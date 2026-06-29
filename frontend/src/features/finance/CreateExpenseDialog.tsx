import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createExpense, type ExpenseInput } from "@/api/finance.api";
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

const emptyForm: ExpenseInput = {
  category: "",
  amount: 0,
  description: "",
  paidTo: "",
  paymentMethod: "cash",
  date: new Date().toISOString().slice(0, 10),
};

export function CreateExpenseDialog() {
  const { t } = useTranslation(["finance", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      toast.success(t("createExpenseDialog.toasts.expenseRecorded"));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setForm(emptyForm);
      setReceipt(null);
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function set<K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ ...form, receipt: receipt ?? undefined });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t("createExpenseDialog.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createExpenseDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">{t("createExpenseDialog.fields.category")}</Label>
              <Input
                id="category"
                required
                placeholder={t("createExpenseDialog.fields.categoryPlaceholder")}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">{t("common:fields.amount")}</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("common:fields.description")}</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paidTo">{t("createExpenseDialog.fields.paidTo")}</Label>
              <Input id="paidTo" value={form.paidTo} onChange={(e) => set("paidTo", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentMethod">{t("createExpenseDialog.fields.paymentMethod")}</Label>
              <Input
                id="paymentMethod"
                required
                value={form.paymentMethod}
                onChange={(e) => set("paymentMethod", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">{t("common:fields.date")}</Label>
            <Input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              {receipt
                ? t("createExpenseDialog.fields.receiptAttached", { name: receipt.name })
                : t("createExpenseDialog.fields.attachReceipt")}
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common:actions.saving") : t("createExpenseDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
