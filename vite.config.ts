import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

const plugins = [react(), tailwindcss()];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins,
    define: {
      'import.meta.env.VITE_ENABLE_AUTH': JSON.stringify(env.VITE_ENABLE_AUTH || 'false'),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist", "public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
