import { useState, useEffect, useCallback } from "react";

import { DEFAULT_API_URL, normalizeApiUrl, apiGet, apiPost } from "./api";
import { SAMPLE_PERSONS, SAMPLE_RELS } from "./data/sampleData";

import SetupScreen from "./components/SetupScreen";
import Modal from "./components/Modal";
import PersonForm from "./components/PersonForm";
import RelationshipForm from "./components/RelationshipForm";
import PersonDetail from "./components/PersonDetail";
import FamilyTreeView from "./components/FamilyTreeView";
import MembersList from "./components/MembersList";
import ConfirmDialog from "./components/ConfirmDialog";
import { Icons } from "./components/Icons";

export default function App() {
  const [mode, setMode] = useState(null);
  const [apiUrl, setApiUrl] = useState("");
  const [persons, setPersons] = useState([]);
  const [rels, setRels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("tree");
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Modals
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(null);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load saved API URL
  useEffect(() => {
    (async () => {
      try {
        if (window.storage && typeof window.storage.get === "function") {
          const result = await window.storage.get("family-tree-api-url");
          if (result && result.value) {
            setApiUrl(normalizeApiUrl(result.value));
            setMode("connected");
            return;
          }
        }
      } catch {
        // Ignore storage error
      }
      setApiUrl(DEFAULT_API_URL);
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (mode === "demo") {
      setPersons(SAMPLE_PERSONS);
      setRels(SAMPLE_RELS);
      return;
    }

    if (mode !== "connected" || !apiUrl) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiGet(apiUrl, { action: "getAll" });

      if (result.success) {
        setPersons(result.data?.persons || []);
        setRels(result.data?.relationships || []);
      } else {
        setError(result.message || "Gagal mengambil data.");
      }
    } catch (err) {
      console.error("fetchData error:", err);
      setError(`Gagal terhubung ke Google Apps Script: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [mode, apiUrl]);

  useEffect(() => {
    if (mode) fetchData();
  }, [mode, fetchData]);

  const handleConnect = async (url) => {
    const cleanUrl = normalizeApiUrl(url);

    if (!cleanUrl) {
      setError("URL Google Apps Script tidak valid.");
      return;
    }

    setApiUrl(cleanUrl);
    setMode("connected");

    try {
      if (window.storage && typeof window.storage.set === "function") {
        await window.storage.set("family-tree-api-url", cleanUrl);
      }
    } catch {
      // Ignore storage error
    }
  };

  const handleDemo = () => setMode("demo");

  const handleSavePerson = async (form) => {
    setSaving(true);
    setError(null);

    try {
      if (mode === "demo") {
        const id = "P" + String(persons.length + 1).padStart(3, "0");
        setPersons((current) => [...current, { id, ...form }]);
        setShowAddPerson(false);
        return;
      }

      const result = await apiPost(apiUrl, { action: "createPerson", ...form });

      if (result.success) {
        await fetchData();
        setShowAddPerson(false);
      } else {
        setError(result.message || "Gagal menyimpan anggota.");
      }
    } catch (err) {
      console.error("handleSavePerson error:", err);
      setError(`Gagal menyimpan anggota: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePerson = async (form) => {
    if (!showEditPerson) return;

    setSaving(true);
    setError(null);

    try {
      if (mode === "demo") {
        setPersons((current) =>
          current.map((person) =>
            person.id === showEditPerson.id ? { ...person, ...form } : person
          )
        );

        if (showDetail?.id === showEditPerson.id) {
          setShowDetail({ ...showDetail, ...form });
        }

        setShowEditPerson(null);
        return;
      }

      const result = await apiPost(apiUrl, {
        action: "updatePerson",
        id: showEditPerson.id,
        ...form,
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

  const handleDeletePerson = async () => {
    const person = showDeleteConfirm;
    if (!person) return;

    setSaving(true);
    setError(null);

    try {
      if (mode === "demo") {
        setPersons((current) => current.filter((p) => p.id !== person.id));
        setRels((current) =>
          current.filter(
            (relation) =>
              relation.personId !== person.id && relation.relatedPersonId !== person.id
          )
        );
        setShowDeleteConfirm(null);
        setShowDetail(null);
        return;
      }

      const result = await apiPost(apiUrl, { action: "deletePerson", id: person.id });

      if (result.success) {
        await fetchData();
        setShowDeleteConfirm(null);
        setShowDetail(null);
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

  const handleSaveRel = async (form) => {
    setSaving(true);
    setError(null);

    try {
      if (mode === "demo") {
        const id = "R" + String(rels.length + 1).padStart(3, "0");
        setRels((current) => [...current, { id, ...form }]);
        setShowAddRel(false);
        return;
      }

      const result = await apiPost(apiUrl, { action: "createRelationship", ...form });

      if (result.success) {
        await fetchData();
        setShowAddRel(false);
      } else {
        setError(result.message || "Gagal menyimpan hubungan.");
      }
    } catch (err) {
      console.error("handleSaveRel error:", err);
      setError(`Gagal menyimpan hubungan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (query) => {
    setSearch(query);

    if (query.trim()) {
      const match = persons.find((person) =>
        person.name.toLowerCase().includes(query.toLowerCase())
      );
      setHighlightId(match?.id || null);
    } else {
      setHighlightId(null);
    }
  };

  const handleClickPerson = (person) => setShowDetail(person);

  const handleDisconnect = async () => {
    try {
      if (window.storage && typeof window.storage.delete === "function") {
        await window.storage.delete("family-tree-api-url");
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

  if (!mode) {
    return <SetupScreen onConnect={handleConnect} onDemo={handleDemo} />;
  }

  const hasRels = (personId) =>
    rels.some(
      (relation) =>
        relation.personId === personId || relation.relatedPersonId === personId
    );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌳</span>
            <h1 className="text-base font-semibold text-slate-800 hidden sm:block">
              Silsilah Keluarga
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {[
              ["tree", "Silsilah"],
              ["members", `Anggota (${persons.length})`],
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
            {tab === "tree" && (
              <button
                type="button"
                onClick={() => setShowSearch((current) => !current)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {Icons.search}
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

        {/* Search bar */}
        {showSearch && tab === "tree" && (
          <div className="px-4 pb-3">
            <div className="relative">
              <input
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                placeholder="Cari nama anggota..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {Icons.search}
              </span>
            </div>

            {search && highlightId && (
              <p className="text-xs text-green-600 mt-1.5 ml-1">
                ✓ Ditemukan: {persons.find((p) => p.id === highlightId)?.name}
              </p>
            )}

            {search && !highlightId && (
              <p className="text-xs text-slate-400 mt-1.5 ml-1">Tidak ditemukan</p>
            )}
          </div>
        )}
      </header>

      {/* ERROR */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            {Icons.close}
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-600 animate-pulse">Mengambil data...</p>
        </div>
      )}

      {/* DEMO BANNER */}
      {mode === "demo" && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-600 text-center">
            Mode Demo — data hanya tersimpan sementara
          </p>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 overflow-hidden relative">
        {tab === "tree" ? (
          <FamilyTreeView
            persons={persons}
            rels={rels}
            onClickPerson={handleClickPerson}
            highlightId={highlightId}
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
              persons={persons}
              rels={rels}
              search={search}
              onClickPerson={handleClickPerson}
              onEdit={(person) => setShowEditPerson(person)}
              onDelete={(person) => setShowDeleteConfirm(person)}
            />
          </div>
        )}

        {/* FAB */}
        <div className="absolute bottom-5 right-5 flex flex-col gap-2 z-10">
          {persons.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowAddRel(true)}
              className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
              title="Tambah hubungan"
            >
              {Icons.link}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddPerson(true)}
            className="w-11 h-11 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            title="Tambah anggota"
          >
            {Icons.plus}
          </button>
        </div>
      </main>

      {/* ADD PERSON */}
      <Modal open={showAddPerson} onClose={() => setShowAddPerson(false)} title="Tambah Anggota">
        <PersonForm
          onSave={handleSavePerson}
          onCancel={() => setShowAddPerson(false)}
          saving={saving}
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

      {/* ADD RELATION */}
      <Modal open={showAddRel} onClose={() => setShowAddRel(false)} title="Tambah Hubungan">
        <RelationshipForm
          persons={persons}
          rels={rels}
          onSave={handleSaveRel}
          onCancel={() => setShowAddRel(false)}
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
          onEdit={(person) => {
            setShowDetail(null);
            setShowEditPerson(person);
          }}
          onDelete={(person) => {
            setShowDetail(null);
            setShowDeleteConfirm(person);
          }}
          onClickPerson={handleClickPerson}
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
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Mode</p>
            <p className="text-sm text-slate-700">
              {mode === "demo" ? "Demo (data sementara)" : "Terhubung ke Google Sheets"}
            </p>
          </div>

          {apiUrl && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">API URL</p>
              <p className="text-xs text-slate-500 break-all bg-slate-50 p-2 rounded-lg">
                {apiUrl}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Data</p>
            <p className="text-sm text-slate-700">
              {persons.length} anggota, {rels.length} hubungan
            </p>
          </div>

          {mode === "connected" && (
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          )}

          <button
            type="button"
            onClick={handleDisconnect}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            {mode === "demo" ? "Keluar Demo" : "Putuskan Koneksi"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
