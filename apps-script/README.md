# Backend auth (Google Apps Script)

PIN diverifikasi **di server**, bukan di browser. Data keluarga tidak pernah
dikirim ke browser sebelum PIN benar.

Kode sudah ada di [`codeawalscript.gs`](./codeawalscript.gs) (bagian `// ===== AUTH =====`
plus guard di `doGet` / `doPost`). Yang perlu kamu lakukan tinggal 3 langkah.

## 1. Salin `codeawalscript.gs` ke project Apps Script

Buka Sheet ▸ **Extensions ▸ Apps Script**, ganti seluruh isi file dengan versi
terbaru `codeawalscript.gs`.

## 2. Simpan PIN sebagai Script Properties

Apps Script editor ▸ **Project Settings** (ikon gerigi) ▸ **Script properties** ▸
**Add script property**:

| Property     | Value                                 |
| ------------ | ------------------------------------- |
| `USER_PIN`   | PIN untuk membuka aplikasi (viewer)   |
| `ADMIN_PIN`  | PIN untuk mode edit (admin)           |

Jangan taruh PIN di dalam kode.

## 3. Re-deploy

**Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version ▸ Deploy.**
URL `/exec` tetap sama, jadi `API_URL` di `src/backend/api.js` tidak berubah.

---

## Cara kerjanya

**Server (`codeawalscript.gs`):**

- `roleForPin_(pin)` → `"admin"` | `"viewer"` | `null` dengan membandingkan ke
  Script Properties.
- `doGet`: `action=verifyPin` mengembalikan `{ success:true, role }`; semua
  action lain lewat `requireRole_` dulu.
- `doPost`: `requireRole_(data.pin, action)` — aksi di `WRITE_ACTIONS`
  (`createPerson`, `updatePerson`, `deletePerson`, `createRelationship`,
  `updateRelationship`, `deleteRelationship`) wajib `role === "admin"`.
- PIN salah / kurang → `{ success:false, code:"AUTH" }`.

**Frontend:**

- `src/backend/api.js` menyisipkan `pin` ke **setiap** request (GET & POST),
  diambil dari `sessionStorage` (hilang saat tab ditutup).
- `UnlockGate` memanggil `action=verifyPin`; sukses → PIN disimpan, aplikasi terbuka.
- `AdminPinForm` memanggil `verifyPin`; hanya lolos bila `role === "admin"`,
  lalu menaikkan PIN sesi ke `ADMIN_PIN` supaya request tulis diterima server.
- Jika server membalas `code:"AUTH"` kapan pun, frontend menghapus PIN dan
  kembali ke layar kunci.

## Catatan keamanan

- Deploy Web App: **Execute as: Me**, **Who has access: Anyone**. Validasi ada di
  server, jadi data hanya keluar setelah PIN benar.
- PIN dikirim lewat HTTPS. Jangan `Logger.log(pin)` di produksi.
- Ini bukan login per-user; cukup untuk membatasi akses ke lingkaran keluarga
  yang tahu PIN.
