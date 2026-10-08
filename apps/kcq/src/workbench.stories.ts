/** Vue workbench story for the product chrome, separate from library demos. */

import { createAuthCenterBrowserClient } from "@nebutra/auth/browser";
import Workbench from "./workbench.vue";
export default { title: "Products/KCQ/Workbench", component: Workbench };
export const Visitor = {
  args: {
    context: null,
    auth: createAuthCenterBrowserClient("https://auth.nebutra.com"),
    scope: "story/visitor",
  },
};
