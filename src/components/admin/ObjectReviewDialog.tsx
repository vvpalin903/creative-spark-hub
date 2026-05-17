import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  accessModeLabels,
  objectStatusLabels,
  objectVerificationStatusLabels,
  scheduleModeLabels,
} from "@/lib/labels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectId: string | null;
}

const VERIF_BUCKET = "verification-docs";
const VERIF_PUBLIC_PREFIX = "/storage/v1/object/public/verification-docs/";

const docStatusLabels: Record<string, string> = {
  pending: "На проверке",
  approved: "Одобрен",
  rejected: "Отклонён",
};

export function ObjectReviewDialog({ open, onOpenChange, objectId }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url: string; name: string; type: string } | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const handleOpenChange = (value: boolean) => {
    if (!value) setPreview(null);
    onOpenChange(value);
  };

  const { data: object } = useQuery({
    queryKey: ["admin", "object_review", objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_objects")
        .select("*")
        .eq("id", objectId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!objectId && open,
  });

  const { data: docs } = useQuery({
    queryKey: ["admin", "object_review_docs", objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("object_id", objectId!)
        .eq("document_type", "ownership")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!objectId && open,
  });

  const getDocPath = (fileUrl: string) => {
    let path = fileUrl;
    const idx = path.indexOf(VERIF_PUBLIC_PREFIX);
    if (idx !== -1) path = path.substring(idx + VERIF_PUBLIC_PREFIX.length);
    return path;
  };

  const viewDoc = async (doc: { id: string; file_url: string }) => {
    setLoadingId(doc.id);
    try {
      const path = getDocPath(doc.file_url);
      const { data: blob, error } = await supabase.storage.from(VERIF_BUCKET).download(path);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ id: doc.id, url: blobUrl, name: path.split("/").pop() || "Документ", type: blob.type });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const downloadPreview = () => {
    if (!preview) return;
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = preview.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Проверка объекта</DialogTitle>
          <DialogDescription>Фотографии объекта и документы для модерации.</DialogDescription>
        </DialogHeader>

        {!object ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{object.title}</h3>
              <p className="text-sm text-muted-foreground">{object.address}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">Статус: {objectStatusLabels[object.object_status]}</Badge>
                <Badge variant="outline">Верификация: {objectVerificationStatusLabels[object.verification_status]}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                <Info label="Доступ" value={accessModeLabels[object.access_mode]} />
                <Info label="Расписание" value={scheduleModeLabels[object.schedule_mode]} />
                {object.schedule_notes && <Info label="Уточнения" value={object.schedule_notes} />}
                {object.area_sqm && <Info label="Площадь" value={`${object.area_sqm} м²`} />}
                {object.city && <Info label="Город" value={object.city} />}
                {object.district && <Info label="Район" value={object.district} />}
              </div>
              {object.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Описание</p>
                  <p className="text-sm whitespace-pre-wrap">{object.description}</p>
                </div>
              )}
              {object.rules && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Правила хранения</p>
                  <p className="text-sm whitespace-pre-wrap">{object.rules}</p>
                </div>
              )}
            </div>

            <section>
              <h4 className="font-semibold mb-2">Фотографии объекта ({object.photos?.length || 0})</h4>
              {object.photos && object.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {object.photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded overflow-hidden border bg-muted block">
                      <img src={url} alt="Фото объекта" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Хост не загрузил фотографии.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold mb-2">Документы о праве собственности ({docs?.length || 0})</h4>
              {docs && docs.length > 0 ? (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{d.file_url.split("/").pop()}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                          {docStatusLabels[d.status] || d.status}
                        </Badge>
                        <Button size="sm" variant="outline" disabled={loadingId === d.id} onClick={() => viewDoc(d)}>
                          {loadingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Документы не загружены.</p>
              )}
            </section>

            {preview && (
              <section className="space-y-3 rounded border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold">Просмотр документа</h4>
                    <p className="truncate text-xs text-muted-foreground">{preview.name}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={downloadPreview}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Скачать
                  </Button>
                </div>
                {preview.type.startsWith("image/") ? (
                  <img src={preview.url} alt="Документ о праве собственности" className="max-h-[70vh] w-full rounded border object-contain bg-background" />
                ) : preview.type === "application/pdf" ? (
                  <iframe src={preview.url} title="Документ о праве собственности" className="h-[70vh] w-full rounded border bg-background" />
                ) : (
                  <p className="rounded border bg-background p-4 text-sm text-muted-foreground">
                    Предпросмотр этого формата недоступен. Скачайте файл для просмотра.
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
