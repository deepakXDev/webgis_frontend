  import path from "path" // <-- Add this import
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import tailwindcss from '@tailwindcss/vite'

    export default defineConfig({
      plugins: [react(), tailwindcss()],
      // Add this resolve block
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    })