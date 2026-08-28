import { buildRelMaps } from "../utils/treeBuilder";
import { Icons } from "./Icons";

export default function MembersList({ persons, rels, search, onClickPerson, onEdit, onDelete }) {
  const filtered = persons.filter((person) =>
    person.name.toLowerCase().includes(search.toLowerCase())
  );

  const { spouseMap, childrenOfParent } = buildRelMaps(persons, rels);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-30">👤</div>
        <p className="text-slate-400 text-sm">
          {search ? "Tidak ditemukan" : "Belum ada anggota"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {filtered.map((person) => {
        const spouseId = spouseMap.get(person.id);
        const spousePerson = spouseId
          ? persons.find((p) => p.id === spouseId)
          : null;
        const childCount = (childrenOfParent.get(person.id) || []).length;

        return (
          <div
            key={person.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
            onClick={() => onClickPerson(person)}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                person.gender === "Male"
                  ? "bg-gradient-to-br from-blue-400 to-blue-600"
                  : "bg-gradient-to-br from-pink-400 to-pink-600"
              }`}
            >
              {person.photoUrl ? (
                <img
                  src={person.photoUrl}
                  className="w-full h-full rounded-xl object-cover"
                  alt=""
                />
              ) : (
                person.name.charAt(0)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{person.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {person.gender === "Male" ? "Laki-laki" : "Perempuan"}
                {spousePerson && ` • Pasangan: ${spousePerson.name}`}
                {childCount > 0 && ` • ${childCount} anak`}
              </p>
            </div>

            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onEdit(person)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {Icons.edit}
              </button>
              <button
                type="button"
                onClick={() => onDelete(person)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                {Icons.trash}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
