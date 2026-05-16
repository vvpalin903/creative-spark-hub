import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Loader2, AlertCircle } from "lucide-react";

interface Props {
  objectId: string;
}

const BUCKET = "verification-docs";
const MAX_FILES = 5;

const statusLabels: Record<string, string> = {
  pending: "На проверке",
  approved: "Одобрен",
  rejected: "Отклонён",
};

export function OwnershipDocsManager({ objectId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["ownership_docs", objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("user_id", user!.id)
        .eq("object_id", objectId)
        .eq("document_type", "ownership")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ownership_docs", objectId] });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    if (docs.length + files.length > MAX_FILES) {
      toast({ title: `Не больше ${MAX_FILES} файлов`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name}: больше 10 МБ`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop() || "pdf";
        const path = `${user.id}/${objectId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) {
          toast({ title: "Ошибка загрузки", description: upErr.message, variant: "destructive" });
          continue;
        }
        const { error: insErr } = await supabase.from("verification_documents").insert({
          user_id: user.id,
          object_id: objectId,
          document_type: "ownership",
          file_url: path,
          status: "pending",
        });
        if (insErr) {
          toast({ title: "Ошибка", description: insErr.message, variant: "destructive" });
        }
      }
      // If the object was in "needs_changes", auto-resubmit it for review
      const { data: obj } = await supabase
        .from("host_objects")
        .select("object_status")
        .eq("id", objectId)
        .maybeSingle();
      if (obj?.object_status === "needs_changes" || obj?.object_status === "draft") {
        await supabase
          .from("host_objects")
          .update({ object_status: "pending_review", verification_status: "pending" })
          .eq("id", objectId);
        queryClient.invalidateQueries({ queryKey: ["host", "object", objectId] });
        queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      }
      refresh();
      toast({ title: "Документ загружен", description: "Отправлен модератору на проверку" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadDoc = async (doc: any) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_url, 60);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const removeDoc = async (doc: any) => {
    if (doc.status === "approved") {
      toast({ title: "Нельзя удалить одобренный документ", variant: "destructive" });
      return;
    }
    await supabase.storage.from(BUCKET).remove([doc.file_url]);
    await supabase.from("verification_documents").delete().eq("id", doc.id);
    refresh();
  };

  return (
    <div className="space-y-3">
      {docs.length === 0 && !isLoading && (
        <div className="flex items-start gap-2 rounded border border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Подтвердите право на сдачу объекта</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Загрузите документ, подтверждающий право собственности или право распоряжения (выписка ЕГРН, договор аренды с правом субаренды и т.п.). Без проверки документа объект не будет опубликован.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
            <button onClick={() => downloadDoc(d)} className="flex items-center gap-2 hover:underline text-left min-w-0">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{d.file_url.split("/").pop()}</span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                {statusLabels[d.status] || d.status}
              </Badge>
              {d.status !== "approved" && (
                <Button size="icon" variant="ghost" onClick={() => removeDoc(d)} className="h-7 w-7">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {docs.length < MAX_FILES && (
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Загрузить документ
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">PDF или фото, до 10 МБ. Документы видны только модераторам.</p>
    </div>
  );
}
