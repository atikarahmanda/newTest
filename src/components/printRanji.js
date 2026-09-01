import { NODE_W, NODE_H } from "../backend/constants";

/**
 * Buka jendela cetak berisi bagan ranji yang sedang tampil (sesuai filter ranji
 * aktif), lalu picu dialog print → user pilih "Save as PDF".
 *
 * @param {SVGSVGElement} svgEl  elemen <svg> bagan di layar
 * @param {Record<string,{x:number,y:number}>} positions  posisi node (untuk hitung batas)
 * @param {string} title  judul dokumen (mis. "Ranji Budi" / "Silsilah Keluarga")
 */
export function printRanji(svgEl, positions, title) {
  const pts = Object.values(positions || {});
  const group = svgEl && svgEl.querySelector("g");
  if (!group || !pts.length) return;

  const pad = 48;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const maxX = Math.max(...pts.map((p) => p.x + NODE_W)) + pad;
  const maxY = Math.max(...pts.map((p) => p.y + NODE_H)) + pad;
  const w = Math.round(maxX - minX);
  const h = Math.round(maxY - minY);

  // Salin isi bagan tanpa transform pan/zoom & tanpa atribut interaktif
  const clone = group.cloneNode(true);
  clone.removeAttribute("transform");
  clone.querySelectorAll("[style],[data-clickable]").forEach((n) => {
    n.removeAttribute("style");
    n.removeAttribute("data-clickable");
  });

  const inner = new XMLSerializer().serializeToString(clone);
  const safeTitle = String(title || "Silsilah Keluarga").replace(/[<>&]/g, " ").trim();
  const stamp = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { font: 13px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif; color: #1e293b; }
  .wrap { padding: 24px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: #94a3b8; font-size: 11px; margin-bottom: 16px; }
  .bar { margin-bottom: 16px; }
  .btn { padding: 8px 16px; background: #2563eb; color: #fff; border: 0;
         border-radius: 8px; font: inherit; cursor: pointer; }
  svg { max-width: 100%; height: auto; }
  /* margin:0 pada @page menghilangkan header/footer bawaan browser (URL "about:blank", tanggal) */
  @page { size: A4 landscape; margin: 0; }
  @media print {
    .wrap { padding: 12mm; }
    .no-print { display: none !important; }
    svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="bar no-print">
    <button class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>
  <h1>${safeTitle}</h1>
  <div class="sub">Dicetak ${stamp}</div>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">
    ${inner}
  </svg>
</div>
<script>
  window.addEventListener("load", function () {
    setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 500);
  });
</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup diblokir. Izinkan popup untuk situs ini agar bisa mencetak ranji.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
