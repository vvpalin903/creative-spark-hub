import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { hostPlanLabels, hostPlanRequestStatusLabels, hostPlanRequestStatusColors } from "@/lib/labels";

const STANDARD_LIMIT = 1;

export function useHostPlan() {
  const { user } = useAuth();
  const profileQ = useQuery({
    queryKey: ["host", "profile-plan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("host_plan, host_plan_started_at, host_plan_expires_at, name, email, phone, telegram")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeCountQ = useQuery({
    queryKey: ["host", "active-objects-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("host_objects")
        .select("id", { count: "exact", head: true })
        .eq("host_user_id", user!.id)
        .not("object_status", "in", "(draft,archived)");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const plan = (profileQ.data?.host_plan as "standard" | "super_host" | undefined) || "standard";
  const activeCount = activeCountQ.data || 0;
  const limit = plan === "super_host" ? Infinity : STANDARD_LIMIT;
  const canPublishMore = activeCount < limit;

  return { plan, activeCount, limit, canPublishMore, profile: profileQ.data, isLoading: profileQ.isLoading || activeCountQ.isLoading };
}

export function HostPlanSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { plan, activeCount, limit, profile, isLoading } = useHostPlan();
  const [open, setOpen] = useState(false);
  const [telegram, setTelegram] = useState("");
  const [comment, setComment] = useState("");

  const existingRequest = useQuery({
    queryKey: ["host", "plan-request", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_plan_requests")
        .select("*")
        .eq("host_user_id", user!.id)
        .not("status", "in", "(activated,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("host_plan_requests").insert({
        host_user_id: user!.id,
        requested_plan: "super_host",
        status: "new",
        contact_email: profile?.email || user!.email,
        contact_phone: profile?.phone || null,
        contact_telegram: telegram || profile?.telegram || null,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Заявка отправлена", description: "Администратор свяжется с вами в ближайшее время." });
      setOpen(false);
      setComment("");
      qc.invalidateQueries({ queryKey: ["host", "plan-request"] });
    },
    onError: (e: any) => toast({ title: "Не удалось отправить", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;

  const isSuper = plan === "super_host";
  const limitText = isSuper ? "без ограничений" : `${activeCount} из ${STANDARD_LIMIT}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${isSuper ? "text-primary" : "text-muted-foreground"}`} />
            Тариф
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Текущий статус</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isSuper ? "default" : "secondary"}>{hostPlanLabels[plan]}</Badge>
                {isSuper && profile?.host_plan_expires_at && (
                  <span className="text-xs text-muted-foreground">
                    действует до {new Date(profile.host_plan_expires_at).toLocaleDateString("ru-RU")}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Активных размещений</div>
              <div className="text-sm font-medium mt-1">{limitText}</div>
            </div>
          </div>

          {!isSuper && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">Супер хост — 199 ₽ в месяц</p>
                  <p className="text-sm text-muted-foreground">
                    Чтобы разместить больше одного объекта, подключите статус Супер хост.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Неограниченное число активных размещений</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Приоритет в выдаче (скоро)</li>
                  </ul>
                </div>
              </div>

              {existingRequest.data ? (
                <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                  <span>Ваша заявка в обработке</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${hostPlanRequestStatusColors[existingRequest.data.status]}`}>
                    {hostPlanRequestStatusLabels[existingRequest.data.status]}
                  </span>
                </div>
              ) : (
                <Button onClick={() => setOpen(true)}>
                  <Crown className="h-4 w-4 mr-2" /> Подключить Супер хост
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заявка на статус «Супер хост»</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Стоимость — 199 ₽/мес. Оплата и активация проходят вручную: администратор свяжется с вами по указанным контактам.
            </p>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={profile?.email || user?.email || ""} disabled />
            </div>
            <div>
              <Label className="text-xs">Телефон</Label>
              <Input value={profile?.phone || "—"} disabled />
            </div>
            <div>
              <Label className="text-xs">Telegram</Label>
              <Input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder={profile?.telegram || "@username"}
              />
            </div>
            <div>
              <Label className="text-xs">Комментарий (необязательно)</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={() => createRequest.mutate()} disabled={createRequest.isPending}>
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
