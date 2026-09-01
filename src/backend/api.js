export const API_URL =
  "https://script.google.com/macros/s/AKfycbxGH3qHrquaSU9UwI1j_skVykXEMJDcBe8O4MNQOnLO8izhRWjVzrJipouRwk9DuOrB/exec"
// ==========================================================
// AUTH PIN — dikirim ke backend di setiap request.
// Backend (Apps Script) yang memvalidasi; frontend tidak menyimpan PIN asli.
// Disimpan di sessionStorage: hilang saat tab ditutup.
// ==========================================================

const PIN_KEY = "sk_pin"; // PIN aktif yang dikirim ke backend
const USER_PIN_KEY = "sk_user_pin"; // PIN level viewer, untuk kembali saat logout admin

function read(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key, val) {
  try {
    if (val) sessionStorage.setItem(key, val);
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

let authPin = read(PIN_KEY);

export function getAuthPin() {
  return authPin;
}

/** Set PIN sesi hasil verifikasi gate (level viewer). */
export function setAuthPin(pin) {
  authPin = pin || "";
  write(PIN_KEY, authPin);
  write(USER_PIN_KEY, authPin);
}

/** Naikkan PIN aktif ke PIN admin, tanpa kehilangan PIN viewer. */
export function elevateAuthPin(adminPin) {
  authPin = adminPin || "";
  write(PIN_KEY, authPin);
}

/** Kembali ke PIN viewer (dipakai saat logout admin). */
export function demoteAuthPin() {
  authPin = read(USER_PIN_KEY);
  write(PIN_KEY, authPin);
}

export function clearAuthPin() {
  authPin = "";
  write(PIN_KEY, "");
  write(USER_PIN_KEY, "");
  clearDataCache();
}

// ==========================================================
// DATA CACHE — simpan hasil getAll terakhir supaya app terbuka instan
// (stale-while-revalidate). Dibersihkan saat "Kunci Aplikasi" / sesi invalid.
// ==========================================================

const DATA_CACHE_KEY = "sk_data_cache";

export function readDataCache() {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDataCache(data) {
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* kuota penuh / mode privat — abaikan */
  }
}

export function clearDataCache() {
  try {
    localStorage.removeItem(DATA_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Error yang menandakan PIN salah / sesi tidak valid. */
export class AuthError extends Error {
  constructor(message) {
    super(message || "PIN salah atau sesi berakhir.");
    this.name = "AuthError";
  }
}

function assertNotAuthFailure(result) {
  if (result && result.success === false && result.code === "AUTH") {
    throw new AuthError(result.message);
  }
  return result;
}

// ==========================================================
// REQUEST HELPERS
// ==========================================================

export async function apiGet(params = {}) {
  const u = new URL(API_URL);

  const withPin = { pin: authPin, ...params };

  Object.entries(withPin).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(u.toString(), { method: "GET", redirect: "follow" });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON. Periksa deployment Apps Script.");
  }
  return assertNotAuthFailure(json);
}

export async function apiPost(body = {}) {
  /*
   * PENTING: Content-Type text/plain menghindari CORS preflight OPTIONS.
   */
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ pin: authPin, ...body }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    redirect: "follow",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON. Periksa fungsi doPost().");
  }
  return assertNotAuthFailure(json);
}

/**
 * Verifikasi PIN ke backend tanpa mengubah sesi aktif.
 * @returns {Promise<{ok: boolean, role: "viewer"|"admin"|null, message?: string}>}
 */
export async function verifyPin(pin) {
  const u = new URL(API_URL);
  u.searchParams.set("action", "verifyPin");
  u.searchParams.set("pin", pin);

  const response = await fetch(u.toString(), { method: "GET", redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Response bukan JSON. Periksa deployment Apps Script.");
  }

  return {
    ok: json.success === true,
    role: json.role ?? (json.success ? "viewer" : null),
    message: json.message,
  };
}
