import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listActivityLogs } from "@/api/security.api";
import { listUsers } from "@/api/auth.api";
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

export function ActivityLogsPage() {
  const { t } = useTranslation(["security", "common"]);
  const [userId, setUserId] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activityLogs", userId],
    queryFn: () => listActivityLogs(userId === "all" ? undefined : { userId }),
  });
  const { data: users } = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });

  const userName = (id: string) => users?.find((u) => u.uid === id)?.displayName ?? id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("activityLogsPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("activityLogsPage.subtitle")}
        </p>
      </div>

      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t("activityLogsPage.filterByUser")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("activityLogsPage.allUsers")}</SelectItem>
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
            <TableHead>{t("activityLogsPage.user")}</TableHead>
            <TableHead>{t("activityLogsPage.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("common:actions.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && logs?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("activityLogsPage.empty")}
              </TableCell>
            </TableRow>
          )}
          {logs?.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {new Date(log.createdAt._seconds * 1000).toLocaleString()}
              </TableCell>
              <TableCell>{userName(log.userId)}</TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
