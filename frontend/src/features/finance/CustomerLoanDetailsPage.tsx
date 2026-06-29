import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  CalendarClock,
  CreditCard,
  PiggyBank,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { listLoans, listRepayments, recordRepayment, setLoanDueDate } from "@/api/loans.api";
import { listCustomers } from "@/api/customers.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { Loan } from "@/types/loan.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isOverdue(loan: Loan): boolean {
  return loan.status === "outstanding" && !!loan.dueDate && loan.dueDate._seconds * 1000 < Date.now();
}

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  purple: "bg-purple/10 text-purple",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {Icon && (
          <div className={`flex size-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
            <Icon className="size-4.5" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerLoanDetailsPage() {
  const { t } = useTranslation(["finance", "common"]);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const [repayTarget, setRepayTarget] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);
  const [repayMethod, setRepayMethod] = useState<"cash" | "card" | "mobile_money" | "wallet">("cash");
  const [dueDateTarget, setDueDateTarget] = useState<Loan | null>(null);
  const [dueDateValue, setDueDateValue] = useState("");

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ["loans", customerId],
    queryFn: () => listLoans({ customerId }),
    enabled: !!customerId,
  });
  const { data: repayments, isLoading: repaymentsLoading } = useQuery({
    queryKey: ["loanRepayments", customerId],
    queryFn: () => listRepayments({ customerId }),
    enabled: !!customerId,
  });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const customer = customers?.find((c) => c.uid === customerId);

  const totals = useMemo(() => {
    const list = loans ?? [];
    return {
      principal: round2(list.reduce((s, l) => s + l.principalAmount, 0)),
      repaid: round2(list.reduce((s, l) => s + l.amountRepaid, 0)),
      remaining: round2(list.reduce((s, l) => s + l.balanceRemaining, 0)),
      activeCount: list.filter((l) => l.status === "outstanding").length,
    };
  }, [loans]);

  const repayMutation = useMutation({
    mutationFn: () => recordRepayment(repayTarget!.id, repayAmount, repayMethod),
    onSuccess: () => {
      toast.success(t("customerLoanDetailsPage.toasts.repaymentRecorded"));
      queryClient.invalidateQueries({ queryKey: ["loans", customerId] });
      queryClient.invalidateQueries({ queryKey: ["loanRepayments", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setRepayTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openRepay(loan: Loan) {
    setRepayAmount(loan.balanceRemaining);
    setRepayMethod("cash");
    setRepayTarget(loan);
  }

  const dueDateMutation = useMutation({
    mutationFn: () => setLoanDueDate(dueDateTarget!.id, dueDateValue),
    onSuccess: () => {
      toast.success(t("customerLoanDetailsPage.toasts.dueDateUpdated"));
      queryClient.invalidateQueries({ queryKey: ["loans", customerId] });
      setDueDateTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openSetDueDate(loan: Loan) {
    setDueDateValue(loan.dueDate ? new Date(loan.dueDate._seconds * 1000).toISOString().slice(0, 10) : "");
    setDueDateTarget(loan);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("customerLoanDetailsPage.title", { name: customer?.displayName ?? t("customerLoanDetailsPage.defaultCustomerName") })}
          </h1>
          <p className="text-muted-foreground">{customer?.email}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/finance/loans")}>
          ← {t("customerLoanDetailsPage.backToLoans")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("customerLoanDetailsPage.stats.creditLimit")}
          value={`$${(customer?.creditLimit ?? 0).toFixed(2)}`}
          icon={CreditCard}
          tone="primary"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.outstandingBalance")}
          value={`$${(customer?.outstandingLoanBalance ?? 0).toFixed(2)}`}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.availableCredit")}
          value={`$${round2((customer?.creditLimit ?? 0) - (customer?.outstandingLoanBalance ?? 0)).toFixed(2)}`}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.walletBalance")}
          value={`$${(customer?.walletBalance ?? 0).toFixed(2)}`}
          icon={Wallet}
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("customerLoanDetailsPage.stats.totalLoanAmount")}
          value={`$${totals.principal.toFixed(2)}`}
          icon={Banknote}
          tone="primary"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.totalRepaid")}
          value={`$${totals.repaid.toFixed(2)}`}
          icon={PiggyBank}
          tone="success"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.remainingBalance")}
          value={`$${totals.remaining.toFixed(2)}`}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          label={t("customerLoanDetailsPage.stats.activeLoans")}
          value={String(totals.activeCount)}
          icon={CalendarClock}
          tone="purple"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("customerLoanDetailsPage.loansCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.orderNumber")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.principal")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.repaid")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.remaining")}</TableHead>
                <TableHead>{t("common:fields.status")}</TableHead>
                <TableHead>{t("common:fields.date")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.dueDate")}</TableHead>
                <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loansLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t("common:actions.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!loansLoading && loans?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t("customerLoanDetailsPage.loansCard.empty")}
                  </TableCell>
                </TableRow>
              )}
              {loans?.map((loan) => {
                const overdue = isOverdue(loan);
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.orderNumber}</TableCell>
                    <TableCell>${loan.principalAmount.toFixed(2)}</TableCell>
                    <TableCell>${loan.amountRepaid.toFixed(2)}</TableCell>
                    <TableCell>${loan.balanceRemaining.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          loan.status === "paid_off" ? "success" : overdue ? "destructive" : "warning"
                        }
                      >
                        {loan.status === "paid_off"
                          ? t("common:status.paidOff")
                          : overdue
                            ? t("common:status.overdue")
                            : t("common:status.outstanding")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(loan.createdAt._seconds * 1000).toLocaleDateString()}
                    </TableCell>
                    <TableCell className={overdue ? "text-destructive" : "text-muted-foreground"}>
                      {loan.dueDate ? new Date(loan.dueDate._seconds * 1000).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {profile?.role === "admin" && loan.status === "outstanding" && (
                          <Button size="sm" variant="ghost" onClick={() => openSetDueDate(loan)}>
                            {t("customerLoanDetailsPage.loansCard.setDueDate")}
                          </Button>
                        )}
                        {loan.status === "outstanding" && (
                          <Button size="sm" variant="outline" onClick={() => openRepay(loan)}>
                            {t("customerLoanDetailsPage.loansCard.recordRepayment")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("customerLoanDetailsPage.repaymentHistoryCard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:fields.date")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.loansCard.columns.orderNumber")}</TableHead>
                <TableHead>{t("common:fields.amount")}</TableHead>
                <TableHead>{t("customerLoanDetailsPage.repaymentHistoryCard.columns.method")}</TableHead>
                <TableHead>{t("common:fields.recordedBy")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repaymentsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("common:actions.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!repaymentsLoading && repayments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("customerLoanDetailsPage.repaymentHistoryCard.empty")}
                  </TableCell>
                </TableRow>
              )}
              {repayments?.map((r) => {
                const loan = loans?.find((l) => l.id === r.loanId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.createdAt._seconds * 1000).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{loan?.orderNumber ?? "—"}</TableCell>
                    <TableCell>${r.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{r.method.replace("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.recordedByName ?? t("customerLoanDetailsPage.repaymentHistoryCard.selfWallet")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={repayTarget !== null} onOpenChange={(next) => !next && setRepayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("customerLoanDetailsPage.repayDialog.title", { orderNumber: repayTarget?.orderNumber })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("customerLoanDetailsPage.repayDialog.remainingBalance", {
                amount: repayTarget?.balanceRemaining.toFixed(2),
              })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>{t("common:fields.amount")}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                max={repayTarget?.balanceRemaining}
                value={repayAmount}
                onChange={(e) => setRepayAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("customerLoanDetailsPage.repayDialog.method")}</Label>
              <Select value={repayMethod} onValueChange={(v) => setRepayMethod(v as typeof repayMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("customerLoanDetailsPage.paymentMethods.cash")}</SelectItem>
                  <SelectItem value="card">{t("customerLoanDetailsPage.paymentMethods.card")}</SelectItem>
                  <SelectItem value="mobile_money">
                    {t("customerLoanDetailsPage.paymentMethods.mobileMoney")}
                  </SelectItem>
                  <SelectItem value="wallet">{t("customerLoanDetailsPage.paymentMethods.wallet")}</SelectItem>
                </SelectContent>
              </Select>
              {repayMethod === "wallet" && (
                <p className="text-xs text-muted-foreground">
                  {t("customerLoanDetailsPage.repayDialog.customerWalletBalance", {
                    amount: (customer?.walletBalance ?? 0).toFixed(2),
                  })}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={repayMutation.isPending || repayAmount <= 0}
              onClick={() => repayMutation.mutate()}
            >
              {repayMutation.isPending
                ? t("common:actions.saving")
                : t("customerLoanDetailsPage.loansCard.recordRepayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dueDateTarget !== null} onOpenChange={(next) => !next && setDueDateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("customerLoanDetailsPage.dueDateDialog.title", { orderNumber: dueDateTarget?.orderNumber })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("customerLoanDetailsPage.loansCard.columns.dueDate")}</Label>
              <Input
                type="date"
                value={dueDateValue}
                onChange={(e) => setDueDateValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={dueDateMutation.isPending || !dueDateValue}
              onClick={() => dueDateMutation.mutate()}
            >
              {dueDateMutation.isPending
                ? t("common:actions.saving")
                : t("customerLoanDetailsPage.dueDateDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
