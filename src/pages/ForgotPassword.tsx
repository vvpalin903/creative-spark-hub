import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Письмо отправлено", description: "Проверьте почту" });
  };

  return (
    <Layout>
      <div className="container py-12 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Восстановление пароля</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-sm">
                <p>Мы отправили ссылку для сброса пароля на <strong>{email}</strong>.</p>
                <p className="text-muted-foreground">Перейдите по ссылке в письме, чтобы задать новый пароль.</p>
                <Button asChild variant="outline" className="w-full"><Link to="/auth">Назад ко входу</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Отправить ссылку
                </Button>
                <Button asChild variant="ghost" className="w-full"><Link to="/auth">Назад</Link></Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
