import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import CloseToHomePortal from "./components/CloseToHomePortal";

createRoot(document.getElementById("root")!).render(window.location.pathname.replace(/\/$/,"") === "/close-to-home" ? <CloseToHomePortal /> : <App />);
