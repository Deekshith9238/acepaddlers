import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const cartographer = (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined)
  ? await import("@replit/vite-plugin-cartographer").then((m) =>
      m.cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      }),
    )
  : null;

const devBanner = (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined)
  ? await import("@replit/vite-plugin-dev-banner").then((m) =>
      m.devBanner(),
    )
  : null;

/**
 * Strip `@import` of a remote stylesheet from any CSS we bundle.
 *
 * Vite leaves an absolute-URL `@import` alone and hoists it to the top of the
 * output, so it becomes a request to someone else's server on page load —
 * `@measured/puck` ships one for `https://rsms.me/inter/inter.css`. That is a
 * third party watching our admins load a page, a render-blocking dependency on
 * a host we do not control, and (for Puck's iframe, which waits for styles to
 * settle) a canvas that spins forever whenever that host is slow or blocked.
 *
 * Handled here rather than by copying the vendored CSS, so an upgrade or a new
 * dependency cannot quietly reintroduce one. The build logs whatever it drops.
 */
const stripRemoteCssImports = () => {
  const REMOTE_IMPORT = /@import\s+(?:url\(\s*)?["']https?:\/\/[^"']+["']\s*\)?[^;]*;/g;
  return {
    name: "strip-remote-css-imports",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!/\.css(\?|$)/.test(id)) return null;
      const found = code.match(REMOTE_IMPORT);
      if (!found) return null;
      for (const hit of found) {
        // Loud on purpose: silently dropping a stylesheet a dependency asked
        // for would be its own kind of bug.
        console.warn(`[strip-remote-css-imports] ${id}: removed ${hit.trim()}`);
      }
      return { code: code.replace(REMOTE_IMPORT, ""), map: null };
    },
  };
};

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build";
  const rawPort = process.env.PORT;

  if (!rawPort && !isBuild) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = rawPort ? Number(rawPort) : 18764;

  if (rawPort && (Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH;

  if (!basePath && !isBuild) {
    throw new Error(
      "BASE_PATH environment variable is required but was not provided.",
    );
  }

  const finalBasePath = basePath || "/";

  return {
    base: finalBasePath,
    // Some deps (react-grid-layout → react-draggable) reference
    // process.env.NODE_ENV at runtime; the browser has no `process`.
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      stripRemoteCssImports(),
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(cartographer ? [cartographer] : []),
      ...(devBanner ? [devBanner] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: process.env.REPL_ID
        ? undefined
        : {
            "/api": {
              target: "http://localhost:8080",
              changeOrigin: true,
            },
            "/media": {
              target: "http://localhost:8080",
              changeOrigin: true,
            },
          },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
