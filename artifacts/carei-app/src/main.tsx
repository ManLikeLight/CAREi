import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import CloseToHomePortal from "./components/CloseToHomePortal";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const path = window.location.pathname.replace(/\/$/, "");
const trustedPortal = [`${base}/close-to-home`, `${base}/family`].includes(path);
if (path === `${base}/family`) {
  window.history.replaceState(null, "", `${base}/close-to-home${window.location.search}${window.location.hash}`);
}
createRoot(document.getElementById("root")!).render(trustedPortal ? <CloseToHomePortal /> : <App />);
