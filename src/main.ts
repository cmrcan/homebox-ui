import "./style.css";
import { loadUI5 } from "./ui5/runtime";
import { start } from "./ui5/app";
loadUI5()
  .then(start)
  .catch((error) => {
    document.getElementById("app")!.textContent =
      `Arayüz başlatılamadı: ${error instanceof Error ? error.message : String(error)}`;
  });
