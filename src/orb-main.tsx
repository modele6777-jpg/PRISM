import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OrbGatewayPage from "./pages/OrbGatewayPage";
import { BigBangButton } from "./components/omniwarp/BigBangButton";
import { BigBangExpansionOverlay } from "./components/omniwarp/BigBangExpansionOverlay";
import "./index.css";
import { initPerfMode } from "./lib/perfMode";

// Initialize performance mode
initPerfMode();

// Prevent extension unhandled rejections
if (typeof window !== "undefined") {
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const msg = String(event?.reason?.message || event?.reason || "");
      if (/MetaMask|ethereum|web3|inpage/i.test(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <OrbGatewayPage />
      <BigBangButton />
      <BigBangExpansionOverlay />
    </StrictMode>
  );
}
