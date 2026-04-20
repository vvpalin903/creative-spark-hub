import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { LotCard, type LotCardObject } from "@/components/LotCard";
import { HostRating } from "@/components/reviews/HostRating";
import { Loader2, MapPin, Calendar, Package, CheckCircle2, Star } from "lucide-react";

function pluralReviews(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отзыв";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "отзыва";
  return "отзывов";
}

function formatJoinDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function HostProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["host-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, city, created_at")
        .eq("user_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["host-public-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_public_stats", { _host_user_id: id! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { published_objects: number; completed_placements: number } | null;
    },
    enabled: !!id,
  });

  const { data: rating } = useQuery({
    queryKey: ["host-rating", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_rating", { _host_user_id: id! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { avg_rating: number | null; review_count: number } | null;
    },
    enabled: !!id,
  });

  const { data: lots } = useQuery({
    queryKey: ["host-public-lots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_objects")
        .select("id, title, address, city, photos, access_mode, schedule_mode, storage_slots(category, price_monthly)")
        .eq("host_user_id", id!)
        .eq("object_status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LotCardObject[];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["host-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, rater_user_id, rater_role")
        .eq("ratee_user_id", id!)
        .eq("rater_role", "client")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const raterIds = Array.from(new Set((reviews || []).map((r) => r.rater_user_id)));
  const { data: raters } = useQuery({
    queryKey: ["host-reviews-raters", id, raterIds.join(",")],
    queryFn: async () => {
      if (raterIds.length === 0) return {} as Record<string, { name: string | null }>;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", raterIds);
      if (error) throw error;
      const map: Record<string, { name: string | null }> = {};
      (data || []).forEach((p) => { map[p.user_id] = { name: p.name }; });
      return map;
    },
    enabled: raterIds.length > 0,
  });

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Профиль не найден или скрыт</p>
          <Link to="/rent" className="text-primary underline mt-2 inline-block">Вернуться к каталогу</Link>
        </div>
      </Layout>
    );
  }

  const initials = (profile.name || "?").trim().slice(0, 2).toUpperCase();
  const joined = formatJoinDate(profile.created_at);

  return (
    <Layout>
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <Avatar className="h-20 w-20">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.name || "Хост"} />}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{profile.name || "Без имени"}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {profile.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {profile.city}
                    </span>
                  )}
                  {joined && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> На платформе с {joined}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <HostRating hostUserId={profile.user_id} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Опубликовано лотов
                </div>
                <div className="text-xl font-semibold mt-1">{stats?.published_objects ?? 0}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Завершено сделок
                </div>
                <div className="text-xl font-semibold mt-1">{stats?.completed_placements ?? 0}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> Отзывов
                </div>
                <div className="text-xl font-semibold mt-1">{Number(rating?.review_count ?? 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lots */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Лоты хоста</h2>
          {!lots || lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет опубликованных лотов</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Отзывы клиентов</h2>
            {rating?.review_count ? (
              <Badge variant="secondary">
                {Number(rating.review_count)} {pluralReviews(Number(rating.review_count))}
              </Badge>
            ) : null}
          </div>
          {!reviews || reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">У хоста пока нет отзывов</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => {
                const raterName = raters?.[r.rater_user_id]?.name || "Клиент";
                return (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground truncate">{raterName}</span>
                          <span className="inline-flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                              />
                            ))}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatReviewDate(r.created_at)}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{r.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <Separator className="mt-8" />
        </section>
      </div>
    </Layout>
  );
}
