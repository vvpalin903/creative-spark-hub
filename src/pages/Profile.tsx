import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Star } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface Prefs {
  email_new_request: boolean;
  email_request_status: boolean;
  email_new_message: boolean;
  email_verification: boolean;
}

const DEFAULT_PREFS: Prefs = {
  email_new_request: true, email_request_status: true,
  email_new_message: true, email_verification: true,
};

export default function Profile() {
  const { user, signOut, isHost } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("name, phone, city, district, notification_prefs")
        .eq("user_id", user.id).maybeSingle();
      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
        setDistrict(data.district || "");
        setPrefs({ ...DEFAULT_PREFS, ...((data.notification_prefs as any) || {}) });
      }
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name, phone, city, district, notification_prefs: prefs as any,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Сохранено" });
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Минимум 8 символов", variant: "destructive" }); return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setNewPassword("");
    toast({ title: "Пароль обновлён" });
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Аккаунт удалён" });
    await signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return <Layout><div className="container py-8"><Loader2 className="h-6 w-6 animate-spin" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Профиль и настройки</h1>

        <Card>
          <CardHeader><CardTitle>Личные данные</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">Город</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="district">Район</Label>
                <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isHost && user && <MyReviewsCard userId={user.id} />}

        <Card>
          <CardHeader><CardTitle>Email-уведомления</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ["email_new_request", "Новые заявки (для хоста)"],
              ["email_request_status", "Изменение статуса моих заявок"],
              ["email_new_message", "Новые сообщения в чате"],
              ["email_verification", "Верификация и системные"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                <Switch id={key} checked={prefs[key as keyof Prefs]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Сохранить
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Смена пароля</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" placeholder="Новый пароль" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
            <Button variant="outline" onClick={changePassword} disabled={!newPassword}>Обновить пароль</Button>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Опасная зона</CardTitle></CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Удалить аккаунт</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Аккаунт будет удалён, ваши объекты сняты с публикации. Действие необратимо.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground">
                    Удалить навсегда
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function MyReviewsCard({ userId }: { userId: string }) {
  const { data: rating } = useQuery({
    queryKey: ["my-host-rating", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_rating", { _host_user_id: userId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { avg_rating: number | null; review_count: number } | null;
    },
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["my-host-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, rater_user_id, rater_role")
        .eq("ratee_user_id", userId)
        .eq("rater_role", "client")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const raterIds = Array.from(new Set((reviews || []).map((r) => r.rater_user_id)));
  const { data: raters } = useQuery({
    queryKey: ["my-host-reviews-raters", userId, raterIds.join(",")],
    queryFn: async () => {
      if (raterIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", raterIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.user_id] = p.name || "Клиент"; });
      return map;
    },
    enabled: raterIds.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Мои отзывы</span>
          {rating?.review_count ? (
            <span className="text-sm font-normal inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-semibold">{Number(rating.avg_rating ?? 0).toFixed(1)}</span>
              <span className="text-muted-foreground">· {Number(rating.review_count)}</span>
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !reviews || reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">У вас пока нет отзывов от клиентов.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground truncate">
                      {raters?.[r.rater_user_id] || "Клиент"}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{r.comment}</p>
                )}
              </div>
            ))}
            <Link to={`/host/${userId}`} className="text-sm text-primary hover:underline inline-block">
              Открыть публичный профиль
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
