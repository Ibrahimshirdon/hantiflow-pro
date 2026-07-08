import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createStocktakeSession, listStocktakeSessions } from "@/api/inventory.api";
import { getApiErrorMessage } from "@/api/client";
import { toDate } from "@/types/inventory.types";

export function StocktakePage() {
  const { t } = useTranslation(["inventory", "common"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["stocktake-sessions"],
    queryFn: listStocktakeSessions,
  });

  const createMutation = useMutation({
    mutationFn: () => createStocktakeSession({}),
    onMutate: () => setCreating(true),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["stocktake-sessions"] });
      navigate(`/app/inventory/stocktake/${id}`);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
      setCreating(false);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("inventory:stocktakePage.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("inventory:stocktakePage.subtitle")}
          </p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={creating}>
          <ClipboardList className="mr-2 h-4 w-4" />
          {creating
            ? t("inventory:stocktakePage.startingSession")
            : t("inventory:stocktakePage.newSession")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("inventory:stocktakePage.columns.date")}</TableHead>
            <TableHead>{t("inventory:stocktakePage.columns.startedBy")}</TableHead>
            <TableHead>{t("inventory:stocktakePage.columns.items")}</TableHead>
            <TableHead>{t("inventory:stocktakePage.columns.discrepancies")}</TableHead>
            <TableHead>{t("inventory:stocktakePage.columns.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common:loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && (!sessions || sessions.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("inventory:stocktakePage.empty")}
              </TableCell>
            </TableRow>
          )}
          {sessions?.map((session) => (
            <TableRow
              key={session.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/inventory/stocktake/${session.id}`)}
            >
              <TableCell>
                {toDate(session.createdAt)?.toLocaleDateString() ?? "—"}
              </TableCell>
              <TableCell>{session.startedByName}</TableCell>
              <TableCell>{session.itemCount}</TableCell>
              <TableCell>
                {session.status === "committed" ? session.discrepancyCount : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={session.status === "committed" ? "default" : "secondary"}
                >
                  {t(`inventory:stocktakePage.status.${session.status}`)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
