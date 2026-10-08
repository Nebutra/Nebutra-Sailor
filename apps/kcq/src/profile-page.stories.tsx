import { ProfilePage } from "./profile-page";

export default { title: "Products/KCQ/Profile", component: ProfilePage };
const context = {
  user: { id: "story-user", name: "Alex", email: "alex@example.test", image: null },
  activeWorkspaceId: null,
  workspaces: [],
};
const auth = {
  getContext: async () => context,
  selectWorkspace: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
};
export const SignedIn = { args: { context, auth } };
export const SignedOut = { args: { context: null, auth } };
export const SaveRejected = {
  args: {
    context,
    auth: {
      ...auth,
      updateProfile: async () => {
        throw new Error("保存失败，请重试。");
      },
    },
  },
};
