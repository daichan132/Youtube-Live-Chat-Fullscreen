import { resolve } from "node:path";

import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import tsconfigPaths from "vite-tsconfig-paths";
import manifest from "./src/manifest";

export default defineConfig({
	// @see https://github.com/crxjs/chrome-extension-tools/issues/696
	server: {
		port: 5173,
		strictPort: true,
		hmr: {
			port: 5173,
		},
	},
	// prevent src/ prefix on extension urls
	root: resolve(__dirname, "src"),
	publicDir: resolve(__dirname, "public"),
	build: {
		outDir: resolve(__dirname, "dist"),
		rollupOptions: {
			output: {
				chunkFileNames: "assets/chunk-[hash].js",
			},
		},
	},
	plugins: [react(), crx({ manifest }), tsconfigPaths()],
	css: {
		preprocessorOptions: {
			scss: {
				api: "modern-compiler",
			},
		},
	},
});
