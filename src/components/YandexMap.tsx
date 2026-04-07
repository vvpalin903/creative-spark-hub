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
          });

          const placemarks = points.map((point) => {
            const placemark = new ymaps.Placemark(
              [point.lat, point.lng],
              {
                hintContent: `${point.title} — ${point.price.toLocaleString("ru-RU")} ₽/мес`,
              },
              {
                preset: "islands#greenDotIcon",
                hasBalloon: false,
              }
            );

            if (onPointClick) {
              placemark.events.add("click", () => {
                onPointClick(point.id);
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
