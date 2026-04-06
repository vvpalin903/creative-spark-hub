import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface LotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot?: Tables<"lots"> | null;
}

export function LotFormDialog({ open, onOpenChange, lot }: LotFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!lot;

  const [form, setForm] = useState({
    title: lot?.title || "",
    address: lot?.address || "",
    description: lot?.description || "",
    category: lot?.category || "other",
    price_monthly: lot?.price_monthly?.toString() || "",
    access_mode: lot?.access_mode || "24/7",
    schedule: lot?.schedule || "",
    area_sqm: lot?.area_sqm?.toString() || "",
    lat: lot?.lat?.toString() || "",
    lng: lot?.lng?.toString() || "",
    is_mytishchi: lot?.is_mytishchi ?? true,
    rules: lot?.rules || "",
    status: lot?.status || "draft",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        address: form.address,
        description: form.description || null,
        category: form.category as any,
        price_monthly: parseInt(form.price_monthly),
        access_mode: form.access_mode as any,
        schedule: form.schedule || null,
        area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        is_mytishchi: form.is_mytishchi,
        rules: form.rules || null,
        status: form.status as any,
      };

      if (isEdit) {
        const { error } = await supabase.from("lots").update(payload).eq("id", lot!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lots").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lots"] });
      toast({ title: isEdit ? "Лот обновлён" : "Лот создан" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.address || !form.price_monthly) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать лот" : "Создать лот"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div>
            <Label>Адрес *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tires">Шины</SelectItem>
                  <SelectItem value="bikes">Велосипеды</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Цена (₽/мес) *</Label>
              <Input type="number" value={form.price_monthly} onChange={(e) => set("price_monthly", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Режим доступа</Label>
              <Select value={form.access_mode} onValueChange={(v) => set("access_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24/7">24/7</SelectItem>
                  <SelectItem value="scheduled">По расписанию</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Площадь (м²)</Label>
              <Input type="number" value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} />
            </div>
          </div>
          {form.access_mode === "scheduled" && (
            <div>
              <Label>Расписание</Label>
              <Input value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="Пн-Пт 9:00-18:00" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Широта (lat)</Label>
              <Input type="number" step="any" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
            </div>
            <div>
              <Label>Долгота (lng)</Label>
              <Input type="number" step="any" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Правила хранения</Label>
            <Textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_mytishchi} onCheckedChange={(v) => set("is_mytishchi", v)} />
            <Label>Мытищи</Label>
          </div>
          <div>
            <Label>Статус</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="published">Опубликован</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
