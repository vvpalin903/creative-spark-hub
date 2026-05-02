import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function NotificationsBell() {
  const { data, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();
  const unread = data?.unread || 0;
  const items = data?.items || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-popover">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Уведомления</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-auto py-1">
              Прочитать все
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет уведомлений</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 cursor-pointer hover:bg-accent ${!n.is_read ? "bg-accent/40" : ""}`}
                  onClick={async () => {
                    if (!n.is_read) await markRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
