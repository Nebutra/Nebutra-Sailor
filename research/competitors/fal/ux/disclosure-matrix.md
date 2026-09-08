# fal — disclosure matrix (Playground, fal-ai/flux/schnell) — all O

| Control | Default | Behind | Widget |
|---|---|---|---|
| Prompt* | visible | — | textarea + (i) + '@ entities' hint |
| Num inference steps | hidden | More | slider 1–12 + number + reset |
| Image size | hidden | More | preset combobox + W×H inputs |
| Seed | hidden | More | text 'random' + randomize button |
| Guidance scale (CFG) | hidden | More | slider 1–20 + number |
| Sync mode | hidden | More | switch + note (base64, not in history) |
| Num images | hidden | More | slider 1–4 |
| Enable safety checker | hidden | More | locked alert (API only) |
| Output format | hidden | More | combobox jpeg/png |
| Acceleration | hidden | More | combobox none/regular/high |
| Input mode Form/JSON | visible | header combobox | I2 (not opened) |
| Result Preview/JSON | visible | — | radio group |
| Cost line | visible | — | text under result |
| Chain actions (Edit/Upscale/Make Video…) | on completed result | — | link + ▾ menu |

Other model types (O): nano-banana-2/edit shows Prompt, Aspect ratio, Image URLs dropzone (+URL/paste), Resolution, Limit generations by default; Kling i2v shows multi-shot prompt list, start/end image, duration, generate audio, elements by default — video models disclose more up front.

Sandbox (O): Simple input = dock only (prompt, type, aspect, N models, Sets, repeats, Est.); Advanced input = persistent left panel with modality radio + model selection list.
