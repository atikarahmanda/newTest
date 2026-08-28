import { useState } from "react";

const ADMIN_PIN = "0110";

export default function AdminPinForm({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
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
          maxLength={8}
          autoFocus
          className={`w-full px-3 py-3 border rounded-xl text-center text-xl tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
            error
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-slate-200 bg-slate-50/50 text-slate-800"
          }`}
          value={pin}
          placeholder="••••"
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1.5 text-center">
            PIN salah. Coba lagi.
          </p>
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
          disabled={!pin}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Masuk
        </button>
      </div>
    </div>
  );
}
