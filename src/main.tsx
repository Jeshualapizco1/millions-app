import { createRoot } from "react-dom/client";

// Placeholder mientras se migran los módulos; <Root/> llega en el paso 6.
createRoot(document.getElementById("root")!).render(<div />);

if ("serviceWorker" in navigator)
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
