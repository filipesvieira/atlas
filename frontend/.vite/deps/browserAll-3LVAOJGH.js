import "./chunk-4JTVKSOP.js";
import {
  AccessibilitySystem,
  DOMPipe,
  EventSystem,
  FederatedContainer,
  accessibilityTarget
} from "./chunk-P7S75R22.js";
import "./chunk-UNB47MFI.js";
import {
  Container
} from "./chunk-PVEJ7NVB.js";
import "./chunk-HFIJIZWA.js";
import "./chunk-DBCUPMS3.js";
import "./chunk-VHK5EIIN.js";
import {
  extensions
} from "./chunk-YZKSUHOB.js";
import "./chunk-5WRI5ZAA.js";

// node_modules/pixi.js/lib/accessibility/init.mjs
extensions.add(AccessibilitySystem);
extensions.mixin(Container, accessibilityTarget);

// node_modules/pixi.js/lib/dom/init.mjs
extensions.add(DOMPipe);

// node_modules/pixi.js/lib/events/init.mjs
extensions.add(EventSystem);
extensions.mixin(Container, FederatedContainer);
//# sourceMappingURL=browserAll-3LVAOJGH.js.map
