import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Send, EyeOff, Eye, Building2, Inbox, History, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { HostObjectFormDialog } from "@/components/dashboard/HostObjectFormDialog";
import { PhotosManager } from "@/components/dashboard/PhotosManager";
import { SlotsManager } from "@/components/dashboard/SlotsManager";
import {
  accessModeLabels,
  objectStatusColors,
  objectStatusLabels,
  objectVerificationStatusLabels,
  scheduleModeLabels,
} from "@/lib/labels";
import { toast } from "@/hooks/use-toast";

const sections = [
  { to: "/dashboard/host", label: "Мои объекты", icon: Building2 },
  { to: "/dashboard/host/requests", label: "Заявки", icon: Inbox },
  { to: "/dashboard/host/history", label: "История", icon: History },
  { to: "/dashboard/host/verification", label: "Верификация", icon: ShieldCheck },
];

export default function HostObjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: object, isLoading } = useQuery({
    queryKey: ["host", "object", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("host_objects").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const submitForReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("host_objects")
        .update({ object_status: "pending_review", verification_status: "pending" })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "object", id] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: "Объект отправлен на проверку" });
    },
  });

  const toggleHidden = useMutation({
    mutationFn: async (hide: boolean) => {
      const { error } = await supabase
        .from("host_objects")
        .update({ object_status: hide ? "hidden" : "published" })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host", "object", id] });
      queryClient.invalidateQueries({ queryKey: ["host", "objects"] });
      toast({ title: "Статус обновлён" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Кабинет хоста" sections={sections}>
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!object) {
    return (
      <DashboardLayout title="Кабинет хоста" sections={sections}>
        <p className="text-sm text-muted-foreground">Объект не найден.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard/host"><ArrowLeft className="h-4 w-4 mr-1" /> К списку</Link>
        </Button>
      </DashboardLayout>
    );
  }

  if (object.host_user_id !== user?.id) {
    return (
      <DashboardLayout title="Кабинет хоста" sections={sections}>
        <p className="text-sm text-muted-foreground">Доступ запрещён.</p>
      </DashboardLayout>
    );
  }

  const isPublished = object.object_status === "published";
  const isHidden = object.object_status === "hidden";
  const isDraft = object.object_status === "draft" || object.object_status === "needs_changes";

  return (
    <DashboardLayout title="Кабинет хоста" sections={sections}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/host"><ArrowLeft className="h-4 w-4 mr-1" /> К списку</Link>
          </Button>
          <div className="flex gap-2 flex-wrap">
            {isDraft && (
              <Button size="sm" onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                <Send className="h-4 w-4 mr-1" /> Опубликовать
              </Button>
            )}
            {isPublished && (
              <Button size="sm" variant="outline" onClick={() => toggleHidden.mutate(true)} disabled={toggleHidden.isPending}>
                <EyeOff className="h-4 w-4 mr-1" /> Скрыть
              </Button>
            )}
            {isHidden && (
              <Button size="sm" variant="outline" onClick={() => toggleHidden.mutate(false)} disabled={toggleHidden.isPending}>
                <Eye className="h-4 w-4 mr-1" /> Опубликовать
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Редактировать
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-foreground">{object.title}</h2>
                <p className="text-sm text-muted-foreground">{object.address}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded ${objectStatusColors[object.object_status]}`}>
                  {objectStatusLabels[object.object_status]}
                </span>
                <Badge variant="outline">Верификация: {objectVerificationStatusLabels[object.verification_status]}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info label="Доступ" value={accessModeLabels[object.access_mode]} />
              <Info label="Расписание" value={scheduleModeLabels[object.schedule_mode]} />
              {object.schedule_notes && <Info label="Уточнения" value={object.schedule_notes} />}
              {object.area_sqm && <Info label="Площадь" value={`${object.area_sqm} м²`} />}
              {object.city && <Info label="Город" value={object.city} />}
              {object.district && <Info label="Район" value={object.district} />}
            </div>

            {object.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Описание</p>
                <p className="text-sm whitespace-pre-wrap">{object.description}</p>
              </div>
            )}

            {object.rules && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Правила хранения</p>
                <p className="text-sm whitespace-pre-wrap">{object.rules}</p>
              </div>
            )}

            {object.reviewer_notes && (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">Комментарий модератора</p>
                <p className="text-sm">{object.reviewer_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <section>
          <h3 className="text-lg font-semibold mb-3">Фотографии</h3>
          <PhotosManager objectId={object.id} photos={object.photos || []} />
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Слоты хранения</h3>
          <SlotsManager objectId={object.id} />
        </section>
      </div>

      {editOpen && <HostObjectFormDialog open={editOpen} onOpenChange={setEditOpen} object={object} />}
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
