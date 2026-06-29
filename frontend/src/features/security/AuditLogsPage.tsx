import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listAuditLogs } from "@/api/security.api";
import { listUsers } from "@/api/auth.api";
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

export function AuditLogsPage() {
  const { t } = useTranslation(["security", "common"]);
  const [userId, setUserId] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["auditLogs", userId],
    queryFn: () => listAuditLogs(userId === "all" ? undefined : { userId }),
  });
  const { data: users } = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("auditLogsPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("auditLogsPage.subtitle")}
        </p>
      </div>

      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t("auditLogsPage.filterByUser")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("auditLogsPage.allUsers")}</SelectItem>
          {users?.map((u) => (
            <SelectItem key={u.uid} value={u.uid}>
              {u.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common:fields.date")}</TableHead>
            <TableHead>{t("auditLogsPage.user")}</TableHead>
            <TableHead>{t("auditLogsPage.action")}</TableHead>
            <TableHead>{t("auditLogsPage.entity")}</TableHead>
            <TableHead>{t("auditLogsPage.beforeAfter")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && logs?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("auditLogsPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {logs?.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {new Date(log.createdAt._seconds * 1000).toLocaleString()}
              </TableCell>
              <TableCell>
                {log.userName} <Badge variant="secondary">{log.role}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell>
              <TableCell className="text-sm">
                {log.entityType} <span className="text-muted-foreground">{log.entityId.slice(0, 8)}</span>
              </TableCell>
              <TableCell className="max-w-xs text-xs text-muted-foreground">
                {log.before && <div>{t("auditLogsPage.before", { value: JSON.stringify(log.before) })}</div>}
                {log.after && <div>{t("auditLogsPage.after", { value: JSON.stringify(log.after) })}</div>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
