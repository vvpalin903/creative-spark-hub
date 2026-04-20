import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  placementId: string;
  rateeUserId: string;
  raterRole: "host" | "client";
  /** Counterpart name shown in the title */
  counterpartName: string;
}

export function ReviewDialog({ open, onOpenChange, placementId, rateeUserId, raterRole, counterpartName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Не авторизован");
      if (rating < 1 || rating > 5) throw new Error("Поставьте оценку от 1 до 5");
      const { error } = await supabase.from("reviews").insert({
        placement_id: placementId,
        rater_user_id: user.id,
        ratee_user_id: rateeUserId,
        rater_role: raterRole,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Спасибо за отзыв!" });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["host-rating"] });
      onOpenChange(false);
      setRating(0);
      setComment("");
    },
    onError: (e: Error) => {
      toast({ title: "Не удалось отправить отзыв", description: e.message, variant: "destructive" });
    },
  });

  const target = raterRole === "client" ? "хосте" : "клиенте";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оставить отзыв о {target}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{counterpartName}</p>

          <div>
            <Label className="block mb-2">Оценка</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => {
                const filled = (hover || rating) >= v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRating(v)}
                    onMouseEnter={() => setHover(v)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`${v} из 5`}
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        filled ? "fill-warning text-warning" : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="review-comment">Комментарий (необязательно)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Расскажите, как всё прошло"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Отмена
          </Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || rating < 1}>
            {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Отправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
