export const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbzlWyVr2YwX6flRfnHx1arlIqIfMJDLNzZ6P6ZZ_lZ6t-LY9UzUqO733rc96fEU_Ve_/exec";

export function normalizeApiUrl(value) {
  if (!value) return "";

  let url = String(value).trim();

  // Kalau user paste: [https://example.com](https://example.com)
  const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) {
    url = markdownMatch[1];
  }

  // Kalau masih ada [] dari markdown
  url = url.replace(/^\[/, "").replace(/\]$/, "");

  return url.trim();
}

export async function apiGet(url, params = {}) {
  const cleanUrl = normalizeApiUrl(url);

  if (!cleanUrl) {
    throw new Error("API URL kosong.");
  }

  const u = new URL(cleanUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(u.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Response dari Google Apps Script bukan JSON. Periksa deployment Apps Script."
    );
  }
}

export async function apiPost(url, body = {}) {
  const cleanUrl = normalizeApiUrl(url);

  if (!cleanUrl) {
    throw new Error("API URL kosong.");
  }

  /*
   * PENTING: Jangan gunakan Content-Type: application/json karena
   * memicu CORS preflight OPTIONS. text/plain adalah simple request
   * sehingga browser tidak melakukan preflight OPTIONS.
   */
  const response = await fetch(cleanUrl, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Response dari Google Apps Script bukan JSON. Periksa fungsi doPost()."
    );
  }
}
