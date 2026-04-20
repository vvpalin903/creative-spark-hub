import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2 } from "lucide-react";

interface Props {
  objectId: string;
  photos: string[];
}

const BUCKET = "lot-photos";
const MAX_PHOTOS = 10;

export function PhotosManager({ objectId, photos }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const persist = useMutation({
    mutationFn: async (next: string[]) => {
      const { error } = await supabase.from("host_objects").update({ photos: next }).eq("id", objectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "object", objectId] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      toast({ title: `Не больше ${MAX_PHOTOS} фотографий`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Загружайте только изображения", variant: "destructive" });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: `${file.name}: больше 5 МБ`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${objectId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) {
          toast({ title: "Ошибка загрузки", description: upErr.message, variant: "destructive" });
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
      if (uploadedUrls.length) {
        await persist.mutateAsync([...photos, ...uploadedUrls]);
        toast({ title: `Загружено ${uploadedUrls.length}` });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async (url: string) => {
    // Try to remove file from storage (extract path after /lot-photos/)
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = url.substring(idx + marker.length);
      await supabase.storage.from(BUCKET).remove([path]);
    }
    await persist.mutateAsync(photos.filter((p) => p !== url));
    toast({ title: "Фото удалено" });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((url) => (
          <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
            <img src={url} alt="Фото объекта" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Удалить фото"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span className="text-xs">Загрузить</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">До {MAX_PHOTOS} фото, не больше 5 МБ каждая</p>
    </div>
  );
}
