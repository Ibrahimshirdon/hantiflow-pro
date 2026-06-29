import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  adjustCustomerLoyalty,
  adjustCustomerWallet,
  listCustomers,
  setCustomerCreditLimit,
  setCustomerStatus,
} from "@/api/customers.api";
import { getApiErrorMessage } from "@/api/client";
import type { CustomerSummary } from "@/types/customer.types";
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

export function CustomersPage() {
  const { t } = useTranslation(["customers", "common"]);
  const queryClient = useQueryClient();
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
      adjustCustomerWallet(walletTarget!.uid, {
        type: walletType,
        amount: walletAmount,
        reason: walletReason,
      }),
    onSuccess: () => {
      toast.success(t("toasts.walletAdjusted"));
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setWalletTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const loyaltyMutation = useMutation({
    mutationFn: () =>
      adjustCustomerLoyalty(loyaltyTarget!.uid, {
        pointsChange: loyaltyPointsChange,
        reason: loyaltyReason,
      }),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("page.title")}</h1>
        <p className="text-muted-foreground">{t("page.subtitle")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.name")}</TableHead>
            <TableHead>{t("common:fields.email")}</TableHead>
            <TableHead>{t("common:fields.phone")}</TableHead>
            <TableHead>{t("page.wallet")}</TableHead>
            <TableHead>{t("page.loyaltyPoints")}</TableHead>
            <TableHead>{t("page.addresses")}</TableHead>
            <TableHead>{t("page.creditLimit")}</TableHead>
            <TableHead>{t("page.outstandingLoan")}</TableHead>
            <TableHead>{t("common:fields.status")}</TableHead>
            <TableHead className="text-end">{t("common:fields.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && customers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                {t("page.empty")}
              </TableCell>
            </TableRow>
          )}
          {customers?.map((customer) => (
            <TableRow key={customer.uid}>
              <TableCell className="font-medium">{customer.displayName}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
              <TableCell>${customer.walletBalance.toFixed(2)}</TableCell>
              <TableCell>{customer.loyaltyPoints}</TableCell>
              <TableCell>{customer.addressCount}</TableCell>
              <TableCell>${customer.creditLimit.toFixed(2)}</TableCell>
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
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openWalletAdjust(customer)}>
                    {t("page.adjustWallet")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openLoyaltyAdjust(customer)}>
                    {t("page.adjustLoyalty")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCreditAdjust(customer)}>
                    {t("page.setCreditLimit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        uid: customer.uid,
                        status: customer.status === "active" ? "suspended" : "active",
                      })
                    }
                  >
                    {customer.status === "active" ? t("page.suspend") : t("page.activate")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">{t("dialogs.topUp")}</SelectItem>
                  <SelectItem value="debit">{t("dialogs.debit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("common:fields.amount")}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
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
                type="number"
                min={0}
                step="0.01"
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
