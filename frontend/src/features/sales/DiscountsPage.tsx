import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createDiscount, listDiscounts, updateDiscount, type DiscountInput } from "@/api/sales.api";
import { listCategories, listProducts } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const emptyForm: DiscountInput = {
  code: "",
  type: "percentage",
  value: 10,
  appliesTo: "all",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

export function DiscountsPage() {
  const { t } = useTranslation(["sales", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DiscountInput>(emptyForm);
  const [targetId, setTargetId] = useState("");

  const { data: discounts, isLoading } = useQuery({ queryKey: ["discounts"], queryFn: listDiscounts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });

  const createMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: () => {
      toast.success(t("discountsPage.toasts.created"));
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setForm(emptyForm);
      setTargetId("");
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateDiscount(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function set<K extends keyof DiscountInput>(key: K, value: DiscountInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const targetIds = form.appliesTo === "all" ? [] : targetId ? [targetId] : [];
    if (form.appliesTo !== "all" && targetIds.length === 0) {
      toast.error(t("discountsPage.toasts.selectTarget"));
      return;
    }
    createMutation.mutate({ ...form, targetIds });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("discountsPage.title")}</h1>
          <p className="text-muted-foreground">{t("discountsPage.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t("discountsPage.newDiscount")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("discountsPage.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">{t("discountsPage.fields.code")}</Label>
                <Input
                  id="code"
                  required
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type">{t("discountsPage.fields.type")}</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as DiscountInput["type"])}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("discountsPage.types.percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("discountsPage.types.fixed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="value">
                    {form.type === "percentage"
                      ? t("discountsPage.fields.valuePercentage")
                      : t("discountsPage.fields.valueAmount")}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min={0}
                    required
                    value={form.value}
                    onChange={(e) => set("value", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appliesTo">{t("discountsPage.fields.appliesTo")}</Label>
                <Select
                  value={form.appliesTo}
                  onValueChange={(v) => {
                    set("appliesTo", v as DiscountInput["appliesTo"]);
                    setTargetId("");
                  }}
                >
                  <SelectTrigger id="appliesTo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("discountsPage.appliesToOptions.all")}</SelectItem>
                    <SelectItem value="category">{t("discountsPage.appliesToOptions.category")}</SelectItem>
                    <SelectItem value="product">{t("discountsPage.appliesToOptions.product")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.appliesTo === "category" && (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("discountsPage.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.appliesTo === "product" && (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("discountsPage.selectProduct")} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="validFrom">{t("discountsPage.fields.validFrom")}</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    required
                    value={form.validFrom}
                    onChange={(e) => set("validFrom", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="validTo">{t("discountsPage.fields.validTo")}</Label>
                  <Input
                    id="validTo"
                    type="date"
                    required
                    value={form.validTo}
                    onChange={(e) => set("validTo", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="usageLimit">{t("discountsPage.fields.usageLimit")}</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min={1}
                  value={form.usageLimit ?? ""}
                  onChange={(e) => set("usageLimit", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? t("discountsPage.creating")
                    : t("discountsPage.createDiscount")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("discountsPage.fields.code")}</TableHead>
            <TableHead>{t("discountsPage.columns.value")}</TableHead>
            <TableHead>{t("discountsPage.fields.appliesTo")}</TableHead>
            <TableHead>{t("discountsPage.columns.used")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {discounts?.map((discount) => (
            <TableRow key={discount.id}>
              <TableCell className="font-medium">{discount.code}</TableCell>
              <TableCell>
                {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}
              </TableCell>
              <TableCell className="capitalize">{discount.appliesTo}</TableCell>
              <TableCell>
                {discount.usedCount}
                {discount.usageLimit ? ` / ${discount.usageLimit}` : ""}
              </TableCell>
              <TableCell>
                <Badge variant={discount.isActive ? "success" : "secondary"}>
                  {discount.isActive ? t("common:status.active") : t("common:status.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggleActiveMutation.isPending}
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: discount.id, isActive: !discount.isActive })
                  }
                >
                  {discount.isActive ? t("discountsPage.deactivate") : t("discountsPage.activate")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
