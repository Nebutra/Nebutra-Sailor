---
title: "An Autopsy of Three Claude Code Skill Frameworks: superpowers, gstack, and ECC"
slug: claude-code-skill-frameworks-autopsy
translationKey: claude-code-skill-frameworks-autopsy
excerpt: "A practical dissection of superpowers, gstack, and Everything Claude Code: what actions they actually change, how much context tax they charge, and which workflow each one fits."
author: "Tseka Luk"
categories: "Nebutra Originals,AI Engineering,Agent Tooling"
publishedAt: 2026-05-23T16:29:49.000Z
---

# An Autopsy of Three Claude Code Skill Frameworks: superpowers, gstack, and ECC

## First, one agreement: this essay will not decide for you

Over the past half year, GitHub has produced a new “Claude Code transformation” framework every few weeks. Their READMEs tend to look alike: tens of thousands of stars, sometimes far more; one `/plugin marketplace add`; then a parade of words like “100x productivity,” “god mode,” and “an entire engineering team in your terminal.”

Before reading further, cross all of those words out.

None of them answer the question that matters: **after installing this skill framework, what does your agent do differently? If you remove it, does the behavior revert?** If the answer is no, the skill is decoration. It enters the context window, consumes tokens, and changes nothing.

This essay dissects three of the most discussed frameworks: **superpowers** by Jesse Vincent, also known on GitHub as obra; **gstack** by Y Combinator CEO Garry Tan; and **Everything Claude Code**, or ECC, by affaan-m. It will not hand you an unconditional winner, because an autopsy has one central rule: **there are no universally good skills, only skills that do or do not fit a specific workflow.** A good skill for a solo learner can damage a team workflow. The reverse is also true.

So before the knife goes in, identify your workflow:

- **Solo fast iteration**: you write and ship alone; speed comes first; mess is tolerable.
- **Team delivery**: multiple people collaborate; consistency and reviewability come first.
- **Legacy-system refactoring**: you are operating on a system you did not fully shape; safety nets come first.
- **Beginner learning**: you are learning; you need to be corrected and stopped from taking shortcuts.

Remember which one you are. When you reach the verdict section, read the line that applies to you.

---

## A necessary technical premise: skills are not free

Before judging any skill, we need to understand one thing: **skills stay in context**.

According to Anthropic’s Claude Code documentation, when you or Claude invokes a skill, the rendered contents of `SKILL.md` enter the conversation as a message and remain there for the rest of the session. Claude Code does not reread the file on later turns. It simply keeps occupying space. The implication is blunt: once loaded, a skill’s content remains across turns, so every line is a recurring token cost.

That gives every skill framework two costs. The first is the **startup cost**: the frontmatter descriptions for all installed skills are loaded at session start so Claude knows what exists. The second is the **trigger cost**: when a skill is actually invoked, its full body enters context.

Keep this model in mind. A framework with 14 skills and a framework with 180 skills already differ by an order of magnitude before any real work begins. That is not a footnote. It is the survival line.

---

## Autopsy One: superpowers, the only framework that really says “no”

### Its shape

The design philosophy of superpowers can be summarized by one of its own rules: Claude should follow the “1% rule.” **If there is even a 1% chance a skill applies, Claude should invoke it.** This is obsessive, but it is obsession with a direction.

Its workflow is a chain: brainstorming → creating a git worktree → writing a plan → dispatching subagents through TDD → requesting code review → verifying before completion → finishing the branch. The chain contains roughly 14 skills, guided by a small startup hook, reportedly around 2,000 tokens, while full skill bodies load only when needed.

### Its prohibitions are the point

Here is the core test for judging skill strength. Weak skills list “best practices.” Strong skills **block shortcuts**. The difference is not tone. The difference is whether a violation actually stops the agent.

superpowers is strong because it writes constraints as **executable gates**, not slogans. Three examples from its `SKILL.md` files are representative.

The first comes from `test-driven-development`. It calls the rule a hard law: no failing test, no production code; if production code was written before the test, delete it and start over. Notice the shape of the sentence. It does not suggest writing tests first. It says delete and restart. More importantly, the rule attaches a verification action: you must personally see the test fail, because if you have not seen it fail, you do not know whether it tests the right thing. A non-AI script can check this kind of gate in CI: did a failing test exist before the implementation commit?

The second comes from `verification-before-completion`: without fresh verification evidence, you cannot claim completion; if you have not run a verification command in this message, you cannot say it passed. It turns “done” into a five-step function: identify the command, run it, read the output, compare it against expectations, and report with evidence. This blocks one of the most common failure modes of large language models: saying “fixed, tests pass” without running anything.

The third comes from `brainstorming`: before presenting a design and receiving user approval, do not write code and do not scaffold. It applies to every project, no matter how simple it looks.

All three rules share one trait: each blocks a concrete shortcut, and each block can be objectively checked. That is the boundary between a strong skill and a weak one. We will use the same ruler on the other two frameworks.

### Is it honest?

Very honest. Honest enough to earn a separate point.

Jesse Vincent publicly documented a failure in an earlier version of superpowers. The initial brainstorming skill used descriptive language, roughly asking Claude to present a design in 200 to 300 word sections. Claude invoked the skill, then ignored it. It went straight to frontend tooling and `npm create vite`. Only after those descriptive sentences were rewritten into hard-gate language did Claude begin to follow the intended workflow.

That failure is worth pausing over. It reveals a counterintuitive truth: **for a large language model, polite wording is close to no constraint at all.** The model can rationalize suggestions away. Only when the rule becomes a door it cannot walk around does the door exist. Vincent’s willingness to publish this failure is itself evidence for the framework’s hard-gate philosophy.

The repository also shows real bugs: issue #565 recorded a regression where the brainstorming skill skipped the user-review gate; issue #1077 recorded a skill being mistaken for an agent type during dispatch. The author did not hide them.

### What do developers say?

Independent feedback is broadly positive. Simon Willison described Vincent as one of the most creative users of coding agents he knows, and specifically noted the token efficiency: one reported full project consumed about 100,000 tokens. Several Hacker News commenters confirmed that the TDD skill literally refuses prewritten code with the “delete it and start over” behavior.

The criticism also exists, and it is valid: someone on Hacker News summarized it well by saying it looks charming, but without benchmarks its final value is limited. That criticism applies to all three frameworks in this essay. We will return to it at the end.

---

## Autopsy Two: gstack, a role-play system rather than a gate system

### Its shape

gstack is Garry Tan’s Claude Code configuration released as a public project: roughly 23 core slash-command skills plus about a dozen power tools. Its pitch is that Claude becomes a virtual company: CEO, designer, engineering manager, release manager, documentation engineer, and QA.

One distinction unlocks the whole system. superpowers skills are **gates**. gstack skills are mostly **persona prompts plus checklists**. `/plan-ceo-review`, `/plan-eng-review`, and `/office-hours` ask sharp questions and force thought, but they define few executable gates.

To be fair, gstack is not gate-free. `/investigate` has a hard rule that fixing symptoms creates whack-a-mole debugging, and it includes a “three strikes” rule similar to superpowers. `/plan-ceo-review` says never silently default to an option. But overall, gstack’s control comes from making you answer 20 to 45 questions, not from blocking the agent when it violates a rule. By the ruler from the previous section, many of its prohibitions are slogan-shaped rather than verifiable.

### Several designs are dangerous for collaboration

Some gstack skills **edit code and commit automatically**. Whether that is good or bad depends entirely on the workflow. This is the clearest example of the rule that there is no absolute good skill.

The `/review` skill, in staff-engineer mode, automatically fixes “mechanical issues” such as dead code, stale comments, and N+1 queries, marking them as auto-fixed. The `/qa` skill applies fixes directly to source files, makes atomic commits, and generates regression tests. For a solo developer, this saves time. In a team scenario, imagine a teammate running `/qa` on a shared branch and Claude committing a batch of “fixes” that bypass the normal review flow. The same capability is convenience in one workflow and risk in another.

More concerning are several **silent failures**. GitHub issue #1196 recorded `/codex`, the skill that calls Codex CLI for a second-opinion review, passing mutually exclusive arguments. Codex failed, but Claude saw a nonzero exit code and no model output, then silently skipped that review step and continued. Issue #1248 is sharper: a user reported running about five image generations, roughly 50 cents of API usage, before realizing the charges went to the OpenAI account from the project directory’s `.env`, not the account configured for gstack. The danger of silent failure is that nobody knows the step did not happen.

### Is it honest?

The issue with gstack is not hidden bugs. It is the marketing posture. Tan’s README claims his 2026 code output is about 810 times his 2013 output. That number drew significant public criticism. Developer Mo Bitar published a video called “AI is making CEOs delusional,” which TechCrunch reported reached 800,000 views in 48 hours. His judgment was that gstack is basically a pile of prompts in text files. One founder’s reaction to the “god mode” CTO endorsement was that if it were true, the CTO should be fired immediately. A deeper retrospective framed “10,000 lines a day” as a danger signal, not a feature.

This is not to mock gstack. Its engineering is not useless. The point is another autopsy rule: **star count is a social phenomenon; workflow fit is an engineering phenomenon. Keep them separate.** A meaningful part of gstack’s reach comes from its author being the CEO of YC, not from the strength of its constraints. One Product Hunt commenter put it bluntly: if Garry were not YC’s CEO, this would not be on Product Hunt.

---

## Autopsy Three: Everything Claude Code, a directory rather than a methodology

### Its shape

ECC is the hardest to judge because it is not a framework with a clear workflow. It is a **directory**: a continuously expanding collection of skills. Different sources cite different numbers: 119 skills, 182, newer counts above 230. Whichever number you choose, it is more than ten times larger than superpowers.

### Its fatal problem: context tax

Return to the technical premise from the beginning. If ECC has about 180 skills, and each skill frontmatter description costs only 100 to 200 tokens, **the metadata alone consumes 18,000 to 36,000 tokens before any skill has been invoked.**

This is not a speculative attack. ECC’s own README admits the issue in its FAQ. It warns that too many MCP servers eat your context, each tool description subtracts tokens from the 200K window, and the usable window can collapse to about 70K. ECC therefore ships multiple “kill switches,” such as `--profile minimal`, `ECC_DISABLED_HOOKS`, and `ECC_SESSION_START_CONTEXT=off`. A framework that needs this many switches to turn itself down is already admitting that its default install is too heavy.

### Installation is a trap

There is another problem for teams. Claude Code’s plugin system **cannot distribute rules files**. That is an upstream limitation. ECC’s README warns users not to mix installation methods; the most common broken configuration is installing the plugin and then running `install.sh --profile full`, which produces duplicate skills and duplicate hook execution.

In team language, this means that if a team installs ECC through plugins, each developer can end up with a different rule set. A member’s local behavior can diverge from CI behavior, which is exactly what collaborative delivery tries to avoid. ECC’s README candidly admits repeated hook regressions, naming issue #29, #52, and #103.

### Its most honest and most damaging sentence

ECC contains a skill called `continuous-learning`. In its v1 self-critique, it says that v1 relied on skills for observation, but **skills are probabilistic: they trigger about 50% to 80% of the time**. v2 moves observation into hooks because hooks are 100% reliable.

That may be the most important sentence in the entire ECC repository. It is an admission that **a skill is not deterministic control flow; it is a probabilistic prompt.** This fact means different things in different workflows. For a team that needs repeatable delivery, “this constraint fails to fire 20% to 50% of the time” is a disaster. For a solo explorer, it may be a tolerable inconvenience. Same fact, different verdict.

### It also has real strengths

Do not dismiss ECC entirely. Two skills are genuinely valuable when extracted individually.

`tdd-workflow` is about as strict as superpowers’ TDD, and it adds a smart rule: verification checkpoint commits must be **reachable from the current branch’s HEAD**. You cannot use a commit from another branch or unrelated history as checkpoint evidence. That is useful in CI.

`eval-harness` is unique among the three frameworks. It supports evaluation-driven development: define evals before writing code, use metrics like pass@k as success criteria, and require thresholds such as pass@3 above 90% for capability evals and pass^3 at 100% for regression evals. If you are building AI features, this skill has no clean substitute.

---

## Seven-dimensional scoring: placing the three bodies side by side

The table below scores the three frameworks from 0 to 5 across seven dimensions. One caveat matters: **the table is weighted for team delivery**, because that was the initial autopsy scenario. If you belong to another workflow, the relative scores change. The verdict section explains how.

| Dimension | superpowers | gstack | ECC |
|---|---:|---:|---:|
| Behavior delta, with evidence | 4 | 2 | 2 |
| Density of executable prohibitions | 5 | 2 | 3 |
| Trigger precision | 3 | 3 | 2 |
| Context tax | 4 | 3 | 1 |
| Falsifiable success criteria | 5 | 3 | 3 |
| Fit with team delivery | 4 | 2 | 2 |
| Author honesty | 5 | 3 | 4 |

Briefly: superpowers earns 4 on behavior delta because its author actually ran skill-on versus skill-off comparisons; the other two mostly offer self-reported throughput metrics without controlled contrast. gstack earns only 2 on prohibition density because its skills are mostly questioning checklists, not executable gates. ECC earns only 1 on context tax because it admits the “collapse to around 70K” problem itself.

---

## Verdict: four workflows, four different answers

An autopsy verdict should be conditional, not an unconditional “good” or “bad.” So there is no champion here, only prescriptions. Read the one that fits you.

**If you are doing team delivery**, use superpowers as the skeleton and selectively import parts from the other two. Its hard gates can be checked in CI: was there a failing test before implementation? Did the latest completion claim include a fresh verification command? Its artifacts—plans, design docs, worktrees—remain reviewable. From ECC, consider extracting `tdd-workflow` and `eval-harness`, but do not install ECC wholesale; its context tax conflicts with shared budgets. From gstack, at most borrow `/codex` and `/retro`, while avoiding `/review` and `/qa` on shared branches because they auto-fix.

**If you are a solo fast-iteration developer**, the verdict flips. superpowers’ 1% rule and mandatory brainstorming gates can become shackles. gstack’s role-play structure, quick pressure, auto-fixes, and auto-commits may feel natural, because no teammate is exposed to the blast radius of your automation. In that workflow, the convenience is mostly upside. gstack is shaped for that mode.

**If you are refactoring a legacy system**, prefer superpowers’ `systematic-debugging` and `verification-before-completion`. Legacy work is most dangerous when you think something is fixed but have not proven it. Those two skills are safety nets. Add ECC’s `tdd-workflow` if you want its reachable-checkpoint rule, which is especially valuable in repositories with messy history. Stay away from gstack’s auto-fix skills: letting an agent auto-edit and auto-commit in a codebase you do not fully understand creates another layer of archaeology.

**If you are learning**, superpowers may again be the best fit, but for a different reason. Its gates repeatedly stop you from taking shortcuts, and being stopped is where learning happens. It forces you to write a failing test first, design before coding, and run verification before claiming completion. ECC is useful as a reference book: read individual `SKILL.md` files to learn how other people encode workflows, but do not install the whole thing for daily use. gstack is risky for beginners because its automation can do the work for you; you see the output, but you do not learn the process.

One rule applies to **all** workflows: any skill you plan to install in a shared environment must have a core prohibition that a non-AI script can verify: an exit code, file content, or git-log check. A rule that exists only as a slogan cannot be enforced in CI.

---

## A shareable summary

If you only remember one paragraph, remember this:

These frameworks are not selling the same thing. superpowers sells **discipline**: executable gates that stop the agent from taking shortcuts, at the cost of token overhead and occasional over-triggering. gstack sells **momentum**: it costumes Claude as a virtual company and forces sharp product questions; it is shaped for a solo founder. ECC sells **breadth**: a directory of more than 180 skills, with genuinely useful parts inside, but a full install can consume a large portion of your context before work begins. Which one is “best” depends on whether you are iterating alone, delivering with a team, refactoring legacy code, or learning. Those workflows want conflicting things, so there is no universal answer.

The lesson running through all three is more important: **for a large language model, polite suggestions are almost no constraint at all.** Jesse Vincent’s public failure experiment showed it clearly. A skill that says “please present the design in 200 to 300 words” can be politely rationalized away. A hard gate cannot. So the next time you evaluate any skill, ignore the adjectives and read the prohibitions. Does it block a concrete shortcut? Can that block be verified by a script? If both answers are no, it is decoration, no matter how many stars it has.

---

## Necessary disclaimers

None of the three frameworks has controlled benchmarks. Quantitative claims such as 100,000 tokens for a project, ten thousand lines of code per day, “3x to 4x acceleration,” and “85% to 95% coverage” are practitioner self-reports, not controlled measurements. The Hacker News criticism that value is limited without benchmarks applies to all of them.

These repositories also change quickly. Star counts, issue numbers, and `SKILL.md` line counts drift. If your process depends on a specific behavior, lock to a commit and verify it.

The skill abstraction itself is young. Anthropic’s skill standard appeared in 2025, and behavior around skill bodies remaining in context has changed across Claude Code versions before. Treat this essay as a **method for thinking**, not a permanent conclusion. It teaches how to dissect a skill—read the prohibitions, measure the context tax, separate popularity from workflow fit—not what to memorize about three repositories today. The method lasts longer than the conclusion.
