import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import {
  apiGet,
  apiPost,
  getAuthPin,
  clearAuthPin,
  demoteAuthPin,
  AuthError,
  readDataCache,
  writeDataCache,
} from "./backend/api";
import { buildRelMaps } from "./backend/treeBuilder";

import Modal from "./components/Modal";
import PersonForm from "./components/PersonForm";
import PersonDetail from "./components/PersonDetail";
import FamilyTreeView from "./components/FamilyTreeView";
import MembersList from "./components/MembersList";
import ConfirmDialog from "./components/ConfirmDialog";
import { Icons } from "./components/Icons";
import RanjiSelector from "./components/RanjiSelector";
import AdminPinForm from "./components/AdminPinForm";
import RelationshipManager from "./components/RelationshipManager";
import UnlockGate from "./components/UnlockGate";

export default function App() {
  const [persons, setPersons] = useState([]);
  const [rels, setRels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("tree");
  const [search, setSearch] = useState("");

  // Focused ranji view (null = full tree)
  const [focusPersonId, setFocusPersonId] = useState(null);

  // Gate — buka aplikasi dengan PIN (diverifikasi backend).
  // Sesi = ada PIN tersimpan di sessionStorage (dikelola src/backend/api.js).
  const [unlocked, setUnlocked] = useState(() => !!getAuthPin());

  const handleUnlock = (unlockedRole) => {
    if (unlockedRole === "admin") setRole("admin");
    setUnlocked(true);
  };

  const handleLock = () => {
    clearAuthPin();
    setRole("viewer");
    setShowSettings(false);
    setPersons([]);
    setRels([]);
    setUnlocked(false);
  };

  // Role system
  const [role, setRole] = useState("viewer"); // "viewer" | "admin"
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleAdminLogin = () => {
    setRole("admin");
    setShowAdminLogin(false);
  };

  const handleAdminLogout = () => {
    demoteAuthPin();
    setRole("viewer");
    setShowSettings(false);
  };

  // Modals
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManageRels, setShowManageRels] = useState(null); // person object

  // ==========================================================
  // FETCH DATA
  // ==========================================================

  const seededFromCache = useRef(false);

  const fetchData = useCallback(async () => {
    setError(null);

    // Load pertama: tampilkan data cache seketika, refresh diam-diam di belakang.
    if (!seededFromCache.current) {
      seededFromCache.current = true;
      const cached = readDataCache();
      if (cached) {
        setPersons(cached.persons || []);
        setRels(cached.relationships || []);
      } else {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    try {
      const result = await apiGet({ action: "getAll" });

      if (result.success) {
        const data = result.data || {};
        setPersons(data.persons || []);
        setRels(data.relationships || []);
        writeDataCache(data);
      } else {
        setError(result.message || "Gagal mengambil data.");
      }
    } catch (err) {
      console.error("fetchData error:", err);
      if (err instanceof AuthError) {
        clearAuthPin();
        setRole("viewer");
        setPersons([]);
        setRels([]);
        setUnlocked(false);
        return;
      }
      setError(`Gagal terhubung ke server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchData();
  }, [fetchData, unlocked]);

  // ==========================================================
  // SAVE PERSON (with optional relationship)
  // ==========================================================

  const handleSavePerson = async (form) => {
    setSaving(true);
    setError(null);

    try {
      // Step 1: create the person
      const createResult = await apiPost({
        action: "createPerson",
        name: form.name,
        gender: form.gender,
        birthDate: form.birthDate,
        photoUrl: form.photoUrl,
        notes: form.notes,
        siblingOrder: form.siblingOrder,
      });

      if (!createResult.success) {
        setError(createResult.message || "Gagal menyimpan anggota.");
        return;
      }

      // Step 2: create relationship if the user chose one
      if (form.relType !== "none") {
        // Try to get the new ID from the createPerson response first
        let newId = createResult.data?.id ?? createResult.id ?? null;

        // Fallback: fetch all and find the person that wasn't there before
        if (!newId) {
          const prevIds = new Set(persons.map((p) => p.id));
          const allResult = await apiGet({ action: "getAll" });

          if (allResult.success) {
            const fresh = allResult.data?.persons || [];
            newId = fresh.find((p) => !prevIds.has(p.id))?.id ?? null;
          }
        }

        if (newId) {
          if (form.relType === "child") {
            for (const parentId of form.parentIds ?? []) {
              await apiPost({
                action: "createRelationship",
                personId: parentId,
                relatedPersonId: newId,
                type: "parent",
              });
            }
          } else if (form.relType === "spouse") {
            await apiPost({
              action: "createRelationship",
              personId: newId,
              relatedPersonId: form.spouseId,
              type: "spouse",
            });
          }
        } else {
          setError(
            "Anggota ditambahkan, tapi hubungan gagal dibuat karena ID tidak ditemukan dari response API."
          );
        }
      }

      await fetchData();
      setShowAddPerson(false);
    } catch (err) {
      console.error("handleSavePerson error:", err);
      setError(`Gagal menyimpan anggota: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // UPDATE PERSON
  // ==========================================================

  const handleUpdatePerson = async (form) => {
    if (!showEditPerson) return;

    setSaving(true);
    setError(null);

    try {
      const result = await apiPost({
        action: "updatePerson",
        id: showEditPerson.id,
        name: form.name,
        gender: form.gender,
        birthDate: form.birthDate,
        photoUrl: form.photoUrl,
        notes: form.notes,
        siblingOrder: form.siblingOrder,
      });

      if (result.success) {
        await fetchData();
        setShowEditPerson(null);
      } else {
        setError(result.message || "Gagal memperbarui anggota.");
      }
    } catch (err) {
      console.error("handleUpdatePerson error:", err);
      setError(`Gagal memperbarui anggota: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE PERSON
  // ==========================================================

  const handleDeletePerson = async () => {
    const person = showDeleteConfirm;
    if (!person) return;

    setSaving(true);
    setError(null);

    try {
      const result = await apiPost({ action: "deletePerson", id: person.id });

      if (result.success) {
        await fetchData();
        setShowDeleteConfirm(null);
        setShowDetail(null);
        if (focusPersonId === person.id) setFocusPersonId(null);
      } else {
        setError(result.message || "Gagal menghapus anggota.");
      }
    } catch (err) {
      console.error("handleDeletePerson error:", err);
      setError(`Gagal menghapus anggota: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // RELATIONSHIP MANAGEMENT
  // ==========================================================

  const handleAddRel = async (form) => {
    setSaving(true);
    setError(null);

    try {
      const result = await apiPost({ action: "createRelationship", ...form });

      if (result.success) {
        await fetchData();
      } else {
        setError(result.message || "Gagal menyimpan hubungan.");
      }
    } catch (err) {
      console.error("handleAddRel error:", err);
      setError(`Gagal menyimpan hubungan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRel = async (relId) => {
    setSaving(true);
    setError(null);

    try {
      const result = await apiPost({ action: "deleteRelationship", id: relId });

      if (result.success) {
        await fetchData();
      } else {
        setError(result.message || "Gagal menghapus hubungan.");
      }
    } catch (err) {
      console.error("handleDeleteRel error:", err);
      setError(`Gagal menghapus hubungan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClickPerson = (person) => setShowDetail(person);

  const handleSelectRanji = (person) => setFocusPersonId(person.id);
  const handleClearRanji = () => setFocusPersonId(null);

  const handleFocusPerson = (person) => {
    setFocusPersonId(person.id);
    setShowDetail(null);
    setTab("tree");
  };

  // Focused view: hanya person + pasangan + anak-anak
  const focusPerson = useMemo(
    () => persons.find((p) => p.id === focusPersonId) ?? null,
    [focusPersonId, persons]
  );

  const { displayPersons, displayRels } = useMemo(() => {
    if (!focusPersonId) return { displayPersons: persons, displayRels: rels };

    const { spouseMap, childrenOfParent } = buildRelMaps(persons, rels);
    const focusedIds = new Set();

    // Kumpulkan orang ini + pasangan, lalu rekursif ke seluruh keturunan
    function collectDescendants(personId) {
      if (focusedIds.has(personId)) return;
      focusedIds.add(personId);

      const spouseId = spouseMap.get(personId);
      if (spouseId) focusedIds.add(spouseId);

      for (const childId of (childrenOfParent.get(personId) ?? [])) {
        collectDescendants(childId);
      }
    }

    collectDescendants(focusPersonId);

    return {
      displayPersons: persons.filter((p) => focusedIds.has(p.id)),
      displayRels: rels.filter(
        (r) => focusedIds.has(r.personId) && focusedIds.has(r.relatedPersonId)
      ),
    };
  }, [focusPersonId, persons, rels]);

  const hasRels = (personId) =>
    rels.some((r) => r.personId === personId || r.relatedPersonId === personId);

  // ==========================================================
  // RENDER
  // ==========================================================

  if (!unlocked) {
    return <UnlockGate onUnlock={handleUnlock} />;
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden relative">
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl"></span>
            <h1 className="text-base font-semibold text-slate-800 hidden sm:block">
              Silsilah Keluarga
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {[
              ["tree", "Silsilah"],
              ["members", `Anggota (${displayPersons.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {role === "admin" ? (
              <>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg select-none">
                  Admin
                </span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  title="Keluar dari Admin"
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {Icons.lockOpen}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                title="Admin Login"
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {Icons.lock}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {Icons.settings}
            </button>
          </div>
        </div>
      </header>

      {/* RANJI SELECTOR — filter berlaku untuk tab Silsilah & Anggota */}
      {(tab === "tree" || tab === "members") && (
        <RanjiSelector
          persons={persons}
          focusPerson={focusPerson}
          onSelect={handleSelectRanji}
          onClear={handleClearRanji}
        />
      )}

      {/* ERROR + RETRY */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between gap-3">
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              {Icons.close}
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-600 animate-pulse">Mengambil data...</p>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-hidden relative">
        {tab === "tree" ? (
          <FamilyTreeView
            persons={displayPersons}
            rels={displayRels}
            onClickPerson={handleClickPerson}
            viewKey={focusPersonId ?? "full"}
            printTitle={focusPerson ? `Ranji ${focusPerson.name}` : "Silsilah Keluarga"}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <input
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                  placeholder="Cari anggota..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {Icons.search}
                </span>
              </div>
            </div>

            <MembersList
              persons={displayPersons}
              rels={displayRels}
              search={search}
              onClickPerson={handleClickPerson}
              onEdit={(person) => setShowEditPerson(person)}
              onDelete={(person) => setShowDeleteConfirm(person)}
              role={role}
            />
          </div>
        )}

        {/* FAB — tambah anggota (admin only) */}
        {role === "admin" && (
          <div className="absolute bottom-5 right-5 z-10">
            <button
              type="button"
              onClick={() => setShowAddPerson(true)}
              className="w-11 h-11 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              title="Tambah anggota"
            >
              {Icons.plus}
            </button>
          </div>
        )}
      </main>

      {/* ADD PERSON */}
      <Modal open={showAddPerson} onClose={() => setShowAddPerson(false)} title="Tambah Anggota">
        <PersonForm
          onSave={handleSavePerson}
          onCancel={() => setShowAddPerson(false)}
          saving={saving}
          persons={persons}
          rels={rels}
        />
      </Modal>

      {/* EDIT PERSON */}
      <Modal
        open={!!showEditPerson}
        onClose={() => setShowEditPerson(null)}
        title="Edit Anggota"
      >
        <PersonForm
          person={showEditPerson}
          onSave={handleUpdatePerson}
          onCancel={() => setShowEditPerson(null)}
          saving={saving}
        />
      </Modal>

      {/* DETAIL */}
      <Modal
        open={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Detail Anggota"
        wide
      >
        <PersonDetail
          person={showDetail}
          persons={persons}
          rels={rels}
          role={role}
          onEdit={(person) => {
            setShowDetail(null);
            setShowEditPerson(person);
          }}
          onDelete={(person) => {
            setShowDetail(null);
            setShowDeleteConfirm(person);
          }}
          onManageRels={(person) => {
            setShowDetail(null);
            setShowManageRels(person);
          }}
          onClickPerson={handleClickPerson}
          onFocus={handleFocusPerson}
        />
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        title="Hapus Anggota?"
        message={
          showDeleteConfirm
            ? hasRels(showDeleteConfirm.id)
              ? `${showDeleteConfirm.name} memiliki hubungan keluarga yang akan ikut terhapus. Lanjutkan?`
              : `Yakin ingin menghapus ${showDeleteConfirm.name}?`
            : ""
        }
        onConfirm={handleDeletePerson}
        onCancel={() => setShowDeleteConfirm(null)}
        danger
        saving={saving}
      />

      {/* SETTINGS */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Pengaturan">
        <div className="space-y-4">
          {/* Role status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-500">Role</p>
              <p className={`text-sm font-semibold mt-0.5 ${role === "admin" ? "text-emerald-700" : "text-slate-600"}`}>
                {role === "admin" ? "Admin" : "Viewer"}
              </p>
            </div>
            {role === "admin" ? (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Logout Admin
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setShowAdminLogin(true);
                }}
                className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Admin Login
              </button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Data</p>
            <p className="text-sm text-slate-700">
              {persons.length} anggota, {rels.length} hubungan
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchData();
              setShowSettings(false);
            }}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {loading ? "Mengambil data..." : "Refresh Data"}
          </button>

          <button
            type="button"
            onClick={handleLock}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Kunci Aplikasi
          </button>
        </div>
      </Modal>

      {/* MANAGE RELATIONSHIPS */}
      <Modal
        open={!!showManageRels}
        onClose={() => setShowManageRels(null)}
        title={showManageRels ? `Hubungan: ${showManageRels.name}` : "Kelola Hubungan"}
        wide
      >
        <RelationshipManager
          person={showManageRels}
          persons={persons}
          rels={rels}
          onAdd={handleAddRel}
          onDelete={handleDeleteRel}
          saving={saving}
        />
      </Modal>

      {/* ADMIN LOGIN */}
      <Modal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        title="Admin Login"
      >
        <AdminPinForm
          onSuccess={handleAdminLogin}
          onCancel={() => setShowAdminLogin(false)}
        />
      </Modal>

      {/* WATERMARK */}
      <p className="fixed bottom-5 left-20 text-[10px] text-slate-300 select-none pointer-events-none z-50">
        More details, 
        @atikarestirhmd
        </p>
    </div>
  );
}
