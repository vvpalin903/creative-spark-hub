import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface Props {
  hostUserId: string;
  className?: string;
}

/**
 * Public host rating: average + count of reviews from clients.
 * Renders nothing when there are no reviews yet.
 */
export function HostRating({ hostUserId, className }: Props) {
  const { data } = useQuery({
    queryKey: ["host-rating", hostUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_rating", { _host_user_id: hostUserId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { avg_rating: number | null; review_count: number } | null;
    },
    enabled: !!hostUserId,
    staleTime: 60_000,
  });

  if (!data || !data.review_count || Number(data.review_count) === 0) return null;

  const avg = Number(data.avg_rating);
  const count = Number(data.review_count);

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className || ""}`}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <strong className="font-semibold">{avg.toFixed(1)}</strong>
      <span className="text-muted-foreground">
        ({count} {pluralReviews(count)})
      </span>
    </span>
  );
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отзыва";
  return "отзывов";
}
