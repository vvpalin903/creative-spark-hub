import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Package } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-accent via-background to-secondary py-16 md:py-24">
      <div className="container text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance animate-fade-in">
          Храните вещи рядом с домом
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Сервис аренды мест для хранения шин, велосипедов и других вещей рядом с вами
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Button asChild size="lg" className="text-base">
            <Link to="/rent">
              <MapPin className="mr-2 h-5 w-5" />
              Снять место
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-base">
            <Link to="/host">
              <Package className="mr-2 h-5 w-5" />
              Сдать место
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
