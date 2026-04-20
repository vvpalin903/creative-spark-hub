export const lotCategoryLabels: Record<string, string> = {
  tires: "Шины",
  bikes: "Велосипеды",
  other: "Другое",
};

export const storageCategoryLabels: Record<string, string> = {
  tires: "Шины",
  bikes: "Велосипеды",
  boxes: "Коробки",
  furniture: "Мебель",
  sport: "Спортинвентарь",
  seasonal: "Сезонные вещи",
  other: "Другое",
};

export const accessModeLabels: Record<string, string> = {
  free_by_arrangement: "Свободный по договорённости",
  pre_approval: "По предварительному согласованию",
  host_present_only: "Только в присутствии хоста",
  self_access: "Самостоятельный доступ",
  rare_seasonal: "Редкий / сезонное хранение",
  weekends_only: "Только по выходным",
  weekdays_only: "Только по будням",
  specific_hours: "Только в определённые часы",
};

export const scheduleModeLabels: Record<string, string> = {
  daily: "Ежедневно",
  weekdays: "По будням",
  weekends: "По выходным",
  by_arrangement: "По договорённости",
  mornings_only: "Только утром",
  daytime_only: "Только днём",
  evenings_only: "Только вечером",
};

export const objectStatusLabels: Record<string, string> = {
  draft: "Черновик",
  pending_review: "На проверке",
  needs_changes: "Требуются уточнения",
  verified: "Верифицирован",
  published: "Опубликован",
  hidden: "Скрыт",
  archived: "Архив",
};

export const objectStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-warning/10 text-warning",
  needs_changes: "bg-destructive/10 text-destructive",
  verified: "bg-primary/10 text-primary",
  published: "bg-primary text-primary-foreground",
  hidden: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

export const objectVerificationStatusLabels: Record<string, string> = {
  not_submitted: "Не отправлено",
  pending: "На проверке",
  approved: "Одобрено",
  rejected: "Отклонено",
  needs_changes: "Требуются уточнения",
};

export const bookingRequestStatusLabels: Record<string, string> = {
  new: "Новая",
  viewed: "Просмотрена",
  accepted: "Принята",
  rejected: "Отклонена",
  cancelled: "Отменена",
  completed: "Завершена",
  expired: "Истёк срок",
};

export const bookingRequestStatusColors: Record<string, string> = {
  new: "bg-warning/10 text-warning",
  viewed: "bg-muted text-muted-foreground",
  accepted: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary text-primary-foreground",
  expired: "bg-muted text-muted-foreground",
};

export const placementStatusLabels: Record<string, string> = {
  upcoming: "Предстоит",
  active: "Активно",
  completed: "Завершено",
  cancelled: "Отменено",
  disputed: "Спор",
};

export const userVerificationStatusLabels: Record<string, string> = {
  unverified: "Не подтверждён",
  pending: "На проверке",
  verified: "Подтверждён",
  rejected: "Отклонён",
};
