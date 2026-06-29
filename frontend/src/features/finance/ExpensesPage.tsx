import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { deleteExpense, listExpenses } from "@/api/finance.api";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateExpenseDialog } from "./CreateExpenseDialog";

function monthAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function ExpensesPage() {
  const { t } = useTranslation(["finance", "common"]);
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", dateFrom, dateTo],
    queryFn: () => listExpenses({ dateFrom, dateTo }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      toast.success(t("expensesPage.toasts.expenseDeleted"));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("expensesPage.title")}</h1>
          <p className="text-muted-foreground">{t("expensesPage.subtitle")}</p>
        </div>
        <CreateExpenseDialog />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateFrom">{t("expensesPage.filters.from")}</Label>
          <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateTo">{t("expensesPage.filters.to")}</Label>
          <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Card className="ms-auto">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Receipt className="size-4.5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("expensesPage.columns.totalLabel")}</p>
              <p className="text-lg font-semibold">${total.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.date")}</TableHead>
            <TableHead>{t("expensesPage.columns.category")}</TableHead>
            <TableHead>{t("common:fields.description")}</TableHead>
            <TableHead>{t("expensesPage.columns.paidTo")}</TableHead>
            <TableHead>{t("expensesPage.columns.method")}</TableHead>
            <TableHead className="text-end">{t("common:fields.amount")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && expenses?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t("expensesPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {expenses?.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{new Date(expense.date._seconds * 1000).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{expense.category}</TableCell>
              <TableCell className="text-muted-foreground">{expense.description ?? "—"}</TableCell>
              <TableCell>{expense.paidTo ?? "—"}</TableCell>
              <TableCell className="capitalize">{expense.paymentMethod}</TableCell>
              <TableCell className="text-end">${expense.amount.toFixed(2)}</TableCell>
              <TableCell className="text-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(expense.id)}
                >
                  {t("common:actions.delete")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
