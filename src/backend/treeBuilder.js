/**
 * Nilai urut saudara. Angka kecil = lebih tua (paling kiri).
 * Kosong / bukan angka → Infinity, artinya taruh setelah yang bernomor,
 * lalu urutannya jatuh ke urutan input (index di array persons).
 */
export function siblingRank(person) {
  const v = person && person.siblingOrder;
  const n = Number(v);
  return v === "" || v == null || Number.isNaN(n) ? Infinity : n;
}

/*
 * Relationship rules:
 * 1. spouse is always bidirectional.
 * 2. parent is stored as: personId = parent, relatedPersonId = child.
 * 3. A parent relationship belongs to the whole married couple — the spouse
 *    of a recorded parent is also treated as the child's parent (no step-parents).
 */
export function buildRelMaps(persons, rels) {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const spouseMap = new Map();
  const childrenOfParent = new Map();
  const parentsOfChild = new Map();

  for (const r of rels) {
    if (r.type !== "spouse") continue;

    const a = String(r.personId || "").trim();
    const b = String(r.relatedPersonId || "").trim();

    if (!a || !b || !personMap.has(a) || !personMap.has(b)) continue;

    spouseMap.set(a, b);
    spouseMap.set(b, a);
  }

  const addParentChild = (parentId, childId) => {
    if (!personMap.has(parentId) || !personMap.has(childId)) return;
    if (parentId === childId) return;

    if (!childrenOfParent.has(parentId)) childrenOfParent.set(parentId, new Set());
    childrenOfParent.get(parentId).add(childId);

    if (!parentsOfChild.has(childId)) parentsOfChild.set(childId, new Set());
    parentsOfChild.get(childId).add(parentId);
  };

  for (const r of rels) {
    if (r.type !== "parent") continue;

    const parentId = String(r.personId || "").trim();
    const childId = String(r.relatedPersonId || "").trim();

    if (!personMap.has(parentId) || !personMap.has(childId)) continue;

    addParentChild(parentId, childId);

    const spouseId = spouseMap.get(parentId);
    if (spouseId) addParentChild(spouseId, childId);
  }

  return {
    spouseMap,
    childrenOfParent: new Map(
      [...childrenOfParent.entries()].map(([id, set]) => [id, [...set]])
    ),
    parentsOfChild: new Map(
      [...parentsOfChild.entries()].map(([id, set]) => [id, [...set]])
    ),
  };
}

/*
 * Build the family tree by FAMILY UNIT (spouse pair or single person).
 * This ensures a person with no recorded parents but whose spouse has parents
 * is still connected to the tree, not left as a floating root.
 */
export function buildFamilyNodes(persons, rels) {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const personIndex = new Map(persons.map((p, i) => [p.id, i])); // urutan input
  const { spouseMap, childrenOfParent, parentsOfChild } = buildRelMaps(persons, rels);

  const unitByPerson = new Map();
  const units = [];
  const visited = new Set();

  for (const person of persons) {
    if (visited.has(person.id)) continue;

    const spouseId = spouseMap.get(person.id);
    const memberIds = [person.id];

    if (spouseId && personMap.has(spouseId) && !visited.has(spouseId)) {
      memberIds.push(spouseId);
    }

    const unit = {
      id: `family-${units.length + 1}`,
      memberIds,
      members: memberIds.map((id) => personMap.get(id)).filter(Boolean),
      children: [],
      parentUnits: new Set(),
    };

    units.push(unit);
    memberIds.forEach((id) => {
      visited.add(id);
      unitByPerson.set(id, unit);
    });
  }

  for (const parentUnit of units) {
    // childUnit -> id anak kandung yang menghubungkan ke unit ini
    const viaChild = new Map();

    for (const parentId of parentUnit.memberIds) {
      const childIds = childrenOfParent.get(parentId) || [];

      for (const childId of childIds) {
        const childUnit = unitByPerson.get(childId);
        if (!childUnit || childUnit === parentUnit) continue;

        if (!viaChild.has(childUnit)) viaChild.set(childUnit, childId);
        childUnit.parentUnits.add(parentUnit);
      }
    }

    // Urutkan saudara: kolom "Urutan" dulu, lalu urutan input sebagai tie-break.
    parentUnit.children = [...viaChild.keys()].sort((ua, ub) => {
      const a = personMap.get(viaChild.get(ua));
      const b = personMap.get(viaChild.get(ub));
      return (
        siblingRank(a) - siblingRank(b) ||
        (personIndex.get(a.id) ?? 0) - (personIndex.get(b.id) ?? 0)
      );
    });
  }

  const rootUnits = units.filter((unit) => unit.parentUnits.size === 0);

  const built = new Map();
  const building = new Set();

  function buildNode(unit) {
    if (built.has(unit.id)) return built.get(unit.id);

    // Guard against accidental circular relationships.
    if (building.has(unit.id)) return { members: unit.members, children: [] };

    building.add(unit.id);

    const node = { members: unit.members, children: [] };
    built.set(unit.id, node);

    node.children = unit.children.map((childUnit) => buildNode(childUnit)).filter(Boolean);

    building.delete(unit.id);
    return node;
  }

  const rootNodes = rootUnits.map(buildNode);

  // Safety fallback: display any unit not reachable from roots (malformed/cyclic data).
  for (const unit of units) {
    if (!built.has(unit.id)) rootNodes.push(buildNode(unit));
  }

  return rootNodes;
}
