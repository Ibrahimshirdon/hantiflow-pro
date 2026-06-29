import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { assignDriver, listDeliveries } from "@/api/delivery.api";
import { listUsers } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
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
import { CreateDeliveryDialog } from "./CreateDeliveryDialog";

const STATUS_VARIANT = {
  unassigned: "warning",
  assigned: "info",
  picked_up: "info",
  in_transit: "info",
  delivered: "success",
  failed: "destructive",
} as const;

export function DispatchBoardPage() {
  const { t } = useTranslation(["delivery"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => listDeliveries(),
  });
  const { data: drivers } = useQuery({
    queryKey: ["users", "driver"],
    queryFn: () => listUsers("driver"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string }) => assignDriver(id, driverId),
    onSuccess: () => {
      toast.success(t("dispatchBoardPage.toasts.driverAssigned"));
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const driverName = (id: string | null) => drivers?.find((d) => d.uid === id)?.displayName ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("dispatchBoardPage.title")}</h1>
          <p className="text-muted-foreground">{t("dispatchBoardPage.subtitle")}</p>
        </div>
        <CreateDeliveryDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dispatchBoardPage.table.orderNumber")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.dropoff")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.driver")}</TableHead>
            <TableHead>{t("dispatchBoardPage.table.status")}</TableHead>
            <TableHead className="text-end">{t("dispatchBoardPage.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("dispatchBoardPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && deliveries?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("dispatchBoardPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {deliveries?.map((delivery) => (
            <TableRow
              key={delivery.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/delivery/${delivery.id}`)}
            >
              <TableCell className="font-medium">{delivery.orderNumber}</TableCell>
              <TableCell>
                {delivery.dropoffAddress.line1}, {delivery.dropoffAddress.city}
              </TableCell>
              <TableCell>{driverName(delivery.driverId)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[delivery.status]}>
                  {t(`statuses.${delivery.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                {delivery.status === "unassigned" && (
                  <Select
                    onValueChange={(driverId) => assignMutation.mutate({ id: delivery.id, driverId })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("dispatchBoardPage.assignDriverPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map((d) => (
                        <SelectItem key={d.uid} value={d.uid}>
                          {d.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
