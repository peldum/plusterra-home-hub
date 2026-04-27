import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { installSupabaseQueryLoopGuard } from "./lib/queryLoopGuard";
import "./index.css";

installSupabaseQueryLoopGuard();

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Notify the UI that an update is available
    window.dispatchEvent(new Event('pwa-update-available'));
    // Listen for user confirmation
    const doUpdate = () => {
      updateSW(true);
      window.removeEventListener('pwa-do-update', doUpdate);
    };
    window.addEventListener('pwa-do-update', doUpdate);
  },
  onRegisteredSW(_, registration) {
    if (!registration) return;
    // Check for updates every 5 minutes (was 60s — too aggressive, caused
    // the update banner to appear seconds after every refresh)
    setInterval(() => {
      registration.update();
    }, 300_000);
  },
});

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
// Reveal content with smooth fade after React hydrates
requestAnimationFrame(() => { root.style.opacity = '1'; });
