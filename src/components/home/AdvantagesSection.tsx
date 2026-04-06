import { Shield, MapPin, Clock, Wallet } from "lucide-react";

const advantages = [
  { icon: MapPin, title: "Рядом с домом", desc: "Места для хранения в шаговой доступности" },
  { icon: Wallet, title: "Доступные цены", desc: "Дешевле, чем коммерческие склады" },
  { icon: Clock, title: "Гибкий доступ", desc: "Режим 24/7 или по расписанию — выбирайте удобный" },
  { icon: Shield, title: "Проверенные хосты", desc: "Все владельцы проходят верификацию" },
];

export function AdvantagesSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          Почему Место рядом
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((a) => (
            <div key={a.title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <a.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
