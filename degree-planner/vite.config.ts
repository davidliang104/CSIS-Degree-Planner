import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/CSIS-Degree-Planner/",
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
})
