import { createRoot } from "react-dom/client";
import Root from "./Root";

createRoot(document.getElementById("root")!).render(<Root />);

if ("serviceWorker" in navigator)
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
