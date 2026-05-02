import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<{ items: Notification[]; unread: number }> => {
      if (!user) return { items: [], unread: 0 };
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      const items = (data || []) as Notification[];
      return { items, unread: items.filter((n) => !n.is_read).length };
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return { ...query, markAllRead, markRead };
}
