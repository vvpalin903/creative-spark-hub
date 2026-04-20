import { useState } from "react";
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
import { Loader2, Building2, User as UserIcon } from "lucide-react";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

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

  // signup
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suRole, setSuRole] = useState<"host" | "client">(initialRole);
  const [suBusy, setSuBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
  }, [loading, session, navigate, next]);

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
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: parsed.data.role,
        },
      },
    });
    setSuBusy(false);
    if (error) {
      toast({ title: "Не удалось создать аккаунт", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Аккаунт создан", description: "Добро пожаловать!" });
    navigate(parsed.data.role === "host" ? "/dashboard/host" : "/dashboard/client", { replace: true });
  };

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
                    <p className="text-xs text-muted-foreground mt-1">Минимум 8 символов</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={suBusy}>
                    {suBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Создать аккаунт
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
