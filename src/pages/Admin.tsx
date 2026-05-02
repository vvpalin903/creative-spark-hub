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
import { Loader2, LogOut, Pencil } from "lucide-react";
import { HostObjectFormDialog } from "@/components/dashboard/HostObjectFormDialog";
import { DocumentsTab } from "@/components/admin/DocumentsTab";
import { VerificationDocsTab } from "@/components/admin/VerificationDocsTab";
import {
  bookingRequestStatusLabels,
  objectStatusColors,
  objectStatusLabels,
  objectVerificationStatusLabels,
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Вход в админку</CardTitle>
          </CardHeader>
          <CardContent>
            {session && !isAdmin ? (
              <p className="text-sm text-destructive">У вас нет прав администратора</p>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Войти
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="font-bold text-foreground">Админ-панель</h1>
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
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="verification">Документы хостов</TabsTrigger>
            <TabsTrigger value="documents">Сайт-доки</TabsTrigger>
          </TabsList>

          <TabsContent value="objects"><ObjectsTab /></TabsContent>
          <TabsContent value="requests"><RequestsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="verification"><VerificationDocsTab /></TabsContent>
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
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("host_objects")
        .update({ object_status: status as any })
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
                  <Select value={o.object_status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
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
function UsersTab() {
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

  const rolesByUser = (roles || []).reduce<Record<string, string[]>>((acc, r) => {
    acc[r.user_id] = [...(acc[r.user_id] || []), r.role];
    return acc;
  }, {});

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
            <TableHead>Верификация</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles?.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("ru-RU")}</TableCell>
              <TableCell>{p.name || "—"}</TableCell>
              <TableCell className="text-sm">{p.email || "—"}</TableCell>
              <TableCell className="text-sm">{p.phone || "—"}</TableCell>
              <TableCell className="text-xs">
                <div className="flex gap-1 flex-wrap">
                  {(rolesByUser[p.user_id] || []).map((r) => (
                    <Badge key={r} variant="secondary">{r}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-1 rounded ${objectStatusColors[p.verification_status] || "bg-muted"}`}>
                  {userVerificationStatusLabels[p.verification_status]}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {(!profiles || profiles.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет пользователей</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
