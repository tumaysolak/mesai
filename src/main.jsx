import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./assets/fonts.css";
import "./styles.css";
import "./panel-dark.css";
import "./office.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
