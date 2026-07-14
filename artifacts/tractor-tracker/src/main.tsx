import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Fade out and remove the HTML splash screen once React has rendered
const splash = document.getElementById("app-splash");
if (splash) {
  splash.classList.add("fade-out");
  setTimeout(() => splash.remove(), 400);
}
