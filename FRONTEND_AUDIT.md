# Frontend Code Audit

**Date:** 2025-02-19
**Scope:** `frontend/` directory
**Auditor:** Jules

## 🛠️ Tech Stack & Dependencies

### Core Technologies
*   **Runtime/Build:** Vite 7.2.4, TypeScript ~5.9.3
*   **Framework:** React 19.2.0
*   **State Management:**
    *   **Client State:** Zustand 5.0.9
    *   **Server State:** React Query (TanStack Query) 5.90.11
    *   *Note:* Redux Toolkit is **not** installed, despite presence of file naming conventions like `apiSlice.ts`.
*   **Styling:** Tailwind CSS 3.4.17 + `tailwindcss-animate`, `tailwind-merge`, `clsx`.
*   **UI Components:** Radix UI Primitives (headless), Lucide React (icons), Sonner (toasts).
*   **Forms:** React Hook Form + Zod + @hookform/resolvers.
*   **Routing:** React Router DOM 7.9.6.

> **⚠️ Note on Versions:** The `package.json` specifies versions (React 19.2.0, Vite 7.2.4) that appear to be non-existent or future versions as of early 2025. This indicates the codebase is likely AI-generated with "hallucinated" version numbers. Care must be taken during actual installation to downgrade to stable releases (e.g., React 18.x or 19.0-beta, Vite 5.x/6.x).

### Dependency Issues
*   **Bloatware/Confusion:**
    *   `apiSlice.ts` exists but Redux Toolkit is missing. This suggests a copy-paste error or abandoned architecture.
    *   `axios` is installed and used alongside React Query. While valid, React Query's built-in fetchers or a lighter fetch wrapper could reduce bundle size.

## 🏗️ Architecture & Structure

### Folder Structure
The project follows a **Hybrid Feature/Type-based** structure:
```
src/
├── features/       # Domain-specific logic (auth, categories, transactions)
├── components/     # Shared UI components (ui/ for Shadcn, layout/)
├── pages/          # Route views
├── services/       # API integration
├── store/          # Global state (Zustand)
```

### Architectural Flaws
1.  **State Management Crisis:**
    *   **The Problem:** The application replicates server state in Client-side stores.
    *   **Evidence:** `useTransactionStore.ts` stores an array of `transactions` and provides methods like `addTransaction`. This defeats the purpose of React Query (which is installed). Data is likely being fetched, put into Zustand, and manually updated, leading to "stale-while-revalidate" issues being handled manually.
2.  **Legacy Logic Retention (Critical):** - NOTE FROM PAVOL - toto je v poradku ja som delal refaktor backendu a frontend este nebyl upraveny
    *   **The Problem:** The `features/categories` module is built entirely around "Category Versions" (`VersionList.tsx`, `levels_count`, `activeVersion`).
    *   **Context:** The backend architecture has shifted to an Adjacency List model (`parent` FK) and removed the `CategoryVersion` concept entirely. The frontend is currently built to interact with a non-existent API API for versions.
3.  **Leaky Abstractions:**
    *   `apiClient.ts` imports `useInspectArchivedStore`, coupling the networking layer directly to specific UI business logic (archived workspace inspection). This makes the API client hard to reuse or test in isolation.

## 🧹 Code Quality & DRY Principles

### "God Components" & Complexity
*   **`CategoryManager.tsx`:**
    *   Defines a component `FullscreenOverlay` *inside* the render function (causes remounts on every render).
    *   Mixes List View, Graph View, and Version Management in one file.
    *   Contains inline error handling UI.
*   **`TransactionManager.tsx`:**
    *   Uses manual `refreshTrigger` prop drilling to force updates in child components, bypassing React Query's cache invalidation mechanisms.

### Code Hygiene
*   **`apiSlice.ts`**: An empty file. Likely a remnant of a failed Redux attempt.
*   **`DashboardPage.tsx`**: Currently a skeleton/placeholder.
*   **Styling**: `components/ui/button.tsx` correctly uses `cva` and `cn` for Tailwind class merging. This is a positive pattern (Shadcn UI standard).

## 🚀 Performance & Security

### Performance
*   **Re-renders:** Defining components inside other components (as seen in `CategoryManager`) forces React to tear down and recreate the DOM subtree on every state change.
*   **Bundle Size:** No major issues, though proper code-splitting should be verified in `App.tsx` (lazy loading routes).

### Security
*   **Auth Token:** Stored in `useUserStore`. Standard practice, but ensure it's persisted securely.
*   **Interceptors:** `apiClient.ts` correctly handles 401 errors to trigger logout, preventing the app from getting stuck in an authenticated state with an invalid token.

## ⚠️ Refactoring Action Plan

### 🔴 High Priority (Critical)
1.  **Purge Category Versions:**
    *   Delete `VersionList.tsx`.
    *   Rewrite `useCategoryStore` and `CategoryManager` to fetch the Category Tree directly from the Adjacency List API, removing all `versionId` parameters.
2.  **Fix State Management Strategy:**
    *   Deprecate `useTransactionStore` and `useCategoryStore` for *data storage*.
    *   Move data fetching to React Query hooks (e.g., `useTransactions`, `useCategories`).
    *   Use Zustand *only* for UI state (e.g., `isSidebarOpen`, `activeModal`) or truly global user preferences.

### 🟡 Medium Priority (Maintenance)
3.  **Clean Networking Layer:**
    *   Delete `apiSlice.ts`.
    *   Decouple `apiClient.ts` from specific stores like `useInspectArchivedStore` if possible, or move that logic to a higher-level Service wrapper.
4.  **Refactor `CategoryManager`:**
    *   Move `FullscreenOverlay` to its own file.
    *   Split into `CategoryListView` and `CategoryGraphView`.

### 🟢 Low Priority (Polish)
5.  **Implement Dashboard:**
    *   Flesh out `DashboardPage.tsx` with real metrics.
6.  **Standardize Components:**
    *   Ensure all UI components in `components/ui` follow the Shadcn pattern.
