import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const categoryLabels: Record<string, string> = {
  tires: "Шины",
  bikes: "Велосипеды",
  other: "Другое",
};

export function LotCard({ lot }: { lot: Tables<"lots"> }) {
  const photo = lot.photos?.[0];

  return (
    <Link to={`/lot/${lot.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg hover:border-primary/30">
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          {photo ? (
            <img src={photo} alt={lot.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
              Нет фото
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[lot.category] || lot.category}
            </Badge>
            {!lot.is_mytishchi && (
              <Badge variant="outline" className="text-xs border-warning text-warning">
                Не Мытищи
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{lot.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{lot.address}</span>
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {lot.price_monthly.toLocaleString("ru-RU")} ₽/мес
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lot.access_mode === "24/7" ? "24/7" : "По расписанию"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
