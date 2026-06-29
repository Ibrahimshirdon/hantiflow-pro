import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listDeliveryIssues, resolveDeliveryIssue } from "@/api/delivery.api";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DeliveryIssuesPage() {
  const { t } = useTranslation(["delivery"]);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const { data: issues, isLoading } = useQuery({
    queryKey: ["deliveryIssues", statusFilter],
    queryFn: () => listDeliveryIssues(statusFilter === "all" ? undefined : statusFilter),
  });
  const { data: allOpenIssues } = useQuery({
    queryKey: ["deliveryIssues", "open"],
    queryFn: () => listDeliveryIssues("open"),
  });
  const openCount = allOpenIssues?.length ?? 0;

  const resolveMutation = useMutation({
    mutationFn: () => resolveDeliveryIssue(resolvingId!, resolutionNote || undefined),
    onSuccess: () => {
      toast.success(t("deliveryIssuesPage.toasts.issueResolved"));
      setResolvingId(null);
      setResolutionNote("");
      queryClient.invalidateQueries({ queryKey: ["deliveryIssues"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("deliveryIssuesPage.title")}</h1>
        <p className="text-muted-foreground">{t("deliveryIssuesPage.subtitle")}</p>
      </div>

      {openCount > 0 && (
        <Card className="border-warning">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <p className="text-sm">
              <span className="font-semibold">
                {t("deliveryIssuesPage.openIssuesBanner.count", { count: openCount })}
              </span>{" "}
              <span className="text-muted-foreground">
                {t("deliveryIssuesPage.openIssuesBanner.awaiting")}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">{t("deliveryIssuesPage.filter.open")}</SelectItem>
          <SelectItem value="resolved">{t("deliveryIssuesPage.filter.resolved")}</SelectItem>
          <SelectItem value="all">{t("deliveryIssuesPage.filter.all")}</SelectItem>
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("deliveryIssuesPage.table.orderNumber")}</TableHead>
            <TableHead>{t("deliveryIssuesPage.table.customer")}</TableHead>
            <TableHead>{t("deliveryIssuesPage.table.description")}</TableHead>
            <TableHead>{t("deliveryIssuesPage.table.status")}</TableHead>
            <TableHead>{t("deliveryIssuesPage.table.date")}</TableHead>
            <TableHead className="text-end">{t("deliveryIssuesPage.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("deliveryIssuesPage.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && issues?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("deliveryIssuesPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {issues?.map((issue) => (
            <TableRow
              key={issue.id}
              className={issue.status === "open" ? "border-s-2 border-s-warning bg-warning/5" : undefined}
            >
              <TableCell className="font-medium">{issue.orderNumber}</TableCell>
              <TableCell className="text-muted-foreground">{issue.customerName}</TableCell>
              <TableCell className="max-w-sm">{issue.description}</TableCell>
              <TableCell>
                <Badge
                  variant={issue.status === "open" ? "warning" : "success"}
                  className="gap-1"
                >
                  {issue.status === "open" && <AlertTriangle className="size-3" />}
                  {issue.status === "open"
                    ? t("deliveryIssuesPage.filter.open")
                    : t("deliveryIssuesPage.filter.resolved")}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(issue.createdAt._seconds * 1000).toLocaleString()}
              </TableCell>
              <TableCell className="text-end">
                {issue.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => setResolvingId(issue.id)}>
                    {t("deliveryIssuesPage.resolveButton")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={resolvingId !== null} onOpenChange={(next) => !next && setResolvingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deliveryIssuesPage.resolveDialog.title")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("deliveryIssuesPage.resolveDialog.notePlaceholder")}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <DialogFooter>
            <Button disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate()}>
              {resolveMutation.isPending
                ? t("deliveryIssuesPage.resolveDialog.resolving")
                : t("deliveryIssuesPage.resolveDialog.markResolved")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
