import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SuperHostBadge({ plan, className }: { plan?: string | null; className?: string }) {
  if (plan !== "super_host") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm",
        className,
      )}
      title="Супер хост"
    >
      <Crown className="h-3 w-3" />
      Супер хост
    </span>
  );
}
