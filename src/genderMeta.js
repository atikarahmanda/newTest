/**
 * Tampilan per jenis kelamin. "" / null / nilai lain = tidak diketahui
 * (dipakai untuk generasi atas yang datanya tidak pasti).
 *
 * Semua nama kelas Tailwind ditulis literal supaya ter-scan saat build.
 */
export function genderMeta(gender) {
  switch (gender) {
    case "Male":
      return {
        known: true,
        symbol: "♂",
        label: "Laki-laki",
        text400: "text-blue-400",
        text500: "text-blue-500",
        avatarGradient: "bg-gradient-to-br from-blue-400 to-blue-600",
        svg: { accent: "#3b82f6", avatarFill: "#eff6ff", avatarStroke: "#bfdbfe" },
      };
    case "Female":
      return {
        known: true,
        symbol: "♀",
        label: "Perempuan",
        text400: "text-pink-400",
        text500: "text-pink-500",
        avatarGradient: "bg-gradient-to-br from-pink-400 to-pink-600",
        svg: { accent: "#ec4899", avatarFill: "#fdf2f8", avatarStroke: "#fbcfe8" },
      };
    default:
      return {
        known: false,
        symbol: "○",
        label: "Tidak diketahui",
        text400: "text-slate-400",
        text500: "text-slate-400",
        avatarGradient: "bg-gradient-to-br from-slate-400 to-slate-500",
        svg: { accent: "#94a3b8", avatarFill: "#f8fafc", avatarStroke: "#e2e8f0" },
      };
  }
}

/**
 * Cocok jadi kandidat pasangan berdasarkan gender:
 * gender berbeda, ATAU salah satu tidak diketahui (jangan dibatasi).
 */
export function genderAllowsSpouse(genderA, genderB) {
  if (!genderA || !genderB) return true;
  return genderA !== genderB;
}
