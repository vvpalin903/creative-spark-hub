import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  requestId: string;
  /** start_date of the booking; cancellation is blocked once it has passed */
  startDate: string | null;
}

/**
 * Lets the client cancel their own booking request at any time before start_date.
 * Posts a system message into the related chat.
 */
export function CancelRequestButton({ requestId, startDate }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const startedAlready = startDate ? new Date(startDate) <= new Date(new Date().toDateString()) : false;

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ request_status: "cancelled" })
        .eq("id", requestId);
      if (error) throw error;

      // Post a system message into the related chat (best-effort)
      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("related_request_id", requestId)
        .maybeSingle();
      if (chat?.id) {
        await supabase.from("messages").insert({
          chat_id: chat.id,
          sender_user_id: null,
          message_type: "system",
          message_text: "Клиент отменил заявку.",
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Заявка отменена" });
      queryClient.invalidateQueries({ queryKey: ["client", "active_requests"] });
      queryClient.invalidateQueries({ queryKey: ["client", "history_requests"] });
      queryClient.invalidateQueries({ queryKey: ["host", "requests"] });
      setOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "Не удалось отменить", description: e.message, variant: "destructive" });
    },
  });

  if (startedAlready) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <X className="h-3.5 w-3.5 mr-1" /> Отменить
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить заявку?</AlertDialogTitle>
          <AlertDialogDescription>
            Хост получит системное сообщение в чате. Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>Не отменять</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              cancel.mutate();
            }}
            disabled={cancel.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Отменить заявку
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
