import { useState } from "react";
import { verifyPin, setAuthPin } from "../backend/api";

export default function UnlockGate({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pin || checking) return;
    setChecking(true);
    setError("");

    try {
      const res = await verifyPin(pin);
      if (res.ok) {
        setAuthPin(pin);
        onUnlock(res.role || "viewer");
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
    <div className="h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="space-y-2">
          <span className="text-4xl"></span>
          <h1 className="text-lg font-semibold text-slate-800">Silsilah Keluarga</h1>
          <p className="text-sm text-slate-500">
            Data keluarga bersifat privat. Masukkan PIN untuk membuka.
          </p>
        </div>

        <div>
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
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!pin || checking}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {checking ? "Memeriksa..." : "Buka"}
        </button>
      </div>

      <p className="fixed bottom-5 text-[10px] text-slate-300 select-none pointer-events-none">
        More details, @atikarestirhmd
      </p>
    </div>
  );
}
