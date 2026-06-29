import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CalendarCheck,
  CreditCard,
  PiggyBank,
  ShoppingBag,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getMyWallet, listMyOrders } from "@/api/customer.api";
import { listLoans, repayLoanFromWallet } from "@/api/loans.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { CustomerProfile } from "@/types/auth.types";
import type { Loan } from "@/types/loan.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isOverdue(loan: Loan): boolean {
  return loan.status === "outstanding" && !!loan.dueDate && loan.dueDate._seconds * 1000 < Date.now();
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
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

const STATUS_VARIANT = {
  pending: "warning",
  completed: "success",
  cancelled: "destructive",
} as const;

export function CustomerDashboardPage() {
  const { t } = useTranslation(["customerPortal"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const customerProfile = profile?.profile as CustomerProfile | null;
  const loyaltyPoints = customerProfile?.loyaltyPoints ?? 0;
  const creditLimit = customerProfile?.creditLimit ?? 0;
  const outstandingLoanBalance = customerProfile?.outstandingLoanBalance ?? 0;
  const [repayTarget, setRepayTarget] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);

  const { data: wallet } = useQuery({ queryKey: ["myWallet"], queryFn: getMyWallet });
  const { data: orders } = useQuery({ queryKey: ["myOrders"], queryFn: listMyOrders });
  const { data: loans } = useQuery({ queryKey: ["loans", "mine"], queryFn: () => listLoans() });

  const outstandingLoans = useMemo(() => (loans ?? []).filter((l) => l.status === "outstanding"), [loans]);

  const repayMutation = useMutation({
    mutationFn: () => repayLoanFromWallet(repayTarget!.id, repayAmount),
    onSuccess: () => {
      toast.success(t("dashboardPage.toasts.loanRepaid"));
      setRepayTarget(null);
      queryClient.invalidateQueries({ queryKey: ["loans", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openRepay(loan: Loan) {
    setRepayAmount(loan.balanceRemaining);
    setRepayTarget(loan);
  }

  const activeOrders = useMemo(() => (orders ?? []).filter((o) => o.status === "pending"), [orders]);
  const completedOrders = useMemo(
    () => (orders ?? []).filter((o) => o.status === "completed"),
    [orders],
  );
  const totalSpent = useMemo(
    () =>
      round2(
        (orders ?? [])
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + o.grandTotal, 0),
      ),
    [orders],
  );

  const spendingTrend = useMemo(() => {
    const byDate = new Map<string, number>();
    (orders ?? [])
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const key = new Date(o.createdAt._seconds * 1000).toISOString().slice(0, 10);
        byDate.set(key, round2((byDate.get(key) ?? 0) + o.grandTotal));
      });
    const days: { date: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = isoDaysAgo(i);
      days.push({ date: key, total: byDate.get(key) ?? 0 });
    }
    return days;
  }, [orders]);

  const recentOrders = (orders ?? []).slice(0, 6);
  const recentTransactions = (wallet?.transactions ?? []).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("dashboardPage.welcomeBack", { name: profile?.displayName })}
        </h1>
        <p className="text-muted-foreground">{t("dashboardPage.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label={t("dashboardPage.stats.walletBalance")}
          value={`$${(wallet?.walletBalance ?? 0).toFixed(2)}`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label={t("dashboardPage.stats.loyaltyPoints")}
          value={String(loyaltyPoints)}
          icon={Star}
          tone="purple"
        />
        <StatCard
          label={t("dashboardPage.stats.activeOrders")}
          value={String(activeOrders.length)}
          icon={ShoppingBag}
          tone="warning"
        />
        <StatCard
          label={t("dashboardPage.stats.completedOrders")}
          value={String(completedOrders.length)}
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard
          label={t("dashboardPage.stats.totalSpent")}
          value={`$${totalSpent.toFixed(2)}`}
          icon={PiggyBank}
          tone="primary"
        />
      </div>

      {creditLimit > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard
            label={t("dashboardPage.stats.creditLimit")}
            value={`$${creditLimit.toFixed(2)}`}
            icon={CreditCard}
            tone="primary"
          />
          <StatCard
            label={t("dashboardPage.stats.outstandingLoan")}
            value={`$${outstandingLoanBalance.toFixed(2)}`}
            icon={CreditCard}
            tone="warning"
          />
          <StatCard
            label={t("dashboardPage.stats.availableCredit")}
            value={`$${round2(creditLimit - outstandingLoanBalance).toFixed(2)}`}
            icon={PiggyBank}
            tone="success"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboardPage.spendingChart.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--color-primary)" name={t("dashboardPage.spendingChart.seriesName")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("dashboardPage.recentOrders.title")}
              <Link to="/portal/orders" className="text-xs font-normal text-primary hover:underline">
                {t("dashboardPage.recentOrders.viewAll")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboardPage.recentOrders.columnOrderNumber")}</TableHead>
                  <TableHead>{t("dashboardPage.recentOrders.columnTotal")}</TableHead>
                  <TableHead>{t("dashboardPage.recentOrders.columnStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {t("dashboardPage.recentOrders.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/portal/orders/${order.id}`)}
                    >
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>${order.grandTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("dashboardPage.recentWalletActivity.title")}
              <Link to="/portal/wallet" className="text-xs font-normal text-primary hover:underline">
                {t("dashboardPage.recentWalletActivity.viewAll")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboardPage.recentWalletActivity.columnReason")}</TableHead>
                  <TableHead className="text-end">
                    {t("dashboardPage.recentWalletActivity.columnAmount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      {t("dashboardPage.recentWalletActivity.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="capitalize">{tx.reason.replace("_", " ")}</TableCell>
                      <TableCell
                        className={
                          tx.type === "credit"
                            ? "text-end text-success"
                            : "text-end text-destructive"
                        }
                      >
                        {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {outstandingLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboardPage.loans.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboardPage.loans.columnOrderNumber")}</TableHead>
                  <TableHead>{t("dashboardPage.loans.columnPrincipal")}</TableHead>
                  <TableHead>{t("dashboardPage.loans.columnRemaining")}</TableHead>
                  <TableHead>{t("dashboardPage.loans.columnDueDate")}</TableHead>
                  <TableHead className="text-end">{t("dashboardPage.loans.columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingLoans.map((loan) => {
                  const overdue = isOverdue(loan);
                  return (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.orderNumber}</TableCell>
                      <TableCell>${loan.principalAmount.toFixed(2)}</TableCell>
                      <TableCell>${loan.balanceRemaining.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                          {loan.dueDate
                            ? new Date(loan.dueDate._seconds * 1000).toLocaleDateString()
                            : t("dashboardPage.loans.noDueDate")}
                        </span>
                        {overdue && (
                          <Badge variant="destructive" className="ms-2">
                            {t("dashboardPage.loans.overdueBadge")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="outline" onClick={() => openRepay(loan)}>
                          {t("dashboardPage.loans.repayFromWallet")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <p className="text-sm text-muted-foreground">{t("dashboardPage.promo.readyToOrder")}</p>
          <Link to="/portal/shop" className="text-sm font-medium text-primary hover:underline">
            {t("dashboardPage.promo.goToShop")}
          </Link>
        </CardContent>
      </Card>

      <Dialog open={repayTarget !== null} onOpenChange={(next) => !next && setRepayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("dashboardPage.repayDialog.title", { orderNumber: repayTarget?.orderNumber })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("dashboardPage.repayDialog.balanceSummary", {
                remaining: `$${repayTarget?.balanceRemaining.toFixed(2)}`,
                walletBalance: `$${(wallet?.walletBalance ?? 0).toFixed(2)}`,
              })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dashboardPage.repayDialog.amountLabel")}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                max={repayTarget?.balanceRemaining}
                value={repayAmount}
                onChange={(e) => setRepayAmount(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={repayMutation.isPending || repayAmount <= 0}
              onClick={() => repayMutation.mutate()}
            >
              {repayMutation.isPending
                ? t("dashboardPage.repayDialog.paying")
                : t("dashboardPage.repayDialog.repay")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
