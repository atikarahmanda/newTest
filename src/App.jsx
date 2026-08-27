import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// CONSTANTS
// ============================================================

const NODE_W = 144;
const NODE_H = 58;
const COUPLE_GAP = 12;
const H_GAP = 32;
const V_GAP = 76;
const PADDING = 60;

// ============================================================
// SAMPLE DATA
// ============================================================

const SAMPLE_PERSONS = [
  {
    id: "P001",
    name: "Budi Santoso",
    gender: "Male",
    birthDate: "1950-03-15",
    photoUrl: "",
    notes: "Kepala keluarga",
  },
  {
    id: "P002",
    name: "Siti Aminah",
    gender: "Female",
    birthDate: "1952-07-22",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P003",
    name: "Andi Santoso",
    gender: "Male",
    birthDate: "1975-01-10",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P004",
    name: "Dewi Lestari",
    gender: "Female",
    birthDate: "1977-05-18",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P005",
    name: "Rina Santoso",
    gender: "Female",
    birthDate: "1978-11-03",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P006",
    name: "Doni Pratama",
    gender: "Male",
    birthDate: "2002-09-14",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P007",
    name: "Putri Santoso",
    gender: "Female",
    birthDate: "2005-04-25",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P008",
    name: "Hendra Wijaya",
    gender: "Male",
    birthDate: "1976-08-12",
    photoUrl: "",
    notes: "",
  },
  {
    id: "P009",
    name: "Maya Wijaya",
    gender: "Female",
    birthDate: "2003-02-28",
    photoUrl: "",
    notes: "",
  },
];

const SAMPLE_RELS = [
  {
    id: "R001",
    personId: "P001",
    relatedPersonId: "P002",
    type: "spouse",
  },
  {
    id: "R002",
    personId: "P001",
    relatedPersonId: "P003",
    type: "parent",
  },
  {
    id: "R003",
    personId: "P002",
    relatedPersonId: "P003",
    type: "parent",
  },
  {
    id: "R004",
    personId: "P001",
    relatedPersonId: "P005",
    type: "parent",
  },
  {
    id: "R005",
    personId: "P002",
    relatedPersonId: "P005",
    type: "parent",
  },
  {
    id: "R006",
    personId: "P003",
    relatedPersonId: "P004",
    type: "spouse",
  },
  {
    id: "R007",
    personId: "P003",
    relatedPersonId: "P006",
    type: "parent",
  },
  {
    id: "R008",
    personId: "P004",
    relatedPersonId: "P006",
    type: "parent",
  },
  {
    id: "R009",
    personId: "P003",
    relatedPersonId: "P007",
    type: "parent",
  },
  {
    id: "R010",
    personId: "P004",
    relatedPersonId: "P007",
    type: "parent",
  },
  {
    id: "R011",
    personId: "P005",
    relatedPersonId: "P008",
    type: "spouse",
  },
  {
    id: "R012",
    personId: "P005",
    relatedPersonId: "P009",
    type: "parent",
  },
  {
    id: "R013",
    personId: "P008",
    relatedPersonId: "P009",
    type: "parent",
  },
];

// ============================================================
// API CONFIG
// ============================================================

const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbzlWyVr2YwX6flRfnHx1arlIqIfMJDLNzZ6P6ZZ_lZ6t-LY9UzUqO733rc96fEU_Ve_/exec";

// ============================================================
// API HELPERS
// ============================================================

function normalizeApiUrl(value) {
  if (!value) return "";

  let url = String(value).trim();

  // Kalau user paste:
  // [https://example.com](https://example.com)
  const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);

  if (markdownMatch) {
    url = markdownMatch[1];
  }

  // Kalau masih ada [] dari markdown
  url = url.replace(/^\[/, "").replace(/\]$/, "");

  return url.trim();
}

async function apiGet(url, params = {}) {
  const cleanUrl = normalizeApiUrl(url);

  if (!cleanUrl) {
    throw new Error("API URL kosong.");
  }

  const u = new URL(cleanUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(u.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Response dari Google Apps Script bukan JSON. Periksa deployment Apps Script."
    );
  }
}

async function apiPost(url, body = {}) {
  const cleanUrl = normalizeApiUrl(url);

  if (!cleanUrl) {
    throw new Error("API URL kosong.");
  }

  /*
   * PENTING:
   *
   * Jangan gunakan:
   *
   * headers: {
   *   "Content-Type": "application/json"
   * }
   *
   * karena itu memicu CORS preflight OPTIONS.
   *
   * text/plain adalah simple request sehingga browser tidak
   * melakukan preflight OPTIONS.
   */

  const response = await fetch(cleanUrl, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Response dari Google Apps Script bukan JSON. Periksa fungsi doPost()."
    );
  }
}

// ============================================================
// TREE BUILDING
// ============================================================

function buildRelMaps(persons, rels) {
  const spouseMap = new Map();
  const childrenOfParent = new Map();
  const parentsOfChild = new Map();

  for (const r of rels) {
    if (r.type === "spouse") {
      spouseMap.set(r.personId, r.relatedPersonId);
      spouseMap.set(r.relatedPersonId, r.personId);
    } else if (r.type === "parent") {
      if (!childrenOfParent.has(r.personId)) {
        childrenOfParent.set(r.personId, []);
      }

      childrenOfParent.get(r.personId).push(r.relatedPersonId);

      if (!parentsOfChild.has(r.relatedPersonId)) {
        parentsOfChild.set(r.relatedPersonId, []);
      }

      parentsOfChild.get(r.relatedPersonId).push(r.personId);
    }
  }

  return {
    spouseMap,
    childrenOfParent,
    parentsOfChild,
  };
}

function buildFamilyNodes(persons, rels) {
  const personMap = new Map(persons.map((p) => [p.id, p]));

  const {
    spouseMap,
    childrenOfParent,
    parentsOfChild,
  } = buildRelMaps(persons, rels);

  const processed = new Set();

  function getChildIds(memberIds) {
    const allChildren = new Set();

    memberIds.forEach((id) => {
      const children = childrenOfParent.get(id) || [];

      children.forEach((childId) => {
        allChildren.add(childId);
      });
    });

    return [...allChildren];
  }

  function buildNode(memberIds) {
    memberIds.forEach((id) => processed.add(id));

    const members = memberIds
      .map((id) => personMap.get(id))
      .filter(Boolean);

    const childIds = getChildIds(memberIds).filter(
      (id) => !processed.has(id)
    );

    const uniqueChildIds = [...new Set(childIds)];

    const children = uniqueChildIds
      .map((childId) => {
        if (processed.has(childId)) {
          return null;
        }

        const spouseId = spouseMap.get(childId);

        const childMembers = [childId];

        if (spouseId && !processed.has(spouseId)) {
          childMembers.push(spouseId);
        }

        return buildNode(childMembers);
      })
      .filter(Boolean);

    return {
      members,
      children,
    };
  }

  const roots = persons.filter((person) => {
    const parents = parentsOfChild.get(person.id);

    return !parents || parents.length === 0;
  });

  const rootNodes = [];

  for (const root of roots) {
    if (processed.has(root.id)) {
      continue;
    }

    const spouseId = spouseMap.get(root.id);

    const memberIds = [root.id];

    if (spouseId && !processed.has(spouseId)) {
      memberIds.push(spouseId);
    }

    rootNodes.push(buildNode(memberIds));
  }

  // Handle orphan nodes
  for (const person of persons) {
    if (!processed.has(person.id)) {
      rootNodes.push({
        members: [person],
        children: [],
      });

      processed.add(person.id);
    }
  }

  return rootNodes;
}

// ============================================================
// TREE LAYOUT
// ============================================================

function coupleWidth(node) {
  return (
    node.members.length * NODE_W +
    (node.members.length > 1 ? COUPLE_GAP : 0)
  );
}

function subtreeWidth(node) {
  const ownWidth = coupleWidth(node);

  if (!node.children.length) {
    return ownWidth;
  }

  const childrenWidth = node.children.reduce(
    (sum, child, index) =>
      sum +
      subtreeWidth(child) +
      (index > 0 ? H_GAP : 0),
    0
  );

  return Math.max(ownWidth, childrenWidth);
}

function layoutTree(node, sx, sy) {
  const sw = subtreeWidth(node);
  const cw = coupleWidth(node);

  const px = sx + (sw - cw) / 2;

  const positions = {};

  node.members.forEach((member, index) => {
    positions[member.id] = {
      x: px + index * (NODE_W + COUPLE_GAP),
      y: sy,
    };
  });

  let cx = sx;

  const childrenTotalWidth = node.children.reduce(
    (sum, child, index) =>
      sum +
      subtreeWidth(child) +
      (index > 0 ? H_GAP : 0),
    0
  );

  const childOffset =
    childrenTotalWidth < cw
      ? sx + (sw - childrenTotalWidth) / 2
      : sx;

  for (const child of node.children) {
    const childWidth = subtreeWidth(child);

    const actualCx =
      childrenTotalWidth < cw
        ? childOffset + (cx - sx)
        : cx;

    const childPositions = layoutTree(
      child,
      actualCx,
      sy + NODE_H + V_GAP
    );

    Object.assign(positions, childPositions);

    cx += childWidth + H_GAP;
  }

  return positions;
}

function computeFullLayout(rootNodes) {
  let positions = {};
  let offsetX = PADDING;

  for (const root of rootNodes) {
    const sw = subtreeWidth(root);

    const rootPositions = layoutTree(
      root,
      offsetX,
      PADDING
    );

    Object.assign(positions, rootPositions);

    offsetX += sw + H_GAP * 2;
  }

  return positions;
}

// ============================================================
// SVG CONNECTORS
// ============================================================

function getConnectorPaths(rootNodes, positions) {
  const paths = [];

  function traverse(node) {
    // Spouse connector
    if (node.members.length === 2) {
      const a = positions[node.members[0].id];
      const b = positions[node.members[1].id];

      if (a && b) {
        const y = a.y + NODE_H / 2;

        paths.push(
          `M${a.x + NODE_W},${y} L${b.x},${y}`
        );
      }
    }

    // Parent-child connector
    if (node.children.length > 0) {
      const parentY =
        positions[node.members[0].id]?.y;

      if (parentY === undefined) {
        return;
      }

      let parentCX;

      if (node.members.length === 2) {
        const a = positions[node.members[0].id];
        const b = positions[node.members[1].id];

        parentCX =
          (a.x + NODE_W + b.x) / 2;
      } else {
        parentCX =
          positions[node.members[0].id].x +
          NODE_W / 2;
      }

      const topY = parentY + NODE_H;
      const midY =
        parentY + NODE_H + V_GAP / 2;

      paths.push(
        `M${parentCX},${topY} L${parentCX},${midY}`
      );

      const childCenters = node.children
        .map((child) => {
          const childWidth = coupleWidth(child);

          const firstPos =
            positions[child.members[0].id];

          if (!firstPos) {
            return null;
          }

          return firstPos.x + childWidth / 2;
        })
        .filter((x) => x !== null);

      if (childCenters.length > 0) {
        const minCX = Math.min(
          ...childCenters,
          parentCX
        );

        const maxCX = Math.max(
          ...childCenters,
          parentCX
        );

        if (
          childCenters.length > 1 ||
          childCenters[0] !== parentCX
        ) {
          paths.push(
            `M${minCX},${midY} L${maxCX},${midY}`
          );
        }

        const childY =
          parentY + NODE_H + V_GAP;

        childCenters.forEach((cx) => {
          paths.push(
            `M${cx},${midY} L${cx},${childY}`
          );
        });
      }
    }

    node.children.forEach(traverse);
  }

  rootNodes.forEach(traverse);

  return paths;
}

// ============================================================
// ICONS
// ============================================================

const Icons = {
  search: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),

  plus: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  close: (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),

  edit: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),

  trash: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),

  link: (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),

  zoomIn: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  ),

  zoomOut: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M8 11h6" />
    </svg>
  ),

  reset: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),

  settings: (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
};

// ============================================================
// MODAL
// ============================================================

function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${
          wide ? "max-w-lg" : "max-w-md"
        } max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {Icons.close}
          </button>
        </div>

        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PERSON FORM
// ============================================================

function PersonForm({
  person,
  onSave,
  onCancel,
  saving,
}) {
  const [form, setForm] = useState(
    person || {
      name: "",
      gender: "Male",
      birthDate: "",
      photoUrl: "",
      notes: "",
    }
  );

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

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
          onChange={(e) =>
            set("name", e.target.value)
          }
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
              {gender === "Male"
                ? "♂ Laki-laki"
                : "♀ Perempuan"}
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
          onChange={(e) =>
            set("birthDate", e.target.value)
          }
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          URL Foto
        </label>

        <input
          className={inputCls}
          value={form.photoUrl}
          onChange={(e) =>
            set("photoUrl", e.target.value)
          }
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
          onChange={(e) =>
            set("notes", e.target.value)
          }
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

// ============================================================
// RELATIONSHIP FORM
// ============================================================

function RelationshipForm({
  persons,
  rels,
  onSave,
  onCancel,
  saving,
}) {
  const [personId, setPersonId] = useState("");
  const [relType, setRelType] = useState("spouse");
  const [relatedId, setRelatedId] = useState("");

  const { spouseMap } = buildRelMaps(
    persons,
    rels
  );

  const relatedOptions = persons.filter((person) => {
    if (person.id === personId) {
      return false;
    }

    if (relType === "spouse") {
      const selectedPerson = persons.find(
        (p) => p.id === personId
      );

      if (!selectedPerson) {
        return false;
      }

      if (
        person.gender === selectedPerson.gender
      ) {
        return false;
      }

      if (spouseMap.has(person.id)) {
        return false;
      }

      if (spouseMap.has(personId)) {
        return false;
      }
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
          <option value="">
            Pilih orang...
          </option>

          {persons.map((person) => (
            <option
              key={person.id}
              value={person.id}
            >
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
          {relType === "spouse"
            ? "Pasangan"
            : "Anak"}
        </label>

        <select
          className={selectCls}
          value={relatedId}
          onChange={(e) =>
            setRelatedId(e.target.value)
          }
          disabled={!personId}
        >
          <option value="">
            Pilih orang...
          </option>

          {relatedOptions.map((person) => (
            <option
              key={person.id}
              value={person.id}
            >
              {person.name} (
              {person.gender === "Male"
                ? "L"
                : "P"}
              )
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
            onSave({
              personId,
              relatedPersonId: relatedId,
              type: relType,
            })
          }
          disabled={
            !personId ||
            !relatedId ||
            saving
          }
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? "Menyimpan..."
            : "Tambah Hubungan"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PERSON DETAIL
// ============================================================

function PersonDetail({
  person,
  persons,
  rels,
  onEdit,
  onDelete,
  onClickPerson,
}) {
  if (!person) {
    return null;
  }

  const {
    spouseMap,
    childrenOfParent,
    parentsOfChild,
  } = buildRelMaps(persons, rels);

  const spouseId = spouseMap.get(person.id);

  const spouse = spouseId
    ? persons.find(
        (p) => p.id === spouseId
      )
    : null;

  const childIds =
    childrenOfParent.get(person.id) || [];

  const children = childIds
    .map((id) =>
      persons.find((p) => p.id === id)
    )
    .filter(Boolean);

  const parentIds =
    parentsOfChild.get(person.id) || [];

  const parents = parentIds
    .map((id) =>
      persons.find((p) => p.id === id)
    )
    .filter(Boolean);

  // Siblings
  const siblingIds = new Set();

  parentIds.forEach((parentId) => {
    (
      childrenOfParent.get(parentId) || []
    ).forEach((childId) => {
      if (childId !== person.id) {
        siblingIds.add(childId);
      }
    });
  });

  const siblings = [...siblingIds]
    .map((id) =>
      persons.find((p) => p.id === id)
    )
    .filter(Boolean);

  const age = person.birthDate
    ? Math.floor(
        (Date.now() -
          new Date(
            person.birthDate
          ).getTime()) /
          31557600000
      )
    : null;

  const PersonChip = ({ person: chipPerson }) => (
    <button
      type="button"
      onClick={() =>
        onClickPerson(chipPerson)
      }
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
    >
      <span
        className={
          chipPerson.gender === "Male"
            ? "text-blue-500"
            : "text-pink-500"
        }
      >
        ●
      </span>

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
          <h3 className="text-lg font-semibold text-slate-800 truncate">
            {person.name}
          </h3>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>
              {person.gender === "Male"
                ? "♂ Laki-laki"
                : "♀ Perempuan"}
            </span>

            {age !== null && (
              <span>• {age} tahun</span>
            )}
          </div>

          {person.birthDate && (
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(
                person.birthDate
              ).toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </p>
          )}
        </div>
      </div>

      {/* Relationships */}
      <div className="space-y-3">
        {parents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              Orang Tua
            </p>

            <div className="flex flex-wrap gap-1.5">
              {parents.map((p) => (
                <PersonChip
                  key={p.id}
                  person={p}
                />
              ))}
            </div>
          </div>
        )}

        {spouse && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              Pasangan
            </p>

            <PersonChip person={spouse} />
          </div>
        )}

        {siblings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              Saudara
            </p>

            <div className="flex flex-wrap gap-1.5">
              {siblings.map((p) => (
                <PersonChip
                  key={p.id}
                  person={p}
                />
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">
              Anak
            </p>

            <div className="flex flex-wrap gap-1.5">
              {children.map((p) => (
                <PersonChip
                  key={p.id}
                  person={p}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {person.notes && (
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">
            Catatan
          </p>

          <p className="text-sm text-slate-600">
            {person.notes}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
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
  );
}

// ============================================================
// FAMILY TREE SVG
// ============================================================

function FamilyTreeSVG({
  rootNodes,
  positions,
  persons,
  highlightId,
  onClickPerson,
}) {
  const paths = useMemo(
    () =>
      getConnectorPaths(
        rootNodes,
        positions
      ),
    [rootNodes, positions]
  );

  const allPos = Object.entries(positions);

  const personMap = useMemo(
    () =>
      new Map(
        persons.map((p) => [p.id, p])
      ),
    [persons]
  );

  return (
    <g>
      {/* Connectors */}
      {paths.map((d, index) => (
        <path
          key={`connector-${index}`}
          d={d}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Person nodes */}
      {allPos.map(([id, pos]) => {
        const person = personMap.get(id);

        if (!person) {
          return null;
        }

        const isHighlight =
          id === highlightId;

        const isMale =
          person.gender === "Male";

        return (
          <g
            key={id}
            data-clickable="true"
            onClick={() =>
              onClickPerson(person)
            }
            style={{
              cursor: "pointer",
            }}
          >
            {/* Shadow */}
            <rect
              x={pos.x + 1}
              y={pos.y + 2}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill="#0001"
            />

            {/* Card */}
            <rect
              x={pos.x}
              y={pos.y}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill={
                isHighlight
                  ? isMale
                    ? "#dbeafe"
                    : "#fce7f3"
                  : "white"
              }
              stroke={
                isHighlight
                  ? isMale
                    ? "#3b82f6"
                    : "#ec4899"
                  : "#e2e8f0"
              }
              strokeWidth={
                isHighlight ? 2.5 : 1.2
              }
            />

            {/* Top accent */}
            <rect
              x={pos.x + 1}
              y={pos.y + 1}
              width={NODE_W - 2}
              height={4}
              fill={
                isMale
                  ? "#3b82f6"
                  : "#ec4899"
              }
              opacity="0.9"
            />

            {/* Avatar */}
            <circle
              cx={pos.x + 22}
              cy={
                pos.y +
                NODE_H / 2 +
                3
              }
              r={14}
              fill={
                isMale
                  ? "#eff6ff"
                  : "#fdf2f8"
              }
              stroke={
                isMale
                  ? "#bfdbfe"
                  : "#fbcfe8"
              }
              strokeWidth="1"
            />

            {person.photoUrl ? (
              <image
                href={person.photoUrl}
                x={pos.x + 8}
                y={
                  pos.y +
                  NODE_H / 2 -
                  11
                }
                width="28"
                height="28"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`circle(14px at ${
                  pos.x + 22
                }px ${
                  pos.y +
                  NODE_H / 2 +
                  3
                }px)`}
              />
            ) : (
              <text
                x={pos.x + 22}
                y={
                  pos.y +
                  NODE_H / 2 +
                  8
                }
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={
                  isMale
                    ? "#3b82f6"
                    : "#ec4899"
                }
              >
                {person.name.charAt(0)}
              </text>
            )}

            {/* Name */}
            <text
              x={pos.x + 42}
              y={
                pos.y +
                NODE_H / 2 +
                2
              }
              fontSize="11.5"
              fontWeight="500"
              fill="#1e293b"
              textAnchor="start"
              dominantBaseline="middle"
            >
              {person.name.length > 11
                ? `${person.name.slice(
                    0,
                    10
                  )}…`
                : person.name}
            </text>

            {/* Birth year */}
            {person.birthDate && (
              <text
                x={pos.x + 42}
                y={
                  pos.y +
                  NODE_H / 2 +
                  16
                }
                fontSize="9.5"
                fill="#94a3b8"
                textAnchor="start"
                dominantBaseline="middle"
              >
                {new Date(
                  person.birthDate
                ).getFullYear()}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================
// FAMILY TREE VIEW
// ============================================================

function FamilyTreeView({
  persons,
  rels,
  onClickPerson,
  highlightId,
}) {
  const containerRef =
    useRef(null);

  const [transform, setTransform] =
    useState({
      x: 0,
      y: 0,
      scale: 1,
    });

  const [dragging, setDragging] =
    useState(false);

  const [dragStart, setDragStart] =
    useState({
      x: 0,
      y: 0,
    });

  const [
    dragStartTransform,
    setDragStartTransform,
  ] = useState({
    x: 0,
    y: 0,
  });

  const rootNodes = useMemo(
    () =>
      buildFamilyNodes(
        persons,
        rels
      ),
    [persons, rels]
  );

  const positions = useMemo(
    () =>
      computeFullLayout(
        rootNodes
      ),
    [rootNodes]
  );

  // Center highlighted person
  useEffect(() => {
    if (
      highlightId &&
      positions[highlightId] &&
      containerRef.current
    ) {
      const pos =
        positions[highlightId];

      const rect =
        containerRef.current.getBoundingClientRect();

      setTransform({
        x:
          rect.width / 2 -
          pos.x -
          NODE_W / 2,
        y:
          rect.height / 2 -
          pos.y -
          NODE_H / 2,
        scale: 1,
      });
    }
  }, [highlightId, positions]);

  // Auto fit
  const fitView = useCallback(() => {
    if (
      !containerRef.current ||
      !Object.keys(positions).length
    ) {
      return;
    }

    const rect =
      containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.values(
      positions
    ).forEach((p) => {
      minX = Math.min(
        minX,
        p.x
      );

      minY = Math.min(
        minY,
        p.y
      );

      maxX = Math.max(
        maxX,
        p.x + NODE_W
      );

      maxY = Math.max(
        maxY,
        p.y + NODE_H
      );
    });

    const tw =
      maxX - minX + 80;

    const th =
      maxY - minY + 80;

    const scale = Math.min(
      1,
      rect.width / tw,
      rect.height / th
    );

    setTransform({
      x:
        (rect.width -
          tw * scale) /
          2 -
        minX * scale +
        40 * scale,

      y:
        (rect.height -
          th * scale) /
          2 -
        minY * scale +
        40 * scale,

      scale,
    });
  }, [positions]);

  useEffect(() => {
    fitView();
  }, [
    persons.length,
    rels.length,
    fitView,
  ]);

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();

      const delta =
        event.deltaY > 0
          ? 0.9
          : 1.1;

      setTransform((current) => {
        const newScale = Math.min(
          3,
          Math.max(
            0.1,
            current.scale * delta
          )
        );

        const rect =
          containerRef.current?.getBoundingClientRect();

        if (!rect) {
          return {
            ...current,
            scale: newScale,
          };
        }

        const mx =
          event.clientX -
          rect.left;

        const my =
          event.clientY -
          rect.top;

        return {
          x:
            mx -
            (mx - current.x) *
              (newScale /
                current.scale),

          y:
            my -
            (my - current.y) *
              (newScale /
                current.scale),

          scale: newScale,
        };
      });
    },
    []
  );

  const onPointerDown =
    useCallback(
      (event) => {
        if (
          event.target.closest(
            "[data-clickable]"
          )
        ) {
          return;
        }

        setDragging(true);

        setDragStart({
          x: event.clientX,
          y: event.clientY,
        });

        setDragStartTransform({
          x: transform.x,
          y: transform.y,
        });

        event.currentTarget.setPointerCapture(
          event.pointerId
        );
      },
      [
        transform.x,
        transform.y,
      ]
    );

  const onPointerMove =
    useCallback(
      (event) => {
        if (!dragging) {
          return;
        }

        setTransform((current) => ({
          ...current,

          x:
            dragStartTransform.x +
            (event.clientX -
              dragStart.x),

          y:
            dragStartTransform.y +
            (event.clientY -
              dragStart.y),
        }));
      },
      [
        dragging,
        dragStart,
        dragStartTransform,
      ]
    );

  const onPointerUp =
    useCallback(() => {
      setDragging(false);
    }, []);

  const zoom = (factor) => {
    setTransform((current) => ({
      ...current,
      scale: Math.min(
        3,
        Math.max(
          0.1,
          current.scale * factor
        )
      ),
    }));
  };

  const resetView = () => {
    fitView();
  };

  const isEmpty =
    persons.length === 0;

  return (
    <div
      className="relative w-full h-full bg-slate-50/50"
      ref={containerRef}
    >
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3 opacity-30">
              🌳
            </div>

            <p className="text-slate-400 text-sm">
              Belum ada anggota keluarga
            </p>

            <p className="text-slate-300 text-xs mt-1">
              Tambahkan anggota untuk mulai
              membangun silsilah
            </p>
          </div>
        </div>
      ) : (
        <svg
          width="100%"
          height="100%"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            cursor: dragging
              ? "grabbing"
              : "grab",
            touchAction: "none",
          }}
        >
          <g
            transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}
          >
            <FamilyTreeSVG
              rootNodes={rootNodes}
              positions={positions}
              persons={persons}
              highlightId={
                highlightId
              }
              onClickPerson={
                onClickPerson
              }
            />
          </g>
        </svg>
      )}

      {!isEmpty && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoom(1.2)}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomIn}
          </button>

          <button
            type="button"
            onClick={() => zoom(0.8)}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.zoomOut}
          </button>

          <button
            type="button"
            onClick={resetView}
            className="w-9 h-9 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {Icons.reset}
          </button>
        </div>
      )}

      {!isEmpty && (
        <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded-lg">
          {Math.round(
            transform.scale * 100
          )}
          %
        </div>
      )}
    </div>
  );
}

// ============================================================
// MEMBERS LIST
// ============================================================

function MembersList({
  persons,
  rels,
  search,
  onClickPerson,
  onEdit,
  onDelete,
}) {
  const filtered =
    persons.filter((person) =>
      person.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  const {
    spouseMap,
    childrenOfParent,
  } = buildRelMaps(
    persons,
    rels
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-30">
          👤
        </div>

        <p className="text-slate-400 text-sm">
          {search
            ? "Tidak ditemukan"
            : "Belum ada anggota"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {filtered.map((person) => {
        const spouseId =
          spouseMap.get(person.id);

        const spousePerson =
          spouseId
            ? persons.find(
                (p) =>
                  p.id === spouseId
              )
            : null;

        const childCount =
          (
            childrenOfParent.get(
              person.id
            ) || []
          ).length;

        return (
          <div
            key={person.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
            onClick={() =>
              onClickPerson(person)
            }
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                person.gender ===
                "Male"
                  ? "bg-gradient-to-br from-blue-400 to-blue-600"
                  : "bg-gradient-to-br from-pink-400 to-pink-600"
              }`}
            >
              {person.photoUrl ? (
                <img
                  src={
                    person.photoUrl
                  }
                  className="w-full h-full rounded-xl object-cover"
                  alt=""
                />
              ) : (
                person.name.charAt(
                  0
                )
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {person.name}
              </p>

              <p className="text-xs text-slate-400 truncate">
                {person.gender ===
                "Male"
                  ? "Laki-laki"
                  : "Perempuan"}

                {spousePerson &&
                  ` • Pasangan: ${spousePerson.name}`}

                {childCount > 0 &&
                  ` • ${childCount} anak`}
              </p>
            </div>

            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() =>
                  onEdit(person)
                }
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {Icons.edit}
              </button>

              <button
                type="button"
                onClick={() =>
                  onDelete(person)
                }
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

// ============================================================
// CONFIRM DIALOG
// ============================================================

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
  saving = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          {title}
        </h3>

        <p className="text-sm text-slate-500 mb-4">
          {message}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving
              ? "Memproses..."
              : danger
              ? "Hapus"
              : "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETUP SCREEN
// ============================================================

function SetupScreen({
  onConnect,
  onDemo,
}) {
  const [url, setUrl] =
    useState(DEFAULT_API_URL);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            🌳
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            Silsilah Keluarga
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Catat dan visualisasikan
            hubungan keluarga
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Google Apps Script URL
            </label>

            <input
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
              placeholder="https://script.google.com/macros/s/.../exec"
            />

            <p className="text-xs text-slate-400 mt-1.5">
              URL sudah diisi otomatis. Pastikan
              deployment Apps Script sudah benar.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onConnect(url)
            }
            disabled={!url.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hubungkan
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>

            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">
                atau
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onDemo}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Coba Mode Demo
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Mode demo menggunakan data contoh
          tanpa Google Sheets
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [mode, setMode] =
    useState(null);

  const [apiUrl, setApiUrl] =
    useState("");

  const [persons, setPersons] =
    useState([]);

  const [rels, setRels] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [tab, setTab] =
    useState("tree");

  const [search, setSearch] =
    useState("");

  const [
    highlightId,
    setHighlightId,
  ] = useState(null);

  const [
    showSearch,
    setShowSearch,
  ] = useState(false);

  // Modals
  const [
    showAddPerson,
    setShowAddPerson,
  ] = useState(false);

  const [
    showEditPerson,
    setShowEditPerson,
  ] = useState(null);

  const [
    showAddRel,
    setShowAddRel,
  ] = useState(false);

  const [
    showDetail,
    setShowDetail,
  ] = useState(null);

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(null);

  const [
    showSettings,
    setShowSettings,
  ] = useState(false);

  // ==========================================================
  // LOAD SAVED API URL
  // ==========================================================

  useEffect(() => {
    (async () => {
      try {
        if (
          window.storage &&
          typeof window.storage.get ===
            "function"
        ) {
          const result =
            await window.storage.get(
              "family-tree-api-url"
            );

          if (
            result &&
            result.value
          ) {
            setApiUrl(
              normalizeApiUrl(
                result.value
              )
            );

            setMode("connected");

            return;
          }
        }
      } catch {
        // Ignore storage error
      }

      // Default URL
      setApiUrl(
        DEFAULT_API_URL
      );
    })();
  }, []);

  // ==========================================================
  // FETCH DATA
  // ==========================================================

  const fetchData =
    useCallback(async () => {
      if (mode === "demo") {
        setPersons(
          SAMPLE_PERSONS
        );

        setRels(
          SAMPLE_RELS
        );

        return;
      }

      if (
        mode !== "connected" ||
        !apiUrl
      ) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result =
          await apiGet(
            apiUrl,
            {
              action: "getAll",
            }
          );

        if (result.success) {
          setPersons(
            result.data?.persons ||
              []
          );

          setRels(
            result.data
              ?.relationships ||
              []
          );
        } else {
          setError(
            result.message ||
              "Gagal mengambil data."
          );
        }
      } catch (err) {
        console.error(
          "fetchData error:",
          err
        );

        setError(
          `Gagal terhubung ke Google Apps Script: ${err.message}`
        );
      } finally {
        setLoading(false);
      }
    }, [mode, apiUrl]);

  useEffect(() => {
    if (mode) {
      fetchData();
    }
  }, [mode, fetchData]);

  // ==========================================================
  // CONNECT
  // ==========================================================

  const handleConnect = async (
    url
  ) => {
    const cleanUrl =
      normalizeApiUrl(url);

    if (!cleanUrl) {
      setError(
        "URL Google Apps Script tidak valid."
      );

      return;
    }

    setApiUrl(cleanUrl);
    setMode("connected");

    try {
      if (
        window.storage &&
        typeof window.storage.set ===
          "function"
      ) {
        await window.storage.set(
          "family-tree-api-url",
          cleanUrl
        );
      }
    } catch {
      // Ignore storage error
    }
  };

  // ==========================================================
  // DEMO
  // ==========================================================

  const handleDemo = () => {
    setMode("demo");
  };

  // ==========================================================
  // SAVE PERSON
  // ==========================================================

  const handleSavePerson =
    async (form) => {
      setSaving(true);
      setError(null);

      try {
        if (mode === "demo") {
          const id =
            "P" +
            String(
              persons.length + 1
            ).padStart(3, "0");

          const newPerson = {
            id,
            ...form,
          };

          setPersons(
            (current) => [
              ...current,
              newPerson,
            ]
          );

          setShowAddPerson(
            false
          );

          return;
        }

        const result =
          await apiPost(
            apiUrl,
            {
              action:
                "createPerson",
              ...form,
            }
          );

        if (result.success) {
          await fetchData();

          setShowAddPerson(
            false
          );
        } else {
          setError(
            result.message ||
              "Gagal menyimpan anggota."
          );
        }
      } catch (err) {
        console.error(
          "handleSavePerson error:",
          err
        );

        setError(
          `Gagal menyimpan anggota: ${err.message}`
        );
      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // UPDATE PERSON
  // ==========================================================

  const handleUpdatePerson =
    async (form) => {
      if (!showEditPerson) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        if (mode === "demo") {
          setPersons(
            (current) =>
              current.map(
                (person) =>
                  person.id ===
                  showEditPerson.id
                    ? {
                        ...person,
                        ...form,
                      }
                    : person
              )
          );

          if (
            showDetail?.id ===
            showEditPerson.id
          ) {
            setShowDetail({
              ...showDetail,
              ...form,
            });
          }

          setShowEditPerson(
            null
          );

          return;
        }

        const result =
          await apiPost(
            apiUrl,
            {
              action:
                "updatePerson",
              id: showEditPerson.id,
              ...form,
            }
          );

        if (result.success) {
          await fetchData();

          setShowEditPerson(
            null
          );
        } else {
          setError(
            result.message ||
              "Gagal memperbarui anggota."
          );
        }
      } catch (err) {
        console.error(
          "handleUpdatePerson error:",
          err
        );

        setError(
          `Gagal memperbarui anggota: ${err.message}`
        );
      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // DELETE PERSON
  // ==========================================================

  const handleDeletePerson =
    async () => {
      const person =
        showDeleteConfirm;

      if (!person) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        if (mode === "demo") {
          setPersons(
            (current) =>
              current.filter(
                (p) =>
                  p.id !==
                  person.id
              )
          );

          setRels(
            (current) =>
              current.filter(
                (relation) =>
                  relation.personId !==
                    person.id &&
                  relation.relatedPersonId !==
                    person.id
              )
          );

          setShowDeleteConfirm(
            null
          );

          setShowDetail(null);

          return;
        }

        const result =
          await apiPost(
            apiUrl,
            {
              action:
                "deletePerson",
              id: person.id,
            }
          );

        if (result.success) {
          await fetchData();

          setShowDeleteConfirm(
            null
          );

          setShowDetail(null);
        } else {
          setError(
            result.message ||
              "Gagal menghapus anggota."
          );
        }
      } catch (err) {
        console.error(
          "handleDeletePerson error:",
          err
        );

        setError(
          `Gagal menghapus anggota: ${err.message}`
        );
      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // SAVE RELATIONSHIP
  // ==========================================================

  const handleSaveRel =
    async (form) => {
      setSaving(true);
      setError(null);

      try {
        if (mode === "demo") {
          const id =
            "R" +
            String(
              rels.length + 1
            ).padStart(3, "0");

          setRels(
            (current) => [
              ...current,
              {
                id,
                ...form,
              },
            ]
          );

          setShowAddRel(false);

          return;
        }

        const result =
          await apiPost(
            apiUrl,
            {
              action:
                "createRelationship",
              ...form,
            }
          );

        if (result.success) {
          await fetchData();

          setShowAddRel(false);
        } else {
          setError(
            result.message ||
              "Gagal menyimpan hubungan."
          );
        }
      } catch (err) {
        console.error(
          "handleSaveRel error:",
          err
        );

        setError(
          `Gagal menyimpan hubungan: ${err.message}`
        );
      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = (
    query
  ) => {
    setSearch(query);

    if (query.trim()) {
      const match =
        persons.find(
          (person) =>
            person.name
              .toLowerCase()
              .includes(
                query
                  .toLowerCase()
              )
        );

      setHighlightId(
        match?.id || null
      );
    } else {
      setHighlightId(null);
    }
  };

  // ==========================================================
  // PERSON CLICK
  // ==========================================================

  const handleClickPerson =
    (person) => {
      setShowDetail(person);
    };

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  const handleDisconnect =
    async () => {
      try {
        if (
          window.storage &&
          typeof window.storage
            .delete === "function"
        ) {
          await window.storage.delete(
            "family-tree-api-url"
          );
        }
      } catch {
        // Ignore
      }

      setMode(null);
      setApiUrl("");
      setPersons([]);
      setRels([]);
      setShowSettings(false);
    };

  // ==========================================================
  // NOT CONNECTED
  // ==========================================================

  if (!mode) {
    return (
      <SetupScreen
        onConnect={
          handleConnect
        }
        onDemo={handleDemo}
      />
    );
  }

  const hasRels = (personId) =>
    rels.some(
      (relation) =>
        relation.personId ===
          personId ||
        relation.relatedPersonId ===
          personId
    );

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              🌳
            </span>

            <h1 className="text-base font-semibold text-slate-800 hidden sm:block">
              Silsilah Keluarga
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {[
              [
                "tree",
                "Silsilah",
              ],
              [
                "members",
                `Anggota (${persons.length})`,
              ],
            ].map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setTab(key)
                  }
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {tab === "tree" && (
              <button
                type="button"
                onClick={() =>
                  setShowSearch(
                    (current) =>
                      !current
                  )
                }
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {Icons.search}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setShowSettings(
                  true
                )
              }
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {Icons.settings}
            </button>
          </div>
        </div>

        {/* Search */}
        {showSearch &&
          tab === "tree" && (
            <div className="px-4 pb-3">
              <div className="relative">
                <input
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                  placeholder="Cari nama anggota..."
                  value={search}
                  onChange={(e) =>
                    handleSearch(
                      e.target.value
                    )
                  }
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {Icons.search}
                </span>
              </div>

              {search &&
                highlightId && (
                  <p className="text-xs text-green-600 mt-1.5 ml-1">
                    ✓ Ditemukan:{" "}
                    {
                      persons.find(
                        (p) =>
                          p.id ===
                          highlightId
                      )?.name
                    }
                  </p>
                )}

              {search &&
                !highlightId && (
                  <p className="text-xs text-slate-400 mt-1.5 ml-1">
                    Tidak ditemukan
                  </p>
                )}
            </div>
          )}
      </header>

      {/* ERROR */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <p className="text-xs text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="text-red-400 hover:text-red-600"
          >
            {Icons.close}
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-600 animate-pulse">
            Mengambil data...
          </p>
        </div>
      )}

      {/* DEMO */}
      {mode === "demo" && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-600 text-center">
            Mode Demo — data hanya
            tersimpan sementara
          </p>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-hidden relative">
        {tab === "tree" ? (
          <FamilyTreeView
            persons={persons}
            rels={rels}
            onClickPerson={
              handleClickPerson
            }
            highlightId={
              highlightId
            }
          />
        ) : (
          <div className="h-full overflow-y-auto">
            {/* Member search */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <input
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                  placeholder="Cari anggota..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {Icons.search}
                </span>
              </div>
            </div>

            <MembersList
              persons={persons}
              rels={rels}
              search={search}
              onClickPerson={
                handleClickPerson
              }
              onEdit={(person) =>
                setShowEditPerson(
                  person
                )
              }
              onDelete={(person) =>
                setShowDeleteConfirm(
                  person
                )
              }
            />
          </div>
        )}

        {/* FAB */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-2 z-10">
          {persons.length >=
            2 && (
            <button
              type="button"
              onClick={() =>
                setShowAddRel(
                  true
                )
              }
              className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
              title="Tambah hubungan"
            >
              {Icons.link}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setShowAddPerson(
                true
              )
            }
            className="w-11 h-11 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            title="Tambah anggota"
          >
            {Icons.plus}
          </button>
        </div>
      </main>

      {/* ADD PERSON */}
      <Modal
        open={showAddPerson}
        onClose={() =>
          setShowAddPerson(false)
        }
        title="Tambah Anggota"
      >
        <PersonForm
          onSave={
            handleSavePerson
          }
          onCancel={() =>
            setShowAddPerson(
              false
            )
          }
          saving={saving}
        />
      </Modal>

      {/* EDIT PERSON */}
      <Modal
        open={!!showEditPerson}
        onClose={() =>
          setShowEditPerson(null)
        }
        title="Edit Anggota"
      >
        <PersonForm
          person={
            showEditPerson
          }
          onSave={
            handleUpdatePerson
          }
          onCancel={() =>
            setShowEditPerson(null)
          }
          saving={saving}
        />
      </Modal>

      {/* ADD RELATION */}
      <Modal
        open={showAddRel}
        onClose={() =>
          setShowAddRel(false)
        }
        title="Tambah Hubungan"
      >
        <RelationshipForm
          persons={persons}
          rels={rels}
          onSave={
            handleSaveRel
          }
          onCancel={() =>
            setShowAddRel(false)
          }
          saving={saving}
        />
      </Modal>

      {/* DETAIL */}
      <Modal
        open={!!showDetail}
        onClose={() =>
          setShowDetail(null)
        }
        title="Detail Anggota"
        wide
      >
        <PersonDetail
          person={showDetail}
          persons={persons}
          rels={rels}
          onEdit={(person) => {
            setShowDetail(
              null
            );
            setShowEditPerson(
              person
            );
          }}
          onDelete={(person) => {
            setShowDetail(
              null
            );
            setShowDeleteConfirm(
              person
            );
          }}
          onClickPerson={
            handleClickPerson
          }
        />
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={
          !!showDeleteConfirm
        }
        title="Hapus Anggota?"
        message={
          showDeleteConfirm
            ? hasRels(
                showDeleteConfirm.id
              )
              ? `${showDeleteConfirm.name} memiliki hubungan keluarga yang akan ikut terhapus. Lanjutkan?`
              : `Yakin ingin menghapus ${showDeleteConfirm.name}?`
            : ""
        }
        onConfirm={
          handleDeletePerson
        }
        onCancel={() =>
          setShowDeleteConfirm(
            null
          )
        }
        danger
        saving={saving}
      />

      {/* SETTINGS */}
      <Modal
        open={showSettings}
        onClose={() =>
          setShowSettings(false)
        }
        title="Pengaturan"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              Mode
            </p>

            <p className="text-sm text-slate-700">
              {mode === "demo"
                ? "Demo (data sementara)"
                : "Terhubung ke Google Sheets"}
            </p>
          </div>

          {apiUrl && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">
                API URL
              </p>

              <p className="text-xs text-slate-500 break-all bg-slate-50 p-2 rounded-lg">
                {apiUrl}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              Data
            </p>

            <p className="text-sm text-slate-700">
              {persons.length} anggota,{" "}
              {rels.length} hubungan
            </p>
          </div>

          {mode ===
            "connected" && (
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Data"}
            </button>
          )}

          <button
            type="button"
            onClick={
              handleDisconnect
            }
            className="w-full py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            {mode === "demo"
              ? "Keluar Demo"
              : "Putuskan Koneksi"}
          </button>
        </div>
      </Modal>
    </div>
  );
}