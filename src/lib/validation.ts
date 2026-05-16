import { z } from "zod";

export const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

export function normalizePhoneInput(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  return digits;
}

export const emailSchema = z.string().trim().email("Некорректный email").max(255);
export const phoneSchema = z.string().trim().regex(phoneRegex, "Неверный формат телефона")
  .refine((value) => !!normalizePhoneInput(value), "Неверный формат телефона")
  .transform((value) => normalizePhoneInput(value)!);
export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .max(72)
  .regex(/[a-zA-Zа-яА-Я]/, "Пароль должен содержать буквы")
  .regex(/[0-9]/, "Пароль должен содержать цифры")
  .regex(/[^a-zA-Z0-9а-яА-Я]/, "Пароль должен содержать спецсимвол (например, !@#$)");
export const nameSchema = z.string().trim().min(2, "Минимум 2 символа").max(100);

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["host", "client"]),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Введите пароль"),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
