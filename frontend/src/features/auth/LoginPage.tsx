import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "react-i18next";
import { resolveLoginIdentifier } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/lib/firebaseErrors";
import { ROLE_HOME_ROUTE } from "@/types/auth.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const email = identifier.includes("@")
        ? identifier
        : (await resolveLoginIdentifier(identifier)).email;
      const profile = await login(email, password);
      navigate(ROLE_HOME_ROUTE[profile.role]);
    } catch (error) {
      toast.error(error instanceof FirebaseError ? getAuthErrorMessage(error) : getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <img src="/favicon.png" alt="" className="mx-auto mb-2 size-12 object-contain" />
          <CardTitle className="text-xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identifier">{t("login.identifierLabel")}</Label>
              <Input
                id="identifier"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("login.newCustomer")}{" "}
            <Link to="/register" className="text-primary hover:underline">
              {t("login.createAccount")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
