import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Check, FileText, AlertTriangle, Info } from "lucide-react";

export default function HostVerification() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get("app");
  const isMytishchi = searchParams.get("mytishchi") !== "false";

  const [docType, setDocType] = useState("passport");
  const [uploading, setUploading] = useState(false);
  const [identityUploaded, setIdentityUploaded] = useState(false);
  const [ownershipUploaded, setOwnershipUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ownershipFileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Файл слишком большой", description: "Максимум 10 МБ", variant: "destructive" });
        return;
      }
      setter(file);
    }
  };

  const uploadFile = async (file: File, docTypeStr: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${applicationId}/${docTypeStr}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("verification-docs")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("verification_documents").insert({
      user_id: applicationId!,
      document_type: docTypeStr,
      file_url: urlData.publicUrl,
    });
    if (insertError) throw insertError;
  };

  const handleUpload = async () => {
    if (!applicationId) return;

    if (isMytishchi && (!selectedFile || !ownershipFile)) {
      toast({ title: "Ошибка", description: "Загрузите оба документа: удостоверение личности и право собственности", variant: "destructive" });
      return;
    }

    if (!isMytishchi && !selectedFile) {
      // Non-Mytishchi doesn't need docs, but if they chose to upload — allow
    }

    setUploading(true);

    try {
      if (selectedFile) {
        await uploadFile(selectedFile, docType);
        setIdentityUploaded(true);
      }
      if (ownershipFile) {
        await uploadFile(ownershipFile, "ownership");
        setOwnershipUploaded(true);
      }

      toast({ title: "Документы загружены!", description: "Мы проверим их в ближайшее время" });
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const allDone = isMytishchi ? (identityUploaded && ownershipUploaded) : identityUploaded;

  // Non-Mytishchi: show test mode info instead of verification
  if (!isMytishchi) {
    return (
      <Layout>
        <div className="container py-16 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Заявка принята
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Check className="h-14 w-14 text-primary mx-auto mb-4" />
                <p className="text-xl font-semibold text-foreground mb-4">Ваша заявка автоматически подтверждена!</p>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-left">
                  <p className="text-sm text-foreground">
                    <AlertTriangle className="inline h-4 w-4 mr-1 text-warning" />
                    <strong>Тестовый режим:</strong> Сервис «Место рядом» работает в тестовом режиме. Проверка объектов осуществляется пока только в границах города Мытищи Московской области.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ваш объект вне Мытищ добавлен автоматически. Полная верификация будет доступна при расширении географии сервиса.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
            {allDone ? (
              <div className="text-center py-8">
                <Check className="h-14 w-14 text-primary mx-auto mb-4" />
                <p className="text-xl font-semibold text-foreground">Документы загружены!</p>
                <p className="text-muted-foreground mt-2">
                  Мы проверим ваши документы в течение 1-2 рабочих дней и свяжемся с вами.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-accent border border-primary/20">
                  <p className="text-sm text-accent-foreground">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Для завершения регистрации загрузите <strong>два документа</strong>: удостоверение личности и документ, подтверждающий право собственности на место хранения.
                  </p>
                </div>

                {/* Identity document */}
                <div>
                  <Label className="text-base font-semibold">1. Документ, удостоверяющий личность</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Паспорт</SelectItem>
                      <SelectItem value="drivers_license">Водительское удостоверение</SelectItem>
                    </SelectContent>
                  </Select>
                  <div
                    className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setSelectedFile)}
                    />
                    {selectedFile ? (
                      <div>
                        <FileText className="h-6 w-6 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} МБ</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm text-muted-foreground">Нажмите для выбора файла</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG или PDF, до 10 МБ</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ownership document */}
                <div>
                  <Label className="text-base font-semibold">2. Документ о праве собственности</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Свидетельство о собственности, выписка из ЕГРН, договор аренды или иной документ
                  </p>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => ownershipFileRef.current?.click()}
                  >
                    <input
                      ref={ownershipFileRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setOwnershipFile)}
                    />
                    {ownershipFile ? (
                      <div>
                        <FileText className="h-6 w-6 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">{ownershipFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(ownershipFile.size / 1024 / 1024).toFixed(1)} МБ</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm text-muted-foreground">Нажмите для выбора файла</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG или PDF, до 10 МБ</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedFile || !ownershipFile || uploading}
                  onClick={handleUpload}
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Загрузить документы
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
