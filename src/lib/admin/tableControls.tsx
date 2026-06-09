import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export interface SortState { key: string; dir: SortDir }

export interface UseTableControlsOpts<T> {
  searchFields: (row: T) => string;
  statusField?: (row: T) => string | null | undefined;
  sortAccessors: Record<string, (row: T) => string | number | Date | null | undefined>;
  defaultSort?: SortState;
}

export function useTableControls<T>(
  rows: T[] | undefined | null,
  opts: UseTableControlsOpts<T>,
) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortState | null>(opts.defaultSort ?? null);

  const filtered = useMemo(() => {
    let list = (rows || []).slice();
    if (status !== "all" && opts.statusField) {
      list = list.filter((r) => (opts.statusField!(r) ?? "") === status);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => (opts.searchFields(r) || "").toLowerCase().includes(q));
    }
    if (sort && opts.sortAccessors[sort.key]) {
      const acc = opts.sortAccessors[sort.key];
      list.sort((a, b) => {
        const av = acc(a);
        const bv = acc(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
        else cmp = String(av).localeCompare(String(bv), "ru");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, search, status, sort, opts]);

  return { filtered, search, setSearch, status, setStatus, sort, setSort };
}

export function SortHead({
  label,
  sortKey,
  sort,
  setSort,
  className,
}: {
  label: React.ReactNode;
  sortKey: string;
  sort: SortState | null;
  setSort: (s: SortState | null) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const dir = active ? sort!.dir : null;
  const onClick = () => {
    if (!active) setSort({ key: sortKey, dir: "asc" });
    else if (dir === "asc") setSort({ key: sortKey, dir: "desc" });
    else setSort(null);
  };
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={onClick}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export interface StatusOption { value: string; label: string }

export function TableToolbar({
  search,
  setSearch,
  status,
  setStatus,
  statusOptions,
  count,
  placeholder = "Поиск...",
  className,
}: {
  search: string;
  setSearch: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  statusOptions?: StatusOption[];
  count: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap mb-3", className)}>
      <Input
        className="max-w-xs h-9"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {statusOptions && setStatus && (
        <Select value={status || "all"} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="ml-auto text-xs text-muted-foreground">{count} записей</div>
    </div>
  );
}
