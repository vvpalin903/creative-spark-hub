import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase автоматически обработает recovery-token из URL hash
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Если уже есть сессия — тоже ок
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Минимум 8 символов", variant: "destructive" }); return;
    }
    if (password !== confirm) {
      toast({ title: "Пароли не совпадают", variant: "destructive" }); return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return;
    }
    toast({ title: "Пароль обновлён" });
    navigate("/dashboard", { replace: true });
  };

  return (
    <Layout>
      <div className="container py-12 max-w-md">
        <Card>
          <CardHeader><CardTitle>Новый пароль</CardTitle></CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground">Проверяем ссылку...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pw">Новый пароль</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <div>
                  <Label htmlFor="pw2">Подтвердите</Label>
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Сохранить
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
