import { Check, Cpu, LockClosed, Sparkles } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import type * as React from "react";
import {
  AvatarWithIcon,
  BitbucketAvatar,
  DiceBearAvatar,
  type DiceBearStyle,
  GitHubAvatar,
  GitLabAvatar,
} from "./avatar-extended";

/**
 * The five provider/decorated avatars in `avatar-extended.tsx`. `avatar.stories.tsx`
 * already renders `GitHubAvatar`, `GitLabAvatar`, `BitbucketAvatar` and
 * `AvatarWithIcon` in passing; none of them had a story that pinned the state
 * that actually breaks, and `DiceBearAvatar` had no coverage at all.
 *
 * Every one of these five resolves its image from a **remote host** —
 * github.com, gitlab.com, bitbucket.org, api.dicebear.com. That makes the
 * failure path the normal path, not the edge case: offline, a deleted account, a
 * rate-limited CDN, or a Storybook running behind a network sandbox all land on
 * `AvatarFallback` initials. `FallbackWhenImageFails` asserts the fallback is
 * reachable rather than trusting the image to load, and every showcase below
 * deliberately includes a broken handle next to a real one so the two renderings
 * are visible side by side.
 */

const meta = {
  title: "Primitives/AvatarExtended",
  component: DiceBearAvatar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Provider-badged and generated avatars built on Avatar. Images come from remote hosts, so treat the initials fallback as a first-class state, not an error case.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DiceBearAvatar>;

export default meta;
type Story = StoryObj<typeof DiceBearAvatar>;

/* ------------------------------------------------------------------ *
 * Layout helpers
 * ------------------------------------------------------------------ */

function Row({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {note ? <p className="max-w-md text-xs text-muted-foreground/80">{note}</p> : null}
      <div className="flex flex-wrap items-end gap-6 py-1">{children}</div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 text-center">
      {children}
      <span className="w-full truncate text-[11px] text-muted-foreground" title={label}>
        {label}
      </span>
    </div>
  );
}

/** A handle that cannot resolve, so the fallback path renders deterministically. */
const BROKEN = "this-account-does-not-exist-000";
/** Single word with no separator — `getAvatarInitials` takes the first two chars. */
const LONG_HANDLE = "averyverylongsingletokenhandle";

const PRESET_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const DICEBEAR_STYLES: ReadonlyArray<DiceBearStyle> = [
  "bottts-neutral",
  "identicon",
  "lorelei",
  "notionists-neutral",
  "open-peeps",
  "pixel-art",
  "shapes",
  "thumbs",
  "fun-emoji",
  "micah",
  "rings",
  "glass",
];

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <Cell label="GitHub">
        <GitHubAvatar username="rauchg" size="lg" />
      </Cell>
      <Cell label="GitLab">
        <GitLabAvatar username="gitlab-org" size="lg" />
      </Cell>
      <Cell label="Bitbucket">
        <BitbucketAvatar username="atlassian" size="lg" />
      </Cell>
      <Cell label="With icon">
        <AvatarWithIcon alt="Ada Lovelace" icon={<Check />} size="lg" />
      </Cell>
      <Cell label="DiceBear">
        <DiceBearAvatar seed="seed-alpha" size="lg" />
      </Cell>
    </div>
  ),
};

/**
 * All five components, the full size ramp, both image outcomes, and the overflow
 * case. The provider badge is absolutely positioned against the avatar box, so
 * the size ramp is the row that shows whether the badge still sits on the edge at
 * `xs` and `xl`.
 */
export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-8">
      <Row
        title="Provider avatars — resolved vs unresolvable"
        note="Right-hand cell in each pair uses a handle that cannot resolve; it must render initials inside the same bordered box, badge intact."
      >
        <Cell label="rauchg">
          <GitHubAvatar username="rauchg" size="lg" />
        </Cell>
        <Cell label={BROKEN}>
          <GitHubAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="gitlab-org">
          <GitLabAvatar username="gitlab-org" size="lg" />
        </Cell>
        <Cell label={BROKEN}>
          <GitLabAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="atlassian">
          <BitbucketAvatar username="atlassian" size="lg" />
        </Cell>
        <Cell label={BROKEN}>
          <BitbucketAvatar username={BROKEN} size="lg" />
        </Cell>
      </Row>

      <Row
        title="Size ramp — badge anchoring at every preset"
        note="Badge offsets are hardcoded per size in AvatarWithIcon and fixed at -bottom-[5px]/-left-[3px] for the three provider avatars."
      >
        {PRESET_SIZES.map((size) => (
          <Cell key={size} label={size}>
            <GitHubAvatar username="rauchg" size={size} />
          </Cell>
        ))}
        <Cell label="64px">
          <GitHubAvatar username="rauchg" size={64} />
        </Cell>
      </Row>

      <Row
        title="AvatarWithIcon — icon background variants"
        note="iconBackground accepts true (bg-background), false (transparent), or a class string. The badge is aria-hidden, so the accessible name comes from alt alone."
      >
        <Cell label="true">
          <AvatarWithIcon alt="Ada Lovelace" icon={<Check />} size="lg" />
        </Cell>
        <Cell label="false">
          <AvatarWithIcon alt="Grace Hopper" icon={<Sparkles />} iconBackground={false} size="lg" />
        </Cell>
        <Cell label="bg-primary">
          <AvatarWithIcon
            alt="Alan Turing"
            icon={<LockClosed className="text-primary-foreground" />}
            iconBackground="bg-primary"
            size="lg"
          />
        </Cell>
        <Cell label="with src">
          <AvatarWithIcon
            alt="Katherine Johnson"
            src="https://github.com/rauchg.png?size=96"
            icon={<Cpu />}
            size="lg"
          />
        </Cell>
        <Cell label="numeric 72px">
          <AvatarWithIcon alt="Ada Lovelace" icon={<Check />} size={72} />
        </Cell>
      </Row>

      <Row
        title="DiceBearAvatar — deterministic from seed"
        note="Same seed always yields the same face. Style union has 22 members; twelve shown."
      >
        {DICEBEAR_STYLES.map((avatarStyle) => (
          <Cell key={avatarStyle} label={avatarStyle}>
            <DiceBearAvatar seed="seed-alpha" avatarStyle={avatarStyle} size="lg" />
          </Cell>
        ))}
      </Row>

      <Row
        title="Overflow — long and empty labels"
        note="getAvatarInitials takes the first two characters of a single unseparated token, and returns an empty string for an empty name — an unlabelled circle, which is why alt/title should never be blank."
      >
        <Cell label={LONG_HANDLE}>
          <GitHubAvatar username={LONG_HANDLE} size="lg" />
        </Cell>
        <Cell label="ada.lovelace">
          <DiceBearAvatar seed="ada.lovelace" avatarStyle="identicon" size="lg" />
        </Cell>
        <Cell label="empty alt">
          <AvatarWithIcon alt="" icon={<Check />} size="lg" />
        </Cell>
      </Row>
    </div>
  ),
};

/** The generated-avatar surface on its own: seed stability and the style union. */
export const DiceBearStyles: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-8">
      <Row title="One seed, twelve styles">
        {DICEBEAR_STYLES.map((avatarStyle) => (
          <Cell key={avatarStyle} label={avatarStyle}>
            <DiceBearAvatar seed="seed-alpha" avatarStyle={avatarStyle} size="lg" />
          </Cell>
        ))}
      </Row>
      <Row
        title="Twelve seeds, one style — the real product case"
        note="Placeholder identities for users with no uploaded picture. Distinctness across seeds is the property that matters."
      >
        {["ada", "grace", "alan", "katherine", "linus", "barbara", "edsger", "donald"].map(
          (seed) => (
            <Cell key={seed} label={seed}>
              <DiceBearAvatar seed={seed} size="lg" />
            </Cell>
          ),
        )}
      </Row>
      <Row
        title="options passthrough"
        note="Arbitrary DiceBear query params, forwarded as strings."
      >
        <Cell label="default">
          <DiceBearAvatar seed="ada" avatarStyle="shapes" size="lg" />
        </Cell>
        <Cell label="backgroundColor">
          <DiceBearAvatar
            seed="ada"
            avatarStyle="shapes"
            options={{ backgroundColor: "b6e3f4" }}
            size="lg"
          />
        </Cell>
        <Cell label="radius=50">
          <DiceBearAvatar seed="ada" avatarStyle="shapes" options={{ radius: 50 }} size="lg" />
        </Cell>
      </Row>
    </div>
  ),
};

/**
 * The state a happy-path story hides. Asserted rather than shown, because
 * whether the *image* loads depends on the network and whether the *fallback* is
 * correct does not: the accessible name must survive either way, and the badge
 * must not disappear with the image.
 */
export const FallbackWhenImageFails: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-8">
      <Row
        title="Unresolvable handles"
        note="Base UI's AvatarImage unmounts on error and AvatarFallback takes over. Initials come from the handle, so the row stays identifiable with no network at all."
      >
        <Cell label="GitHub">
          <GitHubAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="GitLab">
          <GitLabAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="Bitbucket">
          <BitbucketAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="DiceBear">
          <DiceBearAvatar seed={BROKEN} avatarStyle="bottts-neutral" size="lg" />
        </Cell>
      </Row>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initials are computed from the handle, not from anything the remote host
    // returns, so this holds offline as well as on a 404. "this-account-does-…"
    // splits on `-` → T + A. Base UI keeps AvatarFallback mounted until an image
    // actually loads, so all four cells must show it.
    //
    // Deliberately NOT asserting the <img> element: it unmounts on error, so a
    // query for it would pass only on a machine where the request *succeeded*,
    // which is the opposite of what this story is for.
    await waitFor(() => expect(canvas.getAllByText("TA")).toHaveLength(4));
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" }, layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-end gap-4">
      {PRESET_SIZES.map((size) => (
        <GitHubAvatar key={size} username="rauchg" size={size} />
      ))}
      <DiceBearAvatar seed="seed-alpha" size="lg" />
      <AvatarWithIcon alt="Ada Lovelace" icon={<Check />} size="lg" />
    </div>
  ),
};

/**
 * The provider badges sit on `bg-background` / `bg-primary` with a
 * `border-background` ring, so dark mode is where a badge can vanish into the
 * avatar or into the page.
 */
export const DarkMode: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="dark flex flex-col gap-8 rounded-[var(--radius-md)] bg-background p-8 text-foreground">
      <Row title="Provider badges on a dark surface">
        <Cell label="GitHub">
          <GitHubAvatar username="rauchg" size="lg" />
        </Cell>
        <Cell label="GitLab">
          <GitLabAvatar username="gitlab-org" size="lg" />
        </Cell>
        <Cell label="Bitbucket">
          <BitbucketAvatar username="atlassian" size="lg" />
        </Cell>
        <Cell label="With icon">
          <AvatarWithIcon alt="Ada Lovelace" icon={<Check />} size="lg" />
        </Cell>
      </Row>
      <Row title="Fallback initials on a dark surface">
        <Cell label="GitHub">
          <GitHubAvatar username={BROKEN} size="lg" />
        </Cell>
        <Cell label="DiceBear">
          <DiceBearAvatar seed="seed-alpha" size="lg" />
        </Cell>
      </Row>
    </div>
  ),
};
