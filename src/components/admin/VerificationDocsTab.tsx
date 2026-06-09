import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { SortHead, TableToolbar, useTableControls } from "@/lib/admin/tableControls";

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

  const downloadDocument = async (doc: { id: string; file_url: string }) => {
    setLoadingId(doc.id);
    try {
      let filePath = doc.file_url;
      const marker = "/storage/v1/object/public/verification-docs/";
      const idx = filePath.indexOf(marker);
      if (idx !== -1) filePath = filePath.substring(idx + marker.length);
      if (!filePath) throw new Error("Invalid file path");

      const { data: fileBlob, error } = await supabase.storage
        .from("verification-docs")
        .download(filePath);
      if (error) throw error;

      const blobUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filePath.split("/").pop() || `document-${doc.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      toast({ title: "Ошибка скачивания", description: err.message, variant: "destructive" });
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

  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles_for_docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email, phone");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Загрузка...</p>;
  }

  const enriched = (docs || []).map((d: any) => {
    const profile = profileMap.get(d.user_id);
    return { ...d, _user_name: profile?.name || "", _user_email: profile?.email || "", _user_phone: profile?.phone || "" };
  });

  // Inline controls (component-local) — we need them after data is ready
  return <VerificationDocsTable rows={enriched} loadingId={loadingId} downloadDocument={downloadDocument} />;
}

function VerificationDocsTable({ rows, loadingId, downloadDocument }: { rows: any[]; loadingId: string | null; downloadDocument: (d: { id: string; file_url: string }) => void }) {
  const { filtered, search, setSearch, status, setStatus, sort, setSort } = useTableControls(rows, {
    searchFields: (d: any) => `${d._user_name} ${d._user_email} ${d._user_phone} ${docTypeLabels[d.document_type] ?? d.document_type}`,
    statusField: (d: any) => d.status,
    sortAccessors: {
      created_at: (d: any) => new Date(d.created_at),
      user: (d: any) => d._user_name || d._user_email || "",
      type: (d: any) => docTypeLabels[d.document_type] ?? d.document_type ?? "",
      status: (d: any) => d.status ?? "",
    },
    defaultSort: { key: "created_at", dir: "desc" },
  });

  return (
    <div>
      <TableToolbar
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        statusOptions={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        count={filtered.length}
        placeholder="Поиск по пользователю или типу..."
      />
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Дата" sortKey="created_at" sort={sort} setSort={setSort} />
              <SortHead label="Пользователь" sortKey="user" sort={sort} setSort={setSort} />
              <SortHead label="Тип документа" sortKey="type" sort={sort} setSort={setSort} />
              <SortHead label="Статус" sortKey="status" sort={sort} setSort={setSort} />
              <TableHead>Файл</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((doc: any) => (
              <TableRow key={doc.id}>
                <TableCell className="text-sm">{new Date(doc.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell>
                  {doc._user_name || doc._user_email ? (
                    <div>
                      <div className="font-medium">{doc._user_name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {doc._user_email || doc._user_phone || ""}
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
                    onClick={() => downloadDocument(doc)}
                  >
                    {loadingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1" />
                    )}
                    Скачать
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Ничего не найдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
