import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Inbox, History, ShieldCheck, Search, MessageCircle } from "lucide-react";
import { bookingRequestStatusColors, bookingRequestStatusLabels, placementStatusLabels } from "@/lib/labels";
import { RequestChatLink } from "@/components/chat/RequestChatLink";
import { CancelRequestButton } from "@/components/CancelRequestButton";
import { ReviewButton } from "@/components/reviews/ReviewButton";

const sections = [
  { to: "/dashboard/client", label: "Активные", icon: Inbox },
  { to: "/dashboard/client/messages", label: "Сообщения", icon: MessageCircle },
  { to: "/dashboard/client/history", label: "История", icon: History },
  { to: "/dashboard/client/verification", label: "Верификация", icon: ShieldCheck },
];

export default function ClientDashboard() {
  return (
    <DashboardLayout title="Кабинет клиента" sections={sections}>
      <Routes>
        <Route index element={<ActiveTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="verification" element={<VerificationTab />} />
        <Route path="*" element={<Navigate to="/dashboard/client" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function ActiveTab() {
  const { user } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["client", "active_requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, host_objects(title, address)")
        .eq("client_user_id", user!.id)
        .in("request_status", ["new", "viewed", "accepted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: placements } = useQuery({
    queryKey: ["client", "active_placements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("*, host_objects(title, address)")
        .eq("client_user_id", user!.id)
        .in("placement_status", ["upcoming", "active"])
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  const hasAny = (requests && requests.length > 0) || (placements && placements.length > 0);

  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Пока ничего нет</p>
          <p className="text-sm text-muted-foreground mb-4">Найдите место для хранения и оставьте заявку</p>
          <Button asChild>
            <Link to="/rent">Найти место</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {placements && placements.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Активные размещения</h3>
          <div className="grid gap-3">
            {placements.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{p.host_objects?.title}</div>
                      <div className="text-xs text-muted-foreground">{p.host_objects?.address}</div>
                    </div>
                    <Badge variant="outline">{placementStatusLabels[p.placement_status]}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {requests && requests.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Заявки в работе</h3>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Объект</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Чат</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.host_objects?.title || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.host_objects?.address}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${bookingRequestStatusColors[r.request_status]}`}>
                        {bookingRequestStatusLabels[r.request_status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RequestChatLink requestId={r.id} role="client" />
                    </TableCell>
                    <TableCell className="text-right">
                      <CancelRequestButton requestId={r.id} startDate={r.start_date} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}

function HistoryTab() {
  const { user } = useAuth();

  const { data: requests } = useQuery({
    queryKey: ["client", "history_requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, host_objects(title, address)")
        .eq("client_user_id", user!.id)
        .in("request_status", ["rejected", "cancelled", "completed", "expired"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: completedPlacements } = useQuery({
    queryKey: ["client", "completed_placements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("*, host_objects(title, address, host_user_id)")
        .eq("client_user_id", user!.id)
        .eq("placement_status", "completed")
        .order("ended_at", { ascending: false });
      if (error) throw error;
      // Fetch host names
      const hostIds = Array.from(new Set((data || []).map((p: any) => p.host_user_id).filter(Boolean)));
      let hostNames: Record<string, string> = {};
      if (hostIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", hostIds);
        hostNames = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name || "Хост"]));
      }
      return (data || []).map((p: any) => ({ ...p, host_name: hostNames[p.host_user_id] || "Хост" }));
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {completedPlacements && completedPlacements.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2">Завершённые размещения</h3>
          <div className="grid gap-3">
            {completedPlacements.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.host_objects?.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.host_objects?.address}</div>
                  </div>
                  {p.host_user_id && (
                    <ReviewButton
                      placementId={p.id}
                      rateeUserId={p.host_user_id}
                      raterRole="client"
                      counterpartName={p.host_name}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2">Заявки</h3>
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>Статус</TableHead>
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
                    <span className={`text-xs px-2 py-1 rounded ${bookingRequestStatusColors[r.request_status]}`}>
                      {bookingRequestStatusLabels[r.request_status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!requests || requests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">История пуста</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Контактные данные</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm">{profile?.email || user?.email || "—"}</div>
          </div>
          <Badge variant={profile?.email_verified ? "default" : "secondary"}>
            {profile?.email_verified ? "Подтверждён" : "Не подтверждён"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Телефон</div>
            <div className="text-sm">{profile?.phone || "—"}</div>
          </div>
          <Badge variant={profile?.phone_verified ? "default" : "secondary"}>
            {profile?.phone_verified ? "Подтверждён" : "Не подтверждён"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Подтверждение телефона по SMS появится в следующем обновлении.
        </p>
      </CardContent>
    </Card>
  );
}
