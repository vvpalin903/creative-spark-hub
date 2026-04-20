import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface Props {
  requestId: string;
}

/**
 * Inline chat row for booking_requests tables.
 * Renders a toggle button with unread badge and an expandable chat panel.
 */
export function RequestChatRow({ requestId }: Props) {
  const [open, setOpen] = useState(false);
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

  const unreadCount = chat ? unread?.byChat?.[chat.id] || 0 : 0;

  if (!chat) {
    return (
      <span className="text-xs text-muted-foreground">Чат недоступен</span>
    );
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant={unreadCount > 0 ? "default" : "outline"}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        Чат
        {unreadCount > 0 && (
          <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px] font-bold min-w-[18px] text-center">
            {unreadCount}
          </span>
        )}
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
      </Button>
      {open && (
        <div className="mt-2">
          <ChatPanel chatId={chat.id} compact />
        </div>
      )}
    </div>
  );
}
