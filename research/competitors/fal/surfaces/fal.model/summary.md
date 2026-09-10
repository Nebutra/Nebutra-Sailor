# fal.model — model page (Playground · API · Examples · Requests · Analytics)
States: idle-example, advanced, confirm-example, starting, error-no-credits, share-result, api, examples, requests.empty, requests.status-filter, analytics, credits-popover, more-menu, prompt-info, nb2-edit, kling-i2v.

- **O** Input card (required params only + 'More') | Result card (status chip Idle/Starting/Error, Preview|JSON, cost line). Evidence: evidence/model.schnell.webp, model.schnell.advanced.webp
- **O** Observed lifecycle with $0 balance: Idle -> [alertdialog 'about to run the example'] -> Starting -> Error 403 'Exhausted balance', requestId '' (never queued, no history row). Evidence: model.schnell.run-attempt.webp, model.schnell.after-run.webp
- **O** Cost shown pre-run and post-run (per MP / per image / per second, worked examples). Evidence: model.nb2-edit.webp, model.kling-i2v.webp
- **O** Completed result = raw API JSON + chain actions Edit/Upscale/Make Video (?fromOutput=requestId) + Favorite / Link character / Add to Collection / Share / Download. Evidence: model.schnell.share.webp
- **O** Requests tab: search by request ID, Status (All/Success/Error/Client error), preview toggle, compact/list/grid, pagination. Evidence: model.schnell.requests*.webp
- **O** Analytics tab decomposes latency into queue + cold boot + execution (p50–p99). Evidence: model.schnell.analytics.webp
- **O** API tab is public; identical schema to the form. Model page ships llms.txt, OpenAPI link, 'Open in ChatGPT/Claude'. Evidence: model.schnell.api.webp, pg.moremenu.webp
- **U** Funded-run chips (queue position, logs) not observable.
