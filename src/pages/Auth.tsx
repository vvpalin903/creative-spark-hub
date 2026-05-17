import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, User as UserIcon, Phone, ShieldCheck } from "lucide-react";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { checkPasswordPwned } from "@/lib/passwordStrength";
import { useAuth } from "@/hooks/useAuth";

type SignupForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "host" | "client";
};

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const initialRole = (params.get("role") === "host" ? "host" : "client") as "host" | "client";
  const initialTab: "signin" | "signup" = params.get("role") ? "signup" : "signin";
  const { session, loading } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">(initialTab);

  // signin
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siBusy, setSiBusy] = useState(false);

  // signup form
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suRole, setSuRole] = useState<"host" | "client">(initialRole);
  const [suBusy, setSuBusy] = useState(false);

  // signup phone-verify step
  const [verifyStep, setVerifyStep] = useState<null | "calling" | "finalizing">(null);
  const [verifyData, setVerifyData] = useState<{ form: SignupForm; sessionToken: string; callPhone: string; callPhonePretty: string } | null>(null);
  const [polling, setPolling] = useState(false);
  const [signupRetrying, setSignupRetrying] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && session && verifyStep === null) navigate(next, { replace: true });
  }, [loading, session, navigate, next, verifyStep]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  useEffect(() => () => stopPolling(), []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) {
      toast({ title: "Проверьте поля", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSiBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSiBusy(false);
    if (error) {
      toast({ title: "Не удалось войти", description: error.message, variant: "destructive" });
      return;
    }
    navigate(next, { replace: true });
  };

  const completeSignUp = async (form: SignupForm, sessionToken: string) => {
    setSignupRetrying(true);
    setVerifyStep("finalizing");
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: {
          name: form.name,
          phone: form.phone,
          role: form.role,
          pre_verified_phone_token: sessionToken,
        },
      },
    });
    if (error) {
      setSignupRetrying(false);
      setVerifyStep("calling");
      toast({ title: "Не удалось создать аккаунт", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Аккаунт создан", description: "Телефон подтверждён" });
    // Если сессия пришла сразу — переходим. Иначе оставляем экран "finalizing"
    // чтобы не показывать форму регистрации повторно.
    if (signUpData.session) {
      navigate(form.role === "host" ? "/dashboard/host" : "/dashboard/client", { replace: true });
    }
    return true;
  };

  const startPolling = (sessionToken: string, form: SignupForm) => {
    stopPolling();
    setPolling(true);
    const tick = async () => {
      const { data, error } = await supabase.functions.invoke("phone-precheck-status", { body: { session_token: sessionToken } });
      if (error) return;
      const status = (data as any)?.status;
      if (status === "verified") {
        stopPolling();
        await completeSignUp(form, sessionToken);
      } else if (status === "expired" || status === "not_found") {
        stopPolling();
        toast({ title: "Время истекло", description: "Запросите новый номер для звонка.", variant: "destructive" });
        setVerifyStep(null);
        setVerifyData(null);
      }
    };
    pollRef.current = window.setInterval(tick, 3000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({
      name: suName,
      email: suEmail,
      phone: suPhone,
      password: suPassword,
      role: suRole,
    });
    if (!parsed.success) {
      toast({ title: "Проверьте поля", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSuBusy(true);
    const pwned = await checkPasswordPwned(parsed.data.password);
    if (pwned && pwned > 0) {
      setSuBusy(false);
      toast({
        title: "Слабый пароль",
        description: `Этот пароль встречается в известных утечках (${pwned.toLocaleString("ru-RU")} раз). Придумайте другой — не используйте словарные и часто встречающиеся пароли.`,
        variant: "destructive",
      });
      return;
    }
    const { data, error } = await supabase.functions.invoke("phone-precheck-init", { body: { phone: parsed.data.phone } });
    setSuBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Ошибка", description: (data as any)?.error || error?.message || "Не удалось инициировать проверку", variant: "destructive" });
      return;
    }
    const form: SignupForm = { ...parsed.data, phone: parsed.data.phone as string };
    const sessionToken = (data as any).session_token;
    const callPhone = (data as any).call_phone;
    const callPhonePretty = (data as any).call_phone_pretty || callPhone;
    setVerifyData({ form, sessionToken, callPhone, callPhonePretty });
    setVerifyStep("calling");
    setSignupRetrying(false);
    startPolling(sessionToken, form);
  };

  const cancelVerify = () => {
    stopPolling();
    setVerifyStep(null);
    setVerifyData(null);
    setSignupRetrying(false);
  };

  const requestNewNumber = async () => {
    if (!verifyData) return;
    stopPolling();
    setSuBusy(true);
    const { data, error } = await supabase.functions.invoke("phone-precheck-init", { body: { phone: verifyData.form.phone } });
    setSuBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Ошибка", description: (data as any)?.error || error?.message, variant: "destructive" });
      startPolling(verifyData.sessionToken, verifyData.form);
      return;
    }
    const sessionToken = (data as any).session_token;
    const callPhone = (data as any).call_phone;
    const callPhonePretty = (data as any).call_phone_pretty || callPhone;
    setVerifyData({ ...verifyData, sessionToken, callPhone, callPhonePretty });
    startPolling(sessionToken, verifyData.form);
  };

  if ((verifyStep === "calling" || verifyStep === "finalizing") && verifyData) {
    return (
      <Layout>
        <div className="container py-12 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Подтверждение телефона
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {verifyStep === "finalizing" ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Завершаем регистрацию…
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    С телефона <strong>{verifyData.form.phone}</strong> позвоните на номер ниже. Звонок бесплатный, отвечать не нужно — мы автоматически засчитаем входящий вызов и завершим регистрацию.
                  </p>
                  <a
                    href={`tel:${verifyData.callPhone}`}
                    className="flex items-center justify-center gap-3 rounded-lg border-2 border-primary bg-primary/5 px-4 py-6 text-2xl font-semibold text-primary transition hover:bg-primary/10"
                  >
                    <Phone className="h-6 w-6" />
                    {verifyData.callPhonePretty}
                  </a>
                  {polling ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ожидаем входящий звонок…
                    </div>
                  ) : (
                    <Button className="w-full" onClick={() => completeSignUp(verifyData.form, verifyData.sessionToken)} disabled={signupRetrying}>
                      {signupRetrying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Завершить регистрацию
                    </Button>
                  )}
                  <p className="text-xs text-center text-muted-foreground">
                    Аккаунт будет создан только после подтверждения номера.
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" className="text-muted-foreground underline" onClick={cancelVerify}>
                      Отменить
                    </button>
                    <button type="button" className="text-primary disabled:text-muted-foreground" onClick={requestNewNumber} disabled={suBusy}>
                      Запросить новый номер
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Вход и регистрация</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Войти</TabsTrigger>
                <TabsTrigger value="signup">Создать аккаунт</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" autoComplete="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="si-password">Пароль</Label>
                    <Input id="si-password" type="password" autoComplete="current-password" value={siPassword} onChange={(e) => setSiPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={siBusy}>
                    {siBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Войти
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Забыли пароль?
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div>
                    <Label>Я хочу</Label>
                    <RadioGroup value={suRole} onValueChange={(v) => setSuRole(v as any)} className="grid grid-cols-2 gap-2 mt-2">
                      <Label htmlFor="role-client" className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
                        <RadioGroupItem value="client" id="role-client" />
                        <UserIcon className="h-4 w-4" />
                        <span className="text-sm">Снимать место</span>
                      </Label>
                      <Label htmlFor="role-host" className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
                        <RadioGroupItem value="host" id="role-host" />
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">Сдавать место</span>
                      </Label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="su-name">Имя</Label>
                    <Input id="su-name" value={suName} onChange={(e) => setSuName(e.target.value)} required maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="su-phone">Телефон</Label>
                    <Input id="su-phone" type="tel" autoComplete="tel" value={suPhone} onChange={(e) => setSuPhone(e.target.value)} required placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <Label htmlFor="su-password">Пароль</Label>
                    <Input id="su-password" type="password" autoComplete="new-password" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} required minLength={8} />
                    <p className="text-xs text-muted-foreground mt-1">Минимум 8 символов, включая буквы, цифры и спецсимвол</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={suBusy}>
                    {suBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Продолжить и подтвердить телефон
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Создавая аккаунт, вы соглашаетесь с{" "}
              <Link to="/docs/terms" className="underline">условиями</Link> и{" "}
              <Link to="/docs/privacy" className="underline">политикой конфиденциальности</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
