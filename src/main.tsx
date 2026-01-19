import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import 'leaflet/dist/leaflet.css';
import './i18n/config'; // Initialize i18next

// Track chunk load failures per module - allows retry before forcing reload
const chunkRetryCount = new Map<string, number>();
const MAX_CHUNK_RETRIES = 2;
const RELOAD_KEY = 'chunk-reload-attempted';

// Helper to check if error is a chunk loading error
const isChunkLoadError = (message?: string): boolean => {
  if (!message) return false;
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  );
};

// Helper to extract module identifier from error message
const extractModuleId = (message?: string): string => {
  if (!message) return 'unknown';
  const match = message.match(/(?:module|chunk)['":\s]+([^\s'"]+)/i);
  return match?.[1] || 'unknown';
};

// Handle chunk loading errors with retry mechanism
// Only reload after MAX_CHUNK_RETRIES failed attempts (happens after deployments)
window.addEventListener('error', (event) => {
  if (!isChunkLoadError(event.message)) return;

  const moduleId = extractModuleId(event.message);
  const retries = chunkRetryCount.get(moduleId) || 0;

  if (retries < MAX_CHUNK_RETRIES) {
    chunkRetryCount.set(moduleId, retries + 1);
    console.warn(`[ChunkLoader] Transient error for ${moduleId}, attempt ${retries + 1}/${MAX_CHUNK_RETRIES}`);
    // Don't reload - let React's Suspense/lazy handle retry on next navigation
    return;
  }

  // Only reload after max retries AND only once per session
  if (!sessionStorage.getItem(RELOAD_KEY)) {
    console.error(`[ChunkLoader] Max retries exceeded for ${moduleId}, reloading page`);
    sessionStorage.setItem(RELOAD_KEY, 'true');
    window.location.reload();
  }
});

// Handle unhandled promise rejections for dynamic imports with same retry logic
window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event.reason?.message)) return;

  const moduleId = extractModuleId(event.reason?.message);
  const retries = chunkRetryCount.get(moduleId) || 0;

  if (retries < MAX_CHUNK_RETRIES) {
    chunkRetryCount.set(moduleId, retries + 1);
    console.warn(`[ChunkLoader] Transient rejection for ${moduleId}, attempt ${retries + 1}/${MAX_CHUNK_RETRIES}`);
    event.preventDefault(); // Prevent console error spam
    return;
  }

  if (!sessionStorage.getItem(RELOAD_KEY)) {
    console.error(`[ChunkLoader] Max retries exceeded for ${moduleId}, reloading page`);
    sessionStorage.setItem(RELOAD_KEY, 'true');
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
