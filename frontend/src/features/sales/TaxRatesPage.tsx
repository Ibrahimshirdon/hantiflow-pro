import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createTaxRate, listTaxRates, updateTaxRate } from "@/api/sales.api";
import { getApiErrorMessage } from "@/api/client";
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

export function TaxRatesPage() {
  const { t } = useTranslation(["sales", "common"]);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rate, setRate] = useState(0);
  const [isDefault, setIsDefault] = useState(false);

  const { data: taxRates, isLoading } = useQuery({ queryKey: ["taxRates"], queryFn: listTaxRates });

  const createMutation = useMutation({
    mutationFn: createTaxRate,
    onSuccess: () => {
      toast.success(t("taxRatesPage.toasts.created"));
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      setName("");
      setRate(0);
      setIsDefault(false);
      setOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => updateTaxRate(id, { isDefault: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taxRates"] }),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({ name, rate, isDefault });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("taxRatesPage.title")}</h1>
          <p className="text-muted-foreground">{t("taxRatesPage.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t("taxRatesPage.newTaxRate")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("taxRatesPage.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t("common:fields.name")}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rate">{t("taxRatesPage.fields.rate")}</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  required
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked === true)}
                />
                <Label htmlFor="isDefault">{t("taxRatesPage.setAsDefault")}</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("taxRatesPage.creating") : t("common:actions.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableCell className="text-end">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
