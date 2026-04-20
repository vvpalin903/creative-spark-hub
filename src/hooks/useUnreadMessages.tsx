import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the count of unread messages across all chats the user participates in.
 * "Unread" = messages created after the participant's last_read_at, sent by someone else, non-system.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread-counts", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, byChat: {} as Record<string, number> };

      const { data: parts } = await supabase
        .from("chat_participants")
        .select("chat_id, last_read_at")
        .eq("user_id", user.id);

      if (!parts || parts.length === 0) return { total: 0, byChat: {} };

      const byChat: Record<string, number> = {};
      let total = 0;
      for (const p of parts) {
        const after = p.last_read_at || "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("chat_id", p.chat_id)
          .gt("created_at", after)
          .neq("sender_user_id", user.id)
          .eq("message_type", "text");
        byChat[p.chat_id] = count || 0;
        total += count || 0;
      }
      return { total, byChat };
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  // Realtime: any new message → recompute
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-listener")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}
