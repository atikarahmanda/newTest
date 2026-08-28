import { useState } from "react";
import { buildRelMaps } from "../utils/treeBuilder";

export default function RelationshipForm({ persons, rels, onSave, onCancel, saving }) {
  const [personId, setPersonId] = useState("");
  const [relType, setRelType] = useState("spouse");
  const [relatedId, setRelatedId] = useState("");

  const { spouseMap } = buildRelMaps(persons, rels);

  const relatedOptions = persons.filter((person) => {
    if (person.id === personId) return false;

    if (relType === "spouse") {
      const selectedPerson = persons.find((p) => p.id === personId);
      if (!selectedPerson) return false;
      if (person.gender === selectedPerson.gender) return false;
      if (spouseMap.has(person.id)) return false;
      if (spouseMap.has(personId)) return false;
    }

    return true;
  });

  const selectCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Orang Pertama
        </label>
        <select
          className={selectCls}
          value={personId}
          onChange={(e) => {
            setPersonId(e.target.value);
            setRelatedId("");
          }}
        >
          <option value="">Pilih orang...</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Hubungan
        </label>
        <div className="flex gap-2">
          {[
            ["spouse", "Suami/Istri"],
            ["parent", "Orang Tua"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRelType(value);
                setRelatedId("");
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                relType === value
                  ? "bg-blue-50 text-blue-700 ring-2 ring-blue-500"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {relType === "spouse"
            ? "Orang pertama adalah pasangan orang kedua"
            : "Orang pertama adalah orang tua dari orang kedua"}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          {relType === "spouse" ? "Pasangan" : "Anak"}
        </label>
        <select
          className={selectCls}
          value={relatedId}
          onChange={(e) => setRelatedId(e.target.value)}
          disabled={!personId}
        >
          <option value="">Pilih orang...</option>
          {relatedOptions.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} ({person.gender === "Male" ? "L" : "P"})
            </option>
          ))}
        </select>
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
          onClick={() =>
            onSave({ personId, relatedPersonId: relatedId, type: relType })
          }
          disabled={!personId || !relatedId || saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Menyimpan..." : "Tambah Hubungan"}
        </button>
      </div>
    </div>
  );
}
