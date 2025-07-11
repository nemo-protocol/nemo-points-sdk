import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "NemoContractSDK",
      fileName: (format) => `nemo-contract-sdk.${format}.js`,
    },
    rollupOptions: {
      external: ["@cetusprotocol/vaults-sdk", "@mysten/sui", "decimal.js"],
      output: {
        globals: {
          "@cetusprotocol/vaults-sdk": "CetusVaultsSDK",
          "@mysten/sui": "Sui",
          "decimal.js": "Decimal",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [dts()],
});
