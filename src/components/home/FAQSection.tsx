import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    q: "Как работает сервис «Место рядом»?",
    a: "Мы связываем людей, которым нужно хранить вещи, с теми, у кого есть свободное место. Вы выбираете лот, оставляете заявку, и мы передаём ваши данные хосту для связи.",
  },
  {
    q: "Какие вещи можно хранить?",
    a: "Шины и диски, велосипеды и самокаты, коробки с вещами, спортинвентарь и другие предметы. Категория «Другое» предполагает индивидуальное согласование с хостом.",
  },
  {
    q: "Как обеспечивается безопасность?",
    a: "Все хосты проходят верификацию с проверкой документов. Мы контролируем качество и условия хранения.",
  },
  {
    q: "Сколько стоит хранение?",
    a: "Цена зависит от категории, размера места и условий хранения. Стоимость указана на каждом лоте.",
  },
  {
    q: "Могу ли я сдать своё место?",
    a: "Да! Перейдите на страницу «Сдать место», заполните форму, и после проверки ваше объявление появится на сайте.",
  },
  {
    q: "В каких районах работает сервис?",
    a: "Сервис работает там, где есть проверенные хосты. Город и район указаны на карточке каждого объявления — выбирайте удобное место рядом с вами.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-16 bg-secondary/30">
      <div className="container max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          Часто задаваемые вопросы
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-foreground">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
