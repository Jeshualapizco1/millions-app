import { createRoot } from "react-dom/client";
import Root from "./Root";
import { installErrorHandlers } from "./lib/errorLog";
import { arrancarNativo, esNativo } from "./lib/native";

installErrorHandlers();

createRoot(document.getElementById("root")!).render(<Root />);
void arrancarNativo();

// El service worker es para la PWA: en nativo los archivos ya son locales y
// una caché encima solo serviría para servir una versión vieja tras actualizar.
if (!esNativo() && "serviceWorker" in navigator)
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
