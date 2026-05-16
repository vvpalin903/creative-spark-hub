import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Inbox } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ticketStatusColors, ticketStatusLabels } from "@/lib/labels";

interface Props {
  /** Restrict object/placement options to those visible to this user. If undefined — no preset filter. */
  role: "client" | "host";
}

export function TicketsSection({ role }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", "mine", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, host_objects(title), placements(id)")
        .eq("initiator_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Мои обращения</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Новое обращение
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : !tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">У вас пока нет обращений</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setViewing(t)}>
                  <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell className="font-medium max-w-[280px] truncate">{t.subject}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${ticketStatusColors[t.status]}`}>
                      {ticketStatusLabels[t.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewing(t); }}>
                      Открыть
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        role={role}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["tickets", "mine"] })}
      />

      <TicketDetailDialog ticket={viewing} onOpenChange={(v) => !v && setViewing(null)} />
    </div>
  );
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  role,
  onCreated,
  asAdminInitiatorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: "client" | "host" | "admin";
  onCreated?: () => void;
  /** When admin creates ticket on behalf of someone */
  asAdminInitiatorId?: string;
}) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [objectId, setObjectId] = useState<string>("none");
  const [placementId, setPlacementId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  // Objects list — host sees own; client sees objects from their requests/placements; admin sees all
  const { data: objects } = useQuery({
    queryKey: ["tickets", "objects-options", role, user?.id, asAdminInitiatorId],
    queryFn: async () => {
      if (role === "admin") {
        const { data } = await supabase.from("host_objects").select("id, title").order("created_at", { ascending: false }).limit(500);
        return data || [];
      }
      if (role === "host") {
        const { data } = await supabase.from("host_objects").select("id, title").eq("host_user_id", user!.id).order("created_at", { ascending: false });
        return data || [];
      }
      // client: from their booking_requests
      const { data: reqs } = await supabase.from("booking_requests").select("object_id, host_objects(id, title)").eq("client_user_id", user!.id);
      const map = new Map<string, string>();
      (reqs || []).forEach((r: any) => { if (r.host_objects) map.set(r.host_objects.id, r.host_objects.title); });
      return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
    },
    enabled: open,
  });

  const { data: placements } = useQuery({
    queryKey: ["tickets", "placements-options", role, user?.id, asAdminInitiatorId],
    queryFn: async () => {
      let query = supabase.from("placements").select("id, host_objects(title), created_at").order("created_at", { ascending: false }).limit(500);
      if (role === "host") query = query.eq("host_user_id", user!.id);
      else if (role === "client") query = query.eq("client_user_id", user!.id);
      const { data } = await query;
      return data || [];
    },
    enabled: open,
  });

  const reset = () => {
    setSubject(""); setBody(""); setObjectId("none"); setPlacementId("none");
  };

  const submit = async () => {
    if (!user || !subject.trim() || !body.trim()) return;
    setSubmitting(true);
    const initiator = asAdminInitiatorId || user.id;
    const { error } = await supabase.from("tickets").insert({
      subject: subject.trim(),
      body: body.trim(),
      initiator_user_id: initiator,
      created_by_user_id: user.id,
      object_id: objectId === "none" ? null : objectId,
      placement_id: placementId === "none" ? null : placementId,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Обращение создано" });
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Новое обращение</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Тема</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Кратко опишите проблему" />
          </div>
          <div>
            <Label>Текст</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Опишите подробнее" />
          </div>
          <div>
            <Label>Связанный объект (необязательно)</Label>
            <Select value={objectId} onValueChange={setObjectId}>
              <SelectTrigger><SelectValue placeholder="Без объекта" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Без объекта —</SelectItem>
                {(objects || []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Связанное размещение (необязательно)</Label>
            <Select value={placementId} onValueChange={setPlacementId}>
              <SelectTrigger><SelectValue placeholder="Без размещения" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Без размещения —</SelectItem>
                {(placements || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.host_objects?.title || "Размещение"} · {new Date(p.created_at).toLocaleDateString("ru-RU")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={submit} disabled={submitting || !subject.trim() || !body.trim()}>
            {submitting ? "Создание..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TicketDetailDialog({ ticket, onOpenChange }: { ticket: any | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>{ticket.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${ticketStatusColors[ticket.status]}`}>
                  {ticketStatusLabels[ticket.status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="whitespace-pre-wrap rounded-md border p-3 bg-muted/30">{ticket.body}</div>
              {ticket.host_objects?.title && (
                <div className="text-xs text-muted-foreground">Объект: {ticket.host_objects.title}</div>
              )}
              {ticket.placements?.id && (
                <div className="text-xs text-muted-foreground">Размещение: {ticket.placements.id.slice(0, 8)}…</div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
