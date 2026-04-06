import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CircleDot, Bike, Package } from "lucide-react";

const categories = [
  {
    icon: CircleDot,
    title: "Шины",
    description: "Сезонное хранение шин и дисков в сухом помещении",
    filter: "tires",
  },
  {
    icon: Bike,
    title: "Велосипеды",
    description: "Безопасное хранение велосипедов и самокатов",
    filter: "bikes",
  },
  {
    icon: Package,
    title: "Другое",
    description: "Коробки, спортинвентарь, сезонные вещи и прочее",
    filter: "other",
  },
];

export function CategoriesSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          Что можно хранить
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link key={cat.filter} to={`/rent?category=${cat.filter}`}>
              <Card className="h-full transition-shadow hover:shadow-lg hover:border-primary/30 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                    <cat.icon className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
