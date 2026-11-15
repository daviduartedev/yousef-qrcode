"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, Lock } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, FieldError, FormAlert } from "@/views/Auth";

export default function ResetPassword({ token }: { token: string | null }) {
  const { t } = useTranslation("entry");
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [expired, setExpired] = useState(!token);
  const [isLoading, setIsLoading] = useState(false);

  // Keep the token out of the address bar and history once the page has it.
  useEffect(() => { window.history.replaceState(null, "", "/auth/reset-password"); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (password.length < 8) found.password = t("Use at least 8 characters.");
    else if (password.length > 128) found.password = t("Use at most 128 characters.");
    if (!found.password && confirm !== password) found.confirm = t("The passwords do not match.");
    setErrors(found);
    if (found.password || found.confirm || !token) return;
    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        if (result.error.status === 400) setExpired(true);
        else setErrors({ form: t("We could not change the password. Try again later.") });
        return;
      }
      router.replace("/auth?reset=success");
    } catch {
      setErrors({ form: t("Could not connect. Check your connection and try again.") });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard title={t("Choose a new password")} description={t("Signing in again will be required on your other devices.")}>
      <div className="space-y-4">
        {expired ? (
          <>
            <FormAlert message={t("This reset link is invalid or expired.")} />
            <p className="text-center text-sm">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">{t("Request a new link")}</Link>
            </p>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <FormAlert message={errors.form} />
            <div className="space-y-2">
              <label htmlFor={`${id}-password`} className="text-sm font-medium">{t("New password")}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id={`${id}-password`} name="password" type="password" autoComplete="new-password" dir="ltr"
                  value={password} onChange={(e) => setPassword(e.target.value)} className="ps-10" disabled={isLoading}
                  aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? `${id}-password-error` : undefined} />
              </div>
              <FieldError id={`${id}-password-error`} message={errors.password} />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-confirm`} className="text-sm font-medium">{t("Confirm password")}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id={`${id}-confirm`} name="confirm" type="password" autoComplete="new-password" dir="ltr"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} className="ps-10" disabled={isLoading}
                  aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? `${id}-confirm-error` : undefined} />
              </div>
              <FieldError id={`${id}-confirm-error`} message={errors.confirm} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden="true" />}
              {t("Change password")}
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
