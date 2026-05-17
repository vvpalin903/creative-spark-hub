// Проверка пароля через Have I Been Pwned (k-anonymity API).
// Используется до этапа подтверждения телефона, чтобы заранее отсечь
// слабые/утёкшие пароли (Supabase HIBP-check иначе отклонит signUp уже после звонка).

async function sha1Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Возвращает количество утечек пароля в HIBP (0 — пароль не найден).
 * Если запрос не удался — возвращает null (не блокируем регистрацию).
 */
export async function checkPasswordPwned(password: string): Promise<number | null> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    for (const line of text.split("\n")) {
      const [suf, count] = line.trim().split(":");
      if (suf === suffix) return parseInt(count, 10) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}
