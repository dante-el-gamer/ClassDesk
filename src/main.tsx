import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import iconUrl from "../assets/icon.png";

// Set favicon from assets
const link: HTMLLinkElement =
  document.querySelector("link[rel~='icon']") ?? document.createElement("link");
link.type = "image/png";
link.rel = "icon";
link.href = iconUrl;
if (!document.querySelector("link[rel~='icon']")) {
  document.head.appendChild(link);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
