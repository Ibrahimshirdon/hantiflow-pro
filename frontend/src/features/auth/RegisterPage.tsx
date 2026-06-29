import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/api/client";
import { getAuthErrorMessage } from "@/lib/firebaseErrors";
import { ROLE_HOME_ROUTE } from "@/types/auth.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterPage() {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const profile = await registerCustomer({
        displayName,
        email,
        phone,
        password,
        username: username || undefined,
      });
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
          <CardTitle className="text-xl">{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">{t("register.fullNameLabel")}</Label>
              <Input
                id="displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("register.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t("register.usernameLabel")}</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("register.usernameHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t("register.phoneLabel")}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("register.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? t("register.submitting") : t("register.submit")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("register.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("register.signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
