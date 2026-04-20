import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Wallet, Users, Shield, Building2, ClipboardCheck, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const hostFaq = [
  { q: "Какие требования к месту?", a: "Место должно быть сухим, безопасным и иметь возможность доступа для клиента. Подходят гаражи, кладовки, подвалы, балконы, складские помещения." },
  { q: "Как проходит верификация?", a: "После регистрации вы создаёте объект и отправляете его на проверку. Модераторы проверяют адрес и фотографии в течение 1–2 рабочих дней." },
  { q: "Сколько можно заработать?", a: "Доход зависит от площади, расположения и категории. В среднем хосты получают от 1 000 до 5 000 ₽ в месяц за слот." },
  { q: "Кто отвечает за вещи клиента?", a: "Условия и ответственность согласуются между вами и клиентом. Сервис помогает фиксировать договорённости в чате и истории заявок." },
];

const steps = [
  { icon: ClipboardCheck, title: "Зарегистрируйтесь как хост", text: "Это бесплатно. Понадобится email и телефон." },
  { icon: Building2, title: "Добавьте объект и слоты", text: "Опишите место, добавьте фото и установите цену для каждого типа хранения." },
  { icon: MessageSquare, title: "Получайте заявки", text: "Клиенты находят объекты в каталоге и пишут вам через защищённый чат сервиса." },
];

export default function Host() {
  const { user, isHost } = useAuth();

  const cta = user
    ? isHost
      ? { to: "/dashboard/host", label: "В кабинет хоста" }
      : { to: "/auth?role=host", label: "Стать хостом" }
    : { to: "/auth?role=host", label: "Зарегистрироваться как хост" };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-accent via-background to-secondary py-16">
        <div className="container text-center max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Зарабатывайте на свободном месте
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Сдайте гараж, кладовку, балкон или склад под хранение вещей соседей. Сервис берёт на себя поиск клиентов, заявки и переписку.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <Wallet className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Доход</h3>
              <p className="text-sm text-muted-foreground">от 1 000 ₽/мес за слот</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Клиенты</h3>
              <p className="text-sm text-muted-foreground">Мы приводим целевую аудиторию</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground">Безопасность</h3>
              <p className="text-sm text-muted-foreground">Профили клиентов проверяются</p>
            </div>
          </div>

          <Button asChild size="lg">
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-background">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">Как это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <s.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">{i + 1}. {s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild>
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-secondary/30">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">FAQ для хостов</h2>
          <Accordion type="single" collapsible className="w-full">
            {hostFaq.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-foreground">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </Layout>
  );
}
