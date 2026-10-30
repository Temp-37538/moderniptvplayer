import { defineConfig } from "vite";

// Tauri loads this dev server (see src-tauri/tauri.conf.json).
export default defineConfig({
	clearScreen: false,
	server: { host: "127.0.0.1", port: 1420, strictPort: true },
	build: { target: "es2022", outDir: "dist", emptyOutDir: true },
});
