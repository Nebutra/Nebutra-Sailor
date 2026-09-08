# fal — UX patterns (tiered)

1. **Try-it and API are tabs of one page, not two products** — O. Model page tab strip: Playground · API · Examples · Requests · Analytics. Gallery cards carry both links. `evidence/explore.webp`, `evidence/model.schnell.webp`
2. **Never-empty result column** — O. Playground loads with a sample prompt and a sample result (image + JSON + timing/cost), so the layout teaches the result object before the first run.
3. **Sample-run guard** — O. Running the unedited example raises an alertdialog ("Running it uses your credits" — Run anyway / Edit my input). `evidence/model.schnell.run-attempt.webp`
4. **Cost twice** — O. Pre-run "will cost $X per <unit>" under the result; post-run "took 0.76 s and will cost $X"; nb2 adds "for $1.00 you can run this 12 times" and resolution multipliers; Kling gives a worked 5 s example. `evidence/model.nb2-edit.webp`, `evidence/model.kling-i2v.webp`
5. **Required-first disclosure** — O. Only required params visible; 'Additional Settings · More' reveals the rest inline (no modal). Each param has an (i) popover with the schema string; the same schema is the API doc.
6. **Raw response as the result object** — O. Preview | JSON toggle over the same payload; Copy JSON; Download the media URL.
7. **Chain by request id** — O. Edit / Upscale / Make Video deep-link the next model page with `?fromOutput=<requestId>`; Share is `?share=<requestId>`; Examples cards are prior requests. Provenance = request id.
8. **History at two scopes** — O. Per-model Requests tab and global /dashboard/recent-history, both with 'Show preview'. Status buckets Success / Error / Client error. Gateway rejections (403 balance) leave no row.
9. **Compare lives in a separate surface** — O. Sandbox fans one prompt to N models × M repeats with a live estimate ("Will run 1x on 5 models · Est. $0.37"); named Model Sets are reusable selections. `evidence/sandbox.webp`, `evidence/sandbox.sets.webp`
10. **Queue wait is a first-class metric** — O. Analytics tab splits startup (queue + cold boot) from execution, p50–p99. `evidence/model.schnell.analytics.webp`
11. **Agent-readable model page** — O. llms.txt, OpenAPI link, "Open in ChatGPT / Claude" menu. `evidence/pg.moremenu.webp`
12. **Locked-in-UI param** — O. Safety checker shows an inline alert "cannot be disabled on the playground. Only available through the API" — the form admits the API is a superset.
13. **Entities as prompt referents** — O existence / I2 usage. "@ to reference entities"; Assets has Characters/Props/Environments/Styles/Scenes; result has "Link character".
