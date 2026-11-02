"use client";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
const Auth = () => {
  const { t: copy } = useTranslation("copy");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useRouter().push;
  const { user } = useAuth();
  const { toast } = useToast();
  useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast({
        title: copy("Erro"),
        description: copy("As senhas não coincidem"),
        variant: "destructive",
      });
      return;
    }
    if (!isLogin && password.length < 8) {
      toast({
        title: copy("Erro"),
        description: copy("Senha deve ter no mínimo 8 caracteres"),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = isLogin
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: email.split("@")[0],
          });
      if (result.error) {
        toast({
          title: copy("Erro"),
          description: copy(
            isLogin
              ? "Email ou senha incorretos"
              : "Não foi possível criar a conta. Verifique os dados e tente novamente.",
          ),
          variant: "destructive",
        });
      } else navigate("/app");
    } catch {
      toast({
        title: copy("Erro"),
        description: copy("Não foi possível conectar. Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-primary-foreground rounded-full" />
          </div>
          <span className="text-2xl font-bold">QRConnect</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">
            {copy(isLogin ? "Bem-vindo de volta!" : "Criar conta")}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {copy(
              isLogin
                ? "Entre na sua conta para continuar"
                : "Cadastre-se para começar a criar QR codes",
            )}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-medium">
                {copy("Email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  required
                  autoComplete="email"
                  type="email"
                  placeholder={copy("seu@email.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-medium">
                {copy("Senha")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  type={showPassword ? "text" : "password"}
                  placeholder={copy("••••••••")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  aria-label={copy(
                    showPassword ? "Ocultar senha" : "Mostrar senha",
                  )}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label
                  htmlFor="auth-confirm-password"
                  className="text-sm font-medium"
                >
                  {copy("Confirmar Senha")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="auth-confirm-password"
                    required
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={copy("••••••••")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {copy(isLogin ? "Entrando..." : "Criando conta...")}
                </>
              ) : isLogin ? (
                copy("Fazer login")
              ) : (
                copy("Criar conta")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {copy(isLogin ? "Não tem uma conta?" : "Já tem uma conta?")}
              {copy(" ")}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-primary hover:underline font-medium"
              >
                {copy(isLogin ? "Cadastre-se" : "Fazer login")}
              </button>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {copy("← Voltar para a página inicial")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
