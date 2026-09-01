import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relatif ('./') supaya jalan di subpath apa pun:
//   atikarahmanda.github.io/newTest/ , /silsilah-keluarga/ , dll.
// Aman karena app ini tidak pakai client-side routing (tab via state).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
