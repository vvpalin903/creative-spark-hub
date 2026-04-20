import { useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Inbox, History, ShieldCheck, Pencil, Send, MessageCircle } from "lucide-react";
import { HostObjectFormDialog } from "@/components/dashboard/HostObjectFormDialog";
import { RequestChatLink } from "@/components/chat/RequestChatLink";
import { ReviewButton } from "@/components/reviews/ReviewButton";
import {
  accessModeLabels,
  bookingRequestStatusColors,
  bookingRequestStatusLabels,
  objectStatusColors,
  objectStatusLabels,
  objectVerificationStatusLabels,
  placementStatusLabels,
  scheduleModeLabels,
} from "@/lib/labels";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const sections = [
  { to: "/dashboard/host", label: "Мои объекты", icon: Building2 },
  { to: "/dashboard/host/requests", label: "Заявки", icon: Inbox },
  { to: "/dashboard/host/messages", label: "Сообщения", icon: MessageCircle },
  { to: "/dashboard/host/history", label: "История", icon: History },
  { to: "/dashboard/host/verification", label: "Верификация", icon: ShieldCheck },
];

export default function HostDashboard() {
  return (
    <DashboardLayout title="Кабинет хоста" sections={sections}>
      <Routes>
        <Route index element={<ObjectsTab />} />
        <Route path="requests" element={<RequestsTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="verification" element={<VerificationTab />} />
        <Route path="*" element={<Navigate to="/dashboard/host" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function ObjectsTab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"host_objects"> | null>(null);
  const queryClient = useQueryClient();

  const { data: objects, isLoading } = useQuery({
    queryKey: ["host", "objects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_objects")
        .select("*, storage_slots(id, category, price_monthly, slot_status)")
        .eq("host_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitForReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("host_objects")
        .update({ object_status: "pending_review", verification_status: "pending" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: "Объект отправлен на проверку" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {objects?.length || 0} {objects?.length === 1 ? "объект" : "объектов"}
        </p>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Новый объект
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : !objects || objects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Пока нет объектов</p>
            <p className="text-sm text-muted-foreground mb-4">Создайте первый объект и отправьте его на проверку</p>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Создать объект
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {objects.map((obj: any) => {
            const slots = obj.storage_slots || [];
            const minPrice = slots.length ? Math.min(...slots.map((s: any) => s.price_monthly)) : null;
            return (
              <Card key={obj.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <Link to={`/dashboard/host/objects/${obj.id}`} className="min-w-0 flex-1 group">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{obj.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${objectStatusColors[obj.object_status]}`}>
                          {objectStatusLabels[obj.object_status]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{obj.address}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                        <span>Доступ: {accessModeLabels[obj.access_mode]}</span>
                        <span>Расписание: {scheduleModeLabels[obj.schedule_mode]}</span>
                        <span>Слотов: {slots.length}</span>
                        {minPrice !== null && minPrice > 0 && <span>от {minPrice.toLocaleString("ru-RU")} ₽/мес</span>}
                        <span>Верификация: {objectVerificationStatusLabels[obj.verification_status]}</span>
                      </div>
                    </Link>
                    <div className="flex gap-2 shrink-0">
                      {obj.object_status === "draft" && (
                        <Button size="sm" variant="default" onClick={() => submitForReview.mutate(obj.id)} disabled={submitForReview.isPending}>
                          <Send className="h-3.5 w-3.5 mr-1" /> На проверку
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setEditing(obj); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Изменить
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {open && <HostObjectFormDialog open={open} onOpenChange={setOpen} object={editing} />}
    </div>
  );
}

function RequestsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["host", "requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, host_objects(title, address)")
        .eq("host_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ request_status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "requests"] });
      toast({ title: "Статус обновлён" });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Период</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Чат</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests?.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>
                <div className="font-medium">{r.host_objects?.title || "—"}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.host_objects?.address}</div>
              </TableCell>
              <TableCell>
                <div>{r.client_name}</div>
                <div className="text-xs text-muted-foreground">{r.client_phone}</div>
              </TableCell>
              <TableCell className="text-sm">
                {r.start_date || r.end_date ? `${r.start_date || "?"} → ${r.end_date || "?"}` : "—"}
              </TableCell>
              <TableCell>
                <Select value={r.request_status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(bookingRequestStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <RequestChatLink requestId={r.id} role="host" />
              </TableCell>
            </TableRow>
          ))}
          {(!requests || requests.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Заявок пока нет</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function HistoryTab() {
  const { user } = useAuth();
  const { data: placements, isLoading } = useQuery({
    queryKey: ["host", "placements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("*, host_objects(title, address)")
        .eq("host_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch client names from profiles
      const clientIds = Array.from(new Set((data || []).map((p) => p.client_user_id).filter(Boolean) as string[]));
      let clientNames: Record<string, string> = {};
      if (clientIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", clientIds);
        clientNames = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name || "Клиент"]));
      }
      return (data || []).map((p) => ({ ...p, client_name: p.client_user_id ? clientNames[p.client_user_id] || "Клиент" : "Клиент" }));
    },
    enabled: !!user,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Объект</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Период</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Отзыв</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {placements?.map((p: any) => {
            const clientName = p.booking_requests?.client_name || "Клиент";
            const clientUserId = p.client_user_id || p.booking_requests?.client_user_id;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.host_objects?.title || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.host_objects?.address}</div>
                </TableCell>
                <TableCell className="text-sm">{clientName}</TableCell>
                <TableCell className="text-sm">
                  {p.started_at ? new Date(p.started_at).toLocaleDateString("ru-RU") : "—"}
                  {" → "}
                  {p.ended_at ? new Date(p.ended_at).toLocaleDateString("ru-RU") : "сейчас"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{placementStatusLabels[p.placement_status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {p.placement_status === "completed" && clientUserId && (
                    <ReviewButton
                      placementId={p.id}
                      rateeUserId={clientUserId}
                      raterRole="host"
                      counterpartName={clientName}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {(!placements || placements.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">История пуста</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function VerificationTab() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs } = useQuery({
    queryKey: ["host", "verification_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Контактные данные</h3>
          <VerificationRow
            label="Email"
            value={profile?.email || user?.email || "—"}
            verified={profile?.email_verified ?? false}
          />
          <VerificationRow
            label="Телефон"
            value={profile?.phone || "—"}
            verified={profile?.phone_verified ?? false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Журнал верификации</h3>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Записей нет</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{l.verification_type}</div>
                    {l.comment && <div className="text-xs text-muted-foreground">{l.comment}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {l.verification_status} · {new Date(l.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationRow({ label, value, verified }: { label: string; value: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
      <Badge variant={verified ? "default" : "secondary"}>
        {verified ? "Подтверждён" : "Не подтверждён"}
      </Badge>
    </div>
  );
}
