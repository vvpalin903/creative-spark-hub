import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { YandexMap } from "@/components/YandexMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Clock, Ruler, Loader2, Check, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  accessModeLabels,
  scheduleModeLabels,
  storageCategoryLabels,
} from "@/lib/labels";
import { HostRating } from "@/components/reviews/HostRating";

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isHost, isClient } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const { data: object, isLoading } = useQuery({
    queryKey: ["public", "object", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_objects")
        .select("*, storage_slots(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: hostProfile } = useQuery({
    queryKey: ["lot-host-profile", object?.host_user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", object!.host_user_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!object?.host_user_id,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, phone, email")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async (form: { startDate: string; endDate: string; comment: string }) => {
      if (!user || !object) throw new Error("Нужна авторизация");

      const slot = (object as any).storage_slots?.find((s: any) => s.id === selectedSlot) || null;

      const { error } = await supabase.from("booking_requests").insert({
        object_id: object.id,
        slot_id: slot?.id || null,
        host_user_id: object.host_user_id,
        client_user_id: user.id,
        client_name: profile?.name || user.email?.split("@")[0] || "Без имени",
        client_phone: profile?.phone || "",
        client_email: profile?.email || user.email || null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        comment: form.comment.trim() || null,
        request_status: "new",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Заявка отправлена", description: "Хост получит уведомление" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/lot/${id}`)}`);
      return;
    }
    if (isHost && !isClient) {
      toast({
        title: "Действие недоступно",
        description: "Для того чтобы снять место, необходимо зарегистрироваться как клиент на отдельную учётную запись.",
        variant: "destructive",
      });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const startDate = (fd.get("start_date") as string) || "";
    const endDate = (fd.get("end_date") as string) || "";
    const comment = ((fd.get("comment") as string) || "").trim();

    const slotsList = (object as any)?.storage_slots || [];
    if (slotsList.length > 0 && !selectedSlot) {
      toast({ title: "Выберите слот", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Укажите даты", description: "Заполните «С» и «По»", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Неверные даты", description: "Дата «По» должна быть позже «С»", variant: "destructive" });
      return;
    }
    if (!comment) {
      toast({ title: "Добавьте комментарий", description: "Опишите, что планируете хранить", variant: "destructive" });
      return;
    }
    const selected = slotsList.find((s: any) => s.id === selectedSlot);
    if (selected?.category === "other" && comment.length < 10) {
      toast({
        title: "Уточните, что хранить",
        description: "Для категории «Другое» опишите содержимое подробнее (минимум 10 символов)",
        variant: "destructive",
      });
      return;
    }

    submit.mutate({ startDate, endDate, comment });
  };

  if (isLoading || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!object) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Объект не найден</p>
        </div>
      </Layout>
    );
  }

  const slots = (object as any).storage_slots || [];

  return (
    <Layout>
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {object.photos && object.photos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {object.photos.map((photo, i) => (
                  <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img src={photo} alt={`${object.title} — фото ${i + 1}`} className="h-full w-full object-contain bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Нет фото</p>
              </div>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{object.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="h-4 w-4" /> {object.city ? `${object.city}, ` : ""}{object.address}
              </p>
              {object.host_user_id && (
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {hostProfile?.name && (
                    <Link
                      to={`/host/${object.host_user_id}`}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Хост: <span className="font-medium text-foreground">{hostProfile.name}</span>
                    </Link>
                  )}
                  <HostRating hostUserId={object.host_user_id} />
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {scheduleModeLabels[object.schedule_mode] || "—"}
                  {object.schedule_notes && ` · ${object.schedule_notes}`}
                </span>
                <span className="text-muted-foreground">
                  Доступ: {accessModeLabels[object.access_mode] || "—"}
                </span>
                {object.area_sqm && (
                  <span className="flex items-center gap-1">
                    <Ruler className="h-4 w-4" /> {object.area_sqm} м²
                  </span>
                )}
              </div>
            </div>

            {/* Slots */}
            {slots.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Варианты хранения</h2>
                <div className="grid gap-2">
                  {slots.map((s: any) => (
                    <Card key={s.id}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{storageCategoryLabels[s.category] || s.category}</Badge>
                            {s.slot_status !== "available" && (
                              <Badge variant="outline">{s.slot_status}</Badge>
                            )}
                          </div>
                          {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                        </div>
                        <div className="text-base font-bold text-primary whitespace-nowrap">
                          {s.price_monthly > 0 ? `${s.price_monthly.toLocaleString("ru-RU")} ₽/мес` : "По запросу"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {object.description && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Описание</h2>
                <p className="text-muted-foreground whitespace-pre-line">{object.description}</p>
              </div>
            )}

            {object.rules && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Правила хранения</h2>
                <p className="text-muted-foreground whitespace-pre-line">{object.rules}</p>
              </div>
            )}

            {/* Map */}
            {object.lat && object.lng && (
              <YandexMap
                points={[{ id: object.id, lat: object.lat, lng: object.lng, title: object.title, price: 0, category: slots[0]?.category || "other" }]}
                center={[object.lat, object.lng]}
                zoom={15}
                singlePoint
                className="w-full h-[300px]"
              />
            )}
          </div>

          {/* Application form */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Оставить заявку</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-6">
                    <Check className="h-12 w-12 text-success mx-auto mb-3" />
                    <p className="font-semibold text-foreground">Заявка отправлена</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Следить за статусом можно в кабинете
                    </p>
                    <Button asChild className="mt-4 w-full">
                      <Link to="/dashboard/client">В кабинет</Link>
                    </Button>
                  </div>
                ) : !user ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Чтобы оставить заявку, войдите или зарегистрируйтесь.
                    </p>
                    <Button asChild className="w-full">
                      <Link to={`/auth?next=${encodeURIComponent(`/lot/${id}`)}`}>
                        <LogIn className="h-4 w-4 mr-2" /> Войти и оставить заявку
                      </Link>
                    </Button>
                  </div>
                ) : isHost && !isClient ? (
                  <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-foreground">
                      Бронирование недоступно для аккаунта хоста
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Для того чтобы снять место, необходимо зарегистрироваться как клиент на отдельную учётную запись.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {slots.length > 0 && (
                      <div>
                        <Label htmlFor="slot">Слот <span className="text-destructive">*</span></Label>
                        <select
                          id="slot"
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={selectedSlot}
                          onChange={(e) => setSelectedSlot(e.target.value)}
                          required
                        >
                          <option value="">Выберите слот</option>
                          {slots.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {storageCategoryLabels[s.category] || s.category}
                              {s.price_monthly > 0 ? ` — ${s.price_monthly} ₽/мес` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="start_date">С <span className="text-destructive">*</span></Label>
                        <Input id="start_date" name="start_date" type="date" required />
                      </div>
                      <div>
                        <Label htmlFor="end_date">По <span className="text-destructive">*</span></Label>
                        <Input id="end_date" name="end_date" type="date" required />
                      </div>
                    </div>
                    {(() => {
                      const sel = (slots as any[]).find((s: any) => s.id === selectedSlot);
                      const isOther = sel?.category === "other";
                      return (
                        <div>
                          <Label htmlFor="comment">
                            Комментарий <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="comment"
                            name="comment"
                            maxLength={500}
                            rows={3}
                            required
                            placeholder={
                              isOther
                                ? "Обязательно укажите, что именно будете хранить"
                                : "Что хотите хранить, особенности"
                            }
                          />
                          {isOther && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Для категории «Другое» опишите содержимое подробнее (минимум 10 символов).
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">
                      Заполните слот, даты и комментарий — все поля обязательны.
                    </p>
                    <Button type="submit" className="w-full" disabled={submit.isPending}>
                      {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Отправить заявку
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
