import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { createTaxRate, deleteTaxRate, listTaxRates, updateTaxRate } from "@/api/sales.api";
import type { TaxRate } from "@/types/sales.types";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function TaxRateForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial?: { name: string; rate: number; isDefault: boolean };
  onSubmit: (values: { name: string; rate: number; isDefault: boolean }) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const { t } = useTranslation(["sales", "common"]);
  const [name, setName] = useState(initial?.name ?? "");
  const [rate, setRate] = useState(initial?.rate ?? 0);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, rate, isDefault });
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tr-name">{t("common:fields.name")}</Label>
        <Input id="tr-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tr-rate">{t("taxRatesPage.fields.rate")}</Label>
        <Input
          id="tr-rate"
          type="number"
          step="0.01"
          min={0}
          max={1}
          required
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          {t("taxRatesPage.fields.rateHint", { pct: (rate * 100).toFixed(0) })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="tr-default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked === true)}
        />
        <Label htmlFor="tr-default">{t("taxRatesPage.setAsDefault")}</Label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaxRatesPage() {
  const { t } = useTranslation(["sales", "common"]);
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxRate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxRate | null>(null);

  const { data: taxRates, isLoading } = useQuery({ queryKey: ["taxRates"], queryFn: listTaxRates });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["taxRates"] });

  const createMutation = useMutation({
    mutationFn: createTaxRate,
    onSuccess: () => {
      toast.success(t("taxRatesPage.toasts.created"));
      invalidate();
      setCreateOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name: string; rate: number; isDefault: boolean } }) =>
      updateTaxRate(id, values),
    onSuccess: () => {
      toast.success(t("taxRatesPage.toasts.updated"));
      invalidate();
      setEditTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => updateTaxRate(id, { isDefault: true }),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxRate(id),
    onSuccess: () => {
      toast.success(t("taxRatesPage.toasts.deleted"));
      invalidate();
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("taxRatesPage.title")}</h1>
          <p className="text-muted-foreground">{t("taxRatesPage.subtitle")}</p>
        </div>

        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>{t("taxRatesPage.newTaxRate")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("taxRatesPage.dialogTitle")}</DialogTitle>
              </DialogHeader>
              <TaxRateForm
                onSubmit={(values) => createMutation.mutate(values)}
                isPending={createMutation.isPending}
                submitLabel={createMutation.isPending ? t("taxRatesPage.creating") : t("common:actions.create")}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("taxRatesPage.columns.rate")}</TableHead>
            <TableHead>{t("taxRatesPage.columns.default")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {taxRates?.map((taxRate) => (
            <TableRow key={taxRate.id}>
              <TableCell className="font-medium">{taxRate.name}</TableCell>
              <TableCell>{(taxRate.rate * 100).toFixed(0)}%</TableCell>
              <TableCell>
                {taxRate.isDefault && <Badge variant="info">{t("taxRatesPage.default")}</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {!taxRate.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setDefaultMutation.isPending}
                      onClick={() => setDefaultMutation.mutate(taxRate.id)}
                    >
                      {t("taxRatesPage.setAsDefault")}
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditTarget(taxRate)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(taxRate)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("taxRatesPage.editDialogTitle")}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <TaxRateForm
              key={editTarget.id}
              initial={{ name: editTarget.name, rate: editTarget.rate, isDefault: editTarget.isDefault }}
              onSubmit={(values) => editMutation.mutate({ id: editTarget.id, values })}
              isPending={editMutation.isPending}
              submitLabel={editMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("taxRatesPage.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("taxRatesPage.deleteDescription", { name: deleteTarget?.name })}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common:actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
