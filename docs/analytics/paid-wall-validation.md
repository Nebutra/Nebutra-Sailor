# Paid-Wall Positioning Validation

This is the P0 operating loop for validating whether STARTUP teams perceive
Sailor as worth paying for. Do not use this loop to tune copy before the paid
conversion signal is known.

## Evidence Chain

1. `scaffold.completed` counts create-sailor installs that completed.
2. `license.wizard` with `step=submitted`, `tier=STARTUP`, and `team_size` in
   `2-5`, `6-20`, or `21-50` counts teams that crossed the closed-source
   commercial line.
3. `checkout` with `action=started`, `tier=STARTUP`, and
   `checkout_session_id` counts real Stripe checkout starts.
4. `checkout` with `action=completed`, `tier=STARTUP`, and
   `checkout_session_id` counts paid STARTUP licenses.
5. `deployment.verified` counts deploys only after the ECS/Cloud VM workflow
   passes public smoke tests.

## Run

1. Before looking at data, write the success threshold in the issue or PR body.
   Default recommendation: `>=15%` STARTUP paid conversion within 30 days.
2. Run `docs/analytics/dashboards/08-paid-wall-data-quality.sql` in Metabase.
   If required-field or joinability percentages are weak, fix instrumentation
   before interpreting conversion.
3. Run `docs/analytics/dashboards/07-positioning-paid-wall-validation.sql` in
   Metabase against the PostHog replay table.
4. Export the raw result table. Do not decide from aggregate screenshots.
5. Confirm `startup_team_sample_n >= 20`. If not, keep collecting and do not
   call the experiment.
6. Trigger the ECS fallback deploy when changing the checkout or analytics
   loop:

   ```bash
   gh workflow run deploy-ecs.yml --ref <branch-or-main> -f apps="landing api" -f reason="P0 paid-wall validation"
   ```

7. Wait for the workflow to pass. The workflow emits `deployment.verified`
   after public smoke tests pass.
8. Attach the exported raw table to the issue/PR and record one verdict:
   `value`, `consensus`, or `model`.

## Decision Rule

- Pass: `startup_paid_pct >= threshold` with at least 20 STARTUP team rows.
  Move to P2 and replace claims with behavior evidence.
- Fail: `startup_paid_pct` is near zero, or checkout starts are healthy but
  paid completions are weak. Move to P1 moat/mode work; do not change copy yet.
- Inconclusive: sample is under 20 rows or deployment evidence is absent.
  Keep collecting and fix the instrumentation gap first.
