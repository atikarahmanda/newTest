import { buildRelMaps } from "../backend/treeBuilder";
import { Icons } from "./Icons";

export default function PersonDetail({ person, persons, rels, onEdit, onDelete, onClickPerson, onFocus, onManageRels, role }) {
  if (!person) return null;

  const { spouseMap, childrenOfParent, parentsOfChild } = buildRelMaps(persons, rels);

  const spouseId = spouseMap.get(person.id);
  const spouse = spouseId ? persons.find((p) => p.id === spouseId) : null;

  const childIds = childrenOfParent.get(person.id) || [];
  const children = childIds.map((id) => persons.find((p) => p.id === id)).filter(Boolean);

  const parentIds = parentsOfChild.get(person.id) || [];
  const parents = parentIds.map((id) => persons.find((p) => p.id === id)).filter(Boolean);

  const siblingIds = new Set();
  parentIds.forEach((parentId) => {
    (childrenOfParent.get(parentId) || []).forEach((childId) => {
      if (childId !== person.id) siblingIds.add(childId);
    });
  });
  const siblings = [...siblingIds]
    .map((id) => persons.find((p) => p.id === id))
    .filter(Boolean);

  const age = person.birthDate
    ? Math.floor((Date.now() - new Date(person.birthDate).getTime()) / 31557600000)
    : null;

  const PersonChip = ({ person: chipPerson }) => (
    <button
      type="button"
      onClick={() => onClickPerson(chipPerson)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
    >
      <span className={chipPerson.gender === "Male" ? "text-blue-500" : "text-pink-500"}>●</span>
      {chipPerson.name}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white ${
            person.gender === "Male"
              ? "bg-gradient-to-br from-blue-400 to-blue-600"
              : "bg-gradient-to-br from-pink-400 to-pink-600"
          }`}
        >
          {person.photoUrl ? (
            <img
              src={person.photoUrl}
              className="w-full h-full rounded-2xl object-cover"
              alt=""
            />
          ) : (
            person.name.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 truncate">{person.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{person.gender === "Male" ? "♂ Laki-laki" : "♀ Perempuan"}</span>
            {age !== null && <span>• {age} tahun</span>}
          </div>
          {person.birthDate && (
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(person.birthDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Relationships */}
      <div className="space-y-3">
        {parents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Orang Tua</p>
            <div className="flex flex-wrap gap-1.5">
              {parents.map((p) => (
                <PersonChip key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}

        {spouse && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Pasangan</p>
            <PersonChip person={spouse} />
          </div>
        )}

        {siblings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Saudara</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map((p) => (
                <PersonChip key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Anak</p>
            <div className="flex flex-wrap gap-1.5">
              {children.map((p) => (
                <PersonChip key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {person.notes && (
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">Catatan</p>
          <p className="text-sm text-slate-600">{person.notes}</p>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => onFocus(person)}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
        >
          Lihat Ranji
        </button>

        {role === "admin" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onManageRels(person)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              {Icons.link}
              Kelola Hubungan
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(person)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
              >
                {Icons.edit}
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(person)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                {Icons.trash}
                Hapus
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
