import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  chatId: string;
  className?: string;
  compact?: boolean;
}

export function ChatPanel({ chatId, className, compact }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Mark as read
  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("user_id", user.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
      });
  }, [chatId, user, messages?.length, queryClient]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages?.length]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_user_id: user.id,
      message_text: text.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Не удалось отправить", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    queryClient.invalidateQueries({ queryKey: ["chat", chatId, "messages"] });
  };

  return (
    <div className={`flex flex-col border rounded-lg bg-background ${className || ""}`}>
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-3 space-y-2 ${compact ? "max-h-[300px]" : "min-h-[300px] max-h-[500px]"}`}
      >
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Сообщений пока нет</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_user_id === user?.id;
            const isSystem = m.message_type === "system" || !m.sender_user_id;
            if (isSystem) {
              return (
                <div key={m.id} className="text-center text-xs text-muted-foreground py-1">
                  {m.message_text}
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t p-2 flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Напишите сообщение..."
          className="resize-none"
        />
        <Button type="button" onClick={send} disabled={sending || !text.trim()} size="icon">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
