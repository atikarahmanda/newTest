import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base = '/<nama-repo>/' supaya asset benar saat dihosting di
// https://atikarahmanda.github.io/silsilah-keluarga/
export default defineConfig({
  base: '/silsilah-keluarga/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
