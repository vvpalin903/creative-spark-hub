import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { accessModeLabels, scheduleModeLabels, storageCategoryLabels } from "@/lib/labels";
import type { Tables, Enums } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  object?: Tables<"host_objects"> | null;
}

const YANDEX_KEY = "5704dc84-6009-4a48-99ec-17cec1934c65";

async function geocode(address: string) {
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_KEY}&format=json&geocode=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const json = await res.json();
    const obj = json?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!obj) return null;
    const [lng, lat] = obj.Point.pos.split(" ").map(parseFloat);
    const meta = obj.metaDataProperty?.GeocoderMetaData?.AddressDetails?.Country?.AdministrativeArea;
    const city =
      meta?.SubAdministrativeArea?.Locality?.LocalityName ||
      meta?.Locality?.LocalityName ||
      meta?.AdministrativeAreaName ||
      null;
    const district =
      meta?.SubAdministrativeArea?.Locality?.DependentLocality?.DependentLocalityName ||
      meta?.Locality?.DependentLocality?.DependentLocalityName ||
      meta?.SubAdministrativeArea?.SubAdministrativeAreaName ||
      null;
    return { lat, lng, city, district };
  } catch {
    return null;
  }
}

export function HostObjectFormDialog({ open, onOpenChange, object }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!object;

  const [form, setForm] = useState({
    title: object?.title || "",
    address: object?.address || "",
    description: object?.description || "",
    rules: object?.rules || "",
    area_sqm: object?.area_sqm?.toString() || "",
    access_mode: (object?.access_mode || "pre_approval") as Enums<"access_mode_ext">,
    schedule_mode: (object?.schedule_mode || "by_arrangement") as Enums<"schedule_mode">,
    schedule_notes: object?.schedule_notes || "",
    // slot fields (single slot per object on creation)
    slot_category: "other" as Enums<"storage_category">,
    slot_price: "",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Нужна авторизация");
      if (!form.title.trim() || !form.address.trim()) throw new Error("Заполните название и адрес");

      const geo = await geocode(form.address);

      const payload = {
        host_user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city: geo?.city || null,
        district: geo?.district || null,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        access_mode: form.access_mode,
        schedule_mode: form.schedule_mode,
        schedule_notes: form.schedule_notes.trim() || null,
        rules: form.rules.trim() || null,
        area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : null,
      };

      if (isEdit) {
        const { error } = await supabase.from("host_objects").update(payload).eq("id", object!.id);
        if (error) throw error;
        return object!.id;
      } else {
        const { data, error } = await supabase
          .from("host_objects")
          .insert({ ...payload, object_status: "draft" })
          .select("id")
          .single();
        if (error) throw error;

        // create initial slot if price provided
        if (form.slot_price) {
          await supabase.from("storage_slots").insert({
            object_id: data.id,
            category: form.slot_category,
            price_monthly: parseInt(form.slot_price) || 0,
            slot_count: 1,
          });
        }
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: isEdit ? "Объект обновлён" : "Объект создан" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать объект" : "Новый объект"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label>Название *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} placeholder="Гараж в ЖК Заречье" />
          </div>
          <div>
            <Label>Адрес *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} required maxLength={300} placeholder="г. Москва, ул. ..." />
            <p className="text-xs text-muted-foreground mt-1">Город и район определим автоматически</p>
          </div>

          <div>
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Опишите помещение, условия, особенности доступа, ограничения"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Режим доступа</Label>
              <Select value={form.access_mode} onValueChange={(v) => set("access_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(accessModeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Расписание</Label>
              <Select value={form.schedule_mode} onValueChange={(v) => set("schedule_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(scheduleModeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Уточнения по расписанию</Label>
            <Input value={form.schedule_notes} onChange={(e) => set("schedule_notes", e.target.value)} maxLength={300} placeholder="Например: 9:00–21:00" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Площадь (м²)</Label>
              <Input type="number" step="0.1" value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Правила хранения</Label>
            <Textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={2} maxLength={500} />
          </div>

          {!isEdit && (
            <div className="rounded-lg border p-3 space-y-3 bg-accent/30">
              <p className="text-sm font-medium">Первый слот хранения</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Категория</Label>
                  <Select value={form.slot_category} onValueChange={(v) => set("slot_category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(storageCategoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Цена (₽/мес)</Label>
                  <Input type="number" value={form.slot_price} onChange={(e) => set("slot_price", e.target.value)} placeholder="например, 1500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Можете добавить ещё слоты позже на странице объекта.</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
