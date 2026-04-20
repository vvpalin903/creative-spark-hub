import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Inbox, History, ShieldCheck, Building2, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "host" | "client";

interface Props {
  role: Role;
}

export default function Messages({ role }: Props) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeChatId = searchParams.get("chat");
  const { data: unread } = useUnreadMessages();

  const sections = useMemo(
    () =>
      role === "host"
        ? [
            { to: "/dashboard/host", label: "Мои объекты", icon: Building2 },
            { to: "/dashboard/host/requests", label: "Заявки", icon: Inbox },
            { to: "/dashboard/host/messages", label: "Сообщения", icon: MessageCircle },
            { to: "/dashboard/host/history", label: "История", icon: History },
            { to: "/dashboard/host/verification", label: "Верификация", icon: ShieldCheck },
          ]
        : [
            { to: "/dashboard/client", label: "Активные", icon: Inbox },
            { to: "/dashboard/client/messages", label: "Сообщения", icon: MessageCircle },
            { to: "/dashboard/client/history", label: "История", icon: History },
            { to: "/dashboard/client/verification", label: "Верификация", icon: ShieldCheck },
          ],
    [role]
  );

  const { data: chats, isLoading } = useQuery({
    queryKey: ["messages-page", "chats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // 1. Get chat ids the user participates in
      const { data: parts, error: pErr } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", user.id);
      if (pErr) throw pErr;
      const chatIds = (parts || []).map((p) => p.chat_id);
      if (chatIds.length === 0) return [];

      // 2. Get chats with related request + object
      const { data: chatRows, error: cErr } = await supabase
        .from("chats")
        .select("id, last_message_at, related_request_id, related_object_id")
        .in("id", chatIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (cErr) throw cErr;
      if (!chatRows || chatRows.length === 0) return [];

      // 3. Fetch related booking_requests (for counterpart name)
      const reqIds = chatRows.map((c) => c.related_request_id).filter(Boolean) as string[];
      const objIds = chatRows.map((c) => c.related_object_id).filter(Boolean) as string[];

      const [{ data: reqs }, { data: objs }] = await Promise.all([
        reqIds.length
          ? supabase
              .from("booking_requests")
              .select("id, client_name, client_user_id, host_user_id")
              .in("id", reqIds)
          : Promise.resolve({ data: [] as any[] }),
        objIds.length
          ? supabase.from("host_objects").select("id, title, host_user_id").in("id", objIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // 4. Get host profile names for objects (counterpart for clients)
      const hostUserIds = Array.from(new Set((objs || []).map((o: any) => o.host_user_id).filter(Boolean)));
      const { data: hostProfiles } = hostUserIds.length
        ? await supabase.from("profiles").select("user_id, name").in("user_id", hostUserIds)
        : { data: [] as any[] };

      const reqMap = new Map((reqs || []).map((r: any) => [r.id, r]));
      const objMap = new Map((objs || []).map((o: any) => [o.id, o]));
      const hostMap = new Map((hostProfiles || []).map((p: any) => [p.user_id, p.name]));

      // 5. Fetch last message per chat (one query, then group client-side)
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("chat_id, message_text, message_type, created_at, sender_user_id")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false })
        .limit(500);
      const lastMsgMap = new Map<string, { text: string; type: string; created_at: string; mine: boolean }>();
      for (const m of lastMsgs || []) {
        if (lastMsgMap.has(m.chat_id)) continue;
        lastMsgMap.set(m.chat_id, {
          text: m.message_text,
          type: m.message_type,
          created_at: m.created_at,
          mine: m.sender_user_id === user.id,
        });
      }

      return chatRows.map((c) => {
        const req = c.related_request_id ? reqMap.get(c.related_request_id) : null;
        const obj = c.related_object_id ? objMap.get(c.related_object_id) : null;
        const isHostMe = role === "host";
        const counterpart = isHostMe
          ? req?.client_name || "Клиент"
          : (obj?.host_user_id && hostMap.get(obj.host_user_id)) || "Хост";
        const lotTitle = obj?.title || "Без названия";
        const last = lastMsgMap.get(c.id);
        return {
          id: c.id,
          counterpart,
          lotTitle,
          lastMessageAt: c.last_message_at,
          lastMessageText: last?.text || "",
          lastMessageType: last?.type || "text",
          lastMessageMine: last?.mine || false,
        };
      });
    },
    enabled: !!user,
  });

  // Auto-select first chat if none selected and chats exist
  useEffect(() => {
    if (!activeChatId && chats && chats.length > 0) {
      setSearchParams({ chat: chats[0].id }, { replace: true });
    }
  }, [activeChatId, chats, setSearchParams]);

  const selectChat = (chatId: string) => {
    setSearchParams({ chat: chatId });
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 1) return "вчера";
    if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  };

  const formatPreview = (c: { lastMessageText: string; lastMessageType: string; lastMessageMine: boolean }) => {
    if (!c.lastMessageText) return "";
    if (c.lastMessageType === "system") return c.lastMessageText;
    const prefix = c.lastMessageMine ? "Вы: " : "";
    return prefix + c.lastMessageText;
  };

  const title = role === "host" ? "Кабинет хоста" : "Кабинет клиента";

  return (
    <DashboardLayout title={title} sections={sections}>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[600px]">
        {/* Conversations list */}
        <Card className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Диалоги {chats && `(${chats.length})`}</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !chats || chats.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Диалогов пока нет
              </div>
            ) : (
              <ul className="divide-y">
                {chats.map((c) => {
                  const isActive = c.id === activeChatId;
                  const unreadCount = unread?.byChat?.[c.id] || 0;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectChat(c.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-2",
                          isActive && "bg-accent"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">{c.counterpart}</p>
                            {unreadCount > 0 && (
                              <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px] font-bold min-w-[18px] text-center shrink-0">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lotTitle}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Chat panel */}
        <div className="min-w-0">
          {activeChatId ? (
            <ChatPanel key={activeChatId} chatId={activeChatId} className="h-full min-h-[600px]" />
          ) : (
            <Card className="h-full min-h-[600px] flex items-center justify-center text-sm text-muted-foreground">
              {chats && chats.length > 0 ? "Выберите диалог" : "Здесь появится переписка"}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
