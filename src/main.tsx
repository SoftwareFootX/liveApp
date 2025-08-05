import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./presentation/styles/index.css";
import { App } from "./presentation/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/liveApp">
      <App />
    </BrowserRouter>
  </StrictMode>
);
