import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, Wallet, Users, Shield, Upload, X } from "lucide-react";

const hostFaq = [
  { q: "Какие требования к месту?", a: "Место должно быть сухим, безопасным и иметь отдельный вход или возможность доступа. Подходят гаражи, кладовки, подвалы, балконы." },
  { q: "Как проходит верификация?", a: "После подачи заявки мы попросим загрузить фото документа (паспорт или водительское удостоверение). Проверка занимает 1-2 рабочих дня." },
  { q: "Сколько можно заработать?", a: "Доход зависит от площади, местоположения и категории. В среднем хосты зарабатывают от 1 000 до 5 000 ₽ в месяц." },
  { q: "Нужно ли платить налоги?", a: "Да, доход от сдачи места облагается налогом. Мы рекомендуем оформить самозанятость." },
];

export default function Host() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) {
      toast({ title: "Некоторые файлы слишком большие", description: "Максимум 10 МБ на файл", variant: "destructive" });
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, 10));
    if (e.target) e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const hostName = (fd.get("host_name") as string)?.trim();
    const hostPhone = (fd.get("host_phone") as string)?.trim();
    const hostEmail = (fd.get("host_email") as string)?.trim();
    const address = (fd.get("address") as string)?.trim();
    const placeType = (fd.get("place_type") as string)?.trim();
    const category = fd.get("category") as string;
    const accessMode = fd.get("access_mode") as string;
    const schedule = (fd.get("schedule") as string)?.trim();

    if (!hostName || !hostPhone || !address || !hostEmail) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const isMytishchi = address.toLowerCase().includes("мытищ");
    const appId = crypto.randomUUID();

    // Geocode address via Yandex
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const geocodeUrl = `https://geocode-maps.yandex.ru/1.x/?apikey=5704dc84-6009-4a48-99ec-17cec1934c65&format=json&geocode=${encodeURIComponent(address)}`;
      const geoRes = await fetch(geocodeUrl);
      const geoData = await geoRes.json();
      const pos = geoData?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (pos) {
        const [lngStr, latStr] = pos.split(" ");
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
      }
    } catch {
      // Geocoding failed, continue without coordinates
    }

    // Upload photos to storage
    const uploadedPhotoUrls: string[] = [];
    for (const photo of photos) {
      try {
        const ext = photo.name.split(".").pop() || "jpg";
        const filePath = `${appId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("lot-photos").upload(filePath, photo);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("lot-photos").getPublicUrl(filePath);
          uploadedPhotoUrls.push(urlData.publicUrl);
        }
      } catch {
        // continue uploading others
      }
    }

    const { error } = await supabase.from("host_applications").insert({
      id: appId,
      host_name: hostName,
      host_phone: hostPhone,
      host_email: hostEmail,
      address,
      lat,
      lng,
      place_type: placeType || null,
      category: category as any,
      access_mode: accessMode as any,
      schedule: schedule || null,
      photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : [],
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось отправить заявку", variant: "destructive" });
      return;
    }

    // Send notification email - "application received"
    supabase.functions.invoke("send-notification", {
      body: {
        type: "host_application_received",
        to: hostEmail,
        data: { name: hostName, address },
      },
    }).catch(console.error);

    if (!isMytishchi) {
      // For non-Mytishchi: send second email - "application approved"
      setTimeout(() => {
        supabase.functions.invoke("send-notification", {
          body: {
            type: "host_application_approved",
            to: hostEmail,
            data: { name: hostName, address, is_mytishchi: false },
          },
        }).catch(console.error);
      }, 2000); // Small delay so emails arrive in order
    }

    if (isMytishchi) {
      toast({ title: "Заявка отправлена!", description: "Теперь загрузите документы для верификации" });
      navigate(`/host/verification?app=${appId}&mytishchi=true`);
    } else {
      toast({ title: "Заявка отправлена!", description: "Ваша заявка автоматически подтверждена." });
      navigate(`/host/verification?app=${appId}&mytishchi=false`);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-accent via-background to-secondary py-16">
        <div className="container text-center max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Зарабатывайте на свободном месте
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Сдайте гараж, кладовку или балкон для хранения вещей ваших соседей
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <Wallet className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Доход</h3>
              <p className="text-sm text-muted-foreground">от 1 000 ₽/мес</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Клиенты</h3>
              <p className="text-sm text-muted-foreground">Мы найдём для вас</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Безопасность</h3>
              <p className="text-sm text-muted-foreground">Все клиенты проверены</p>
            </div>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="py-16 bg-background">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Подать заявку на размещение</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host_name">Ваше имя *</Label>
                    <Input id="host_name" name="host_name" required maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="host_phone">Телефон *</Label>
                    <Input id="host_phone" name="host_phone" type="tel" required maxLength={20} placeholder="+7 (___) ___-__-__" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="host_email">Электронная почта *</Label>
                  <Input id="host_email" name="host_email" type="email" required maxLength={255} placeholder="email@example.com" />
                  <p className="text-xs text-muted-foreground mt-1">Координация будет осуществляться по электронной почте</p>
                </div>
                <div>
                  <Label htmlFor="address">Адрес *</Label>
                  <Input id="address" name="address" required maxLength={255} placeholder="Начните вводить адрес..." />
                </div>
                <div>
                  <Label htmlFor="place_type">Тип места</Label>
                  <Input id="place_type" name="place_type" maxLength={100} placeholder="Гараж, кладовка, подвал..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Категория</Label>
                    <Select name="category" defaultValue="other">
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
                    <Label htmlFor="access_mode">Режим доступа</Label>
                    <Select name="access_mode" defaultValue="24/7">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24/7">24/7</SelectItem>
                        <SelectItem value="scheduled">По расписанию</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="schedule">Расписание (если по расписанию)</Label>
                  <Textarea id="schedule" name="schedule" maxLength={500} rows={2} placeholder="Пн-Пт 9:00-21:00" />
                </div>

                {/* Photo upload */}
                <div>
                  <Label>Фотографии места (до 10 шт.)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Добавьте фото, чтобы ваше объявление было привлекательнее</p>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                      {photos.map((file, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Фото ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photos.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {photos.length === 0 ? "Добавить фотографии" : `Добавить ещё (${photos.length}/10)`}
                    </Button>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Отправить заявку
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Host FAQ */}
      <section className="py-16 bg-secondary/30">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">FAQ для хостов</h2>
          <Accordion type="single" collapsible className="w-full">
            {hostFaq.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-foreground">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Layout>
  );
}
