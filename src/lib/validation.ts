import { z } from "zod";

export const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

export const emailSchema = z.string().trim().email("Некорректный email").max(255);
export const phoneSchema = z.string().trim().regex(phoneRegex, "Неверный формат телефона");
export const passwordSchema = z.string().min(8, "Минимум 8 символов").max(72);
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
