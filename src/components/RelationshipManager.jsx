import { useState } from "react";
import { Icons } from "./Icons";

// Ambil hubungan eksplisit dari raw rels (bukan dari buildRelMaps yang sudah implicit)
function getExplicitRels(person, persons, rels) {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const id = person.id;

  const parents = rels
    .filter((r) => r.type === "parent" && r.relatedPersonId === id)
    .map((r) => ({ rel: r, person: personMap.get(r.personId) }))
    .filter((x) => x.person);

  const spouseRel = rels.find(
    (r) =>
      r.type === "spouse" &&
      (r.personId === id || r.relatedPersonId === id)
  );
  const spouseId = spouseRel
    ? spouseRel.personId === id
      ? spouseRel.relatedPersonId
      : spouseRel.personId
    : null;
  const spouse = spouseId ? { rel: spouseRel, person: personMap.get(spouseId) } : null;

  const children = rels
    .filter((r) => r.type === "parent" && r.personId === id)
    .map((r) => ({ rel: r, person: personMap.get(r.relatedPersonId) }))
    .filter((x) => x.person);

  return { parents, spouse: spouse?.person ? spouse : null, children };
}

function hasSpouse(personId, rels) {
  return rels.some(
    (r) =>
      r.type === "spouse" &&
      (r.personId === personId || r.relatedPersonId === personId)
  );
}

export default function RelationshipManager({ person, persons, rels, onAdd, onDelete, saving }) {
  const [addType, setAddType] = useState("");
  const [relatedId, setRelatedId] = useState("");

  const { parents, spouse, children } = getExplicitRels(person, persons, rels);

  // Kandidat untuk tambah hubungan — filter orang yang sudah terhubung
  const existingParentIds = new Set(parents.map((x) => x.person.id));
  const existingChildIds = new Set(children.map((x) => x.person.id));

  const candidates = persons
    .filter((p) => p.id !== person.id)
    .filter((p) => {
      if (addType === "spouse") {
        return (
          p.gender !== person.gender &&
          !hasSpouse(p.id, rels) &&
          !hasSpouse(person.id, rels)
        );
      }
      if (addType === "parent_of") {
        // Focal person jadi orang tua dari p
        return !existingChildIds.has(p.id);
      }
      if (addType === "child_of") {
        // p jadi orang tua dari focal person
        return !existingParentIds.has(p.id);
      }
      return false;
    });

  const changeType = (type) => {
    setAddType(type);
    setRelatedId("");
  };

  const handleAdd = () => {
    if (!addType || !relatedId) return;

    let payload;
    if (addType === "spouse") {
      payload = { personId: person.id, relatedPersonId: relatedId, type: "spouse" };
    } else if (addType === "parent_of") {
      payload = { personId: person.id, relatedPersonId: relatedId, type: "parent" };
    } else if (addType === "child_of") {
      payload = { personId: relatedId, relatedPersonId: person.id, type: "parent" };
    }

    onAdd(payload);
    setAddType("");
    setRelatedId("");
  };

  const selectCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const RelRow = ({ entry, label }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
      <span
        className={`text-xs shrink-0 ${
          entry.person.gender === "Male" ? "text-blue-400" : "text-pink-400"
        }`}
      >
        {entry.person.gender === "Male" ? "♂" : "♀"}
      </span>
      <span className="text-sm flex-1 truncate">{entry.person.name}</span>
      {label && (
        <span className="text-xs text-slate-400 shrink-0">{label}</span>
      )}
      <button
        type="button"
        onClick={() => onDelete(entry.rel.id)}
        disabled={saving}
        title="Hapus hubungan"
        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        {Icons.trash}
      </button>
    </div>
  );

  const noRels = !parents.length && !spouse && !children.length;

  return (
    <div className="space-y-4">
      {/* Hubungan yang ada */}
      {noRels ? (
        <p className="text-sm text-slate-400 text-center py-3">
          Belum ada hubungan tersimpan.
        </p>
      ) : (
        <div className="space-y-3">
          {parents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">Orang Tua</p>
              <div className="space-y-1.5">
                {parents.map((x) => (
                  <RelRow key={x.rel.id} entry={x} />
                ))}
              </div>
            </div>
          )}

          {spouse && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">Pasangan</p>
              <RelRow entry={spouse} />
            </div>
          )}

          {children.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1.5">Anak</p>
              <div className="space-y-1.5">
                {children.map((x) => (
                  <RelRow key={x.rel.id} entry={x} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tambah hubungan baru */}
      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <p className="text-xs font-medium text-slate-500">Tambah Hubungan</p>

        {/* Jenis hubungan */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            ["spouse", "Pasangan dari"],
            ["parent_of", "Orang tua dari"],
            ["child_of", "Anak dari"],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => changeType(val === addType ? "" : val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                addType === val
                  ? "bg-blue-50 text-blue-700 ring-2 ring-blue-400"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pilih anggota */}
        {addType && (
          <>
            {candidates.length === 0 ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                Tidak ada kandidat yang tersedia untuk jenis hubungan ini.
              </p>
            ) : (
              <select
                className={selectCls}
                value={relatedId}
                onChange={(e) => setRelatedId(e.target.value)}
              >
                <option value="">Pilih anggota...</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender === "Male" ? "Laki-laki" : "Perempuan"})
                  </option>
                ))}
              </select>
            )}

            {relatedId && (
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Menyimpan..." : "Simpan Hubungan"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
