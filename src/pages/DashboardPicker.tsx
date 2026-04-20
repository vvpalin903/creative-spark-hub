import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardPicker() {
  const { loading, isHost, isClient, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auto-redirect if user has only one role
  if (isHost && !isClient) return <Navigate to="/dashboard/host" replace />;
  if (isClient && !isHost) return <Navigate to="/dashboard/client" replace />;
  if (isAdmin && !isHost && !isClient) return <Navigate to="/admin" replace />;

  return (
    <Layout>
      <div className="container py-12 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
          Куда хотите перейти?
        </h1>
        <p className="text-muted-foreground text-center mb-8">Выберите кабинет</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dashboard/client">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <User className="h-10 w-10 text-primary mx-auto mb-3" />
                <h2 className="font-semibold text-lg mb-1">Кабинет клиента</h2>
                <p className="text-sm text-muted-foreground">Заявки, активные размещения, история</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/host">
            <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
                <h2 className="font-semibold text-lg mb-1">Кабинет хоста</h2>
                <p className="text-sm text-muted-foreground">Объекты, заявки клиентов, верификация</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {!isHost && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Если вы хотите сдавать место, заполните{" "}
            <Link to="/host" className="underline">форму хоста</Link> — мы добавим вам соответствующую роль.
          </p>
        )}
      </div>
    </Layout>
  );
}
