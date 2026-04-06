import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const clientSteps = [
  { step: "1", title: "Выберите место", desc: "Найдите подходящий лот на карте или в каталоге" },
  { step: "2", title: "Оставьте заявку", desc: "Заполните форму с контактными данными" },
  { step: "3", title: "Договоритесь с хостом", desc: "Мы передадим вашу заявку владельцу места" },
  { step: "4", title: "Храните вещи", desc: "Привезите вещи и пользуйтесь хранилищем" },
];

const hostSteps = [
  { step: "1", title: "Подайте заявку", desc: "Расскажите о вашем месте для хранения" },
  { step: "2", title: "Пройдите проверку", desc: "Мы проверим ваши данные и документы" },
  { step: "3", title: "Публикация лота", desc: "Ваше объявление появится на сайте" },
  { step: "4", title: "Принимайте заявки", desc: "Получайте заявки от клиентов и зарабатывайте" },
];

function StepList({ steps }: { steps: typeof clientSteps }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      {steps.map((s) => (
        <div key={s.step} className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
            {s.step}
          </div>
          <h4 className="font-semibold text-foreground mb-1">{s.title}</h4>
          <p className="text-sm text-muted-foreground">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 bg-secondary/30">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
          Как это работает
        </h2>
        <Tabs defaultValue="client" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
            <TabsTrigger value="client">Для клиента</TabsTrigger>
            <TabsTrigger value="host">Для хоста</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <StepList steps={clientSteps} />
          </TabsContent>
          <TabsContent value="host">
            <StepList steps={hostSteps} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
