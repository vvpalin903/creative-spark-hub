import { Mail, Phone } from "lucide-react";

export function ContactSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container text-center max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Свяжитесь с нами
        </h2>
        <p className="text-muted-foreground mb-8">
          Есть вопросы? Мы с удовольствием поможем!
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <a
            href="mailto:info@mestoryadom.ru"
            className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Mail className="h-5 w-5" />
            info@mestoryadom.ru
          </a>
          <a
            href="tel:+79991234567"
            className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Phone className="h-5 w-5" />
            +7 (999) 123-45-67
          </a>
        </div>
      </div>
    </section>
  );
}
