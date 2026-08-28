import { useState } from "react";
import { buildRelMaps } from "../utils/treeBuilder";

export default function PersonForm({ person, onSave, onCancel, saving, persons = [], rels = [] }) {
  const isNew = !person;

  const [form, setForm] = useState(
    person || { name: "", gender: "Male", birthDate: "", photoUrl: "", notes: "" }
  );

  // Relationship — only used when creating a new person
  const [relType, setRelType] = useState("none"); // "none" | "child" | "spouse"
  const [parentIds, setParentIds] = useState([]);
  const [spouseId, setSpouseId] = useState("");

  const set = (key, value) => {
    setForm((c) => ({ ...c, [key]: value }));
    if (key === "gender") setSpouseId(""); // reset spouse when gender changes
  };

  const { spouseMap } = buildRelMaps(persons, rels);

  const spouseCandidates = persons.filter(
    (p) => p.gender !== form.gender && !spouseMap.has(p.id)
  );

  const toggleParent = (id) => {
    if (parentIds.includes(id)) {
      setParentIds(parentIds.filter((p) => p !== id));
    } else if (parentIds.length < 2) {
      setParentIds([...parentIds, id]);
    }
  };

  const changeRelType = (type) => {
    setRelType(type);
    setParentIds([]);
    setSpouseId("");
  };

  const handleSave = () => {
    const relData = isNew
      ? {
          relType,
          parentIds: relType === "child" ? parentIds : [],
          spouseId: relType === "spouse" ? spouseId : "",
        }
      : {};
    onSave({ ...form, ...relData });
  };

  const relValid =
    !isNew ||
    relType === "none" ||
    (relType === "child" && parentIds.length > 0) ||
    (relType === "spouse" && spouseId !== "");

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-slate-50/50";

  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Nama Lengkap *</label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nama lengkap"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Jenis Kelamin *</label>
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

      {/* Birth date */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Lahir</label>
        <input
          type="date"
          className={inputCls}
          value={form.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
        />
      </div>

      {/* Photo URL */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">URL Foto</label>
        <input
          className={inputCls}
          value={form.photoUrl}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Catatan</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Catatan tambahan"
        />
      </div>

      {/* Relationship section — only when adding a new person with existing members */}
      {isNew && persons.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Hubungan Keluarga
          </label>

          {/* Rel type selector */}
          <div className="flex gap-1.5 mb-3">
            {[
              ["none", "Tidak Ada"],
              ["child", "Anak dari"],
              ["spouse", "Pasangan dari"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeRelType(value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  relType === value
                    ? "bg-blue-50 text-blue-700 ring-2 ring-blue-500"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Child of: checkbox list, max 2 */}
          {relType === "child" && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Pilih orang tua{" "}
                <span className="text-slate-500 font-medium">
                  ({parentIds.length}/2 dipilih)
                </span>
                :
              </p>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {persons.map((p) => {
                  const selected = parentIds.includes(p.id);
                  const maxed = !selected && parentIds.length >= 2;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => !maxed && toggleParent(p.id)}
                      disabled={maxed}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                        selected
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-400"
                          : maxed
                          ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-600"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                        }`}
                      >
                        {selected && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path
                              d="M1 4.5l2.5 2.5 4.5-4"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className={p.gender === "Male" ? "text-blue-400" : "text-pink-400"}>
                        {p.gender === "Male" ? "♂" : "♀"}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
              {parentIds.length === 0 && (
                <p className="text-xs text-amber-500 mt-2">Pilih minimal 1 orang tua.</p>
              )}
            </div>
          )}

          {/* Spouse of: single dropdown */}
          {relType === "spouse" && (
            <div>
              {spouseCandidates.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                  Tidak ada kandidat — pastikan sudah ada anggota berjenis kelamin berbeda
                  yang belum memiliki pasangan.
                </p>
              ) : (
                <select
                  className={inputCls}
                  value={spouseId}
                  onChange={(e) => setSpouseId(e.target.value)}
                >
                  <option value="">Pilih pasangan...</option>
                  {spouseCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender === "Male" ? "Laki-laki" : "Perempuan"})
                    </option>
                  ))}
                </select>
              )}
              {spouseId === "" && spouseCandidates.length > 0 && (
                <p className="text-xs text-amber-500 mt-2">Pilih pasangan.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
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
          onClick={handleSave}
          disabled={!form.name.trim() || !relValid || saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
