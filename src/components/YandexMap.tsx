import { useEffect, useRef, useState } from "react";

const YANDEX_MAPS_API_KEY = "5704dc84-6009-4a48-99ec-17cec1934c65";

let ymapsPromise: Promise<any> | null = null;

function loadYmaps(): Promise<any> {
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    if ((window as any).ymaps) {
      (window as any).ymaps.ready(() => resolve((window as any).ymaps));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`;
    script.onload = () => {
      (window as any).ymaps.ready(() => resolve((window as any).ymaps));
    };
    script.onerror = () => {
      ymapsPromise = null;
      reject(new Error("Failed to load Yandex Maps"));
    };
    document.head.appendChild(script);
  });
  return ymapsPromise;
}

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: number;
  category: string;
}

interface YandexMapProps {
  points?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  onPointClick?: (id: string) => void;
  singlePoint?: boolean;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  tires: "Шины",
  bikes: "Велосипеды",
  other: "Другое",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function groupPointsByCoordinates(points: MapPoint[]) {
  const groups = new Map<string, MapPoint[]>();

  points.forEach((point) => {
    const key = `${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`;
    const current = groups.get(key) ?? [];
    current.push(point);
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function buildGroupBalloonContent(points: MapPoint[]) {
  const items = points
    .map((point) => {
      const title = escapeHtml(point.title);
      const category = escapeHtml(categoryLabels[point.category] ?? point.category);
      const price = point.price.toLocaleString("ru-RU");

      return `
        <a
          href="/lot/${point.id}"
          style="display:block;padding:12px 0;text-decoration:none;color:#111827;border-bottom:1px solid #e5e7eb;"
        >
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${title}</div>
          <div style="font-size:12px;color:#6b7280;">${category} · ${price} ₽/мес</div>
        </a>
      `;
    })
    .join("");

  return `
    <div style="min-width:260px;max-width:320px;padding:4px 0;">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">Доступные объявления</div>
      ${items}
    </div>
  `;
}

export function YandexMap({
  points = [],
  center = [55.9116, 37.7308], // Мытищи
  zoom = 12,
  onPointClick,
  singlePoint = false,
  className = "w-full h-[400px]",
}: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadYmaps()
      .then((ymaps) => {
        if (!mounted || !containerRef.current) return;

        if (mapRef.current) {
          mapRef.current.destroy();
        }

        const map = new ymaps.Map(containerRef.current, {
          center,
          zoom,
          controls: ["zoomControl", "geolocationControl"],
        });

        mapRef.current = map;

        if (points.length > 0) {
          const clusterer = new ymaps.Clusterer({
            preset: "islands#greenClusterIcons",
            groupByCoordinates: false,
            clusterDisableClickZoom: false,
            clusterOpenBalloonOnClick: false,
          });

          const placemarks = groupPointsByCoordinates(points).map((group) => {
            const [firstPoint] = group;
            const isGroup = group.length > 1;

            const placemark = new ymaps.Placemark(
              [firstPoint.lat, firstPoint.lng],
              isGroup
                ? {
                    hintContent: `${group.length} объявлений по этому адресу`,
                    balloonContentBody: buildGroupBalloonContent(group),
                    iconContent: String(group.length),
                  }
                : {
                    hintContent: `${firstPoint.title} — ${firstPoint.price.toLocaleString("ru-RU")} ₽/мес`,
                  },
              {
                preset: isGroup ? "islands#greenStretchyIcon" : "islands#greenDotIcon",
                hasBalloon: isGroup,
                hideIconOnBalloonOpen: false,
              }
            );

            if (!isGroup && onPointClick) {
              placemark.events.add("click", () => {
                onPointClick(firstPoint.id);
              });
            }

            return placemark;
          });

          if (singlePoint) {
            placemarks.forEach((p) => map.geoObjects.add(p));
          } else {
            clusterer.add(placemarks);
            map.geoObjects.add(clusterer);

            if (points.length > 1) {
              map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
            }
          }
        }

        setLoading(false);
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [points, center, zoom]);

  return (
    <div className={`relative rounded-lg overflow-hidden border ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-sm text-muted-foreground">Загрузка карты...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-sm text-destructive">Не удалось загрузить карту</p>
        </div>
      )}
    </div>
  );
}
