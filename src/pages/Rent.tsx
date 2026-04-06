import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LotCard } from "@/components/LotCard";
import { YandexMap } from "@/components/YandexMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Rent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get("category") || "all";
  const accessMode = searchParams.get("access") || "all";

  const { data: lots, isLoading } = useQuery({
    queryKey: ["lots", category, accessMode],
    queryFn: async () => {
      let query = supabase
        .from("lots")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (category !== "all") {
        query = query.eq("category", category as Tables<"lots">["category"]);
      }
      if (accessMode !== "all") {
        query = query.eq("access_mode", accessMode as Tables<"lots">["access_mode"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const mapPoints = useMemo(() => {
    if (!lots) return [];
    return lots
      .filter((l) => l.lat && l.lng)
      .map((l) => ({
        id: l.id,
        lat: l.lat!,
        lng: l.lng!,
        title: l.title,
        price: l.price_monthly,
        category: l.category,
      }));
  }, [lots]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete(key);
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="tires">Шины</SelectItem>
              <SelectItem value="bikes">Велосипеды</SelectItem>
              <SelectItem value="other">Другое</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accessMode} onValueChange={(v) => updateFilter("access", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Режим доступа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любой режим</SelectItem>
              <SelectItem value="24/7">24/7</SelectItem>
              <SelectItem value="scheduled">По расписанию</SelectItem>
            </SelectContent>
          </Select>
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
        ) : lots && lots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пока нет доступных лотов в этой категории</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
