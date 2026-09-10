# flowith.home — /blank

**Role.** Logged-in landing = the *new-flow composer*. "New Flow" in the sidebar just returns here; a flow only comes into existence when the composer is submitted (O — Send navigated to `/conv/<uuid>` and the flow appeared in History with a title derived from the prompt).

**Composer modes (O).** Six chips — Chat · Image · Video · Slides · Website · Neo Agent — re-skin one composer in place (no URL change). Each mode owns its own model default and controls:
- Chat → `Chat · GPT 4.1`, attach accepts text/code files, batch `1 x`.
- Image → `Image · Seedream 5.0 Pro`, Style + (style image), ratio `1:1`, size `1K`, **Agent off** toggle, **Unlimited Mode** (locked on Free), attach accepts images.
- Video → Start frame / swap / End frame / Loop keyframe row.
- Neo Agent → `Auto · Neo Agent`, **MAX** toggle, placeholder "Describe a complex task for the Agent to handle...".
- The last-used mode and per-mode preferred model are remembered client-side (`userHabits:*:lastChatMode`, `preferredModelUnderChatMode:<mode>` in localStorage — O).

**Peripheral content (O).** "Apps" rail of packaged tools (Virtual Try-on, Social Post Maker, Background Remover, Photo Relighting, Image Upscaler, Editorial Poster, Crop & Resize, Wallpaper Generator, Furry Art Generator) and a category-filtered template gallery with a hover "Use" action.

**Account/credit chrome (O).** FREE plan, balance 0, "Get more credits", Notifications (route `/notifications`), persistent upsell banner; account popover with Upgrade / Settings / Help / Log Out.

**Not explored.** Projects semantics, template "Use" flow, Apps entries (each presumably opens a mode-specific composer — I1).

Evidence: `evidence/home.default.webp`, `home.mode-image.webp`, `home.mode-video.webp`, `home.mode-neo-agent.webp`, `home.account-menu.webp`, `home.create-project.webp`.
