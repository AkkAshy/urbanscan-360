// A-Frame нужно импортировать ДО React — регистрирует кастомные HTML-элементы
import "aframe";
// Регистрируем свой billboard-компонент (в A-Frame нет встроенного look-at)
import "./utils/aframe-billboard";
// screen-facing: маркер всегда плоско к экрану (не встаёт боком, как look-at)
import "./utils/aframe-screen-facing";
// laser-reticle: точка-прицел на конце луча VR-контроллера
import "./utils/aframe-laser-reticle";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
