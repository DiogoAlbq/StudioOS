# Portfolio & Commission Manager - Tauri Migration Guide

## 🎯 Context for LLMs
This repository contains a functional prototype of a **Portfolio & Commission Management System**, originally generated in Google AI Studio. The current stack is React + Vite + Tailwind CSS + Zustand.

Your primary objective is to **convert this web prototype into a production-ready desktop application using Tauri (v2)**. 

The UI, state structure, and styling are already fully built and should be preserved. However, the current app relies on browser APIs (`localStorage`, `URL.createObjectURL`, fake downloads) to simulate a backend. These need to be replaced with native Tauri Rust APIs.

---

## 🧹 Step 1: Cleanup "AI Studio Garbage"
Before starting the migration, remove the artifacts left by the AI Studio environment:
1. **Remove `metadata.json`** - This is an AI Studio specific file.
2. **Remove `server.ts` / Express backend** (if present) - In Tauri, all backend logic should be handled by the Rust core (`src-tauri`), not a Node.js server.
3. **Remove any `DISABLE_HMR` environment variables** - HMR works perfectly in standard Tauri + Vite development.
4. **Clean up `package.json`** - Remove any custom `start` scripts meant for containerized Node.js environments. Keep standard Vite scripts (`dev`, `build`, `preview`).

---

## 🏗️ Step 2: Tauri Setup
1. Initialize Tauri in the project root: `npx @tauri-apps/cli init`
2. Configure `tauri.conf.json` to point to the Vite build output (`dist`).
3. Install necessary Tauri plugins (e.g., `fs`, `dialog`, `shell`, `store` or `sql`).

---

## 🔄 Step 3: Architecture Migration (Crucial)

### 1. State Persistence (Zustand -> Tauri Store / SQLite)
Currently, `usePortfolioStore.ts` and `App.tsx` use `localStorage` to save the application state (`artItems`, `queueItems`, etc.).
- **Task:** Refactor the persistence layer. Either use `tauri-plugin-store` (for JSON-based persistence) or `tauri-plugin-sql` (for SQLite). 
- Ensure that state changes in Zustand trigger writes to the native disk rather than browser local storage.

### 2. File System Operations & Native Dialogs
The app currently fakes exports and backups using browser downloads and `Blob` objects (e.g., in `FinanceView.tsx` and `SettingsView.tsx`). It also relies on browser `window.confirm` for delete confirmations.
- **Task:** Replace these with `@tauri-apps/plugin-dialog` (`save`, `confirm`, `ask`) and `@tauri-apps/plugin-fs` (`writeTextFile`).
- Instead of triggering a browser download, open a native save dialog and write the `.json` or `.csv` file directly to the user's file system.
- Replace `window.confirm("Deletar item XYZ?")` with Tauri's native `ask` or `confirm` dialogs.

### 3. Image & Asset Handling
In `GalleryManager.tsx`, images are currently loaded via URLs. 
- **Task:** If the app is intended to manage local files, use the Tauri `fs` and `dialog` APIs to let users pick local image files. Convert those paths using `convertFileSrc` to render them securely in the WebView.

---

## 📁 Project Structure Overview (Keep these)
- `/src/views/DashboardView.tsx` - Main overview.
- `/src/views/GalleryManager.tsx` - Manages different categories of portfolio items (art, video, nsfw, etc.). Supports bulk deletion and categorization with native window confirmations.
- `/src/views/QueueView.tsx` - A Kanban/List style commission queue tracker. Supports bulk selection, status updates, and deletions with confirmations.
- `/src/views/FinanceView.tsx` - Calculates potential revenue and tracks exchange rates.
- `/src/views/SettingsView.tsx` - App configuration and backup triggers.
- `/src/store/usePortfolioStore.ts` - Central Zustand store (Needs persistence refactor).
- `/src/types/index.ts` - TypeScript interfaces (Do not alter the data models unless necessary for SQLite).

## 🚀 Final Goal
A lightweight, fast Rust/Tauri executable that manages local JSON state or a local SQLite database, functioning entirely offline without browser limitations. Maintain the dark, cyber/hacker aesthetic using the existing Tailwind classes.
