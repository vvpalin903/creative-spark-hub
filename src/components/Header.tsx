import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { NotificationsBell } from "@/components/NotificationsBell";

const navItems = [
  { label: "Снять место", href: "/rent" },
  { label: "Сдать место", href: "/host" },
  { label: "Как это работает", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, isHost, isClient, isStaff, signOut } = useAuth();
  const { data: unread } = useUnreadMessages();
  const unreadTotal = unread?.total || 0;

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const dashboardHref = isHost ? "/dashboard/host" : isClient ? "/dashboard/client" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Место рядом" className="h-10 w-auto" />
          <span className="text-lg font-bold text-foreground hidden sm:inline">Место рядом</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => handleNavClick(item.href)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {session && <NotificationsBell />}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <User className="h-4 w-4 mr-2" />
                  {user?.email?.split("@")[0]}
                  {unreadTotal > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {unreadTotal > 99 ? "99+" : unreadTotal}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {isHost && (
                  <DropdownMenuItem onClick={() => navigate("/dashboard/host")}>
                    Кабинет хоста
                  </DropdownMenuItem>
                )}
                {isClient && (
                  <DropdownMenuItem onClick={() => navigate("/dashboard/client")}>
                    Кабинет клиента
                  </DropdownMenuItem>
                )}
                {!isHost && !isClient && (
                  <DropdownMenuItem onClick={() => navigate(dashboardHref)}>
                    Мой кабинет
                  </DropdownMenuItem>
                )}
                {isStaff && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    Админка
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Профиль и настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Войти
              </Link>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-sm font-medium text-muted-foreground hover:text-primary py-2"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t pt-3">
              {session ? (
                <>
                  {isHost && (
                    <Link to="/dashboard/host" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">
                      Кабинет хоста
                    </Link>
                  )}
                  {isClient && (
                    <Link to="/dashboard/client" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">
                      Кабинет клиента
                    </Link>
                  )}
                  {isStaff && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">
                      Админка
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await signOut();
                      setMobileOpen(false);
                      navigate("/");
                    }}
                    className="block py-2 text-sm font-medium text-destructive"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">
                  Войти
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
