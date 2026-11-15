"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, Lock, Mail, QrCode, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/useAuth";
import { safeReturnPath, type AuthMode } from "@/lib/auth-paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageToggle } from "@/components/LanguageToggle";

type Field = "name" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field | "form", string>>;
export type AuthNotice = "reset" | "verified" | "verify-failed" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4"><LanguageToggle /></div>
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-2xl font-bold">QRConnect</span>
        </Link>
        <section className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg" aria-labelledby="auth-title">
          <h1 id="auth-title" className="text-2xl font-bold text-center mb-2">{title}</h1>
          <p className="text-muted-foreground text-center mb-6">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-sm text-destructive">{message}</p> : null;
}

export function FormAlert({ message, tone = "error" }: { message?: string; tone?: "error" | "success" }) {
  if (!message) return null;
  const style = tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${style}`}>{message}</div>;
}

const Auth = ({ initialMode, next, notice, emailAvailable }: { initialMode: AuthMode; next: string | null; notice: AuthNotice; emailAvailable: boolean }) => {
  const { t } = useTranslation("entry");
  const id = useId();
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const destination = safeReturnPath(next);
  const isLogin = mode === "signin";

  useEffect(() => { if (user) router.replace(destination); }, [user, router, destination]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirm("");
    setErrors({});
    const query = new URLSearchParams();
    if (nextMode === "signup") query.set("mode", "signup");
    if (next) query.set("next", destination);
    router.replace(query.size ? `/auth?${query}` : "/auth", { scroll: false });
  }

  function validate(): Errors {
    const found: Errors = {};
    if (!isLogin && !name.trim()) found.name = t("Enter your name.");
    if (!emailPattern.test(email.trim())) found.email = t("Enter a valid email address.");
    if (!password) found.password = t("Enter your password.");
    else if (!isLogin && password.length < 8) found.password = t("Use at least 8 characters.");
    else if (!isLogin && password.length > 128) found.password = t("Use at most 128 characters.");
    if (!isLogin && password && confirm !== password) found.confirm = t("The passwords do not match.");
    return found;
  }

  function focusFirst(found: Errors) {
    const order: Field[] = ["name", "email", "password", "confirm"];
    const first = order.find((field) => found[field]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) { focusFirst(found); return; }
    setIsLoading(true);
    try {
      const result = isLogin
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({ email: email.trim(), password, name: name.trim(), callbackURL: `/auth?verified=1&next=${encodeURIComponent(destination)}` });
      if (result.error) {
        const status = result.error.status;
        const message = status === 429 ? t("Too many attempts. Wait a minute and try again.")
          : isLogin ? t("Email or password is incorrect.")
          : t("We could not create the account. If you already have one, sign in instead.");
        setErrors({ form: message });
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setErrors({ form: t("Could not connect. Check your connection and try again.") });
    } finally {
      setIsLoading(false);
    }
  }

  const noticeText = notice === "reset" ? t("Your password was changed. Sign in with the new password.")
    : notice === "verified" ? t("Your email is confirmed.")
    : notice === "verify-failed" ? t("This confirmation link is invalid or expired.") : undefined;
  const describedBy = (field: Field) => errors[field] ? `${id}-${field}-error` : undefined;

  return (
    <AuthCard
      title={t(isLogin ? "Welcome back" : "Create your account")}
      description={t(isLogin ? "Sign in to manage your QR codes." : "Sign up to create and track QR codes.")}
    >
      <div className="space-y-4">
        <FormAlert message={noticeText} tone={notice === "verify-failed" ? "error" : "success"} />
        <FormAlert message={errors.form} />
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">{t("Name")}</label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id={`${id}-name`} name="name" autoComplete="name" maxLength={80} value={name}
                  onChange={(e) => setName(e.target.value)} className="ps-10" disabled={isLoading}
                  aria-invalid={Boolean(errors.name)} aria-describedby={describedBy("name")} />
              </div>
              <FieldError id={`${id}-name-error`} message={errors.name} />
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor={`${id}-email`} className="text-sm font-medium">{t("Email")}</label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" dir="ltr"
                placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="ps-10" disabled={isLoading} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy("email")} />
            </div>
            <FieldError id={`${id}-email-error`} message={errors.email} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${id}-password`} className="text-sm font-medium">{t("Password")}</label>
              {isLogin && <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">{t("Forgot password?")}</Link>}
            </div>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id={`${id}-password`} name="password" type={showPassword ? "text" : "password"} dir="ltr"
                autoComplete={isLogin ? "current-password" : "new-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} className="ps-10 pe-10" disabled={isLoading}
                aria-invalid={Boolean(errors.password)} aria-describedby={describedBy("password") ?? (!isLogin ? `${id}-password-hint` : undefined)} />
              <button type="button" aria-label={t(showPassword ? "Hide password" : "Show password")} aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isLogin && !errors.password && <p id={`${id}-password-hint`} className="text-xs text-muted-foreground">{t("At least 8 characters.")}</p>}
            <FieldError id={`${id}-password-error`} message={errors.password} />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor={`${id}-confirm`} className="text-sm font-medium">{t("Confirm password")}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id={`${id}-confirm`} name="confirm" type={showPassword ? "text" : "password"} dir="ltr"
                  autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="ps-10" disabled={isLoading} aria-invalid={Boolean(errors.confirm)} aria-describedby={describedBy("confirm")} />
              </div>
              <FieldError id={`${id}-confirm-error`} message={errors.confirm} />
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden="true" />{t(isLogin ? "Signing in…" : "Creating account…")}</>
              : t(isLogin ? "Sign in" : "Create account")}
          </Button>
          {!isLogin && emailAvailable && <p className="text-xs text-muted-foreground text-center">{t("We will email you a link to confirm your address.")}</p>}
        </form>
        <p className="text-sm text-muted-foreground text-center">
          {t(isLogin ? "New to QRConnect?" : "Already have an account?")}{" "}
          <button type="button" onClick={() => switchMode(isLogin ? "signup" : "signin")} className="text-primary hover:underline font-medium">
            {t(isLogin ? "Create an account" : "Sign in")}
          </button>
        </p>
      </div>
      <p className="text-center mt-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">{t("Back to home")}</Link>
      </p>
    </AuthCard>
  );
};

export default Auth;
