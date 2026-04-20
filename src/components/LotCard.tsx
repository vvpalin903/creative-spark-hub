import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { accessModeLabels, scheduleModeLabels, storageCategoryLabels } from "@/lib/labels";

export interface LotCardObject {
  id: string;
  title: string;
  address: string;
  city: string | null;
  photos: string[] | null;
  access_mode: string;
  schedule_mode: string;
  storage_slots?: Array<{ category: string; price_monthly: number }>;
}

function formatPrice(slots: Array<{ price_monthly: number }> | undefined) {
  if (!slots || slots.length === 0) return "Цена по запросу";
  const prices = slots.map((s) => s.price_monthly).filter((p) => p > 0);
  if (prices.length === 0) return "Цена по запросу";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min.toLocaleString("ru-RU")} ₽/мес`;
  return `${min.toLocaleString("ru-RU")} – ${max.toLocaleString("ru-RU")} ₽/мес`;
}

export function LotCard({ lot }: { lot: LotCardObject }) {
  const photo = lot.photos?.[0];
  const slots = lot.storage_slots || [];
  const categories = Array.from(new Set(slots.map((s) => s.category))).slice(0, 3);

  return (
    <Link to={`/lot/${lot.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg hover:border-primary/30">
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          {photo ? (
            <img src={photo} alt={lot.title} className="h-full w-full object-contain bg-muted" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
              Нет фото
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {categories.length > 0 ? (
              categories.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">
                  {storageCategoryLabels[c] || c}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-xs">Слоты не добавлены</Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{lot.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{lot.city ? `${lot.city}, ` : ""}{lot.address}</span>
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-primary line-clamp-1">
              {formatPrice(slots)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0" title={accessModeLabels[lot.access_mode]}>
              <Clock className="h-3 w-3" />
              {scheduleModeLabels[lot.schedule_mode] || "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
