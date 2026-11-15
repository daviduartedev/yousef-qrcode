"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, FieldError, FormAlert } from "@/views/Auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword({ available }: { available: boolean }) {
  const { t } = useTranslation("entry");
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    if (!emailPattern.test(email.trim())) { setError(t("Enter a valid email address.")); return; }
    setError(undefined);
    setIsLoading(true);
    try {
      const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/auth/reset-password" });
      if (result.error) {
        setFormError(result.error.status === 429 ? t("Too many attempts. Wait a minute and try again.") : t("We could not send the link. Try again later."));
        return;
      }
      // The same answer is shown whether or not the address has an account.
      setSent(true);
    } catch {
      setFormError(t("Could not connect. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard title={t("Reset your password")} description={t("Enter your account email and we will send you a link to choose a new password.")}>
      <div className="space-y-4">
        {!available ? (
          <FormAlert message={t("Password recovery by email is not available yet. Contact the QRConnect team to recover your account.")} />
        ) : sent ? (
          <FormAlert tone="success" message={t("If an account exists for this email, a reset link is on its way. The link expires in one hour.")} />
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <FormAlert message={formError} />
            <div className="space-y-2">
              <label htmlFor={`${id}-email`} className="text-sm font-medium">{t("Email")}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" dir="ltr"
                  value={email} onChange={(e) => setEmail(e.target.value)} className="ps-10" disabled={isLoading}
                  aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-email-error` : undefined} />
              </div>
              <FieldError id={`${id}-email-error`} message={error} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden="true" />}
              {t("Send reset link")}
            </Button>
          </form>
        )}
        <p className="text-center text-sm">
          <Link href="/auth" className="text-primary hover:underline">{t("Back to sign in")}</Link>
        </p>
      </div>
    </AuthCard>
  );
}
