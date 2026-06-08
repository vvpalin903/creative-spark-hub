import { z } from "zod";

// Strict RU phone: exactly 11 digits starting with 7 (after normalization)
export const phoneInputRegex = /^[+\d\s\-()]{10,20}$/;

export function normalizePhoneInput(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  if (digits.length === 10) return `7${digits}`;
  return null;
}

// Disposable / throwaway email domains (extend as needed)
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
  "guerrillamail.com", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "fakeinbox.com", "getnada.com", "dispostable.com", "mailnesia.com",
  "maildrop.cc", "sharklasers.com", "mintemail.com", "mohmal.com",
]);

export const emailSchema = z.string().trim().toLowerCase()
  .email("Некорректный email")
  .max(255)
  .refine((v) => {
    const domain = v.split("@")[1] || "";
    return !DISPOSABLE_EMAIL_DOMAINS.has(domain);
  }, "Одноразовые email-адреса не поддерживаются");

export const phoneSchema = z.string().trim()
  .regex(phoneInputRegex, "Неверный формат телефона")
  .refine((value) => !!normalizePhoneInput(value), "Введите российский номер: 11 цифр, начиная с 7 или 8")
  .transform((value) => normalizePhoneInput(value)!);

// Letter check: at least 2 letters (cyr/lat), not just digits/symbols
const LETTERS_RE = /[A-Za-zА-Яа-яЁё]/g;
export const nameSchema = z.string().trim()
  .min(2, "Минимум 2 символа")
  .max(100)
  .refine((v) => (v.match(LETTERS_RE) || []).length >= 2, "Имя должно содержать буквы");

export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .max(72)
  .regex(/[a-zA-Zа-яА-Я]/, "Пароль должен содержать буквы")
  .regex(/[0-9]/, "Пароль должен содержать цифры")
  .regex(/[^a-zA-Z0-9а-яА-Я]/, "Пароль должен содержать спецсимвол (например, !@#$)");

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["host", "client"]),
}).superRefine((data, ctx) => {
  const pwLower = data.password.toLowerCase();
  const emailLocal = (data.email.split("@")[0] || "").toLowerCase();
  if (emailLocal.length >= 4 && pwLower.includes(emailLocal)) {
    ctx.addIssue({ code: "custom", path: ["password"], message: "Пароль не должен содержать email" });
  }
  if (data.phone && pwLower.includes(data.phone.toLowerCase())) {
    ctx.addIssue({ code: "custom", path: ["password"], message: "Пароль не должен содержать номер телефона" });
  }
  const nameLower = data.name.toLowerCase().replace(/\s+/g, "");
  if (nameLower.length >= 4 && pwLower.includes(nameLower)) {
    ctx.addIssue({ code: "custom", path: ["password"], message: "Пароль не должен содержать имя" });
  }
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный email").max(255),
  password: z.string().min(1, "Введите пароль"),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
