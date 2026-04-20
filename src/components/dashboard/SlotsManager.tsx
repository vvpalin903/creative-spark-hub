import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";
import { storageCategoryLabels } from "@/lib/labels";
import type { Tables, Enums } from "@/integrations/supabase/types";

const slotStatusLabels: Record<string, string> = {
  available: "Доступен",
  reserved: "Зарезервирован",
  occupied: "Занят",
  unavailable: "Недоступен",
};

interface Props {
  objectId: string;
}

export function SlotsManager({ objectId }: Props) {
  const queryClient = useQueryClient();
  const [draftCategory, setDraftCategory] = useState<Enums<"storage_category">>("other");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftCount, setDraftCount] = useState("1");

  const { data: slots, isLoading } = useQuery({
    queryKey: ["object", objectId, "slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_slots")
        .select("*")
        .eq("object_id", objectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addSlot = useMutation({
    mutationFn: async () => {
      if (!draftPrice) throw new Error("Укажите цену");
      const { error } = await supabase.from("storage_slots").insert({
        object_id: objectId,
        category: draftCategory,
        price_monthly: parseInt(draftPrice) || 0,
        slot_count: parseInt(draftCount) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", objectId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      setDraftPrice("");
      setDraftCount("1");
      toast({ title: "Слот добавлен" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateSlot = useMutation({
    mutationFn: async (slot: Tables<"storage_slots">) => {
      const { error } = await supabase
        .from("storage_slots")
        .update({
          category: slot.category,
          price_monthly: slot.price_monthly,
          slot_count: slot.slot_count,
          slot_status: slot.slot_status,
          description: slot.description,
        })
        .eq("id", slot.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", objectId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: "Сохранено" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("storage_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", objectId, "slots"] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: "Удалено" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : (
        slots?.map((slot) => (
          <SlotEditor
            key={slot.id}
            slot={slot}
            onSave={(s) => updateSlot.mutate(s)}
            onDelete={() => deleteSlot.mutate(slot.id)}
            saving={updateSlot.isPending}
          />
        ))
      )}

      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Добавить слот</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Категория</Label>
              <Select value={draftCategory} onValueChange={(v) => setDraftCategory(v as Enums<"storage_category">)}>
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
              <Input type="number" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} placeholder="1500" />
            </div>
            <div>
              <Label className="text-xs">Кол-во мест</Label>
              <Input type="number" value={draftCount} onChange={(e) => setDraftCount(e.target.value)} min={1} />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={() => addSlot.mutate()} disabled={addSlot.isPending} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Добавить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SlotEditor({
  slot,
  onSave,
  onDelete,
  saving,
}: {
  slot: Tables<"storage_slots">;
  onSave: (s: Tables<"storage_slots">) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(slot);
  const dirty = JSON.stringify(draft) !== JSON.stringify(slot);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Категория</Label>
            <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as Enums<"storage_category"> })}>
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
            <Input type="number" value={draft.price_monthly} onChange={(e) => setDraft({ ...draft, price_monthly: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">Кол-во мест</Label>
            <Input type="number" value={draft.slot_count} onChange={(e) => setDraft({ ...draft, slot_count: parseInt(e.target.value) || 1 })} min={1} />
          </div>
          <div>
            <Label className="text-xs">Статус</Label>
            <Select value={draft.slot_status} onValueChange={(v) => setDraft({ ...draft, slot_status: v as Enums<"slot_status"> })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(slotStatusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Описание (опционально)</Label>
          <Textarea
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            maxLength={300}
            placeholder="Например: подходит для 4 шин на дисках R17"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить
          </Button>
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => onSave(draft)}>
            <Save className="h-3.5 w-3.5 mr-1" /> Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
