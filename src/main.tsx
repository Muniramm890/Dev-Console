// Dev-Console entry. The whole Admin app lives unchanged under src/ (modules, layout, contexts ...);
// src/dev/* is the new developer layer (platform login, school list/controls, "open school", switch).
import ReactDOM from "react-dom/client";
import { injectStyles } from "./theme/theme";
import { DevApp } from "./dev/DevApp";
import "./dev/dev.css";

injectStyles();
ReactDOM.createRoot(document.getElementById("root")!).render(<DevApp />);
