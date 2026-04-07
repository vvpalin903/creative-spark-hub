import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { YandexMap } from "@/components/YandexMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Ruler, AlertTriangle, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Enums } from "@/integrations/supabase/types";

const categoryLabels: Record<string, string> = {
  tires: "Шины",
  bikes: "Велосипеды",
  other: "Другое",
};

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const clientName = (formData.get("client_name") as string)?.trim();
    const clientPhone = (formData.get("client_phone") as string)?.trim();
    const clientEmail = (formData.get("client_email") as string)?.trim();
    const category = formData.get("category") as Enums<"lot_category"> | null;
    const desiredDate = formData.get("desired_date") as string;
    const comment = (formData.get("comment") as string)?.trim();

    if (!clientName || !clientPhone || !clientEmail) {
      toast({ title: "Ошибка", description: "Заполните имя, телефон и email", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const appId = crypto.randomUUID();
    const { error } = await supabase.from("client_applications").insert({
      id: appId,
      lot_id: id!,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      category,
      desired_date: desiredDate || null,
      comment: comment || null,
      status: "sent_to_host" as any,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось отправить заявку", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    toast({ title: "Заявка отправлена!", description: "Мы свяжемся с вами по электронной почте" });

    // Send confirmation to client
    supabase.functions.invoke("send-notification", {
      body: {
        type: "client_application_received",
        to: clientEmail,
        data: {
          name: clientName,
          lot_title: lot?.title,
          is_mytishchi: lot?.is_mytishchi,
        },
      },
    }).catch(console.error);

    // Send notification to host if lot has host_email
    if (lot?.host_email) {
      const hideUrl = `${window.location.origin}/api/hide-lot?token=${lot.hide_token}`;
      // Use edge function URL for hide-lot
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const hideLotUrl = `https://${projectId}.supabase.co/functions/v1/hide-lot?token=${lot.hide_token}`;

      supabase.functions.invoke("send-notification", {
        body: {
          type: "client_app_to_host",
          to: lot.host_email,
          data: {
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            lot_title: lot.title,
            comment: comment || null,
            desired_date: desiredDate || null,
            hide_url: hideLotUrl,
          },
        },
      }).catch(console.error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!lot) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Лот не найден</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Test mode warning for non-Mytishchi lots */}
        {!lot.is_mytishchi && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 mb-6">
            <p className="text-sm text-foreground">
              <AlertTriangle className="inline h-4 w-4 mr-1 text-warning" />
              <strong>Тестовый режим:</strong> Сервис «Место рядом» работает в тестовом режиме. Проверка объектов осуществляется пока только в границах города Мытищи Московской области.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {lot.photos && lot.photos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lot.photos.map((photo, i) => (
                  <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img src={photo} alt={`${lot.title} — фото ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Нет фото</p>
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary">{categoryLabels[lot.category]}</Badge>
                {!lot.is_mytishchi && (
                  <Badge variant="outline" className="border-warning text-warning">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Не Мытищи
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{lot.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-4 w-4" /> {lot.address}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {lot.access_mode === "24/7" ? "Доступ 24/7" : `По расписанию: ${lot.schedule || "уточняйте"}`}
                </span>
                {lot.area_sqm && (
                  <span className="flex items-center gap-1">
                    <Ruler className="h-4 w-4" /> {lot.area_sqm} м²
                  </span>
                )}
              </div>
            </div>

            <div className="text-2xl font-bold text-primary">
              {lot.price_monthly.toLocaleString("ru-RU")} ₽/мес
            </div>

            {lot.description && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Описание</h2>
                <p className="text-muted-foreground whitespace-pre-line">{lot.description}</p>
              </div>
            )}

            {lot.rules && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Правила хранения</h2>
                <p className="text-muted-foreground whitespace-pre-line">{lot.rules}</p>
              </div>
            )}

            {lot.category === "other" && (
              <div className="p-4 rounded-lg bg-accent border border-primary/20">
                <p className="text-sm text-accent-foreground">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  Категория «Другое» — условия хранения согласуются индивидуально с хостом.
                </p>
              </div>
            )}

            {/* Map */}
            {lot.lat && lot.lng && (
              <YandexMap
                points={[{ id: lot.id, lat: lot.lat, lng: lot.lng, title: lot.title, price: lot.price_monthly, category: lot.category }]}
                center={[lot.lat, lot.lng]}
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
                    <p className="font-semibold text-foreground">Заявка отправлена!</p>
                    <p className="text-sm text-muted-foreground mt-1">Мы свяжемся с вами по электронной почте</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="client_name">Имя *</Label>
                      <Input id="client_name" name="client_name" required maxLength={100} />
                    </div>
                    <div>
                      <Label htmlFor="client_phone">Телефон *</Label>
                      <Input id="client_phone" name="client_phone" type="tel" required maxLength={20} placeholder="+7 (___) ___-__-__" />
                    </div>
                    <div>
                      <Label htmlFor="client_email">Электронная почта *</Label>
                      <Input id="client_email" name="client_email" type="email" required maxLength={255} placeholder="email@example.com" />
                      <p className="text-xs text-muted-foreground mt-1">Координация будет осуществляться по электронной почте</p>
                    </div>
                    <div>
                      <Label htmlFor="category">Что хотите хранить</Label>
                      <Select name="category" defaultValue={lot.category}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tires">Шины</SelectItem>
                          <SelectItem value="bikes">Велосипеды</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="desired_date">Желаемая дата начала</Label>
                      <Input id="desired_date" name="desired_date" type="date" />
                    </div>
                    <div>
                      <Label htmlFor="comment">Комментарий</Label>
                      <Textarea id="comment" name="comment" maxLength={500} rows={3} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
