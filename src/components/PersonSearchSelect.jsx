import { useMemo, useRef, useState } from "react";
import { genderMeta } from "../genderMeta";

/**
 * Dropdown anggota dengan pencarian (ganti <select> biasa).
 *
 * props:
 *  - persons: array anggota { id, name, gender }
 *  - value: id terpilih ("" = belum pilih)
 *  - onChange: (id) => void
 *  - placeholder
 *  - emptyText: teks saat tidak ada hasil
 */
export default function PersonSearchSelect({
  persons = [],
  value = "",
  onChange,
  placeholder = "Cari anggota...",
  emptyText = "Tidak ada anggota cocok.",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const selected = persons.find((p) => p.id === value) || null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => p.name.toLowerCase().includes(q));
  }, [persons, query]);

  const commit = (p) => {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  };

  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow";

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          className={`${inputCls} flex items-center gap-2 text-left`}
        >
          <span className={genderMeta(selected.gender).text400}>
            {genderMeta(selected.gender).symbol}
          </span>
          <span className="flex-1 truncate text-slate-700">{selected.name}</span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(true);
            }}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </span>
        </button>
      ) : (
        <input
          autoFocus={open}
          className={inputCls}
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) commit(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-400">{emptyText}</p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(p)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                } ${p.id === value ? "font-medium" : ""}`}
              >
                <span className={genderMeta(p.gender).text400}>
                  {genderMeta(p.gender).symbol}
                </span>
                <span className="flex-1 truncate">{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
