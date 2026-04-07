import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const docTypeLabels: Record<string, string> = {
  passport: "Паспорт",
  drivers_license: "Водительское удостоверение",
  ownership: "Право собственности",
};

const statusLabels: Record<string, string> = {
  pending: "На проверке",
  approved: "Одобрен",
  rejected: "Отклонён",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

export function VerificationDocsTab() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const openSignedUrl = async (doc: { id: string; file_url: string }) => {
    setLoadingId(doc.id);
    try {
      // Extract path from the public URL
      const urlParts = doc.file_url.split("/storage/v1/object/public/verification-docs/");
      const filePath = urlParts[1];
      if (!filePath) throw new Error("Invalid file path");

      const { data, error } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(filePath, 300); // 5 min
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const { data: docs, isLoading } = useQuery({
    queryKey: ["admin", "verification_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: hostApps } = useQuery({
    queryKey: ["admin", "host_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const hostAppMap = new Map(
    (hostApps || []).map((app) => [app.id, app])
  );

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Загрузка...</p>;
  }

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Заявка (хост)</TableHead>
            <TableHead>Тип документа</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Файл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs?.map((doc) => {
            const hostApp = hostAppMap.get(doc.user_id);
            return (
              <TableRow key={doc.id}>
                <TableCell className="text-sm">
                  {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell>
                  {hostApp ? (
                    <div>
                      <div className="font-medium">{hostApp.host_name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {hostApp.address}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">{doc.user_id.slice(0, 8)}…</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {docTypeLabels[doc.document_type] || doc.document_type}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[doc.status] || ""}`}>
                    {statusLabels[doc.status] || doc.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    disabled={loadingId === doc.id}
                    onClick={() => openSignedUrl(doc)}
                  >
                    {loadingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    )}
                    Открыть
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {(!docs || docs.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Нет загруженных документов
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}