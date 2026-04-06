import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, LogOut } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

const clientStatusLabels: Record<string, string> = {
  new: "Новая",
  sent_to_host: "Передана хосту",
  completed: "Завершена",
  rejected: "Отказ",
};

const hostStatusLabels: Record<string, string> = {
  new: "Новая",
  verified: "Верифицирован",
  rejected: "Отклонена",
};

const lotStatusLabels: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "Архив",
};

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin" as Enums<"app_role">,
        });
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin" as Enums<"app_role">,
        }).then(({ data }) => {
          setIsAdmin(!!data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
  const queryClient = useQueryClient();

  const { data: clientApps } = useQuery({
    queryKey: ["admin", "client_applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: hostApps } = useQuery({
    queryKey: ["admin", "host_applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("host_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lots } = useQuery({
    queryKey: ["admin", "lots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lots").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateClientStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("client_applications").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "client_applications"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const updateHostStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("host_applications").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "host_applications"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const updateLotStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lots").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lots"] });
      toast({ title: "Статус обновлён" });
    },
  });

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
        <Tabs defaultValue="client-apps">
          <TabsList className="mb-6">
            <TabsTrigger value="client-apps">Заявки клиентов ({clientApps?.length || 0})</TabsTrigger>
            <TabsTrigger value="host-apps">Заявки хостов ({hostApps?.length || 0})</TabsTrigger>
            <TabsTrigger value="lots">Лоты ({lots?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="client-apps">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Дата начала</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientApps?.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="text-sm">{new Date(app.created_at).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>{app.client_name}</TableCell>
                      <TableCell>{app.client_phone}</TableCell>
                      <TableCell>{app.category || "—"}</TableCell>
                      <TableCell>{app.desired_date || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{app.comment || "—"}</TableCell>
                      <TableCell>
                        <Select value={app.status} onValueChange={(v) => updateClientStatus.mutate({ id: app.id, status: v })}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Новая</SelectItem>
                            <SelectItem value="sent_to_host">Передана хосту</SelectItem>
                            <SelectItem value="completed">Завершена</SelectItem>
                            <SelectItem value="rejected">Отказ</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!clientApps || clientApps.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет заявок</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="host-apps">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hostApps?.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="text-sm">{new Date(app.created_at).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell>{app.host_name}</TableCell>
                      <TableCell>{app.host_phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{app.address}</TableCell>
                      <TableCell>{app.place_type || "—"}</TableCell>
                      <TableCell>{app.category}</TableCell>
                      <TableCell>
                        <Select value={app.status} onValueChange={(v) => updateHostStatus.mutate({ id: app.id, status: v })}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Новая</SelectItem>
                            <SelectItem value="verified">Верифицирован</SelectItem>
                            <SelectItem value="rejected">Отклонена</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!hostApps || hostApps.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет заявок</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="lots">
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Доступ</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots?.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{lot.address}</TableCell>
                      <TableCell>{lot.category}</TableCell>
                      <TableCell>{lot.price_monthly.toLocaleString("ru-RU")} ₽</TableCell>
                      <TableCell>{lot.access_mode}</TableCell>
                      <TableCell>
                        <Select value={lot.status} onValueChange={(v) => updateLotStatus.mutate({ id: lot.id, status: v })}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Черновик</SelectItem>
                            <SelectItem value="published">Опубликован</SelectItem>
                            <SelectItem value="archived">Архив</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!lots || lots.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет лотов</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
