import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { updateProduct, type ProductInput } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import type { Category, Product } from "@/types/inventory.types";
import type { TaxRate } from "@/types/sales.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toFormState(product: Product): ProductInput {
  return {
    sku: product.sku,
    barcode: product.barcode ?? "",
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId,
    unit: product.unit,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    taxRateId: product.taxRateId ?? undefined,
    reorderLevel: product.reorderLevel,
    maxStockLevel: product.maxStockLevel ?? undefined,
    trackBatches: product.trackBatches,
  };
}

export function EditProductDialog({
  product,
  categories,
  taxRates,
}: {
  product: Product;
  categories: Category[];
  taxRates: TaxRate[];
}) {
  const { t } = useTranslation(["inventory", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(() => toFormState(product));

  const mutation = useMutation({
    mutationFn: () => updateProduct(product.id, form),
    onSuccess: () => {
      toast.success(t("editProductDialog.toasts.updated"));
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (next) setForm(toFormState(product));
    setOpen(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.categoryId) {
      toast.error(t("editProductDialog.selectCategoryError"));
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("editProductDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editProductDialog.title", { name: product.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pe-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-sku">{t("editProductDialog.sku")}</Label>
              <Input id="edit-sku" required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-barcode">{t("editProductDialog.barcode")}</Label>
              <Input
                id="edit-barcode"
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">{t("common:fields.name")}</Label>
            <Input id="edit-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">{t("common:fields.description")}</Label>
            <Textarea
              id="edit-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-category">{t("editProductDialog.category")}</Label>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger id="edit-category" className="w-full">
                <SelectValue placeholder={t("editProductDialog.selectCategoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-unit">{t("editProductDialog.unit")}</Label>
              <Input id="edit-unit" required value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-costPrice">{t("editProductDialog.costPrice")}</Label>
              <Input
                id="edit-costPrice"
                type="number"
                step="0.01"
                min={0}
                required
                value={form.costPrice}
                onChange={(e) => set("costPrice", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-sellingPrice">{t("editProductDialog.sellingPrice")}</Label>
              <Input
                id="edit-sellingPrice"
                type="number"
                step="0.01"
                min={0}
                required
                value={form.sellingPrice}
                onChange={(e) => set("sellingPrice", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-taxRateId">{t("editProductDialog.taxRate")}</Label>
            <Select
              value={form.taxRateId ?? "none"}
              onValueChange={(v) => set("taxRateId", v === "none" ? null : v)}
            >
              <SelectTrigger id="edit-taxRateId" className="w-full">
                <SelectValue placeholder={t("editProductDialog.noTax")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("editProductDialog.noTax")}</SelectItem>
                {taxRates.map((rate) => (
                  <SelectItem key={rate.id} value={rate.id}>
                    {rate.name} ({(rate.rate * 100).toFixed(0)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-reorderLevel">{t("editProductDialog.reorderLevel")}</Label>
              <Input
                id="edit-reorderLevel"
                type="number"
                min={0}
                required
                className="w-32"
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-maxStockLevel">{t("editProductDialog.maxStockLevel")}</Label>
              <Input
                id="edit-maxStockLevel"
                type="number"
                min={0}
                className="w-32"
                value={form.maxStockLevel ?? ""}
                onChange={(e) =>
                  set("maxStockLevel", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="edit-trackBatches"
                checked={form.trackBatches}
                onCheckedChange={(checked) => set("trackBatches", checked === true)}
              />
              <Label htmlFor="edit-trackBatches">{t("editProductDialog.trackBatches")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common:actions.saving") : t("editProductDialog.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
