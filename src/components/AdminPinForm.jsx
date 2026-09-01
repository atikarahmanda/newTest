import { useState } from "react";
import { verifyPin, elevateAuthPin } from "../backend/api";

export default function AdminPinForm({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pin || checking) return;
    setChecking(true);
    setError("");

    try {
      const res = await verifyPin(pin);
      if (res.ok && res.role === "admin") {
        // Naikkan PIN sesi ke PIN admin supaya request tulis diizinkan backend.
        elevateAuthPin(pin);
        onSuccess();
      } else if (res.ok) {
        setError("PIN ini bukan PIN admin.");
        setPin("");
      } else {
        setError(res.message || "PIN salah. Coba lagi.");
        setPin("");
      }
    } catch (err) {
      setError(`Gagal memverifikasi: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Masukkan PIN Admin untuk mengaktifkan mode edit.
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={16}
          autoFocus
          disabled={checking}
          className={`w-full px-3 py-3 border rounded-xl text-center text-xl tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-60 ${
            error
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-slate-200 bg-slate-50/50 text-slate-800"
          }`}
          value={pin}
          placeholder="••••"
          onChange={(e) => {
            setPin(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!pin || checking}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {checking ? "Memeriksa..." : "Masuk"}
        </button>
      </div>
    </div>
  );
}
