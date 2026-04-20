import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface Props {
  requestId: string;
  role: "host" | "client";
}

/**
 * Compact "Open chat" button for booking_requests tables.
 * Navigates to /dashboard/{role}/messages?chat=<chatId>.
 */
export function RequestChatLink({ requestId, role }: Props) {
  const { data: unread } = useUnreadMessages();

  const { data: chat } = useQuery({
    queryKey: ["chat-by-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id")
        .eq("related_request_id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!chat) return <span className="text-xs text-muted-foreground">—</span>;

  const unreadCount = unread?.byChat?.[chat.id] || 0;

  return (
    <Button
      type="button"
      size="sm"
      variant={unreadCount > 0 ? "default" : "outline"}
      asChild
    >
      <Link to={`/dashboard/${role}/messages?chat=${chat.id}`}>
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        Чат
        {unreadCount > 0 && (
          <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px] font-bold min-w-[18px] text-center">
            {unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
