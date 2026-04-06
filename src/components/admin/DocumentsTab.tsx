import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export function DocumentsTab() {
  const queryClient = useQueryClient();
  const [editDoc, setEditDoc] = useState<Tables<"site_documents"> | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: docs } = useQuery({
    queryKey: ["admin", "site_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_documents").select("*").order("created_at", { ascending: false });
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
              <TableHead>Версия</TableHead>
              <TableHead>Активен</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{doc.slug}</TableCell>
                <TableCell>{doc.version}</TableCell>
                <TableCell>
                  <Badge variant={doc.is_active ? "default" : "secondary"}>
                    {doc.is_active ? "Да" : "Нет"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(doc.updated_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditDoc(doc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!docs || docs.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет документов</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(creating || editDoc) && (
        <DocFormDialog
          open
          onOpenChange={(v) => { if (!v) { setCreating(false); setEditDoc(null); } }}
          doc={editDoc}
        />
      )}
    </>
  );
}

function DocFormDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (v: boolean) => void; doc?: Tables<"site_documents"> | null }) {
  const queryClient = useQueryClient();
  const isEdit = !!doc;
  const [form, setForm] = useState({
    title: doc?.title || "",
    slug: doc?.slug || "",
    content: doc?.content || "",
    is_active: doc?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase.from("site_documents").update({
          title: form.title,
          slug: form.slug,
          content: form.content,
          is_active: form.is_active,
          version: (doc!.version || 0) + 1,
        }).eq("id", doc!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_documents").insert({
          title: form.title,
          slug: form.slug,
          content: form.content,
          is_active: form.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "site_documents"] });
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
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <Label>Название *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="Политика конфиденциальности" />
          </div>
          <div>
            <Label>Slug (URL) *</Label>
            <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} required placeholder="privacy-policy" />
          </div>
          <div>
            <Label>Содержимое (Markdown) *</Label>
            <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} required rows={15} className="font-mono text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            <Label>Активен</Label>
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
