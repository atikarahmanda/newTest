import { useState } from "react";
import { DEFAULT_API_URL } from "../api";

export default function SetupScreen({ onConnect, onDemo }) {
  const [url, setUrl] = useState(DEFAULT_API_URL);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌳</div>
          <h1 className="text-2xl font-bold text-slate-800">Silsilah Keluarga</h1>
          <p className="text-slate-500 text-sm mt-2">
            Catat dan visualisasikan hubungan keluarga
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
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              URL sudah diisi otomatis. Pastikan deployment Apps Script sudah benar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onConnect(url)}
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
              <span className="bg-white px-3 text-slate-400">atau</span>
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
          Mode demo menggunakan data contoh tanpa Google Sheets
        </p>
      </div>
    </div>
  );
}
