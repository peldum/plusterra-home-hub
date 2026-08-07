import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installSupabaseQueryLoopGuard } from "./lib/queryLoopGuard";
import { installNetworkSensor } from "./lib/sensors/networkSensor";
import { installNavigationSensor } from "./lib/sensors/navigationSensor";
import "./index.css";

// Sensores de bucle: deben instalarse ANTES del guard de Supabase para que
// observen también esas requests. El orden importa: networkSensor envuelve
// fetch primero, luego queryLoopGuard envuelve sobre eso.
installNetworkSensor();
installNavigationSensor();
installSupabaseQueryLoopGuard();

const isRunningInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPlusPyHost = window.location.hostname === "pluspy.app" || window.location.hostname === "www.pluspy.app";

const removeServiceWorkersForNonPwaContexts = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
};

const setupPwaRegistration = async () => {
  if (!isPlusPyHost || isRunningInIframe) {
    void removeServiceWorkersForNonPwaContexts();
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  let updateRequested = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event("pwa-update-available"));
      const doUpdate = () => {
        if (updateRequested) return;
        updateRequested = true;
        window.removeEventListener("pwa-do-update", doUpdate);
        // updateSW(true) activa el worker nuevo y recarga una sola vez cuando
        // toma control. No agregar location.reload(): producía doble recarga.
        void updateSW(true);
      };
      window.addEventListener("pwa-do-update", doUpdate);
    },
    onRegisteredSW(_, registration) {
      if (!registration) return;
      // Una comprobación moderada evita ciclos de actualización en PWAs que
      // permanecen abiertas durante horas o vuelven del segundo plano.
      window.setInterval(() => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          void registration.update();
        }
      }, 30 * 60_000);
    },
  });
};

void setupPwaRegistration();

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
// Reveal content with smooth fade after React hydrates.
// The 200ms transition + RAF avoids the abrupt opacity flip that read as a flicker.
root.style.transition = 'opacity 200ms ease-out';
requestAnimationFrame(() => {
  requestAnimationFrame(() => { root.style.opacity = '1'; });
});
