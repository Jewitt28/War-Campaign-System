import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/War-Campaign-System/",
  build: {
    outDir: "../../docs",
    emptyOutDir: true,
  },
  plugins: [react()],
});

