/** Review product navigation independently from chart and network. */
import { WorkbenchHeader } from "./workbench-header";
export default { title: "Products/KCQ/Header", component: WorkbenchHeader };
export const Visitor = {
  args: {
    context: null,
    busy: false,
    signInUrl: "https://auth.nebutra.com/sign-in",
    onSwitch: async () => {},
    onSignOut: async () => {},
  },
};

export const PersonalWorkspace = {
  args: {
    ...Visitor.args,
    context: {
      user: { id: "story-user", name: "Alex", email: "alex@example.test", image: null },
      activeWorkspaceId: null,
      workspaces: [],
    },
  },
};
export const TeamWorkspace = {
  args: {
    ...PersonalWorkspace.args,
    context: {
      ...PersonalWorkspace.args.context,
      activeWorkspaceId: "story-team",
      workspaces: [
        { id: "story-team", name: "Research and trading workspace", slug: "research", image: null },
      ],
    },
  },
};
export const Switching = { args: { ...TeamWorkspace.args, busy: true } };
