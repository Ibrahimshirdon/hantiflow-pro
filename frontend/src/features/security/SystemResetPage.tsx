import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { resetSystem } from "@/api/system.api";
import { getApiErrorMessage } from "@/api/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";

const CONFIRM_PHRASE = "RESET EVERYTHING";

export function SystemResetPage() {
  const { t } = useTranslation(["security"]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const mutation = useMutation({
    mutationFn: () => resetSystem(confirmText),
    onSuccess: (result) => {
      toast.success(
        t("systemResetPage.resetSuccess", { count: result.deletedAuthUsers })
      );
      queryClient.clear();
      setOpen(false);
      setConfirmText("");
      navigate("/app/dashboard");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("systemResetPage.title")}</h1>
        <p className="text-muted-foreground">{t("systemResetPage.subtitle")}</p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("systemResetPage.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {t("systemResetPage.warning")}
          </p>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setConfirmText("");
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-fit">
                {t("systemResetPage.resetSystemButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("systemResetPage.confirmDialogTitle")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {t("systemResetPage.confirmDialogBody")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("systemResetPage.confirmDialogTypePhrase")}{" "}
                <strong className="text-foreground">{CONFIRM_PHRASE}</strong>
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmText">{t("systemResetPage.confirmationPhraseLabel")}</Label>
                <Input
                  id="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={confirmText !== CONFIRM_PHRASE || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending
                    ? t("systemResetPage.resetting")
                    : t("systemResetPage.permanentlyResetButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
