import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  CreditCard,
  Mail,
  Phone,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  adjustCustomerLoyalty,
  adjustCustomerWallet,
  listCustomers,
  setCustomerCreditLimit,
  setCustomerStatus,
} from "@/api/customers.api";
import { getApiErrorMessage } from "@/api/client";
import type { CustomerSummary } from "@/types/customer.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "primary" | "warning" | "destructive";
}

function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
  const iconCls = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomersPage() {
  const { t } = useTranslation(["customers", "common"]);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // sub-dialogs
  const [walletTarget, setWalletTarget] = useState<CustomerSummary | null>(null);
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [walletAmount, setWalletAmount] = useState(0);
  const [walletReason, setWalletReason] = useState("");

  const [loyaltyTarget, setLoyaltyTarget] = useState<CustomerSummary | null>(null);
  const [loyaltyPointsChange, setLoyaltyPointsChange] = useState(0);
  const [loyaltyReason, setLoyaltyReason] = useState("");

  const [creditTarget, setCreditTarget] = useState<CustomerSummary | null>(null);
  const [creditLimitValue, setCreditLimitValue] = useState(0);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });

  // keep selectedCustomer in sync after any mutation refreshes the list
  useEffect(() => {
    if (!selectedCustomer || !customers) return;
    const updated = customers.find((c) => c.uid === selectedCustomer.uid);
    if (updated) setSelectedCustomer(updated);
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusMutation = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: "active" | "suspended" }) =>
      setCustomerStatus(uid, status),
    onSuccess: () => {
      toast.success(t("toasts.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const walletMutation = useMutation({
    mutationFn: () =>
      adjustCustomerWallet(walletTarget!.uid, { type: walletType, amount: walletAmount, reason: walletReason }),
    onSuccess: () => {
      toast.success(t("toasts.walletAdjusted"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setWalletTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const loyaltyMutation = useMutation({
    mutationFn: () =>
      adjustCustomerLoyalty(loyaltyTarget!.uid, { pointsChange: loyaltyPointsChange, reason: loyaltyReason }),
    onSuccess: () => {
      toast.success(t("toasts.loyaltyAdjusted"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setLoyaltyTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const creditMutation = useMutation({
    mutationFn: () => setCustomerCreditLimit(creditTarget!.uid, creditLimitValue),
    onSuccess: () => {
      toast.success(t("toasts.creditLimitUpdated"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCreditTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function openWalletAdjust(customer: CustomerSummary) {
    setWalletType("credit");
    setWalletAmount(0);
    setWalletReason("");
    setWalletTarget(customer);
  }

  function openLoyaltyAdjust(customer: CustomerSummary) {
    setLoyaltyPointsChange(0);
    setLoyaltyReason("");
    setLoyaltyTarget(customer);
  }

  function openCreditAdjust(customer: CustomerSummary) {
    setCreditLimitValue(customer.creditLimit);
    setCreditTarget(customer);
  }

  const filtered = customers?.filter(
    (c) =>
      !search ||
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search),
  );

  const totalWallet = customers?.reduce((s, c) => s + c.walletBalance, 0) ?? 0;
  const totalLoans = customers?.reduce((s, c) => s + c.outstandingLoanBalance, 0) ?? 0;
  const activeCount = customers?.filter((c) => c.status === "active").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="mt-0.5 text-muted-foreground">{t("page.subtitle")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("page.totalCustomers")} value={String(customers?.length ?? "—")} icon={Users} />
        <StatCard label={t("page.activeCustomers")} value={String(activeCount)} icon={UserCheck} tone="success" />
        <StatCard label={t("page.totalWallet")} value={`$${totalWallet.toFixed(2)}`} icon={Wallet} tone="primary" />
        <StatCard
          label={t("page.outstandingLoans")}
          value={`$${totalLoans.toFixed(2)}`}
          icon={TrendingUp}
          tone={totalLoans > 0 ? "warning" : "default"}
        />
      </div>

      {/* Search */}
      <Input
        placeholder={t("page.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{t("common:fields.name")}</TableHead>
              <TableHead>{t("common:fields.email")}</TableHead>
              <TableHead>{t("common:fields.phone")}</TableHead>
              <TableHead>{t("page.wallet")}</TableHead>
              <TableHead>{t("page.loyaltyPoints")}</TableHead>
              <TableHead>{t("page.creditLimit")}</TableHead>
              <TableHead>{t("page.outstandingLoan")}</TableHead>
              <TableHead>{t("common:fields.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {t("common:actions.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {search ? t("common:actions.noResults") : t("page.empty")}
                </TableCell>
              </TableRow>
            )}
            {filtered?.map((customer) => (
              <TableRow
                key={customer.uid}
                className="cursor-pointer hover:bg-primary/5"
                onClick={() => setSelectedCustomer(customer)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">{initials(customer.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary underline-offset-2 hover:underline">
                        {customer.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.addressCount} {t("page.addresses")}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                <TableCell className="font-medium">${customer.walletBalance.toFixed(2)}</TableCell>
                <TableCell>{customer.loyaltyPoints}</TableCell>
                <TableCell className="text-muted-foreground">${customer.creditLimit.toFixed(2)}</TableCell>
                <TableCell>
                  {customer.outstandingLoanBalance > 0 ? (
                    <Badge variant="destructive">${customer.outstandingLoanBalance.toFixed(2)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">$0.00</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={customer.status === "active" ? "success" : "destructive"}>
                    {customer.status === "active" ? t("common:status.active") : t("page.suspended")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <ChevronRight className="size-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Customer profile dialog ── */}
      <Dialog open={selectedCustomer !== null} onOpenChange={(next) => !next && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">{selectedCustomer.displayName}</DialogTitle>
              </DialogHeader>

              {/* Profile header */}
              <div className="flex flex-col items-center gap-3 pb-4 pt-2">
                <Avatar className="size-20 ring-4 ring-border ring-offset-2 ring-offset-background">
                  <AvatarFallback className="text-2xl font-bold">
                    {initials(selectedCustomer.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{selectedCustomer.displayName}</h2>
                  <div className="mt-1 flex flex-col items-center gap-0.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5" /> {selectedCustomer.email}
                    </span>
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5" /> {selectedCustomer.phone}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={selectedCustomer.status === "active" ? "success" : "destructive"}
                    className="mt-2"
                  >
                    {selectedCustomer.status === "active" ? t("common:status.active") : t("page.suspended")}
                  </Badge>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-xl bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">{t("page.wallet")}</p>
                  <p className="text-xl font-bold text-primary">
                    ${selectedCustomer.walletBalance.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">{t("page.loyaltyPoints")}</p>
                  <p className="text-xl font-bold">{selectedCustomer.loyaltyPoints}</p>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">{t("page.creditLimit")}</p>
                  <p className="text-xl font-bold">${selectedCustomer.creditLimit.toFixed(2)}</p>
                </div>
                <div
                  className={`flex flex-col gap-0.5 rounded-xl p-3 ${
                    selectedCustomer.outstandingLoanBalance > 0
                      ? "bg-destructive/10"
                      : "bg-muted/60"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{t("page.outstandingLoan")}</p>
                  <p
                    className={`text-xl font-bold ${
                      selectedCustomer.outstandingLoanBalance > 0 ? "text-destructive" : ""
                    }`}
                  >
                    ${selectedCustomer.outstandingLoanBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => openWalletAdjust(selectedCustomer)}
                >
                  <Wallet className="size-4" /> {t("page.adjustWallet")}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => openLoyaltyAdjust(selectedCustomer)}
                >
                  <TrendingUp className="size-4" /> {t("page.adjustLoyalty")}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => openCreditAdjust(selectedCustomer)}
                >
                  <CreditCard className="size-4" /> {t("page.setCreditLimit")}
                </Button>
                <Button
                  variant={selectedCustomer.status === "active" ? "destructive" : "default"}
                  className="justify-start gap-2"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({
                      uid: selectedCustomer.uid,
                      status: selectedCustomer.status === "active" ? "suspended" : "active",
                    })
                  }
                >
                  <UserCheck className="size-4" />
                  {selectedCustomer.status === "active" ? t("page.suspend") : t("page.activate")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet sub-dialog */}
      <Dialog open={walletTarget !== null} onOpenChange={(next) => !next && setWalletTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("dialogs.adjustWalletTitle", { name: walletTarget?.displayName })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("dialogs.currentBalance", { value: walletTarget?.walletBalance.toFixed(2) })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dialogs.type")}</Label>
              <Select value={walletType} onValueChange={(v) => setWalletType(v as typeof walletType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">{t("dialogs.topUp")}</SelectItem>
                  <SelectItem value="debit">{t("dialogs.debit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("common:fields.amount")}</Label>
              <Input
                type="number" min={0} step="0.01"
                value={walletAmount}
                onChange={(e) => setWalletAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dialogs.reason")}</Label>
              <Input value={walletReason} onChange={(e) => setWalletReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={walletMutation.isPending || walletAmount <= 0 || !walletReason.trim()}
              onClick={() => walletMutation.mutate()}
            >
              {walletMutation.isPending ? t("common:actions.saving") : t("dialogs.saveAdjustment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loyalty sub-dialog */}
      <Dialog open={loyaltyTarget !== null} onOpenChange={(next) => !next && setLoyaltyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("dialogs.adjustLoyaltyTitle", { name: loyaltyTarget?.displayName })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("dialogs.currentPoints", { value: loyaltyTarget?.loyaltyPoints })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dialogs.pointsChangeLabel")}</Label>
              <Input
                type="number"
                value={loyaltyPointsChange}
                onChange={(e) => setLoyaltyPointsChange(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dialogs.reason")}</Label>
              <Input value={loyaltyReason} onChange={(e) => setLoyaltyReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={loyaltyMutation.isPending || loyaltyPointsChange === 0 || !loyaltyReason.trim()}
              onClick={() => loyaltyMutation.mutate()}
            >
              {loyaltyMutation.isPending ? t("common:actions.saving") : t("dialogs.saveAdjustment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit limit sub-dialog */}
      <Dialog open={creditTarget !== null} onOpenChange={(next) => !next && setCreditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("dialogs.setCreditLimitTitle", { name: creditTarget?.displayName })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("dialogs.currentLimitAndOutstanding", {
                limit: creditTarget?.creditLimit.toFixed(2),
                outstanding: creditTarget?.outstandingLoanBalance.toFixed(2),
              })}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dialogs.newCreditLimit")}</Label>
              <Input
                type="number" min={0} step="0.01"
                value={creditLimitValue}
                onChange={(e) => setCreditLimitValue(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={creditMutation.isPending} onClick={() => creditMutation.mutate()}>
              {creditMutation.isPending ? t("common:actions.saving") : t("dialogs.saveLimit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
