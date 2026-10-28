"use client";

import { Copy, GitBranch, Sparkles } from "@nebutra/icons";
import { SplitButton, type SplitButtonSize } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";
import type { DemoProps } from "../derived";

const SIZES = ["tiny", "small", "medium", "large"] as const satisfies SplitButtonSize[];

function DeployItems({ onChoose }: { onChoose?: (title: string) => void }) {
  const choose = (title: string) => ({ onClick: () => onChoose?.(title) });
  return (
    <>
      <SplitButton.MenuItem
        description="Build this branch without promoting it"
        icon={<GitBranch />}
        menuItemProps={choose("Deploy to preview")}
        title="Deploy to preview"
      />
      <SplitButton.MenuItem
        description="Replace production once checks pass"
        icon={<Sparkles />}
        menuItemProps={choose("Deploy and promote")}
        title="Deploy and promote"
      />
      <SplitButton.MenuItem
        description="Start from this deployment's settings"
        icon={<Copy />}
        menuItemProps={choose("Duplicate deployment")}
        title="Duplicate deployment"
      />
    </>
  );
}

export default function SplitButtonDemo(_: DemoProps) {
  const [chosen, setChosen] = React.useState("Nothing chosen yet.");

  return (
    <DemoPage>
      <State
        breaks="A menu whose items do not update the page, or a primary action that fires when the chevron is pressed. The two halves are separate buttons with separate handlers."
        code={`<SplitButton
  buttonProps={{ onClick: deploy }}
  menuButtonLabel="More deploy options"
  menuItems={
    <>
      <SplitButton.MenuItem
        title="Deploy to preview"
        description="Build this branch without promoting it"
        menuItemProps={{ onClick: preview }}
      />
    </>
  }
>
  Deploy
</SplitButton>`}
        id="default"
        note="Click Deploy for the primary action, the chevron for the menu. The line under the button echoes whichever you used."
        title="Default"
      >
        <Stack>
          <div>
            <SplitButton
              buttonProps={{ onClick: () => setChosen("Primary action: Deploy.") }}
              menuButtonLabel="More deploy options"
              menuItems={<DeployItems onChoose={(title) => setChosen(`Menu: ${title}.`)} />}
            >
              Deploy
            </SplitButton>
          </div>
          <p aria-live="polite" className="m-0 text-muted-foreground text-sm">
            {chosen}
          </p>
        </Stack>
      </State>

      <State
        breaks="A secondary type that loses the seam between the halves, or that borrows the default type's divider colour."
        id="types"
        note="type is limited to default and secondary on purpose: there is no destructive split button."
        title="Types"
      >
        <Row>
          {(["default", "secondary"] as const).map((type) => (
            <SplitButton
              buttonProps={{ type }}
              key={type}
              menuButtonLabel={`More options, ${type}`}
              menuItems={<DeployItems />}
            >
              {type}
            </SplitButton>
          ))}
        </Row>
      </State>

      <State
        breaks="A size where the chevron half is taller, wider or narrower than the ramp: its width comes from the same height token as the primary button."
        id="sizes"
        note="tiny, small, medium (default) and large. The component also accepts the Button names sm, default and lg."
        title="Sizes"
      >
        <Row align="end">
          {SIZES.map((size) => (
            <SplitButton
              buttonProps={{ size }}
              key={size}
              menuButtonLabel={`More options, ${size}`}
              menuItems={<DeployItems />}
            >
              {size}
            </SplitButton>
          ))}
        </Row>
      </State>

      <State
        breaks="A menu that opens off-screen or on the wrong edge of the chevron. menuAlignment picks which edge of the control the menu lines up with; collisions may still flip it."
        id="alignment"
        note="bottom-start lines the menu up with the left edge of the pair, bottom-end with the right edge. The buttons sit at the far right so the end alignment has room."
        title="Menu alignment"
      >
        <div className="flex justify-end gap-4">
          {(["bottom-start", "bottom-end"] as const).map((menuAlignment) => (
            <SplitButton
              key={menuAlignment}
              menuAlignment={menuAlignment}
              menuButtonLabel={`More options, ${menuAlignment}`}
              menuItems={<DeployItems />}
            >
              {menuAlignment}
            </SplitButton>
          ))}
        </div>
      </State>

      <State
        breaks="A prefix icon that is announced twice, or that shifts the label off-centre. The prefix is decoration and only appears on the primary half."
        id="prefix"
        note="buttonProps.prefix is hidden from assistive technology."
        title="With prefix"
      >
        <Row>
          <SplitButton
            buttonProps={{ prefix: <Sparkles /> }}
            menuButtonLabel="More options"
            menuItems={<DeployItems />}
          >
            Deploy
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="A pending primary action that leaves the chevron clickable, so the menu opens mid-request."
        code={`<SplitButton buttonProps={{ loading: true }} … />`}
        id="loading"
        note="loading on the primary button disables both halves. The spinner appears after a short delay, so a fast action never flashes one."
        title="Loading"
      >
        <Row>
          <SplitButton
            buttonProps={{ loading: true }}
            menuButtonLabel="More options"
            menuItems={<DeployItems />}
          >
            Deploying
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="Only half of the pair going inactive. disabled on the root, or on buttonProps, disables both."
        id="disabled"
        note="Left: disabled on the root. Right: disabled on buttonProps. Both lock the chevron too."
        title="Disabled"
      >
        <Row>
          <SplitButton disabled menuButtonLabel="More options" menuItems={<DeployItems />}>
            Deploy
          </SplitButton>
          <SplitButton
            buttonProps={{ disabled: true }}
            menuButtonLabel="More options"
            menuItems={<DeployItems />}
          >
            Deploy
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="A disabled menu item that still runs its handler, or that looks identical to an enabled one."
        code={`<SplitButton.MenuItem title="Promote" menuItemProps={{ disabled: true }} />`}
        id="disabled-item"
        note="Open the menu: the second entry is disabled through menuItemProps and cannot be chosen."
        title="Disabled menu item"
      >
        <Row>
          <SplitButton
            menuButtonLabel="More options"
            menuItems={
              <>
                <SplitButton.MenuItem description="Build without promoting" title="Preview" />
                <SplitButton.MenuItem
                  description="Blocked until checks pass"
                  menuItemProps={{ disabled: true }}
                  title="Promote"
                />
                <SplitButton.MenuItem description="Rebuild from scratch" title="Rebuild" />
              </>
            }
          >
            Deploy
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="A long title that wraps and pushes the description off, or a long description that makes the menu grow without bound. The title truncates to one line and the description clamps to two."
        id="overflow"
        note="The menu is 264px wide by default. Titles ellipsise; descriptions are cut after two lines."
        title="Overflow — long title and description"
      >
        <Row>
          <SplitButton
            menuButtonLabel="More options"
            menuItems={
              <SplitButton.MenuItem
                description={`${LONG_LABEL}. The remaining detail will not fit in a menu this narrow, so it is clamped.`}
                icon={<GitBranch />}
                title={LONG_LABEL}
              />
            }
          >
            Deploy
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="A primary label long enough to make the pair wider than its container."
        id="long-label"
        note="The pair is inline-flex and does not truncate its label. Give it a short verb and let the menu carry the detail."
        title="Overflow — long primary label"
      >
        <div className="max-w-xs overflow-x-auto">
          <SplitButton menuButtonLabel="More options" menuItems={<DeployItems />}>
            {LONG_LABEL}
          </SplitButton>
        </div>
      </State>

      <State
        breaks="A custom menu width that is ignored, or one narrower than the 192px minimum."
        code={`<SplitButton menuProps={{ width: 360 }} … />`}
        id="menu-width"
        note="menuProps.width sets the panel width in px (or any CSS length). The default is 264."
        title="Menu width"
      >
        <Row>
          <SplitButton
            menuButtonLabel="More options, wide"
            menuItems={<DeployItems />}
            menuProps={{ width: 360 }}
          >
            Wide menu
          </SplitButton>
          <SplitButton
            menuButtonLabel="More options, narrow"
            menuItems={<DeployItems />}
            menuProps={{ width: 200 }}
          >
            Narrow menu
          </SplitButton>
        </Row>
      </State>

      <State
        breaks="A pair in a right-to-left page whose rounding and divider stay on the physical left and right, so the outer corners are squared and the seam corners rounded."
        id="rtl"
        note="Inside dir=rtl the halves swap sides and the seam follows: the primary half squares its end corners (rounded-e-none), the chevron squares its start corners (rounded-s-none) and draws the divider on its start edge (border-s). Where the menu panel opens is decided by the dropdown menu, not by this component."
        title="Right-to-left"
      >
        <div className="flex justify-start" dir="rtl">
          <SplitButton menuButtonLabel="More options" menuItems={<DeployItems />}>
            Deploy
          </SplitButton>
        </div>
      </State>

      <State
        breaks="A menu that cannot be reached or operated from the keyboard, or that loses focus when it closes."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "moves from the primary button to the chevron, then on." },
            { keys: "Enter / Space", does: "on the primary button, runs the action." },
            { keys: "Enter / Space", does: "on the chevron, opens the menu." },
            { keys: "↑ / ↓", does: "move between menu items; type a letter to jump." },
            { keys: "Enter", does: "chooses the highlighted item." },
            { keys: "Escape", does: "closes the menu." },
          ]}
        >
          <Row>
            <SplitButton menuButtonLabel="More deploy options" menuItems={<DeployItems />}>
              Deploy
            </SplitButton>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="When to use a split button">
        <p>
          Use it when one action is clearly the default and a few close variants sit behind it.
          Mirror the visible action as the first menu item so the menu is a complete list. For
          unrelated actions use a <code>DropdownMenu</code> on an ordinary button.
        </p>
      </Aside>
    </DemoPage>
  );
}
