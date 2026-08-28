import { useState } from "react";

export default function PersonForm({ person, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    person || {
      name: "",
      gender: "Male",
      birthDate: "",
      photoUrl: "",
      notes: "",
    }
  );

  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-slate-50/50";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Nama Lengkap *
        </label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Jenis Kelamin *
        </label>
        <div className="flex gap-2">
          {["Male", "Female"].map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => set("gender", gender)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                form.gender === gender
                  ? gender === "Male"
                    ? "bg-blue-50 text-blue-700 ring-2 ring-blue-500"
                    : "bg-pink-50 text-pink-700 ring-2 ring-pink-500"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {gender === "Male" ? "♂ Laki-laki" : "♀ Perempuan"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tanggal Lahir
        </label>
        <input
          type="date"
          className={inputCls}
          value={form.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          URL Foto
        </label>
        <input
          className={inputCls}
          value={form.photoUrl}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Catatan
        </label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Catatan tambahan"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
