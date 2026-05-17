import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, LogOut, Pencil, Plus } from "lucide-react";
import { HostObjectFormDialog } from "@/components/dashboard/HostObjectFormDialog";
import { DocumentsTab } from "@/components/admin/DocumentsTab";
import { VerificationDocsTab } from "@/components/admin/VerificationDocsTab";
import { CreateTicketDialog, TicketDetailDialog } from "@/components/tickets/TicketsSection";
import NotFound from "./NotFound";
import {
  bookingRequestStatusLabels,
  hostPlanLabels,
  hostPlanRequestStatusColors,
  hostPlanRequestStatusLabels,
  objectDocumentStatusColors,
  objectDocumentStatusLabels,
  objectStatusColors,
  objectStatusLabels,
  objectVerificationStatusLabels,
  ticketStatusColors,
  ticketStatusLabels,
  userVerificationStatusLabels,
} from "@/lib/labels";
import type { Enums, Tables } from "@/integrations/supabase/types";

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRole = async (userId: string) => {
      try {
        const { data: adminData } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin" as Enums<"app_role">,
        });
        if (adminData) {
          if (mounted) { setIsAdmin(true); setIsRealAdmin(true); setLoading(false); }
          return;
        }
        const { data: boData } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "back_office" as Enums<"app_role">,
        });
        if (mounted) { setIsAdmin(!!boData); setIsRealAdmin(false); }
      } catch {
        if (mounted) { setIsAdmin(false); setIsRealAdmin(false); }
      }
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        checkRole(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        checkRole(s.user.id);
      } else {
        setIsAdmin(false);
        setIsRealAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <NotFound />;
  }

  return <AdminDashboard isRealAdmin={isRealAdmin} />;
}

function AdminDashboard({ isRealAdmin }: { isRealAdmin: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="font-bold text-foreground">
            {isRealAdmin ? "Админ-панель" : "Бэк-офис"}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </div>
      </header>

      <div className="container py-6">
        <Tabs defaultValue="objects">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="objects">Объекты</TabsTrigger>
            <TabsTrigger value="requests">Заявки</TabsTrigger>
            <TabsTrigger value="tickets">Обращения</TabsTrigger>
            <TabsTrigger value="superhost">Супер хост</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="verification">Документы хостов</TabsTrigger>
            <TabsTrigger value="objectdocs">Документы объектов</TabsTrigger>
            <TabsTrigger value="documents">Сайт-доки</TabsTrigger>
          </TabsList>

          <TabsContent value="objects"><ObjectsTab /></TabsContent>
          <TabsContent value="requests"><RequestsTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
          <TabsContent value="superhost"><SuperHostTab /></TabsContent>
          <TabsContent value="users"><UsersTab isRealAdmin={isRealAdmin} /></TabsContent>
          <TabsContent value="verification"><VerificationDocsTab /></TabsContent>
          <TabsContent value="objectdocs"><ObjectDocsTab /></TabsContent>
          <TabsContent value="documents"><DocumentsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* -------- Objects -------- */
function ObjectsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tables<"host_objects"> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: objects } = useQuery({
    queryKey: ["admin", "host_objects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_objects")
        .select("*, storage_slots(id, price_monthly, category)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string | null }) => {
      const patch: any = { object_status: status as any };
      if (notes !== undefined) patch.reviewer_notes = notes;
      const { error } = await supabase
        .from("host_objects")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "host_objects"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const updateVerification = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("host_objects")
        .update({ verification_status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "host_objects"] });
      toast({ title: "Верификация обновлена" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Слотов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Верификация</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {objects?.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell className="max-w-[220px] truncate">{o.title}</TableCell>
                <TableCell className="max-w-[260px] truncate text-sm">{o.city ? `${o.city}, ` : ""}{o.address}</TableCell>
                <TableCell>{o.storage_slots?.length || 0}</TableCell>
                <TableCell>
                  <Select value={o.object_status} onValueChange={(v) => {
                    if (v === "needs_changes") {
                      const notes = window.prompt("Что нужно уточнить хосту?", o.reviewer_notes || "");
                      if (notes === null) return;
                      updateStatus.mutate({ id: o.id, status: v, notes: notes.trim() || null });
                    } else {
                      updateStatus.mutate({ id: o.id, status: v });
                    }
                  }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(objectStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={o.verification_status} onValueChange={(v) => updateVerification.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(objectVerificationStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(o); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!objects || objects.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет объектов</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {open && <HostObjectFormDialog open={open} onOpenChange={setOpen} object={editing} />}
    </div>
  );
}

/* -------- Requests -------- */
function RequestsTab() {
  const queryClient = useQueryClient();
  const { data: requests } = useQuery({
    queryKey: ["admin", "booking_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, host_objects(title, address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("booking_requests").update({ request_status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "booking_requests"] });
      toast({ title: "Статус обновлён" });
    },
  });

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Объект</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Контакты</TableHead>
            <TableHead>Период</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests?.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>
                <div className="font-medium">{r.host_objects?.title || "—"}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.host_objects?.address}</div>
              </TableCell>
              <TableCell>{r.client_name}</TableCell>
              <TableCell className="text-xs">
                <div>{r.client_phone}</div>
                <div className="text-muted-foreground">{r.client_email}</div>
              </TableCell>
              <TableCell className="text-sm">{r.start_date || "?"} → {r.end_date || "?"}</TableCell>
              <TableCell>
                <Select value={r.request_status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(bookingRequestStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {(!requests || requests.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет заявок</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------- Users -------- */
const ALL_ROLES: Enums<"app_role">[] = ["client", "host", "back_office", "admin"];

function UsersTab({ isRealAdmin }: { isRealAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const rolesByUser = (roles || []).reduce<Record<string, Enums<"app_role">[]>>((acc, r) => {
    acc[r.user_id] = [...(acc[r.user_id] || []), r.role as Enums<"app_role">];
    return acc;
  }, {});

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: Enums<"app_role">; has: boolean }) => {
      if (role === "admin" && !isRealAdmin) {
        throw new Error("Только администратор может управлять ролью admin");
      }
      if (has) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user_roles"] });
      toast({ title: "Роли обновлены" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateHostPlan = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: "standard" | "super_host" }) => {
      const patch =
        plan === "super_host"
          ? {
              host_plan: "super_host" as const,
              host_plan_started_at: new Date().toISOString(),
              host_plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
          : { host_plan: "standard" as const, host_plan_expires_at: null };
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] });
      toast({ title: "Тариф хоста обновлён" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Роли</TableHead>
            <TableHead>Тариф хоста</TableHead>
            <TableHead>Верификация</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles?.map((p) => {
            const userRoles = rolesByUser[p.user_id] || [];
            const isHost = userRoles.includes("host" as Enums<"app_role">);
            return (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell>{p.name || "—"}</TableCell>
                <TableCell className="text-sm">{p.email || "—"}</TableCell>
                <TableCell className="text-sm">{p.phone || "—"}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1 flex-wrap">
                    {userRoles.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      userRoles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded border text-xs bg-muted text-muted-foreground border-border"
                        >
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isHost ? (
                    <Select
                      value={(p as any).host_plan || "standard"}
                      onValueChange={(v) => updateHostPlan.mutate({ userId: p.user_id, plan: v as any })}
                      disabled={updateHostPlan.isPending}
                    >
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(hostPlanLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${objectStatusColors[p.verification_status] || "bg-muted"}`}>
                    {userVerificationStatusLabels[p.verification_status]}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
          {(!profiles || profiles.length === 0) && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет пользователей</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------- Tickets -------- */
function TicketsTab() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const { data: tickets } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, host_objects(title), placements(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // load initiator names
      const ids = Array.from(new Set((data || []).map((t: any) => t.initiator_user_id).filter(Boolean)));
      let names: Record<string, { name: string | null; email: string | null }> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", ids);
        names = Object.fromEntries((profiles || []).map((p) => [p.user_id, { name: p.name, email: p.email }]));
      }
      return (data || []).map((t: any) => ({ ...t, initiator: names[t.initiator_user_id] }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tickets").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      toast({ title: "Статус обновлён" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Новое обращение
        </Button>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Инициатор</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead>Размещение</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets?.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell className="max-w-[240px] truncate font-medium">{t.subject}</TableCell>
                <TableCell className="text-xs">
                  <div>{t.initiator?.name || "—"}</div>
                  <div className="text-muted-foreground">{t.initiator?.email}</div>
                </TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{t.host_objects?.title || "—"}</TableCell>
                <TableCell className="text-xs">{t.placements?.id ? t.placements.id.slice(0, 8) + "…" : "—"}</TableCell>
                <TableCell>
                  <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ticketStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(t)}>Открыть</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!tickets || tickets.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет обращений</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        role="admin"
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] })}
      />
      <TicketDetailDialog ticket={viewing} onOpenChange={(v) => !v && setViewing(null)} />
    </div>
  );
}

/* -------- Super Host requests -------- */
function SuperHostTab() {
  const queryClient = useQueryClient();

  const { data: requests } = useQuery({
    queryKey: ["admin", "host_plan_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_plan_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((r: any) => r.host_user_id)));
      let profiles: Record<string, any> = {};
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("user_id, name, email, phone, telegram, host_plan")
          .in("user_id", ids);
        profiles = Object.fromEntries((ps || []).map((p: any) => [p.user_id, p]));
      }
      return (data || []).map((r: any) => ({ ...r, profile: profiles[r.host_user_id] }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("host_plan_requests")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "host_plan_requests"] });
      toast({ title: "Статус обновлён" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Хост</TableHead>
            <TableHead>Контакты</TableHead>
            <TableHead>Текущий тариф</TableHead>
            <TableHead>Комментарий</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests?.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>
                <div className="font-medium">{r.profile?.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{r.host_user_id.slice(0, 8)}…</div>
              </TableCell>
              <TableCell className="text-xs space-y-0.5">
                <div>{r.contact_email || r.profile?.email || "—"}</div>
                <div>{r.contact_phone || r.profile?.phone || "—"}</div>
                <div>TG: {r.contact_telegram || r.profile?.telegram || "—"}</div>
              </TableCell>
              <TableCell className="text-sm">{hostPlanLabels[r.profile?.host_plan || "standard"]}</TableCell>
              <TableCell className="text-xs max-w-[240px] truncate">{r.comment || "—"}</TableCell>
              <TableCell>
                <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(hostPlanRequestStatusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {(!requests || requests.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Заявок нет</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------- Object documents (external verification) -------- */
function ObjectDocsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: docs } = useQuery({
    queryKey: ["admin", "object_documents", filter],
    queryFn: async () => {
      let q = supabase
        .from("object_documents")
        .select("*, host_objects(title, address)")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
      const patch: any = { status };
      if (comment !== undefined) patch.review_comment = comment;
      if (status === "approved" || status === "rejected") patch.verified_at = new Date().toISOString();
      const { error } = await supabase.from("object_documents").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "object_documents"] });
      toast({ title: "Статус обновлён" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const dispatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("documents-process", { body: { document_id: id } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "object_documents"] });
      toast({ title: "Документ отправлен на проверку" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const manualReview = (docs || []).filter((d: any) => d.status === "manual_review");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Фильтр:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {Object.entries(objectDocumentStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{docs?.length || 0} записей</p>
      </div>

      {manualReview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Требуют ручной проверки ({manualReview.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {manualReview.map((d: any) => (
              <ObjectDocRow key={d.id} d={d} onUpdate={(status, comment) => updateStatus.mutate({ id: d.id, status, comment })} onDispatch={() => dispatch.mutate(d.id)} highlight />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>External job</TableHead>
              <TableHead>Файл</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell className="text-sm max-w-[220px] truncate">{d.host_objects?.title || d.object_id.slice(0, 8) + "…"}</TableCell>
                <TableCell className="text-xs">{d.document_type}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${objectDocumentStatusColors[d.status]}`}>
                    {objectDocumentStatusLabels[d.status]}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-mono">{d.external_job_id ? d.external_job_id.slice(0, 14) + "…" : "—"}</TableCell>
                <TableCell className="text-xs">
                  {d.file_url ? <a className="text-primary hover:underline" href={d.file_url} target="_blank" rel="noreferrer">открыть</a> : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(d.status === "uploaded" || d.status === "error") && (
                      <Button size="sm" variant="outline" onClick={() => dispatch.mutate(d.id)}>Отправить</Button>
                    )}
                    <Select value={d.status} onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v })}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(objectDocumentStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!docs || docs.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Документов нет</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ObjectDocRow({ d, onUpdate, onDispatch, highlight }: { d: any; onUpdate: (status: string, comment?: string) => void; onDispatch: () => void; highlight?: boolean }) {
  const [comment, setComment] = useState(d.review_comment || "");
  return (
    <div className={`rounded-md border p-3 ${highlight ? "border-warning/40 bg-warning/5" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="text-sm font-medium">{d.host_objects?.title || d.object_id.slice(0, 8)}</div>
        <span className={`text-xs px-2 py-0.5 rounded ${objectDocumentStatusColors[d.status]}`}>
          {objectDocumentStatusLabels[d.status]}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">Тип: {d.document_type}</div>
      {d.file_url && <a className="text-xs text-primary hover:underline" href={d.file_url} target="_blank" rel="noreferrer">Открыть файл</a>}
      <Input className="mt-2" placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={() => onUpdate("approved", comment)}>Одобрить</Button>
        <Button size="sm" variant="outline" onClick={() => onUpdate("rejected", comment)}>Отклонить</Button>
        <Button size="sm" variant="ghost" onClick={onDispatch}>Повторно отправить</Button>
      </div>
    </div>
  );
}
