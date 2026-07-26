# Nebutra-Sailor Independent Developer License

> **Quick answer:** if you used `create-sailor` to scaffold this project AND
> your team is ≤ 1 FTE (one person), you may build and ship a commercial
> product on top of Nebutra-Sailor **without AGPL copyleft**, free of charge.
> Above that threshold you need a paid commercial tier — see the full
> commercial license at https://nebutra.com/legal/license.

This file ships with every project created by `create-sailor`. It is the
license that applies to the Nebutra-Sailor source code **as scaffolded into
this project by the CLI**. Direct forks of the source repository
(https://github.com/Nebutra/Nebutra-Sailor) remain under AGPL-3.0; see
`LICENSE-AGPL-REFERENCE.md` for the upstream copyleft text.

---

## 1. Free tier — Individual / One-person Company (OPC)

**Eligible if all of the following are true:**

- You scaffolded this project using the official `create-sailor` CLI
  (a `.nebutra/scaffold-meta.json` is present at the repo root).
- The product or service built on this codebase has **at most one full-time
  equivalent (FTE)** working on it — solo developer, OPC, or solopreneur.
- Annual revenue derived from this product is **under $1,000,000 USD**.

**You get:**

- Full right to use, modify, and extend the scaffolded code in commercial
  or non-commercial projects.
- **No AGPL copyleft.** You do not need to open-source your product or
  serve source code to your users.
- Community support via Discord and GitHub Discussions.

**You must:**

- Keep this `LICENSE` file and the `.nebutra/scaffold-meta.json` marker
  intact at the root of your repository.
- Display a "Built with Nebutra-Sailor" credit (one of: README, product
  about page, marketing footer). Link to https://nebutra.com is preferred
  but not required.
- Re-evaluate eligibility annually. If you cross the FTE or revenue
  threshold, upgrade to the Startup tier within 30 days.

---

## 2. Crossed the threshold? Upgrade tiers

| Tier         | Eligibility                                          | Price        |
|--------------|------------------------------------------------------|--------------|
| Independent  | ≤ 1 FTE, < $1M ARR                                   | Free         |
| Startup      | 2–50 FTE, any revenue                                | $799/year    |
| Enterprise   | 50+ FTE, ≥ $1M ARR, or white-label / SLA needs       | Custom       |

Purchase or contact at https://nebutra.com/get-license.

The Startup and Enterprise tiers grant the **same no-copyleft permissions**
as the Independent tier, with added support, white-labeling rights, and
SLA guarantees. The full commercial license terms are in
`LICENSE-COMMERCIAL.md` if you've shipped one with your fork, or at
https://nebutra.com/legal/license.

---

## 3. What happens if you fork the source repo instead

If you cloned or forked https://github.com/Nebutra/Nebutra-Sailor directly
(without using `create-sailor`), the source code in that fork remains
licensed under **AGPL-3.0** — the upstream license. AGPL's network copyleft
clause (Section 13) applies: if you offer the modified software as a
network service, you must make the modified source available to users.

To avoid AGPL on a direct fork, purchase a Startup or Enterprise commercial
license at https://nebutra.com/get-license.

The CLI-scaffolded path (this license file) and the fork-from-source path
(AGPL) are two distinct grants from the same copyright holder
(Nebutra Technologies). The presence or absence of `.nebutra/scaffold-meta.json`
at the repo root is the legal marker that distinguishes the two.

---

## 4. Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. THE AUTHORS
OR COPYRIGHT HOLDERS SHALL NOT BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER
LIABILITY ARISING FROM OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

---

**License contact:** legal@nebutra.com
**License version:** 1.0 (scaffold-emitted, 2026-05)
