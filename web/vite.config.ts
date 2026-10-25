import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 프로젝트 사이트 경로: https://<user>.github.io/OEM_E2E_Platform/
export default defineConfig({
  plugins: [react()],
  base: "/OEM_E2E_Platform/"
});
