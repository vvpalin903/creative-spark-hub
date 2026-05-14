import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { user, session, loading, phoneVerified, refreshPhoneVerified } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!loading && !session) navigate(`/auth?next=${encodeURIComponent("/verify-phone")}`, { replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (phoneVerified) navigate(next, { replace: true });
  }, [phoneVerified, navigate, next]);

  useEffect(() => {
    // prefill phone from profile
    if (user) {
      supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
    }
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Введите телефон", description: "Не менее 10 цифр", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { phone } });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Ошибка", description: (data as any)?.error || error?.message || "Не удалось отправить код", variant: "destructive" });
      return;
    }
    toast({ title: "Код отправлен", description: "Проверьте SMS" });
    setStep("code");
    setCooldown(60);
    setTimeout(async () => {
      const { data: status } = await supabase.functions.invoke("phone-otp-status", { body: { phone } });
      if ((status as any)?.delivery_status === "undelivered") {
        toast({
          title: "SMS не доставлена",
          description: "Оператор отклонил сообщение. Проверьте номер или попробуйте другой телефон.",
          variant: "destructive",
        });
      }
    }, 45000);
  };

  const verifyCode = async () => {
    if (!/^\d{3,9}$/.test(code)) {
      toast({ title: "Введите код из SMS", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-verify", { body: { code } });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Неверный код", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Телефон подтверждён" });
    await refreshPhoneVerified();
    navigate(next, { replace: true });
  };

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
            {step === "phone" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Для продолжения работы подтвердите номер телефона. Мы отправим SMS с одноразовым кодом.
                </p>
                <div>
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+7 (___) ___-__-__"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={sendCode} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Получить код в SMS
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Код отправлен на <strong>{phone}</strong>. Введите его ниже.
                </p>
                <div>
                  <Label htmlFor="code">Код из SMS</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={9}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button className="w-full" onClick={verifyCode} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Подтвердить
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground underline"
                    onClick={() => setStep("phone")}
                  >
                    Изменить номер
                  </button>
                  <button
                    type="button"
                    className="text-primary disabled:text-muted-foreground"
                    disabled={cooldown > 0 || busy}
                    onClick={sendCode}
                  >
                    {cooldown > 0 ? `Отправить ещё раз через ${cooldown}с` : "Отправить ещё раз"}
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
