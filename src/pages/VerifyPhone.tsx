import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { normalizePhoneInput } from "@/lib/validation";

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { user, session, loading, phoneVerified, refreshPhoneVerified } = useAuth();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "call">("phone");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [callPhone, setCallPhone] = useState<string | null>(null);
  const [callPhonePretty, setCallPhonePretty] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate(`/auth?next=${encodeURIComponent("/verify-phone")}`, { replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (phoneVerified) navigate(next, { replace: true });
  }, [phoneVerified, navigate, next]);

  useEffect(() => {
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

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = () => {
    stopPolling();
    setPolling(true);
    const tick = async () => {
      const { data, error } = await supabase.functions.invoke("phone-otp-verify", { body: {} });
      if (error) return;
      const status = (data as any)?.status;
      if (status === "verified") {
        stopPolling();
        toast({ title: "Телефон подтверждён" });
        await refreshPhoneVerified();
        navigate(next, { replace: true });
      } else if (status === "expired") {
        stopPolling();
        toast({ title: "Время истекло", description: "Запросите новую проверку.", variant: "destructive" });
        setStep("phone");
      }
    };
    pollRef.current = window.setInterval(tick, 3000);
  };

  const sendCode = async () => {
    const normalizedPhone = normalizePhoneInput(phone);
    if (!normalizedPhone) {
      toast({ title: "Введите телефон", description: "Не менее 10 цифр", variant: "destructive" });
      return;
    }
    setPhone(normalizedPhone);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { phone: normalizedPhone } });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Ошибка", description: (data as any)?.error || error?.message || "Не удалось инициировать проверку", variant: "destructive" });
      return;
    }
    setCallPhone((data as any)?.call_phone ?? null);
    setCallPhonePretty((data as any)?.call_phone_pretty ?? (data as any)?.call_phone ?? null);
    setStep("call");
    setCooldown(60);
    startPolling();
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
                  Для подтверждения номера мы покажем вам бесплатный номер. Позвоните на него с указанного телефона — ответа ждать не нужно, мы сами засчитаем входящий звонок.
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
                  Получить номер для звонка
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  С телефона <strong>{phone}</strong> позвоните на номер ниже. Звонок бесплатный, отвечать не нужно — мы автоматически засчитаем входящий вызов.
                </p>
                <a
                  href={callPhone ? `tel:${callPhone}` : undefined}
                  className="flex items-center justify-center gap-3 rounded-lg border-2 border-primary bg-primary/5 px-4 py-6 text-2xl font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Phone className="h-6 w-6" />
                  {callPhonePretty || callPhone || "—"}
                </a>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {polling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ожидаем входящий звонок…
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground underline"
                    onClick={() => { stopPolling(); setStep("phone"); }}
                  >
                    Изменить номер
                  </button>
                  <button
                    type="button"
                    className="text-primary disabled:text-muted-foreground"
                    disabled={cooldown > 0 || busy}
                    onClick={sendCode}
                  >
                    {cooldown > 0 ? `Повторить через ${cooldown}с` : "Запросить новый номер"}
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
