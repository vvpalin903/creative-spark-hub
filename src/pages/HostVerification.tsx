import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Check, FileText, AlertTriangle } from "lucide-react";

export default function HostVerification() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get("app");
  const [docType, setDocType] = useState("passport");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Файл слишком большой", description: "Максимум 10 МБ", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !applicationId) {
      toast({ title: "Ошибка", description: "Выберите файл для загрузки", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${applicationId}/${docType}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("verification-docs")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("verification_documents").insert({
        user_id: applicationId!,
        document_type: docType,
        file_url: urlData.publicUrl,
      });

      if (insertError) throw insertError;

      setUploaded(true);
      toast({ title: "Документ загружен!", description: "Мы проверим его в ближайшее время" });
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-16 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Верификация хоста
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploaded ? (
              <div className="text-center py-8">
                <Check className="h-14 w-14 text-primary mx-auto mb-4" />
                <p className="text-xl font-semibold text-foreground">Документ загружен!</p>
                <p className="text-muted-foreground mt-2">
                  Мы проверим ваш документ в течение 1-2 рабочих дней и свяжемся с вами.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-accent border border-primary/20">
                  <p className="text-sm text-accent-foreground">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Для завершения регистрации загрузите фото документа, удостоверяющего личность.
                    Это необходимо для безопасности клиентов.
                  </p>
                </div>

                <div>
                  <Label>Тип документа</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Паспорт</SelectItem>
                      <SelectItem value="drivers_license">Водительское удостоверение</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Фото документа</Label>
                  <div
                    className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {selectedFile ? (
                      <div>
                        <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(1)} МБ
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Нажмите для выбора файла
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG или PDF, до 10 МБ
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedFile || uploading}
                  onClick={handleUpload}
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Загрузить документ
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
