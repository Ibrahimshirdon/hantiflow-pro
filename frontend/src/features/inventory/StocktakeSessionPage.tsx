import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { commitStocktakeSession, getStocktakeSession } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import type { StocktakeItem } from "@/types/inventory.types";

export function StocktakeSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(["inventory", "common"]);
  const queryClient = useQueryClient();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const { data: session, isLoading } = useQuery({
    queryKey: ["stocktake-session", id],
    queryFn: () => getStocktakeSession(id!),
    enabled: !!id,
  });

  const filteredItems = useMemo(() => {
    if (!session?.items) return [];
    const term = search.toLowerCase();
    if (!term) return session.items;
    return session.items.filter(
      (item: StocktakeItem) =>
        item.productName.toLowerCase().includes(term) ||
        item.batchNumber.toLowerCase().includes(term),
    );
  }, [session, search]);

  const commitMutation = useMutation({
    mutationFn: () => {
      const parsedCounts: Record<string, number> = {};
      for (const [itemId, raw] of Object.entries(counts)) {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 0) parsedCounts[itemId] = val;
      }
      return commitStocktakeSession(id!, parsedCounts);
    },
    onSuccess: ({ discrepancyCount }) => {
      queryClient.invalidateQueries({ queryKey: ["stocktake-session", id] });
      queryClient.invalidateQueries({ queryKey: ["stocktake-sessions"] });
      if (discrepancyCount === 0) {
        toast.success(t("inventory:stocktakeSessionPage.toasts.noDiscrepancies"));
      } else {
        toast.success(
          t("inventory:stocktakeSessionPage.toasts.committed", { count: discrepancyCount }),
        );
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const isCommitted = session?.status === "committed";
  const countsEntered = Object.values(counts).some((v) => v !== "");

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">{t("common:loading")}</div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {t("inventory:stocktakeSessionPage.heading")}
            </h1>
            <Badge variant={isCommitted ? "default" : "secondary"}>
              {isCommitted
                ? t("inventory:stocktakeSessionPage.committedBadge")
                : t("inventory:stocktakeSessionPage.inProgressBadge")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t("inventory:stocktakeSessionPage.startedBy", {
              name: session.startedByName,
            })}
          </p>
          {session.notes && (
            <p className="text-sm mt-1">
              <span className="font-medium">
                {t("inventory:stocktakeSessionPage.notesLabel")}:{" "}
              </span>
              {session.notes}
            </p>
          )}
        </div>
        {!isCommitted && (
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => commitMutation.mutate()}
              disabled={commitMutation.isPending || !countsEntered}
            >
              {commitMutation.isPending
                ? t("inventory:stocktakeSessionPage.committing")
                : t("inventory:stocktakeSessionPage.commitButton")}
            </Button>
            <p className="text-xs text-muted-foreground max-w-xs text-right">
              {t("inventory:stocktakeSessionPage.commitHint")}
            </p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">
          {t("inventory:stocktakeSessionPage.itemsHeading")}
        </h2>
        <Input
          placeholder={t("inventory:stocktakeSessionPage.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 max-w-sm"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inventory:stocktakeSessionPage.columns.product")}</TableHead>
              <TableHead>{t("inventory:stocktakeSessionPage.columns.batch")}</TableHead>
              <TableHead className="text-right">
                {t("inventory:stocktakeSessionPage.columns.systemQty")}
              </TableHead>
              <TableHead className="text-right">
                {t("inventory:stocktakeSessionPage.columns.counted")}
              </TableHead>
              <TableHead className="text-right">
                {t("inventory:stocktakeSessionPage.columns.variance")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("inventory:stocktakeSessionPage.noItems")}
                </TableCell>
              </TableRow>
            )}
            {filteredItems.map((item: StocktakeItem) => {
              const rawCount = counts[item.id];
              const countedQty = rawCount !== undefined && rawCount !== ""
                ? parseInt(rawCount, 10)
                : null;
              const variance =
                countedQty !== null && !isNaN(countedQty)
                  ? countedQty - item.systemQty
                  : null;

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.batchNumber}</TableCell>
                  <TableCell className="text-right">{item.systemQty}</TableCell>
                  <TableCell className="text-right">
                    {isCommitted ? (
                      <span className="text-muted-foreground">
                        {t("inventory:stocktakeSessionPage.uncounted")}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        className="w-24 ml-auto text-right"
                        placeholder="—"
                        value={counts[item.id] ?? ""}
                        onChange={(e) =>
                          setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {variance === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={
                          variance === 0
                            ? "text-green-600"
                            : variance > 0
                            ? "text-blue-600"
                            : "text-destructive"
                        }
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
