import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LotCard } from "@/components/LotCard";
import { YandexMap } from "@/components/YandexMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { storageCategoryLabels } from "@/lib/labels";

export default function Rent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get("category") || "all";
  const cityFilter = searchParams.get("city") || "";

  const { data: objects, isLoading } = useQuery({
    queryKey: ["public", "objects", category, cityFilter],
    queryFn: async () => {
      let query = supabase
        .from("host_objects")
        .select("id, title, address, city, district, photos, access_mode, schedule_mode, lat, lng, storage_slots(category, price_monthly, slot_status)")
        .eq("object_status", "published")
        .order("created_at", { ascending: false });

      if (cityFilter.trim()) {
        query = query.ilike("city", `%${cityFilter.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let list = data || [];
      if (category !== "all") {
        list = list.filter((o: any) =>
          (o.storage_slots || []).some((s: any) => s.category === category)
        );
      }
      return list;
    },
  });

  const mapPoints = useMemo(() => {
    if (!objects) return [];
    return objects
      .filter((o: any) => o.lat && o.lng)
      .map((o: any) => {
        const prices = (o.storage_slots || []).map((s: any) => s.price_monthly).filter((p: number) => p > 0);
        const min = prices.length ? Math.min(...prices) : 0;
        const firstCat = o.storage_slots?.[0]?.category || "other";
        return {
          id: o.id,
          lat: o.lat!,
          lng: o.lng!,
          title: o.title,
          price: min,
          category: firstCat,
        };
      });
  }, [objects]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          Снять место для хранения
        </h1>

        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={category} onValueChange={(v) => updateFilter("category", v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {Object.entries(storageCategoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Город"
            className="w-[200px]"
            defaultValue={cityFilter}
            onBlur={(e) => updateFilter("city", e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilter("city", (e.target as HTMLInputElement).value.trim());
            }}
          />
        </div>

        <YandexMap
          points={mapPoints}
          onPointClick={(id) => navigate(`/lot/${id}`)}
          className="w-full h-[300px] md:h-[400px] mb-8"
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : objects && objects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {objects.map((obj: any) => (
              <LotCard key={obj.id} lot={obj} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пока нет объектов под выбранные фильтры</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
