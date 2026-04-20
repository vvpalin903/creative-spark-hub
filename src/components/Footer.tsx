import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Место рядом" className="h-8 w-auto" />
              <span className="font-bold text-foreground">Место рядом</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Сервис хранения вещей рядом с домом — в вашем районе.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Навигация</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/rent" className="hover:text-primary transition-colors">Снять место</Link></li>
              <li><Link to="/host" className="hover:text-primary transition-colors">Сдать место</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-primary transition-colors">Как это работает</Link></li>
              <li><Link to="/#faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Документы</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/docs/privacy" className="hover:text-primary transition-colors">Политика конфиденциальности</Link></li>
              <li><Link to="/docs/terms" className="hover:text-primary transition-colors">Пользовательское соглашение</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Место рядом. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
