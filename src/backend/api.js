export const API_URL =
  "https://script.google.com/macros/s/AKfycbzlWyVr2YwX6flRfnHx1arlIqIfMJDLNzZ6P6ZZ_lZ6t-LY9UzUqO733rc96fEU_Ve_/exec";

export async function apiGet(params = {}) {
  const u = new URL(API_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(u.toString(), { method: "GET", redirect: "follow" });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON. Periksa deployment Apps Script.");
  }
}

export async function apiPost(body = {}) {
  /*
   * PENTING: Content-Type text/plain menghindari CORS preflight OPTIONS.
   */
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    redirect: "follow",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON. Periksa fungsi doPost().");
  }
}
