import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const DOC_TYPES: Record<string, string> = {
  terms: "Пользовательское соглашение",
  privacy: "Политика ПДн",
  consent: "Согласие",
  host_rules: "Правила для хостов",
  dispute: "Разрешение споров",
  contract_template: "Шаблон договора",
  other: "Другое",
};

export function DocumentsTab() {
  const [editDoc, setEditDoc] = useState<Tables<"site_documents"> | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: docs } = useQuery({
    queryKey: ["admin", "site_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_documents").select("*").order("slug");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> Добавить документ
        </Button>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Версия</TableHead>
              <TableHead>Где</TableHead>
              <TableHead>Активен</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.map((doc: any) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.short_title || doc.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{doc.slug}</TableCell>
                <TableCell className="text-sm">{DOC_TYPES[doc.doc_type] || doc.doc_type}</TableCell>
                <TableCell>{doc.version}</TableCell>
                <TableCell className="space-x-1">
                  {doc.show_in_footer && <Badge variant="outline">футер</Badge>}
                  {doc.requires_acceptance_client && <Badge variant="outline">клиент</Badge>}
                  {doc.requires_acceptance_host && <Badge variant="outline">хост</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={doc.is_active ? "default" : "secondary"}>{doc.is_active ? "Да" : "Нет"}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditDoc(doc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!docs || docs.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Нет документов
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(creating || editDoc) && (
        <DocFormDialog
          open
          onOpenChange={(v) => {
            if (!v) {
              setCreating(false);
              setEditDoc(null);
            }
          }}
          doc={editDoc}
        />
      )}
    </>
  );
}

function DocFormDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (v: boolean) => void; doc?: Tables<"site_documents"> | null }) {
  const queryClient = useQueryClient();
  const isEdit = !!doc;
  const d: any = doc || {};
  const [form, setForm] = useState({
    title: d.title || "",
    short_title: d.short_title || "",
    slug: d.slug || "",
    content: d.content || "",
    doc_type: d.doc_type || "other",
    is_active: d.is_active ?? true,
    show_in_footer: d.show_in_footer ?? false,
    requires_acceptance_client: d.requires_acceptance_client ?? false,
    requires_acceptance_host: d.requires_acceptance_host ?? false,
    requires_acceptance_other: d.requires_acceptance_other ?? false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        title: form.title.trim(),
        short_title: form.short_title.trim() || null,
        slug: form.slug.trim(),
      };
      if (isEdit) {
        const { error } = await supabase
          .from("site_documents")
          .update({ ...payload, version: (doc!.version || 0) + 1, published_at: form.is_active ? new Date().toISOString() : (d.published_at ?? null) })
          .eq("id", doc!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_documents")
          .insert({ ...payload, published_at: form.is_active ? new Date().toISOString() : null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "site_documents"] });
      queryClient.invalidateQueries({ queryKey: ["footer-docs"] });
      queryClient.invalidateQueries({ queryKey: ["acceptance-docs"] });
      toast({ title: isEdit ? "Документ обновлён" : "Документ создан" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать документ" : "Новый документ"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Название *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="Политика конфиденциальности" />
            </div>
            <div>
              <Label>Короткое название</Label>
              <Input value={form.short_title} onChange={(e) => set("short_title", e.target.value)} placeholder="Для меню/футера" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug (URL) *</Label>
              <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} required placeholder="privacy" />
            </div>
            <div>
              <Label>Тип документа</Label>
              <Select value={form.doc_type} onValueChange={(v) => set("doc_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Содержимое (Markdown) *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              required
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Размещение и подтверждение</p>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Активен (опубликован)</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Показывать в футере</Label>
              <Switch checked={form.show_in_footer} onCheckedChange={(v) => set("show_in_footer", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Подтверждение клиентом</Label>
              <Switch
                checked={form.requires_acceptance_client}
                onCheckedChange={(v) => set("requires_acceptance_client", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Подтверждение хостом</Label>
              <Switch
                checked={form.requires_acceptance_host}
                onCheckedChange={(v) => set("requires_acceptance_host", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Подтверждение в иных сценариях</Label>
              <Switch
                checked={form.requires_acceptance_other}
                onCheckedChange={(v) => set("requires_acceptance_other", v)}
              />
            </div>
          </div>

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Сохранение увеличит версию документа (текущая: {doc!.version}).
            </p>
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
