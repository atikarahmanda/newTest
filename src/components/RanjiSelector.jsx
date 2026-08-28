import { useState, useRef, useEffect } from "react";

export default function RanjiSelector({ persons, focusPerson, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Focus input whenever dropdown opens (e.g., chip clicked)
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = persons.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const select = (person) => {
    onSelect(person);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onClear();
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
      {/* Ranji Full toggle */}
      <button
        type="button"
        onClick={clear}
        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
          !focusPerson
            ? "bg-slate-800 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        Ranji Full
      </button>

      <div className="w-px h-4 bg-slate-200 shrink-0" />

      {/* Selector area */}
      <div className="relative flex-1" ref={containerRef}>

        {/* Chip — shows when a person is selected and dropdown is closed */}
        {focusPerson && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-left group"
          >
            <span
              className={`text-xs shrink-0 ${
                focusPerson.gender === "Male" ? "text-blue-500" : "text-pink-500"
              }`}
            >
              {focusPerson.gender === "Male" ? "♂" : "♀"}
            </span>
            <span className="text-xs font-medium text-violet-800 flex-1 truncate">
              {focusPerson.name}
            </span>
            <span className="text-xs text-violet-400 group-hover:text-violet-600 shrink-0 transition-colors">
              ganti ▾
            </span>
            <span
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), clear())}
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="ml-1 text-violet-400 hover:text-violet-700 shrink-0 text-sm leading-none transition-colors"
              aria-label="Hapus pilihan"
            >
              ✕
            </span>
          </button>
        ) : (
          /* Search input — shows when no focus or when chip is clicked */
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-slate-50 placeholder-slate-400"
              placeholder="Lihat Ranji Siapa?"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
          </div>
        )}

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-slate-400 text-center">
                  Tidak ditemukan
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(p)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      focusPerson?.id === p.id
                        ? "bg-violet-50 text-violet-800"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span
                      className={`text-sm shrink-0 ${
                        p.gender === "Male" ? "text-blue-400" : "text-pink-400"
                      }`}
                    >
                      {p.gender === "Male" ? "♂" : "♀"}
                    </span>
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    {focusPerson?.id === p.id && (
                      <span className="text-xs text-violet-500 font-medium shrink-0">
                        aktif
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
