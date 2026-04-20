import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";
import { ReviewDialog } from "./ReviewDialog";

interface Props {
  placementId: string;
  rateeUserId: string;
  raterRole: "host" | "client";
  counterpartName: string;
}

/**
 * Shows "Оставить отзыв" button for completed placements.
 * If the current user already reviewed this placement, shows a disabled "Отзыв оставлен" badge instead.
 */
export function ReviewButton({ placementId, rateeUserId, raterRole, counterpartName }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["my-reviews", placementId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("reviews")
        .select("id, rating")
        .eq("placement_id", placementId)
        .eq("rater_user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (existing) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success" />
        Отзыв оставлен ({existing.rating}/5)
      </span>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Star className="h-3.5 w-3.5 mr-1" /> Оставить отзыв
      </Button>
      {open && (
        <ReviewDialog
          open={open}
          onOpenChange={setOpen}
          placementId={placementId}
          rateeUserId={rateeUserId}
          raterRole={raterRole}
          counterpartName={counterpartName}
        />
      )}
    </>
  );
}
