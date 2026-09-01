/**
 * Ubah link berbagi jadi URL gambar langsung yang bisa dipakai <img> / SVG <image>.
 *
 * Penyebab foto tak muncul (hanya ikon gambar rusak) biasanya karena yang ditempel
 * adalah link HALAMAN, bukan link file gambar. Yang paling sering: Google Drive.
 *
 *   ❌ https://drive.google.com/file/d/1AbC.../view?usp=sharing   (halaman)
 *   ✅ https://drive.google.com/thumbnail?id=1AbC...&sz=w1000     (gambar)
 *
 * Syarat: file di Google Drive harus dibagikan "Anyone with the link".
 */
export function resolvePhotoUrl(raw) {
  if (!raw) return "";
  const url = String(raw).trim();

  // --- Google Drive (berbagai bentuk) ---
  if (/(drive|docs)\.google\.com/.test(url)) {
    const m =
      url.match(/\/file\/d\/([-\w]{20,})/) ||
      url.match(/[?&]id=([-\w]{20,})/) ||
      url.match(/\/d\/([-\w]{20,})/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  }

  // --- Dropbox ---
  if (/dropbox\.com/.test(url)) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/([?&])dl=0\b/, "$1raw=1");
  }

  // --- OneDrive share link ---
  if (/1drv\.ms|onedrive\.live\.com/.test(url) && !/download/.test(url)) {
    return url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
  }

  return url;
}
