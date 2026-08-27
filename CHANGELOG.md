# Changelog

All notable changes to Nebutra-Sailor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.7.14](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.13...v1.7.14) (2026-03-20)


### 🐛 Bug Fixes

* use correct blob-report subdir for playwright merge-reports ([654e12b](https://github.com/Nebutra/Nebutra-Sailor/commit/654e12bf2f75a0dc5020aaa7761bef5c1a8039ed))

## [1.7.13](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.12...v1.7.13) (2026-03-20)


### 🐛 Bug Fixes

* e2e report merge — add blob reporter for shard report merging ([d064903](https://github.com/Nebutra/Nebutra-Sailor/commit/d064903c0a93c4a7eda3a840619c5a2eb8c51bc5))

## [1.7.12](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.11...v1.7.12) (2026-03-20)


### 🐛 Bug Fixes

* e2e broken brand images — run brand:sync in CI before e2e tests ([1139027](https://github.com/Nebutra/Nebutra-Sailor/commit/113902786378b5c40189052d1f16eff68833eeda))

## [1.7.11](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.10...v1.7.11) (2026-03-19)


### 🐛 Bug Fixes

* web typecheck in openapi ci — stub types.generated.ts, build deps ([04c930c](https://github.com/Nebutra/Nebutra-Sailor/commit/04c930ca15088f306205b82fc4d5e5f5f1c27fc3))

## [1.7.10](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.9...v1.7.10) (2026-03-19)


### 🐛 Bug Fixes

* redocly validation and e2e broken-image test ([a09f118](https://github.com/Nebutra/Nebutra-Sailor/commit/a09f118ea1958664e068bb9e9f9281d564576c94))

## [1.7.9](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.8...v1.7.9) (2026-03-19)


### 🐛 Bug Fixes

* openapi spec generation — add type:module to workspace packages, stub env vars ([ff3d3de](https://github.com/Nebutra/Nebutra-Sailor/commit/ff3d3de7f23d5e9c638d72f9d7526a045efbfb59))

## [1.7.8](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.7...v1.7.8) (2026-03-19)


### 🐛 Bug Fixes

* rate-limit coverage — add tests for factory functions, ignore timer block ([1a76848](https://github.com/Nebutra/Nebutra-Sailor/commit/1a7684811c5b89d57d78eb1177a59a7368d48122))

## [1.7.7](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.6...v1.7.7) (2026-03-19)


### 🐛 Bug Fixes

* coverage gate, bundle size limit, email build, e2e nav strict mode ([60748da](https://github.com/Nebutra/Nebutra-Sailor/commit/60748da5e522ff8cd8d50a4ac0c5e961d81ee60a))

## [1.7.6](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.5...v1.7.6) (2026-03-19)


### 🐛 Bug Fixes

* v8 ignore syntax, remove billing from size-limit, auth e2e to web app url ([5e14d58](https://github.com/Nebutra/Nebutra-Sailor/commit/5e14d585c5ee914c000218e49bd4ab671a2eadae))

## [1.7.5](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.4...v1.7.5) (2026-03-19)


### 🐛 Bug Fixes

* coverage gate, bundle size, openapi build, and e2e ci failures ([4f05a9b](https://github.com/Nebutra/Nebutra-Sailor/commit/4f05a9b4746d2f311995edf0497ad1a09a42d82b))

## [1.7.4](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.3...v1.7.4) (2026-03-19)


### 🐛 Bug Fixes

* restore "use client" directives to top of file in @nebutra/ui ([b76f056](https://github.com/Nebutra/Nebutra-Sailor/commit/b76f056b1c973b3c2249b4f17f3a437907a79308))

## [1.7.3](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.2...v1.7.3) (2026-03-19)


### 🐛 Bug Fixes

* stub OPENAI_API_KEY in ai service test conftest ([838bae1](https://github.com/Nebutra/Nebutra-Sailor/commit/838bae10a3d6a53fcf830a78490cd3e75efdbd4e))

## [1.7.2](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.1...v1.7.2) (2026-03-19)


### 🐛 Bug Fixes

* lazy-import OTel FastAPI instrumentation to avoid pkg_resources at module load ([a2c7d28](https://github.com/Nebutra/Nebutra-Sailor/commit/a2c7d28365cb222ef11122054f84232d9229d241))

## [1.7.1](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.7.0...v1.7.1) (2026-03-19)


### 🐛 Bug Fixes

* add setuptools to ai service for pkg_resources compatibility ([9bc4697](https://github.com/Nebutra/Nebutra-Sailor/commit/9bc46977474bf372858f760e988a35a42358b929))

## [1.7.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.6.0...v1.7.0) (2026-03-19)


### 🆕 Features

* add oauthclient schema, generated prisma types, and identity adapter ([65a44ff](https://github.com/Nebutra/Nebutra-Sailor/commit/65a44fff065c7b50afaf2f3a2159a3881d14a013))
* add tooltip storybook stories for tier-1 coverage ([b9b8cfb](https://github.com/Nebutra/Nebutra-Sailor/commit/b9b8cfb012d9919df2c514ad842e2579fe9da051))
* add TsekaLuk.dev personal brand platform ([2900e49](https://github.com/Nebutra/Nebutra-Sailor/commit/2900e49b74eb209fa8a1fb8f41e73bc15fc59f6e))
* **ai:** multi-provider architecture with openrouter + siliconflow support ([e5a2ecb](https://github.com/Nebutra/Nebutra-Sailor/commit/e5a2ecb05fe86474602f2b310e35a2e4d062441d))
* complete nebutra A2A AI ecosystem (mcp, ai-sdk, up) ([43e60db](https://github.com/Nebutra/Nebutra-Sailor/commit/43e60dbf18aaa36011aad1a24c2cfc2440d3a505))
* **create-sailor:** implement zero-error deep clean pruning for ORM & i18n ([8f87f52](https://github.com/Nebutra/Nebutra-Sailor/commit/8f87f52ab42ca8d38b922ead032fb1853235964b))
* **design-docs:** governance audit, registry, status badges, install snippets, text-shimmer fix ([a050181](https://github.com/Nebutra/Nebutra-Sailor/commit/a0501816ac8ad75bbdf97cc2727c012bbe7833c4))
* enhance portfolio ui components and add visual elements ([ccfd639](https://github.com/Nebutra/Nebutra-Sailor/commit/ccfd639849a91e3b43828779a74677464e62e640))
* **infra:** phase 1 mvp nebutra identity provider ([b5ecacc](https://github.com/Nebutra/Nebutra-Sailor/commit/b5ecacce7fb750e27b093e33ecee31328c6479ab))
* redesign capabilities section as interactive service carousel ([3f1f654](https://github.com/Nebutra/Nebutra-Sailor/commit/3f1f654aaf882a5aef8af8b323d2def668f5d351))
* redesign NextAuth signin and error pages ([1273a12](https://github.com/Nebutra/Nebutra-Sailor/commit/1273a1248f373ed43d79addc80644d44c6ab7231))
* **tseka-dev:** add /about page with timeline ([9655a58](https://github.com/Nebutra/Nebutra-Sailor/commit/9655a582972c059bb436af9407cb3228f2ccbf3f))
* **tseka-dev:** add /now and /thinking content pages ([881f9b7](https://github.com/Nebutra/Nebutra-Sailor/commit/881f9b781734a441731a9d2b1a1d124ff57c3e71))
* **tseka-dev:** add /work page with project grid ([0796a68](https://github.com/Nebutra/Nebutra-Sailor/commit/0796a68b746b546efcab18fcb07b882b131d1eb7))
* **tseka-dev:** add site shell and hero section ([df11761](https://github.com/Nebutra/Nebutra-Sailor/commit/df1176104edfb486a1315369ed10f7ff27da1f51))
* **tseka-dev:** add vercel deployment config ([e56c362](https://github.com/Nebutra/Nebutra-Sailor/commit/e56c36253a804646bc3e49a110b87a4f43d7be45))
* **tseka-dev:** bootstrap app with lime tokens and font system ([d779f97](https://github.com/Nebutra/Nebutra-Sailor/commit/d779f97fecbb2ed270d72e737102c4f8256d2589))
* **tseka-dev:** wire now-preview into homepage ([935ab00](https://github.com/Nebutra/Nebutra-Sailor/commit/935ab002e1b7a1a9fb7253e5dd473605eeb59f31))
* **tsekaluk-dev:** add semantic icons and visual polish ([e89cf21](https://github.com/Nebutra/Nebutra-Sailor/commit/e89cf2100fd1f27015effde5f87b1585dfc5f1d6))
* **tsekaluk-dev:** complete portfolio deep content + 6 new projects ([e9207c5](https://github.com/Nebutra/Nebutra-Sailor/commit/e9207c5040797caa52b0f8f7eec8353f922d6881))
* **tsekaluk-dev:** deep content mining with metrics and storytelling ([ac8cb95](https://github.com/Nebutra/Nebutra-Sailor/commit/ac8cb95c9dc6a938a3608fa9bb68a8f4e094960f))
* **tsekaluk-dev:** enrich portfolio with photos, awards, and projects ([4c6a7f7](https://github.com/Nebutra/Nebutra-Sailor/commit/4c6a7f71fc3eb378967f8c5cc573748ea908298c))
* **ui:** integrate 21st.dev badge-1 with tailored semantic color variants ([c71c032](https://github.com/Nebutra/Nebutra-Sailor/commit/c71c0323b10e43238dc1bab59121540f279a65db))
* upgrade inngest v3 → v4 beta with native Zod v4 Standard Schema support ([4511e74](https://github.com/Nebutra/Nebutra-Sailor/commit/4511e743c7180f3af0b6aadcf6cb11a6d29f81a2))
* use multi-provider sign-in for Soul chat ([43a3dbd](https://github.com/Nebutra/Nebutra-Sailor/commit/43a3dbd605ad7fb082e53e3ed57505e5fa98e082))
* **web:** add i18n with animated language switcher to tsekaluk-dev ([a3b1d8f](https://github.com/Nebutra/Nebutra-Sailor/commit/a3b1d8fe687eb5041509a866a18d17d38d8e8d47))


### 🐛 Bug Fixes

* add biome/lefthook/knip to package.json devDependencies, fix ai-prompt-box type ([03dd327](https://github.com/Nebutra/Nebutra-Sailor/commit/03dd32709fff0e13b933751419ac8be13835a1ea))
* add missing @nebutra/icons dependency to tsekaluk-dev ([bb4d35c](https://github.com/Nebutra/Nebutra-Sailor/commit/bb4d35ccd1ede15524e626e707c90ea06e6038e2))
* add oauth-server to lockfile, disable dts until v9 types resolved ([ef2ae2c](https://github.com/Nebutra/Nebutra-Sailor/commit/ef2ae2cd21117c103c3c6013392e39c15869e690))
* add qemu for arm64 docker builds and update governance baseline ([9315802](https://github.com/Nebutra/Nebutra-Sailor/commit/9315802e6b34bc0dbd8d7828d4726e39bdd4844f))
* add structlog to ai service and generate .source before tsekaluk-dev typecheck ([9c61fe4](https://github.com/Nebutra/Nebutra-Sailor/commit/9c61fe46b02aaea6473e57ec9a45525d72dd5f00))
* bandit scans only source dirs, reset next-env.d.ts CI breakage ([072e9e5](https://github.com/Nebutra/Nebutra-Sailor/commit/072e9e5ca1b28a31b74b81870caeb8544841b384))
* **ci:** fix @nebutra/web audit-remediation test failures ([41fb052](https://github.com/Nebutra/Nebutra-Sailor/commit/41fb0525648041b4578c74c977b5400e93d07525))
* **ci:** resolve all biome CI errors to achieve 0-error lint baseline ([95cf92b](https://github.com/Nebutra/Nebutra-Sailor/commit/95cf92bea329017d662bf705fb3abdf45532b07c))
* **ci:** resolve lint, esm, security, and turbopack issues ([344d44e](https://github.com/Nebutra/Nebutra-Sailor/commit/344d44ed2b960e6d0848cb7a439177e80cdb8885))
* **config:** add --no-frozen-lockfile to vercel install commands ([6c8857f](https://github.com/Nebutra/Nebutra-Sailor/commit/6c8857f535e71e2ba4fc1b35841d9c9431c42fe7))
* **config:** resolve remaining ci failures across all checks ([6599132](https://github.com/Nebutra/Nebutra-Sailor/commit/65991321e8998343164e0aacd9ba5b260602621d))
* **config:** update arch tests and workflows after design-system removal ([313e343](https://github.com/Nebutra/Nebutra-Sailor/commit/313e343ff3d8d11f49fd84fada892fb59ce32481))
* **content:** replace fabricated appen sop with real warehouse drone project ([4201735](https://github.com/Nebutra/Nebutra-Sailor/commit/42017354f51da6c97b758325870054944b23f7b6))
* **content:** use precise numbers from source docs, add cdtmp project ([22f6f05](https://github.com/Nebutra/Nebutra-Sailor/commit/22f6f05545730de6eae1a93d076a222f2b111d9a))
* correct import paths from @nebutra/ui/primitives → @nebutra/ui/components ([de17d7f](https://github.com/Nebutra/Nebutra-Sailor/commit/de17d7fb5a968683019c55cddf7d23a75ae7aa98))
* correct python-ci install, arch test deps, and audit scope ([5b06f4d](https://github.com/Nebutra/Nebutra-Sailor/commit/5b06f4d5f58f87b890a7b8053e912f21140c4567))
* **docs:** inject missing Menubar component in mdx-components ([ac6d03e](https://github.com/Nebutra/Nebutra-Sailor/commit/ac6d03e7b9b9e926d5d087ee44306c29a577032b))
* downgrade httpx in billing service to satisfy supabase constraint ([ebb1efc](https://github.com/Nebutra/Nebutra-Sailor/commit/ebb1efcd29b8e927db7497cee7e607b85db24f7f))
* **infra:** regenerate lockfile and remove stale tsup step ([a8e0aa0](https://github.com/Nebutra/Nebutra-Sailor/commit/a8e0aa0a6f53c5bd40cf4c94bb963c7443317a4d))
* **landing-page:** i18n type safety, hreflang, and ppr compatibility ([35534c7](https://github.com/Nebutra/Nebutra-Sailor/commit/35534c7bcc134e7c219c0e126de7244fc637fb85))
* make all env vars optional with graceful degradation ([b33fe23](https://github.com/Nebutra/Nebutra-Sailor/commit/b33fe2394d7ddeb1539ad37eba8b4c6310dafc05))
* make prisma client lazy to avoid DATABASE_URL crash during SSG ([a87c751](https://github.com/Nebutra/Nebutra-Sailor/commit/a87c7512c18eb1b468e48b9ed96adc577a05872b))
* **mcp:** update z.record to zod v4 two-arg form ([4e25129](https://github.com/Nebutra/Nebutra-Sailor/commit/4e25129378403d48de0ac7578debf765fd78a40b))
* migrate Clerk to v7 signals API and fix Python CI pytest-cov ([964c149](https://github.com/Nebutra/Nebutra-Sailor/commit/964c149f91236464f772151a54b06f9970b9fbe1))
* pass --pass-with-no-tests for oauth-server (no tests yet) ([12ebc98](https://github.com/Nebutra/Nebutra-Sailor/commit/12ebc980a3aa6797453efaa488502461f4335377))
* python ci venv approach, landing-page arch rule, e2e guard ([d7ff463](https://github.com/Nebutra/Nebutra-Sailor/commit/d7ff463618be8af3227d09238a2d60c7b41b69d9))
* remove hallucinated nebutra up & fix api-gateway CI ([9769844](https://github.com/Nebutra/Nebutra-Sailor/commit/97698442ace04d07df9a7fc482f23bcfff9212f4))
* remove remaining @nebutra/design-system references from live code ([f55e675](https://github.com/Nebutra/Nebutra-Sailor/commit/f55e67571ba87150d76696c3e4fdee84ae7c73c7))
* reorder exports to put types before import/require in analytics ([9ebaeaf](https://github.com/Nebutra/Nebutra-Sailor/commit/9ebaeaf8e3ccf2da08dd817e39b4b3e1020f224d))
* repair 290+ broken MDX component preview tags in design-docs ([24a9f2c](https://github.com/Nebutra/Nebutra-Sailor/commit/24a9f2c956a223a3cdd6a1b96b773ac2f7213192))
* replace img with next/image in teammemberlist and fix unused orgid param ([3070d8b](https://github.com/Nebutra/Nebutra-Sailor/commit/3070d8b7e5c4d7d6b7af03096d091d35ae63b014))
* resolve jsx-a11y accessibility errors and fix badge variants styling ([8590a1e](https://github.com/Nebutra/Nebutra-Sailor/commit/8590a1e7a89fddfac74a8db64856ceba78b37749))
* resolve monorepo build failures and turbopack resolution errors ([a3cfb71](https://github.com/Nebutra/Nebutra-Sailor/commit/a3cfb715f214eca43c96e4db85a6b98daf4ab0bb))
* resolve python ci, architecture test, and hex token violations ([5f1b35e](https://github.com/Nebutra/Nebutra-Sailor/commit/5f1b35ebf0fdeaccfdcaf5b8b74373dd4a4b0440))
* resolve remaining ci failures in python-ci, e2e, ui-governance ([3635920](https://github.com/Nebutra/Nebutra-Sailor/commit/3635920a0dbdc9c4f3ec859aebb682a43f066364))
* resolve ruff lint errors in billing service and add email tsconfig ([9a6d38e](https://github.com/Nebutra/Nebutra-Sailor/commit/9a6d38e5c86da642764c77c52e71e5f2a1fdaf8e))
* resolve ruff lint errors in ecommerce, recsys and web3 services ([fd06d23](https://github.com/Nebutra/Nebutra-Sailor/commit/fd06d2381e6e7bad47415a43acc078cc9cbbba61))
* resolve ruff/typecheck failures in ai, content, event-ingest services ([3c4a158](https://github.com/Nebutra/Nebutra-Sailor/commit/3c4a1585fb23040360b054e07213dd3741e899ef))
* resolve web lint errors and use venv binaries in python ci ([c4eff29](https://github.com/Nebutra/Nebutra-Sailor/commit/c4eff296674f8a6c4cb2d0f7470810fd4cf4eba8))
* revert Proxy prisma — use build-phase null guard instead ([67f008a](https://github.com/Nebutra/Nebutra-Sailor/commit/67f008a2cd5961b9e6ae53ac9a3c87df56f14ee0))
* security overrides, arch test web deps, tsekaluk-dev lint ([e33077e](https://github.com/Nebutra/Nebutra-Sailor/commit/e33077edb1dd7c340ab6e52cc074f68953918d0b))
* skip env validation during Next.js build phase ([e1e50b1](https://github.com/Nebutra/Nebutra-Sailor/commit/e1e50b10784f9574ec64af361b2f552061e8b55e))
* **tseka-dev:** address code review findings ([93d7e27](https://github.com/Nebutra/Nebutra-Sailor/commit/93d7e2730a1cd1d62821991250ff79de77efce26))
* **ui:** enforce strict generics for animate-in and chart payloads ([a54a722](https://github.com/Nebutra/Nebutra-Sailor/commit/a54a722559645ef3edaec595a8d569878a394002))
* **ui:** resolve typing errors in primitives and complete module exports ([397ac7a](https://github.com/Nebutra/Nebutra-Sailor/commit/397ac7a918617e796efd2020b36cc89c37c250c6))
* use uv venv --seed so pip exists in venv for python ci ([168f797](https://github.com/Nebutra/Nebutra-Sailor/commit/168f797e6b705492c690be5a82fbad2a9dc97f56))
* zod v4 record compat and chromatic brand build step ([c0fe4df](https://github.com/Nebutra/Nebutra-Sailor/commit/c0fe4dfb51a9c965c78abd231de76fbaa2826039))


### ♻️ Code Refactoring

* auto-fix high-frequency a11y violations (SVG aria-hidden, Button explicit types) to adhere to strict biome rules ([e21edcd](https://github.com/Nebutra/Nebutra-Sailor/commit/e21edcd7b04c370c76f63ab04cc43887b4eedeef))
* rename numerical demo components to semantic names for documentation and previews ([f9a0a5b](https://github.com/Nebutra/Nebutra-Sailor/commit/f9a0a5b6dd71efdbb066a240c2b31fa4a47edeb2))
* rename numerical preview demo components to semantic names ([65d9140](https://github.com/Nebutra/Nebutra-Sailor/commit/65d9140f1e5194fa9241d9ba48bfcbac0399975c))
* rename tseka-dev to tsekaluk-dev ([e0d16e1](https://github.com/Nebutra/Nebutra-Sailor/commit/e0d16e1b734a98c17836588c79123ae470e6fbc4))
* **ui:** consolidate UI components into @nebutra/ui ([650f1a0](https://github.com/Nebutra/Nebutra-Sailor/commit/650f1a0dc9fc6f9b1b1029eebbe51ffd8a20baec))


### 📚 Documentation

* add tseka-dev implementation plan ([542aef3](https://github.com/Nebutra/Nebutra-Sailor/commit/542aef35d5e1d3429a2406ab1c02d95eeaa6c3b6))
* add tseka-dev portfolio design document ([d12ba8d](https://github.com/Nebutra/Nebutra-Sailor/commit/d12ba8d4ca8ea1f754c023c36dc08d9a9b2e48af))

## [1.6.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.8...v1.6.0) (2026-03-07)

### 🆕 Features

- **i18n:** finalize fumadocs i18n architecture and translate component docs ([1b69b14](https://github.com/Nebutra/Nebutra-Sailor/commit/1b69b1440fcd740845a142f0fe69f73cff2189d8))

## [1.5.8](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.7...v1.5.8) (2026-03-07)

### 🐛 Bug Fixes

- **ci:** fix pnpm audit and docker trivy scan failures ([58b87e5](https://github.com/Nebutra/Nebutra-Sailor/commit/58b87e5b116bebebd36be082742819782e5fccd6))

### 📚 Documentation

- fix invalid simpleicons slug and bust github camo cache ([1bda970](https://github.com/Nebutra/Nebutra-Sailor/commit/1bda970a3faef8b28f4752495c51fa1b1f9b8fd7))
- update badges to use official brand logos ([afce265](https://github.com/Nebutra/Nebutra-Sailor/commit/afce26585b1aec172e60d6a001d82c95ae4a9605))

## [1.5.7](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.6...v1.5.7) (2026-03-07)

### 🐛 Bug Fixes

- resolve trivy scan not producing sarif file and alerting tests coverage ([da3f879](https://github.com/Nebutra/Nebutra-Sailor/commit/da3f87941fd349b8bad426aa31f0c6326b361eb2))

## [1.5.6](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.5...v1.5.6) (2026-03-07)

### 🐛 Bug Fixes

- resolve exact optional property types errors ([eabcda1](https://github.com/Nebutra/Nebutra-Sailor/commit/eabcda1502c213087f51c2a3d4cab1c7ac6ccebe))
- resolve framer-motion variants type error in onboarding-checklist ([5cdf1e2](https://github.com/Nebutra/Nebutra-Sailor/commit/5cdf1e21748d4b26258bb543281bfc280c420d40))

## [1.5.5](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.4...v1.5.5) (2026-03-06)

### 🐛 Bug Fixes

- **web:** prerender build fixes for next js 16 plus clerk esm patch ([963841d](https://github.com/Nebutra/Nebutra-Sailor/commit/963841df776c1b09395bc116d620e177ffb07b5a))

## [1.5.4](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.3...v1.5.4) (2026-03-06)

### 🐛 Bug Fixes

- always render clerkprovider so clerk hooks have context on ci ([d5233cf](https://github.com/Nebutra/Nebutra-Sailor/commit/d5233cf8831380361bcd951949a8dd617b55ecfe))
- copy patches/ directory in all dockerfiles for pnpm install ([7afe6ee](https://github.com/Nebutra/Nebutra-Sailor/commit/7afe6ee19f89350713c02f7bc4f5c0cb873f9b85))
- resolve clerk v7 esm imports and web/landing-page build failures ([f7a6430](https://github.com/Nebutra/Nebutra-Sailor/commit/f7a6430339705a6483687fb0ed1e47682aadb295))

## [1.5.3](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.2...v1.5.3) (2026-03-06)

### 🐛 Bug Fixes

- docker module resolution, test assertions for cache migration ([11a01db](https://github.com/Nebutra/Nebutra-Sailor/commit/11a01db10488780e309236d4d02e50db93d240f6))
- docker prisma filter, landing-page cache components migration ([7fd74e8](https://github.com/Nebutra/Nebutra-Sailor/commit/7fd74e84d9f5b132d3ef28e365eaa115c0407521))
- migrate auth components to clerk v7 future api ([0dc88e2](https://github.com/Nebutra/Nebutra-Sailor/commit/0dc88e21d3c2289a4c0ebabe412a65959e889df5))
- pass required args to storybook decorator story call ([05387d2](https://github.com/Nebutra/Nebutra-Sailor/commit/05387d2580175e342af6b8a70c2850804f96a4d3))
- upgrade clerk to v7 and hoist all deps for docker compat ([7ca9920](https://github.com/Nebutra/Nebutra-Sailor/commit/7ca99201adb2a00d82791dddff8fa00e8c94ee70))

## [1.5.2](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.1...v1.5.2) (2026-03-06)

### 🐛 Bug Fixes

- docker node 22, clerk turbopack compat, alerting coverage ([ac1dd67](https://github.com/Nebutra/Nebutra-Sailor/commit/ac1dd6710ba311e0e34a45e3d5325d6119cd278f))

## [1.5.1](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.5.0...v1.5.1) (2026-03-06)

### 🐛 Bug Fixes

- ci infra - pnpm version, coverage threshold, docker node_modules ([66048c6](https://github.com/Nebutra/Nebutra-Sailor/commit/66048c63db30bc59aea6e70c69c5b0c739cd8b55))

## [1.5.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.4.1...v1.5.0) (2026-03-06)

### 🆕 Features

- accordion & code-block primitives, docs, i18n lock, preset plan ([65b1e92](https://github.com/Nebutra/Nebutra-Sailor/commit/65b1e92a69d267a08970ce949cb094ce82f8e30c))
- add @nebutra/icons — full geist icon set (541 icons) ([0a40ace](https://github.com/Nebutra/Nebutra-Sailor/commit/0a40acefa88ff6d6de8b6207a5fcb326151a8fe6))
- add bundle analyzer to apps/web (analyze=true next build) ([acfa197](https://github.com/Nebutra/Nebutra-Sailor/commit/acfa1974ecdc9fe326f91e510fb43558b62ec106))
- add error boundary component to prevent white screen on runtime errors ([747937e](https://github.com/Nebutra/Nebutra-Sailor/commit/747937e7fd2f6c07aa5bab96c17d0e1a00144aca))
- add error boundary to apps/web for graceful error handling ([51abdd7](https://github.com/Nebutra/Nebutra-Sailor/commit/51abdd79fea9c840f31faf743c549f1bd3d085cf))
- add eslint-plugin-jsx-a11y to web and landing-page for accessibility linting ([03082df](https://github.com/Nebutra/Nebutra-Sailor/commit/03082dfdb12705cc65476eb289ee02c93d5d23af))
- add multi-stage dockerfile for api-gateway ([d0d2c9f](https://github.com/Nebutra/Nebutra-Sailor/commit/d0d2c9feaee4d1138f07685905ad860f8b1db47f))
- add next-intl routing config, request config, and message files ([313842d](https://github.com/Nebutra/Nebutra-Sailor/commit/313842d6576271b2f7441d85709512df027f9146))
- add opentelemetry sdk to packages/logger with otlp exporter ([e9e5be4](https://github.com/Nebutra/Nebutra-Sailor/commit/e9e5be471e581f39a52a82f4e874b347dd52894a))
- add packages/logger with pino structured logging ([1a0da04](https://github.com/Nebutra/Nebutra-Sailor/commit/1a0da047a6d0f16ef2671cd1c377f89d2c354b1c))
- add playwright e2e setup with landing page smoke tests and auth flow tests ([a868f40](https://github.com/Nebutra/Nebutra-Sailor/commit/a868f40730aa0cc95768561006d69f827068eae2))
- add zod env validation to apps/web ([4904185](https://github.com/Nebutra/Nebutra-Sailor/commit/490418504a9b24bec70f257f0f8d2e9cb20b5923))
- add zod env validation to landing-page ([0a85a12](https://github.com/Nebutra/Nebutra-Sailor/commit/0a85a12c79ab643348a8f1021cd46d35d105b8de))
- **api-gateway:** add clerk jwt verification, webhook handlers, and inngest queue ([703862c](https://github.com/Nebutra/Nebutra-Sailor/commit/703862c84ebf9e253513b84374392eac5a173cbe))
- brand migration, custom-ui primitives, aria fixes, and infra scaffold ([b117cbb](https://github.com/Nebutra/Nebutra-Sailor/commit/b117cbbc24bf9666b8ec26520b551c59d284cb1e))
- **brand:** add complete nebutra color scales with transition colors ([a56f7da](https://github.com/Nebutra/Nebutra-Sailor/commit/a56f7dad956f68af9ef725a0f0f6009f56030d07))
- **brand:** add inline svg logo components ([94db2bc](https://github.com/Nebutra/Nebutra-Sailor/commit/94db2bc27c3f72331d837b2ba5ab2c7f7b6e300c))
- **brand:** add motion language, hex grid, shader presets, and geist font ([a305691](https://github.com/Nebutra/Nebutra-Sailor/commit/a30569169546f3774d6aaee33a009c1ab8d83a42))
- **brand:** update docs-hub favicon and logos with nebutra hexagon mark ([ce2f639](https://github.com/Nebutra/Nebutra-Sailor/commit/ce2f639ee2305e283263fc5d1bf27f9e55257124))
- **config:** add resolve-config and public api for preset package ([e9ccb7d](https://github.com/Nebutra/Nebutra-Sailor/commit/e9ccb7d46595eb4d9a496ff5c2f50108b454a3d1))
- **config:** add root nebutra.config.ts, static build scripts, and env cli ([1feec0a](https://github.com/Nebutra/Nebutra-Sailor/commit/1feec0a90b2e2b75d1c85f7a1d8665de52f8e2a1))
- **config:** add zod config schema and define-config helper ([8b6c937](https://github.com/Nebutra/Nebutra-Sailor/commit/8b6c9371284e748e5bf7d618d8c3f6117a7ecbb0))
- **config:** scaffold architecture test suite with vitest + fast-check ([0ad9097](https://github.com/Nebutra/Nebutra-Sailor/commit/0ad9097a6442b8fbabb9a603f7571ebf88e29103))
- **custom-ui:** refine button, avatar, badge components (phases 6-8) ([4556532](https://github.com/Nebutra/Nebutra-Sailor/commit/455653228289776c3b072cbeade43f8dab0d32ce))
- **custom-ui:** update avatar and badge stories to use new apis ([fac5130](https://github.com/Nebutra/Nebutra-Sailor/commit/fac51306c1cd98a18ecf92c89f6aa903fb8d3bc8))
- **design-docs:** add app layout, docs layout, page renderer, component preview, and mdx registry ([6e05686](https://github.com/Nebutra/Nebutra-Sailor/commit/6e05686ec8f37e0a309eba30b5f5bbf5f13d2864))
- **design-docs:** add button, accordion, combobox pilot pages with live previews ([99ce6d7](https://github.com/Nebutra/Nebutra-Sailor/commit/99ce6d700793ce4b476fe651173c55367a759c2d))
- **design-docs:** add fumadocs navigation meta.json for all sections ([1c933a2](https://github.com/Nebutra/Nebutra-Sailor/commit/1c933a2598155834f9f3197b38fae38f56d58a6e))
- **design-docs:** add live previews for 9 priority components ([3af8c1e](https://github.com/Nebutra/Nebutra-Sailor/commit/3af8c1ecb75b0eeab1e3669a8f77d4ed306827cf))
- **design-docs:** add tsconfig, source config, next config, and globals.css ([265899c](https://github.com/Nebutra/Nebutra-Sailor/commit/265899c5d86faeab9936866a4139b0be70f5efa7))
- **design-docs:** init fumadocs app package ([79b87e5](https://github.com/Nebutra/Nebutra-Sailor/commit/79b87e5cd31aae26469068809e1707c22b4e6bad))
- **design-docs:** migrate all atom-components mdx pages ([c303052](https://github.com/Nebutra/Nebutra-Sailor/commit/c3030529a2bfaa4a52098933b2727fd252d24c66))
- **design-docs:** migrate foundations and top-level pages from mintlify ([e8a3a5c](https://github.com/Nebutra/Nebutra-Sailor/commit/e8a3a5caff689bd9b9b02e027ec6103b7722f470))
- **design-docs:** migrate fragment-components and ui-patterns pages ([ee21863](https://github.com/Nebutra/Nebutra-Sailor/commit/ee2186314a7f3b345006ed77e98f57e692871a71))
- **design-system:** add 3-layer token architecture + vi-correct globals/preset ([c7d1d4e](https://github.com/Nebutra/Nebutra-Sailor/commit/c7d1d4ef02ca0531f279073e303ef165fd5b4269)), closes [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [#0BF1C3](https://github.com/Nebutra/Nebutra-Sailor/issues/0BF1C3) [#22c55](https://github.com/Nebutra/Nebutra-Sailor/issues/22c55) [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [#22c55](https://github.com/Nebutra/Nebutra-Sailor/issues/22c55) [#3b82f6](https://github.com/Nebutra/Nebutra-Sailor/issues/3b82f6) [#a855f7](https://github.com/Nebutra/Nebutra-Sailor/issues/a855f7)
- **design-system:** add foundations pages for docs-hub ([cd6afbc](https://github.com/Nebutra/Nebutra-Sailor/commit/cd6afbcbeccbb99b62456670f927a836eb2b2c2f))
- **design-system:** add geist-style 12-step functional color scales ([4161d16](https://github.com/Nebutra/Nebutra-Sailor/commit/4161d163b4b122aa5924223935c9be7a7a05a1d5))
- **design-system:** add named typography utility class scale ([bfc5d82](https://github.com/Nebutra/Nebutra-Sailor/commit/bfc5d829dc99f051306c4512a361c9725650e109))
- **design-system:** add shadow, motion, and border-radius token system ([7b68021](https://github.com/Nebutra/Nebutra-Sailor/commit/7b68021cfb604ade9bd03bf5cc4bb13ae2f2ee3f))
- **design-system:** add token ingestion module (figma/framer/lottie/css) with transformer ([d7c33f7](https://github.com/Nebutra/Nebutra-Sailor/commit/d7c33f7c7eda6dee392be1cd88ebdb8fd53578f7))
- **docs-hub:** add atom-components pages (introduction + 55 atoms) ([ffe795c](https://github.com/Nebutra/Nebutra-Sailor/commit/ffe795cfa9e2d140c5b207f9896767d96f6b7096))
- **docs-hub:** add fragment-components pages (introduction + 18 fragments) ([44e8d4c](https://github.com/Nebutra/Nebutra-Sailor/commit/44e8d4cc3689625f222c20992e84df43a79af877))
- **docs-hub:** add getting started pages (introduction, how-to-use, contributing) ([e15a0e8](https://github.com/Nebutra/Nebutra-Sailor/commit/e15a0e83bece78000bb439660bf91da1fdc2f234))
- **docs-hub:** add mint.json with full navigation structure ([54e4155](https://github.com/Nebutra/Nebutra-Sailor/commit/54e41559a63772e62f58560ce6c6742a66a18beb))
- **docs-hub:** add ui-patterns pages (introduction + 7 patterns) ([94aea66](https://github.com/Nebutra/Nebutra-Sailor/commit/94aea665d3b3bac59d7ae8da0e5bafa1ebbbb7bf))
- **docs-hub:** migrate packages/design-system to apps/docs-hub/design-system ([9c15e78](https://github.com/Nebutra/Nebutra-Sailor/commit/9c15e78e87697841b65455e195be3925badd8fd6))
- **docs-hub:** scaffold docs-hub app with package.json ([b9bcf71](https://github.com/Nebutra/Nebutra-Sailor/commit/b9bcf71b86939673f8245d734dbce19fcd0881aa))
- **docs-hub:** update pnpm-workspace to include apps/docs-hub/\* packages ([ae03ecd](https://github.com/Nebutra/Nebutra-Sailor/commit/ae03ecd7ecbefe8c432cf4cd6e6432a276cb5afc))
- **i18n:** add ja/ko/es/fr/de translations for landing-page ([b9c7a41](https://github.com/Nebutra/Nebutra-Sailor/commit/b9c7a41741e652e7b1b730d33dfaa59d61cacdd7))
- **i18n:** add next-intl routing config, request config, and message files ([871cd9a](https://github.com/Nebutra/Nebutra-Sailor/commit/871cd9a5d3c0ebb756d103a957695d9560fde502))
- **i18n:** wire legal pages, sitemap, and remove legacy i18n files ([9189acf](https://github.com/Nebutra/Nebutra-Sailor/commit/9189acfb9d6ae85933fd618b00f70a37724eee58))
- **i18n:** wire next-intl middleware, plugin, and [lang] layout ([6554894](https://github.com/Nebutra/Nebutra-Sailor/commit/6554894370b356ef7c0b499ffa89d28d0f3bed42))
- **landing-page:** add @nebutra/brand logo to navbar and footer ([e89e4e8](https://github.com/Nebutra/Nebutra-Sailor/commit/e89e4e8aeebd0b89f9f21953e346c83ba01f05c4))
- **landing-page:** add atomic visualizations to feature bento grid ([c5255ee](https://github.com/Nebutra/Nebutra-Sailor/commit/c5255eeb0a173aeeb5857884f109d9214a772681))
- **landing-page:** add high-granularity ui architecture ([426cd19](https://github.com/Nebutra/Nebutra-Sailor/commit/426cd19629e4c62293b24a726b6fd7821d48c4cc))
- **landing-page:** add light/dark theme support to all landing components ([315c521](https://github.com/Nebutra/Nebutra-Sailor/commit/315c521c5f3275b727932f89c7525534cfe52141))
- **landing-page:** add light/dark/system theme support with next-themes ([c38cb89](https://github.com/Nebutra/Nebutra-Sailor/commit/c38cb89c7f8095d5ed494b035e4557176f3b8f81))
- **landing-page:** add light/dark/system theme switcher to navbar ([b721361](https://github.com/Nebutra/Nebutra-Sailor/commit/b721361a7fc8f5683fd7273db35961fc8c203d44))
- **landing-page:** add locale switcher to navbar + fix hydration mismatch ([0e081ea](https://github.com/Nebutra/Nebutra-Sailor/commit/0e081ea2ac6b692ef4449791a15f4f94411f3aa5))
- **landing-page:** apply atomic ui components to sections ([c53f7b5](https://github.com/Nebutra/Nebutra-Sailor/commit/c53f7b508d844c155f39b587637af9721d180d73))
- **landing-page:** decouple auth + rebuild to production-quality design ([3b1a9dd](https://github.com/Nebutra/Nebutra-Sailor/commit/3b1a9dd0c46dc358e54f4f5df84dc4fc04dc419d)), closes [#000](https://github.com/Nebutra/Nebutra-Sailor/issues/000) [#6366f1](https://github.com/Nebutra/Nebutra-Sailor/issues/6366f1)
- **landing-page:** enhance sections with themed layouts and motion effects ([d7be85f](https://github.com/Nebutra/Nebutra-Sailor/commit/d7be85f296b8eba700b4cb6a91f2d79e4c8838f9))
- **landing-page:** high-granularity bento redesign ([1882706](https://github.com/Nebutra/Nebutra-Sailor/commit/18827065a6156ded26310ac1dda808bccf9efa7a))
- **landing-page:** implement micro-landing card system for feature bento ([0873982](https://github.com/Nebutra/Nebutra-Sailor/commit/0873982b0f4bd7700616d30606bc8aaeeab97d72))
- **landing-page:** migrate landing components to next-intl translations ([a885642](https://github.com/Nebutra/Nebutra-Sailor/commit/a8856420868f5a760e2c7a0156791af0eeffde53))
- **landing-page:** optimize testimonials for mobile responsiveness ([cf8c79b](https://github.com/Nebutra/Nebutra-Sailor/commit/cf8c79b2974caf987011f053aed944ef62e925e8))
- **landing-page:** redesign feature-visuals with impactful components ([fe65fe5](https://github.com/Nebutra/Nebutra-Sailor/commit/fe65fe509aace7a076c13c9c827496999aa6e6da))
- **landing-page:** retranslate all locales via lingo.dev + qwen3:1.7b; switch provider to gemma3:1b ([31c97a8](https://github.com/Nebutra/Nebutra-Sailor/commit/31c97a85e007a188d4c084cf191e91f0ececa806))
- **landing-page:** upgrade testimonials section with stagger carousel ([e2d0774](https://github.com/Nebutra/Nebutra-Sailor/commit/e2d07746ad51f38599ad9cc670886801d02d45d2))
- **landing-page:** upgrade testimonials with realistic avatars and 12 items ([f28c9ef](https://github.com/Nebutra/Nebutra-Sailor/commit/f28c9ef9b88dc6741b4514c15b59dabb8c237f11))
- migrate landing components to next-intl translations ([185dfaf](https://github.com/Nebutra/Nebutra-Sailor/commit/185dfaf50092d8f46bbdd1d44e0d262cc3e0d7b3))
- **platform:** fumadocs design docs, landing page refresh, dashboard navigation, billing & audit modules ([73a1195](https://github.com/Nebutra/Nebutra-Sailor/commit/73a1195385bc19c8649f55afb5de32e946b2b9de))
- **preset:** add 10 scenario preset definitions with tests ([c82df5f](https://github.com/Nebutra/Nebutra-Sailor/commit/c82df5f76d2478b70ef8f289b159cc9cb757a48e))
- **preset:** add feature-map env var generator ([af4677b](https://github.com/Nebutra/Nebutra-Sailor/commit/af4677b37da808b6210387946896be0de6d6c549))
- replace all console statements in api-gateway with structured logger ([f1b0d5c](https://github.com/Nebutra/Nebutra-Sailor/commit/f1b0d5cba356a478f838dafc85c2c8a762877763))
- **storybook:** add storybook app + 5 component stories (phases 3–4) ([430cfc7](https://github.com/Nebutra/Nebutra-Sailor/commit/430cfc7590f7fc92a02e8b4c7975a173ad9f6e33))
- **theme:** add css-only theme engine with 6 scenario presets ([933f079](https://github.com/Nebutra/Nebutra-Sailor/commit/933f079df999f66e82c2ae3b7b9e882e0e810177))
- **theme:** wire themes.css into landing-page and web apps ([bc387ca](https://github.com/Nebutra/Nebutra-Sailor/commit/bc387ca7bfe11610853b40f1c1b4fbf0184c99f8))
- **ui:** add book component with 3d spine, texture, illustration, and responsive width ([e46d02c](https://github.com/Nebutra/Nebutra-Sailor/commit/e46d02cfd4a1d5a452088d98774bf70c68b82ab8))
- **ui:** add git platform avatars, avatarwithicon, dicebearavatar ([45fce43](https://github.com/Nebutra/Nebutra-Sailor/commit/45fce4370b0878d4c0a1a7c8269e0edf808e3a9f))
- **ui:** add prefix/suffix adornments and clearable prop to input ([e2ea05a](https://github.com/Nebutra/Nebutra-Sailor/commit/e2ea05a5facf185a3bea2b3b10ed99a728221607))
- **ui:** implement high-granularity ui architecture ([493f61d](https://github.com/Nebutra/Nebutra-Sailor/commit/493f61dd8dc9b4048d7765de2343ee4b8d7890d9))
- **ui:** upgrade badge with sizes, icon prop, aschild, and geist color palette ([50e82f4](https://github.com/Nebutra/Nebutra-Sailor/commit/50e82f4aa8ab11c6e6fd6bcfaa665b20951d2f01))
- **web:** add auth banner component (neon-style left brand panel) ([37db666](https://github.com/Nebutra/Nebutra-Sailor/commit/37db6664052a27591331e5329b776e326afad87e))
- **web:** add auth split layout (40/60 banner + form) ([5ee9529](https://github.com/Nebutra/Nebutra-Sailor/commit/5ee9529dd69a7f6356f5f7c5351a81cbab32a15f))
- **web:** add bare auth layout (no header for sign-in/sign-up) ([faaaf6e](https://github.com/Nebutra/Nebutra-Sailor/commit/faaaf6e8b4c83606fd02617888ff8dc1d4af8a8d))
- **web:** add connect-integrations onboarding step (placeholder cards) ([63ba52c](https://github.com/Nebutra/Nebutra-Sailor/commit/63ba52cc3ef1718eb450684723f3ed1c7f4bf9d0))
- **web:** add create-workspace onboarding step with clerk org creation ([69f163d](https://github.com/Nebutra/Nebutra-Sailor/commit/69f163d90751f5ebc470d77bad301b75977820a9))
- **web:** add custom sign-in form with clerk hooks ([2770959](https://github.com/Nebutra/Nebutra-Sailor/commit/277095964ba3be642bf36a9d4a41a6cd46a6244b))
- **web:** add custom sign-in form with clerk usesignin hook ([fddb2a2](https://github.com/Nebutra/Nebutra-Sailor/commit/fddb2a264624923ea351b4fead1209ce33eb40c4))
- **web:** add custom sign-up form with clerk hooks + otp verification ([f70592c](https://github.com/Nebutra/Nebutra-Sailor/commit/f70592c4f762d13b66b9085e21369fe4b87bf9ba))
- **web:** add custom sign-up form with otp verification ([5c496c9](https://github.com/Nebutra/Nebutra-Sailor/commit/5c496c9453f21cfb93f058667bdcb774107e8b10))
- **web:** add jwt auto-injection for api calls (server + client) ([674ba54](https://github.com/Nebutra/Nebutra-Sailor/commit/674ba5493345fff82571d29be68c5642287b40b1))
- **web:** add oauth buttons component (google + github) ([90f1dc1](https://github.com/Nebutra/Nebutra-Sailor/commit/90f1dc1a2dcb6813b995318367680acab6b8f0d8))
- **web:** add oauth buttons component for google + github ([815c865](https://github.com/Nebutra/Nebutra-Sailor/commit/815c865f0a3ecfa134d48253e86a7f5b669517f9))
- **web:** add onboarding wizard page (2-step: workspace + integrations) ([3d4c65d](https://github.com/Nebutra/Nebutra-Sailor/commit/3d4c65d261551a86b51af8f486e7457981621c8f))
- **web:** add onboarding, select-org, sso-callback to public routes ([d70df07](https://github.com/Nebutra/Nebutra-Sailor/commit/d70df0711fd0ef5ff199d7f51282234ce32feafc))
- **web:** add select-org page for workspace switching ([45e9f99](https://github.com/Nebutra/Nebutra-Sailor/commit/45e9f9977b0e31168a7405d2687916c417a6ccc7))
- **web:** wire custom auth forms into sign-in/sign-up pages ([3b7ac65](https://github.com/Nebutra/Nebutra-Sailor/commit/3b7ac65934ca3e70d9c3a16c44c7886690a5a3bf))
- **web:** wire custom sign-in and sign-up forms into pages ([790ff4c](https://github.com/Nebutra/Nebutra-Sailor/commit/790ff4c7628470f41fc986d70952a6025993e8c4))
- wire alerting error handler and startup initialization in api-gateway ([181cfe3](https://github.com/Nebutra/Nebutra-Sailor/commit/181cfe354e705f6b4bdf7ae00bcbfa567762529e))
- wire i18n into legal layout, pages, sitemap; remove legacy i18n files ([1d253ce](https://github.com/Nebutra/Nebutra-Sailor/commit/1d253ce77ecdb9437e04fab6af5257db32ff94e1))
- wire next-intl middleware, next.config plugin, and [lang] layout ([d947284](https://github.com/Nebutra/Nebutra-Sailor/commit/d947284a18a6e812ea1102317122ce34d4deff37))

### 🐛 Bug Fixes

- adapt web and landing-page to lobehub v5 and next.js 16 apis ([d31ff0b](https://github.com/Nebutra/Nebutra-Sailor/commit/d31ff0b1f0142417705186b613ba2c9f16c2191b))
- add configurable error handler and lifecycle functions to alerting package ([f868a3b](https://github.com/Nebutra/Nebutra-Sailor/commit/f868a3bbb33d7877c65314a560bc041d73465424))
- **api-gateway:** add sigterm graceful shutdown and x-request-id middleware ([791004a](https://github.com/Nebutra/Nebutra-Sailor/commit/791004a24cb2f361f23bf96be1614a6e3f07d0b7))
- **api-gateway:** replace hardcoded cors origins with domain constants and env-driven allowlist ([da4c389](https://github.com/Nebutra/Nebutra-Sailor/commit/da4c389f2ea102a94917b1a4cd2413566ecfb3ea))
- apply type wrapper to separator primitive for radix compat ([2380487](https://github.com/Nebutra/Nebutra-Sailor/commit/23804873d661d1676b9f71af6350fa284246b23b))
- **brand:** use real brand svg assets instead of mockup ([e0dadb5](https://github.com/Nebutra/Nebutra-Sailor/commit/e0dadb5ec986672b8e1d691fa9ddf3a92d7b5fc9))
- **ci:** run valid custom-ui build in lighthouse compare ([9996d28](https://github.com/Nebutra/Nebutra-Sailor/commit/9996d28115b91cb5d7c1404f4cdae340d0fb7247))
- **ci:** skip custom-ui dts in lighthouse snapshots ([a5ff1d2](https://github.com/Nebutra/Nebutra-Sailor/commit/a5ff1d2b2f0778e31a7543270f043a9d9fc304f0))
- **ci:** tolerate worktree cleanup permission errors ([dc5c9e3](https://github.com/Nebutra/Nebutra-Sailor/commit/dc5c9e3e4affc093cabfd527d09fd829cf12fad8))
- **config:** disable frozen lockfile in vercel install ([d8b8abe](https://github.com/Nebutra/Nebutra-Sailor/commit/d8b8abed0769462f2913cf5ec4f40ec613ee3360))
- **config:** drop ppr option removed in next.js 16, use cacheccomponents ([646a903](https://github.com/Nebutra/Nebutra-Sailor/commit/646a903cd74b875e15491317f093c3cf29289bac))
- **config:** env-configurable domains, redis key prefix, vitest coverage thresholds ([d56c08b](https://github.com/Nebutra/Nebutra-Sailor/commit/d56c08bb8d0799a8c752cb13e30544bd61d24a4a))
- **config:** fix exact-optional-property-types violations in errors package ([0549bb9](https://github.com/Nebutra/Nebutra-Sailor/commit/0549bb9c4156215fc54433fa054b50e121e8995f))
- **config:** remove next.js 16 incompatible config options ([5aaeae0](https://github.com/Nebutra/Nebutra-Sailor/commit/5aaeae05114c358d1e167555836d239b06b85904))
- **config:** restore experimental block and fix [@source](https://github.com/source) paths after rename ([ff9de00](https://github.com/Nebutra/Nebutra-Sailor/commit/ff9de007de1eb421ae9dbf54cf45c344b34ca851))
- correct vitest coverage exclude pattern in api-gateway ([10da47c](https://github.com/Nebutra/Nebutra-Sailor/commit/10da47c514d86995ccf8d023e5f9fd09116a9dde))
- **css:** hoist google fonts [@import](https://github.com/import) to top of globals.css ([5757d29](https://github.com/Nebutra/Nebutra-Sailor/commit/5757d29261456f2fc27546f5d06b4ab5413e1f29))
- **custom-ui:** add missing @heroui/slider dependency and remove stray conflict marker ([725c33a](https://github.com/Nebutra/Nebutra-Sailor/commit/725c33af575b9d5d4a001b6fca7e7558be55f7fb))
- **custom-ui:** avoid polymorphic dts break in Box ([7ce6230](https://github.com/Nebutra/Nebutra-Sailor/commit/7ce623072f539d7687f8a3776762f208c4167bc8))
- **custom-ui:** fix marquee animation not working ([4ffc736](https://github.com/Nebutra/Nebutra-Sailor/commit/4ffc736407dc1fd2fb20969d1f7de19e63aa2ebd))
- **custom-ui:** fix testimonial card text overflow and reduce avatar size ([50af86c](https://github.com/Nebutra/Nebutra-Sailor/commit/50af86c3d9ef8d7da9249384c400074cc2c94132))
- **custom-ui:** improve marquee animation stability ([8732e65](https://github.com/Nebutra/Nebutra-Sailor/commit/8732e65b45ffc0d487571083b6644f092c85bd30))
- **deps:** align workspace specs with lockfile ([169e9ac](https://github.com/Nebutra/Nebutra-Sailor/commit/169e9ac376a8fa304bf50513b66d31dce78d450a))
- **deps:** upgrade next and react to patch cve-2025-55182 ([1570cde](https://github.com/Nebutra/Nebutra-Sailor/commit/1570cde349c9dcba1beafb0c37f88a0498ffef31))
- **deps:** upgrade next-intl v3→v4 and @heroui/theme to resolve peer issues ([ea33f7d](https://github.com/Nebutra/Nebutra-Sailor/commit/ea33f7d6b0c660a98ba04c4044d9a601ccf39be7))
- **design-system:** unicorn quality bar fixes (p0-p3) ([ad21ff0](https://github.com/Nebutra/Nebutra-Sailor/commit/ad21ff0f1438fa5604de90a1fc406f970e5df286))
- eliminate phantom exports and rename custom-ui → ui across codebase ([b1d02b1](https://github.com/Nebutra/Nebutra-Sailor/commit/b1d02b1469a7b8fd454e4e3b0c83c2a2f8b9155a))
- improve logger null safety and use pino silent level in tests ([ae7a58d](https://github.com/Nebutra/Nebutra-Sailor/commit/ae7a58dcfde5b5971be172976774bbe97d1f60a4))
- **infra:** detect chrome from playwright image paths ([55e2e1f](https://github.com/Nebutra/Nebutra-Sailor/commit/55e2e1fed2555b381b5bea77f7abd01ab7ec6904))
- **infra:** harden container probe and chrome path guard ([01c55f7](https://github.com/Nebutra/Nebutra-Sailor/commit/01c55f71cfa5828afdcbd716c24b4cab7a5b4492))
- **infra:** resolve chrome path from playwright runtime ([da30607](https://github.com/Nebutra/Nebutra-Sailor/commit/da3060781fa508093a8a8db305ae707e9b49fe0b))
- **infra:** skip custom-ui dts in lighthouse ci ([ba8264f](https://github.com/Nebutra/Nebutra-Sailor/commit/ba8264f39f23c94f099fb9024de39fc5dfd1142c))
- **infra:** stabilize lighthouse workflow on pr runs ([d838650](https://github.com/Nebutra/Nebutra-Sailor/commit/d838650d10fdfcb03769a9cf91032bb9bf3150a8))
- **infra:** unblock lighthouse run on pr branch ([1ed953c](https://github.com/Nebutra/Nebutra-Sailor/commit/1ed953ca171a6cc2c45720fa3e7da61b267e0379))
- **landing-page:** add missing id to testimonial item ([2e4b228](https://github.com/Nebutra/Nebutra-Sailor/commit/2e4b22866e9f0463fadc2d8b246c2edb42d7136f))
- **landing-page:** add tailwindcss import to globals.css ([759871f](https://github.com/Nebutra/Nebutra-Sailor/commit/759871f79a14282379b2ada43fd0f7734115a69d))
- **landing-page:** fix button contrast with explicit black/white colors ([265ecf3](https://github.com/Nebutra/Nebutra-Sailor/commit/265ecf302f6a10caa01ca73de41df74505e74de6))
- **landing-page:** fix eslint and use next/link ([b4212cb](https://github.com/Nebutra/Nebutra-Sailor/commit/b4212cb64a912e81e051fbcfcc92d7c7df8415a5))
- **landing-page:** fix headline animator and update github repo url ([086483f](https://github.com/Nebutra/Nebutra-Sailor/commit/086483fb471085444282df48699e1d4410d8adb0))
- **landing-page:** force white text on buttons with inline style ([062a2e4](https://github.com/Nebutra/Nebutra-Sailor/commit/062a2e461d2850e40d253826445e2be890c19061))
- **landing-page:** implement animatein locally, remove @nebutra/ui/primitives dep ([e1acc65](https://github.com/Nebutra/Nebutra-Sailor/commit/e1acc65e20bcc159029e4e9b982a91c060c86eae))
- **landing-page:** improve bento visual density ([310b277](https://github.com/Nebutra/Nebutra-Sailor/commit/310b2775ef54f0992973bcf8600e7c07482dd192))
- **landing-page:** increase multi-tenant card visual density ([fd0397b](https://github.com/Nebutra/Nebutra-Sailor/commit/fd0397bda19adc3e8485afd9213e3760eaf494e3))
- **landing-page:** integrate clerk auth buttons into navbar ([e596991](https://github.com/Nebutra/Nebutra-Sailor/commit/e5969918259b01c5da9a1f7a1874c635ce014b7e))
- **landing-page:** make tech logos adapt to light/dark theme ([db6c65a](https://github.com/Nebutra/Nebutra-Sailor/commit/db6c65a7be781f1c4e97e76013aa1805277985c8))
- **landing-page:** remove @nebutra/21st dependency ([ab643f7](https://github.com/Nebutra/Nebutra-Sailor/commit/ab643f7179c63148f582ede0e12b9d2367e63b1b))
- **landing-page:** remove duplicate arrow icon from vision cta ([411e9ce](https://github.com/Nebutra/Nebutra-Sailor/commit/411e9ce40971e482c51f7b2d6d8239dc675e9c14))
- **landing-page:** remove pulse ring animation from cta button ([96d44fd](https://github.com/Nebutra/Nebutra-Sailor/commit/96d44fd47ebb77f626a07de779f74a4d04e21ce8))
- **landing-page:** resolve next16 cache-components prerender issues ([5e9a32c](https://github.com/Nebutra/Nebutra-Sailor/commit/5e9a32c4ff232f6ab11487083dbf0e9ba06418e6))
- **landing-page:** sync metadata, og image, and sitemap to new design ([d95725d](https://github.com/Nebutra/Nebutra-Sailor/commit/d95725df87f78974733644eb722687c4b78c92d1))
- **landing-page:** update css import from 21st to custom-ui ([5cf0ac3](https://github.com/Nebutra/Nebutra-Sailor/commit/5cf0ac3e159c5309153731a06d1c96edbd93f97b))
- **landing-page:** update imports to @nebutra/ui, fix next.js 16 config, drop revalidate ([5bca242](https://github.com/Nebutra/Nebutra-Sailor/commit/5bca2427bedf27e9fdf1c4d7f97b14a9cd790871))
- **landing-page:** use typed locale binding in next-intl v4 request config ([030aa76](https://github.com/Nebutra/Nebutra-Sailor/commit/030aa76fa9ef4f124798df23c72a7ac44f89b181))
- remove byline from footer component ([7ea4e01](https://github.com/Nebutra/Nebutra-Sailor/commit/7ea4e01879b8bdb2a2ec24ce117309abd3eeebfb))
- remove console statements from alerting package ([69fcce6](https://github.com/Nebutra/Nebutra-Sailor/commit/69fcce6b38c5fa4c3f55d2c0ecb781ef1f03a5f3))
- remove dwell hint from testimonials section ([0b37ebf](https://github.com/Nebutra/Nebutra-Sailor/commit/0b37ebfbe1d0342af649f8e7fab309a31191af41))
- resolve exact-optional-property-types errors in api-gateway ([64b7cce](https://github.com/Nebutra/Nebutra-Sailor/commit/64b7cce1c238c22ecbc3e18002bb75c484b908f1))
- resolve ui primitives typecheck errors and export radix components ([71eb4e3](https://github.com/Nebutra/Nebutra-Sailor/commit/71eb4e3f148b8efb47a3a00d09a16fadf0d0995d))
- **theme:** restore light mode switch and align web pages to @nebutra/ui ([6c8bda1](https://github.com/Nebutra/Nebutra-Sailor/commit/6c8bda1a83c52398c18acadbcce2872c3c801ef7))
- **theme:** restore light/system/dark switching behavior ([06cf72c](https://github.com/Nebutra/Nebutra-Sailor/commit/06cf72c0e132d78f69a764ab61ae4d2a716066ac))
- **ts:** conditional property assignment and strict type fixes ([ac6e7cf](https://github.com/Nebutra/Nebutra-Sailor/commit/ac6e7cf39e5a9c755942787fdfa0420693c2c7b2))
- **ui:** add vertical gap between testimonial cards ([bef2a0f](https://github.com/Nebutra/Nebutra-Sailor/commit/bef2a0f1b60ddfe59abec6a8cd1f54512893667c))
- **ui:** align marquee3d testimonials with standard design reference ([78df9c0](https://github.com/Nebutra/Nebutra-Sailor/commit/78df9c0090bc79ef66b0e04408c3ad2fd38bff2a))
- **ui:** marquee animation and inngest logo visibility ([9a8e73c](https://github.com/Nebutra/Nebutra-Sailor/commit/9a8e73c7bd8838302714e4c85a94167ef46be374))
- **ui:** match original 3d testimonials design with proper card spacing ([7503a77](https://github.com/Nebutra/Nebutra-Sailor/commit/7503a77f7d26e543aecd561b031f648e1973b6f3))
- **ui:** reduce testimonial avatar size to 20px ([ea9e953](https://github.com/Nebutra/Nebutra-Sailor/commit/ea9e9536782ffdbf626338c9c9f8656930ba009e))
- **ui:** replace polymorphic component as any with react.createelement ([1f93495](https://github.com/Nebutra/Nebutra-Sailor/commit/1f934959e14ae4adad6d5204541205857935e935))
- **ui:** restore and enhance 3d perspective effect for testimonials ([ba322ae](https://github.com/Nebutra/Nebutra-Sailor/commit/ba322ae6e63df4dd8d7238558118bdf654de8d5d))
- **ui:** restore lobe deps and sync lockfile ([e092465](https://github.com/Nebutra/Nebutra-Sailor/commit/e092465850f8a013f19781b6f1f225279a415f7a))
- **ui:** restore original 3d transform values for testimonials ([2ab2c28](https://github.com/Nebutra/Nebutra-Sailor/commit/2ab2c2804d6b6ea8b3702f78d05c43479a5b6cf3))
- **ui:** unblock landing-page vercel build ([5fc1ea5](https://github.com/Nebutra/Nebutra-Sailor/commit/5fc1ea52e6381a38b12b4162fb7ef98a885e8b66))
- update consent test assertions for zod v4 error format ([fc49adf](https://github.com/Nebutra/Nebutra-Sailor/commit/fc49adf46be8aa4b98d0b153233283ea982e87e4))
- **web:** add force-dynamic to onboarding page to prevent clerk prerender error ([190be86](https://github.com/Nebutra/Nebutra-Sailor/commit/190be86af903edae3fe2e27c80456730f58ad888))
- **web:** replace @nebutra/21st with @nebutra/custom-ui ([8ac49bf](https://github.com/Nebutra/Nebutra-Sailor/commit/8ac49bf1d4a7034a15a15954d89d288ee2365755))

### ⚡ Performance Improvements

- add inputs/outputs to turbo tasks for better cache hit rate ([e206a6b](https://github.com/Nebutra/Nebutra-Sailor/commit/e206a6be3a129a15e5cafc7df439a817455b61e6))
- **db:** add compound indexes for tenant-scoped query patterns ([8ed615f](https://github.com/Nebutra/Nebutra-Sailor/commit/8ed615f5845a14e03d095cc61dc18108dbfff710))
- **landing-page:** add hsts+csp headers, remotepatterns, next/image for logos, validated env url ([6a6e760](https://github.com/Nebutra/Nebutra-Sailor/commit/6a6e7602bb80c16dc1a4611279267a12657c4b44))

### ♻️ Code Refactoring

- align architecture with 2026 best practices ([40b91ab](https://github.com/Nebutra/Nebutra-Sailor/commit/40b91ab92c3fcd32b33add377a1e973008bd1070))
- **custom-ui:** make Box polymorphic typing strict without any ([6b9c35e](https://github.com/Nebutra/Nebutra-Sailor/commit/6b9c35e3234a03148770d2a4eafa87d5818f2a96))
- **design-system:** nest mdx pages inside design-system/ for correct section hierarchy ([ba43955](https://github.com/Nebutra/Nebutra-Sailor/commit/ba4395542ce2d2cc47369cf06018b4b402d8aa58))
- extract usemount hook to eliminate hydration pattern duplication ([0859b43](https://github.com/Nebutra/Nebutra-Sailor/commit/0859b43fb2fb2ae04159e4dfbd3036b11d21075c))
- harden @nebutra/ui facade and unify theme selectors ([da44a8f](https://github.com/Nebutra/Nebutra-Sailor/commit/da44a8f75bf268b97cc1369936edfb825ef6af63))
- **landing-page:** align i18n with next-intl v4 best practices ([8ff6106](https://github.com/Nebutra/Nebutra-Sailor/commit/8ff61062f2d8d6bf60d737f4103cf1275ecc216d))
- **landing-page:** replace stagger testimonials with grid layout ([c245e88](https://github.com/Nebutra/Nebutra-Sailor/commit/c245e8820df4d2f37e947e8c53f75daf3b5cd1c4))
- **landing-page:** replace testimonials with 3d marquee ([b9083a7](https://github.com/Nebutra/Nebutra-Sailor/commit/b9083a7a71e14fa9da66791b877041bf5f0f04e9))
- **landing-page:** use audited bento components for feature section ([3c8fb66](https://github.com/Nebutra/Nebutra-Sailor/commit/3c8fb66a055181461b10eb5178f8c7120fef907c))
- **landing-page:** vercel-style redesign with minimal vertical layout ([e0dbb39](https://github.com/Nebutra/Nebutra-Sailor/commit/e0dbb3973dc26490f3ae74600f48a6b171769a44))
- merge @nebutra/design-system into @nebutra/ui ([cbc26b2](https://github.com/Nebutra/Nebutra-Sailor/commit/cbc26b2ee5340abf9f5e2c83859f6541e67bfcf3))
- **ui:** brand-wire visual components to nebutra palette ([a8f714e](https://github.com/Nebutra/Nebutra-Sailor/commit/a8f714e26c2ad581435438b73bab5f133415d4d3))
- unify theme architecture on @nebutra/tokens ([8eba435](https://github.com/Nebutra/Nebutra-Sailor/commit/8eba4357fa868709a032ff3bcc10a9b63f35159a))
- unify token pipeline — document architecture and deprecate JS tokens ([0585b3a](https://github.com/Nebutra/Nebutra-Sailor/commit/0585b3a7ddedbe63bc4b4e03fac12c9a74529728))
- **web:** extract clerk error utility and add resend loading state ([49d008c](https://github.com/Nebutra/Nebutra-Sailor/commit/49d008c2a4bfe8ae02676ab7e6d488cc77160dca))
- **web:** replace custom clerk hooks forms with appearance api (~400 lines removed) ([e96c431](https://github.com/Nebutra/Nebutra-Sailor/commit/e96c431eff45f26ff0973aa8b2e3dafabcd2d489))
- **web:** split root layout — move header to (app) group, auth routes get bare layout ([bd31167](https://github.com/Nebutra/Nebutra-Sailor/commit/bd31167652795e0208e06d528196d804c5b08f50))

### 📚 Documentation

- add api-gateway proxy layer design for ai, content, and billing services ([e97cc41](https://github.com/Nebutra/Nebutra-Sailor/commit/e97cc41c47499e655f5daddf6998bc3f076f60fc))
- add api-gateway proxy layer implementation plan (8 tasks, tdd) ([e2771c7](https://github.com/Nebutra/Nebutra-Sailor/commit/e2771c7f883eaec72fb66462a47af434841a3cea))
- add architecture correction plan and fix CLAUDE.md references ([1428f88](https://github.com/Nebutra/Nebutra-Sailor/commit/1428f88ee7bb9ed877197cc10af86cec4377b519))
- add auth & onboarding design doc (neon-style split layout) ([9875275](https://github.com/Nebutra/Nebutra-Sailor/commit/98752759971a2cb190d72d0cf722d3779042b0a2))
- add auth & onboarding implementation plan (14 tasks) ([2733de8](https://github.com/Nebutra/Nebutra-Sailor/commit/2733de8397c03db05ffa8e7b1fa03a2ae11064fe))
- add best-practices round2 implementation plan (13 tasks) ([e9d8bad](https://github.com/Nebutra/Nebutra-Sailor/commit/e9d8bad117e6f65f55283791e98949e89a17b492))
- add comprehensive architecture review report ([5e5296f](https://github.com/Nebutra/Nebutra-Sailor/commit/5e5296f1f41a638c615416bb23a0d7f59633d866))
- add design system geist quality upgrade design doc ([9909a62](https://github.com/Nebutra/Nebutra-Sailor/commit/9909a62baf934a06ccaed052a60dbb75985f2435))
- add design system geist quality upgrade implementation plan (10 phases) ([7f9c825](https://github.com/Nebutra/Nebutra-Sailor/commit/7f9c825dc8c7a1ca19bc432961f964d2f1812a93))
- add docs-hub design plan for mintlify design system documentation hub ([607e050](https://github.com/Nebutra/Nebutra-Sailor/commit/607e050ac0f4c70740dbbe12497fe24d4c000b11))
- add docs-hub implementation plan (11 tasks, 9 phases) ([c01bdc1](https://github.com/Nebutra/Nebutra-Sailor/commit/c01bdc12c30cd6583b27f9034f6c678333958e7a))
- add multi-scenario template architecture design (11 layers) ([5c2efb0](https://github.com/Nebutra/Nebutra-Sailor/commit/5c2efb082aa9eb8d0ea42bfea0e1339f0b40e7ab))
- add observability, testing and cors design plan ([9d4a931](https://github.com/Nebutra/Nebutra-Sailor/commit/9d4a931e8b747b3620142adbf59f428555a5c5a6))
- add observability/testing/cors implementation plan (8 tasks) ([77ae20d](https://github.com/Nebutra/Nebutra-Sailor/commit/77ae20d8965ef962e6764e9f87d1e7ae26defa12))
- add phase 4 (architecture tests) and phase 5 (token variable manager) to implementation plan ([b99a947](https://github.com/Nebutra/Nebutra-Sailor/commit/b99a947b1c2fe8082d332bcb2e56eddd84defe43))
- add pusher/soketi to tech stack in all readme files ([aec1f55](https://github.com/Nebutra/Nebutra-Sailor/commit/aec1f55e50e409ccacc2b5764f6e0e5821326e5c))
- **design-system:** add comprehensive digital brand vi manual ([e6855a2](https://github.com/Nebutra/Nebutra-Sailor/commit/e6855a2fc400df6bbb323ac2d0ededed31e14468))
- **design-system:** update avatar and brand pages with new components ([87ff266](https://github.com/Nebutra/Nebutra-Sailor/commit/87ff266e52fc5cb89cac675538d67a2cbaa13676))
- **docs-hub:** add brand, grid foundations + upgrade introduction page ([b8855e4](https://github.com/Nebutra/Nebutra-Sailor/commit/b8855e4c5e06d28eb8c8f2c3710a8576d89c0244)), closes [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [#0BF1C3](https://github.com/Nebutra/Nebutra-Sailor/issues/0BF1C3)
- **docs-hub:** fix brand colors + update 5 component docs (phase 5) ([89f9900](https://github.com/Nebutra/Nebutra-Sailor/commit/89f9900804c9e13270a78cfbf0c7aa04f645a738)), closes [#6366f1](https://github.com/Nebutra/Nebutra-Sailor/issues/6366f1) [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [#818cf8](https://github.com/Nebutra/Nebutra-Sailor/issues/818cf8) [#5c7](https://github.com/Nebutra/Nebutra-Sailor/issues/5c7) [#4f46e5](https://github.com/Nebutra/Nebutra-Sailor/issues/4f46e5) [#002ad4](https://github.com/Nebutra/Nebutra-Sailor/issues/002ad4) [#0A0A0](https://github.com/Nebutra/Nebutra-Sailor/issues/0A0A0) [#020617](https://github.com/Nebutra/Nebutra-Sailor/issues/020617)
- finalize CLAUDE.md with token architecture and corrected references ([25e231b](https://github.com/Nebutra/Nebutra-Sailor/commit/25e231bb2b9f7552c60d98c09197864a69b5c201))
- **landing-page:** add high-granularity ui architecture specification ([ff909ee](https://github.com/Nebutra/Nebutra-Sailor/commit/ff909eef14b25f8731f71cbb7f589d7059a31aa7))
- mark 8 backend packages as WIP with status banners ([603c5ae](https://github.com/Nebutra/Nebutra-Sailor/commit/603c5ae96c798ccd2e2449089992d474976c58c2))
- update design system plan with vi manual aesthetic decisions ([7a5034b](https://github.com/Nebutra/Nebutra-Sailor/commit/7a5034b06616235846ff89eb8ad2126654e2dee7))
- **web:** add clerk redirect urls to env example ([532249d](https://github.com/Nebutra/Nebutra-Sailor/commit/532249d56760b19095683f7d36928aed5d0cc0f4))

### ⏪ Reverts

- Revert "fix(landing-page): fix button contrast in light mode" ([94c770f](https://github.com/Nebutra/Nebutra-Sailor/commit/94c770fdabe218a14e4541235ab4732c3bab461b))

## [1.4.1](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.4.0...v1.4.1) (2025-12-03)

### ♻️ Code Refactoring

- **landing-page:** use @nebutra/brand css variables and semantic tokens ([5b0235f](https://github.com/Nebutra/Nebutra-Sailor/commit/5b0235f8ee6dd42148f6428fe45e5c724695a38b)), closes [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [FE/#0BF1C3](https://github.com/FE/Nebutra-Sailor/issues/0BF1C3)

## [1.4.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.5...v1.4.0) (2025-12-03)

### 🆕 Features

- **config:** add product hunt launch infrastructure ([86f68da](https://github.com/Nebutra/Nebutra-Sailor/commit/86f68dacc83bfa22477fb7a8919815eb1469e563))
- **custom-ui:** add new primitives and marketing components ([0d3febc](https://github.com/Nebutra/Nebutra-Sailor/commit/0d3febc202ff3e78fc45d1c9ec25b1192b170716))
- **custom-ui:** add UI components from 21st.dev integration ([5a54f44](https://github.com/Nebutra/Nebutra-Sailor/commit/5a54f44aa164af4d3d40a6f4d7fda11810d45b89))
- **custom-ui:** migrate 21st.dev components to shared package ([db74e6e](https://github.com/Nebutra/Nebutra-Sailor/commit/db74e6eba5858d783226903a6577f51e06e0a036))
- **infra:** add third-party data service for product hunt integration ([052167a](https://github.com/Nebutra/Nebutra-Sailor/commit/052167a995143ea360ba69c94203b31945a2419d))
- **landing-page:** add 3d-testimonails marquee + card/avatar components ([6d924eb](https://github.com/Nebutra/Nebutra-Sailor/commit/6d924ebe89e8fe76f28d3906a5f278ebb07eabf0))
- **landing-page:** add comprehensive design spec and content system ([82d53bd](https://github.com/Nebutra/Nebutra-Sailor/commit/82d53bd4d0be2b424678705bdc11b34d792699b9))
- **landing-page:** add heroui component library support ([8ae4e99](https://github.com/Nebutra/Nebutra-Sailor/commit/8ae4e990fa55520845b0212dffc1e99e5daf72f7))
- **landing-page:** add magicui/shadcn component support ([ad32539](https://github.com/Nebutra/Nebutra-Sailor/commit/ad32539f66b7db93565777b49e0a26eb762d292b))
- **landing-page:** implement all 13 landing page sections ([4167dac](https://github.com/Nebutra/Nebutra-Sailor/commit/4167dac43bc58712ea851e78966ff6b47f114904))
- **landing-page:** testimonials registry + stagger props support ([d96af79](https://github.com/Nebutra/Nebutra-Sailor/commit/d96af79191a9147e51e2e703148aca55d190f02c))
- **ui:** add heroui components and new primitives ([e55cd26](https://github.com/Nebutra/Nebutra-Sailor/commit/e55cd26399fde4822db20673eb1a21b27345a489))
- **ui:** add marketing package with product hunt integration ([f14f15a](https://github.com/Nebutra/Nebutra-Sailor/commit/f14f15ad83702f4ff86bb110bf23525890320822))
- **ui:** add progress, breadcrumb, alert, switch, tabs primitives ([a8e358e](https://github.com/Nebutra/Nebutra-Sailor/commit/a8e358eac6293eb97081721ca6301388f5f95968))
- **ui:** add tree and terminal-control-section-animated components ([cc6eab5](https://github.com/Nebutra/Nebutra-Sailor/commit/cc6eab54294d122e13aa52176288f653fe83a11e))
- upgrade to Prisma 7 best practices ([f6b94fa](https://github.com/Nebutra/Nebutra-Sailor/commit/f6b94faffad8833a5e756d5afa1a96f16b3aa671))

### 🐛 Bug Fixes

- add db:generate to prerelease script for CI ([ae1353d](https://github.com/Nebutra/Nebutra-Sailor/commit/ae1353d51a599e20c0d6fac590acff7addfd2e77))
- **api-gateway:** resolve typescript errors for fetch response and prisma imports ([e07698f](https://github.com/Nebutra/Nebutra-Sailor/commit/e07698f525d5853d062bb02a144f32762f553bdf))
- **db:** import prismaclient from @nebutra/db in billing package ([807674a](https://github.com/Nebutra/Nebutra-Sailor/commit/807674ac67b22609607fc3dc89dd747a9139f00b))
- **db:** resolve prisma 7 ts2742 error with pnpm ([28f0ac0](https://github.com/Nebutra/Nebutra-Sailor/commit/28f0ac025ba905eebc1cdab1dd7f674ba3f5f349)), closes [prisma/prisma#28581](https://github.com/prisma/prisma/issues/28581)
- **landing-page:** apply primer typography scale for better pc layout ([504f55f](https://github.com/Nebutra/Nebutra-Sailor/commit/504f55fcff9f74184911869d96a7c4fa3753fb34))
- remove unsupported prisma format from lint-staged ([c6255bc](https://github.com/Nebutra/Nebutra-Sailor/commit/c6255bc9b38d04a423aca3dd10268d39646ff657))
- resolve Text variable conflict in ErrorState.tsx ([6c98804](https://github.com/Nebutra/Nebutra-Sailor/commit/6c9880400f27310fdd5efcf9a8fdf5f7314516c7))
- **ui:** use design-system css variables for marketing components ([c7b0b8b](https://github.com/Nebutra/Nebutra-Sailor/commit/c7b0b8b1ff351cc9e1aa889e6d60c6466aed0062))

### 📚 Documentation

- add growth hacking concept and rename twitter to x ([6f0dff9](https://github.com/Nebutra/Nebutra-Sailor/commit/6f0dff9f4147d12da3ce14a2d68e9d23650722e2))
- add Prisma 7 development guide to @nebutra/db README ([0fccd23](https://github.com/Nebutra/Nebutra-Sailor/commit/0fccd23ae7f5de22c26560d51d0c7ec77246dd44))
- add three-layer product hunt architecture relationship ([5d09d09](https://github.com/Nebutra/Nebutra-Sailor/commit/5d09d0994e283c7ea3ae0a0420a8920f2422431b))
- integrate vibe business concept ([1fbba65](https://github.com/Nebutra/Nebutra-Sailor/commit/1fbba657199df6216954ea48ef2334e614bc6744))
- **ui:** add todo for marketing components redesign ([9926154](https://github.com/Nebutra/Nebutra-Sailor/commit/9926154527398c8cbc8fdc30e0ed9737fffd93dd))

## [1.3.5](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.4...v1.3.5) (2025-12-01)

### 🐛 Bug Fixes

- add missing eslint dependencies for lint-staged ([4507a88](https://github.com/Nebutra/Nebutra-Sailor/commit/4507a88e36992886118860aedffe8e809307ae74))

## [1.3.4](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.3...v1.3.4) (2025-12-01)

### 🐛 Bug Fixes

- remove deprecated Box from @primer/react v38 ([6d1d055](https://github.com/Nebutra/Nebutra-Sailor/commit/6d1d055bd433eb6872b81242ad9585e5327a0ee1))

## [1.3.3](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.2...v1.3.3) (2025-12-01)

### 🐛 Bug Fixes

- **design-system:** add StyleSheetManager to filter unknown props like sx ([a79a3a9](https://github.com/Nebutra/Nebutra-Sailor/commit/a79a3a9b2460ba4904e15cfaf0ea8a8acf0a2e60))

## [1.3.2](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.1...v1.3.2) (2025-12-01)

### 🐛 Bug Fixes

- extract Clerk auth to client component for React 19 compatibility ([79b7ecb](https://github.com/Nebutra/Nebutra-Sailor/commit/79b7ecb067ab98dcaecb2bc14dec063a75a40e6d))

### 📚 Documentation

- center social links on separate lines ([0bbace7](https://github.com/Nebutra/Nebutra-Sailor/commit/0bbace714ab010d2cac2a63c68077dcca4378452))
- fix X/Discord badges - separate lines, centered ([9df8fe0](https://github.com/Nebutra/Nebutra-Sailor/commit/9df8fe0032186fae8333b5cbf779c6a6f9b4dc5c))

## [1.3.1](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.3.0...v1.3.1) (2025-12-01)

### 🐛 Bug Fixes

- clean legal pages lint + error state typing ([dca11a6](https://github.com/Nebutra/Nebutra-Sailor/commit/dca11a6d256a1922d6cf7ddf376b24744a81498c))
- **design-system:** annotate ErrorState return type ([70c8c17](https://github.com/Nebutra/Nebutra-Sailor/commit/70c8c1732fed9ab99097576cc1c904a5e0ce20a1))

### ♻️ Code Refactoring

- use canonical Tailwind class shrink-0 ([2cfafd8](https://github.com/Nebutra/Nebutra-Sailor/commit/2cfafd821684d64a804ae26d2ec4f82b1415b634))

## [1.3.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.2.0...v1.3.0) (2025-12-01)

### 🆕 Features

- **billing:** database-driven plan configuration ([e26a0b8](https://github.com/Nebutra/Nebutra-Sailor/commit/e26a0b8a587346b5c55ecfa8ec41be699c3d2ce5))
- **brand:** update with VI manual specifications ([05b51b3](https://github.com/Nebutra/Nebutra-Sailor/commit/05b51b31316f7bd5a43972841c7e9ec356e7f5d2)), closes [#0033](https://github.com/Nebutra/Nebutra-Sailor/issues/0033) [#0BF1C3](https://github.com/Nebutra/Nebutra-Sailor/issues/0BF1C3)
- **custom-ui:** add marketing module skeleton ([a6f91bf](https://github.com/Nebutra/Nebutra-Sailor/commit/a6f91bf86a3e3433361203851151ccad54304d9f))
- **design-system:** add marketing infrastructure spec and tokens ([9b43b83](https://github.com/Nebutra/Nebutra-Sailor/commit/9b43b83e3123c2bdadcaf92c221ccc661934104f))
- **legal:** Add Legal & Compliance infrastructure ([8c7be73](https://github.com/Nebutra/Nebutra-Sailor/commit/8c7be73bfa8e17df2545de15d74a4ce19592e0c5))

### 🐛 Bug Fixes

- **docs:** replace broken badge icons with native emoji h3 headers ([2eec35e](https://github.com/Nebutra/Nebutra-Sailor/commit/2eec35ec92e647f5087b639715f387a6303c1cb7))
- **docs:** sync Japanese README Tech Stack with English version ([b330d5d](https://github.com/Nebutra/Nebutra-Sailor/commit/b330d5db76ff9bb331616f52be0eb411ba162d86))
- unblock builds (consent types, web 404) ([205920c](https://github.com/Nebutra/Nebutra-Sailor/commit/205920c910dab69b656116da164a98c606366537))

### 📚 Documentation

- add company positioning statement to readmes ([57caa27](https://github.com/Nebutra/Nebutra-Sailor/commit/57caa275ef751ee13dfd470186624f6687f11d84))
- add hero taglines, manifesto, and updated footers (en/zh/ja) ([52c8235](https://github.com/Nebutra/Nebutra-Sailor/commit/52c82355046722f627705afea2c97d576dd169a9))
- add Japanese README for better SEO/GEO coverage ([a531788](https://github.com/Nebutra/Nebutra-Sailor/commit/a53178807773cb7d28dd146b4c195c1cf32a85ed))
- center focus grid in readmes (en/zh/ja) ([1a66021](https://github.com/Nebutra/Nebutra-Sailor/commit/1a66021998978433d242168cf7347dc8b3590f23))
- redesign company and features sections with html tables ([def2158](https://github.com/Nebutra/Nebutra-Sailor/commit/def215836f931655999d2b75155584eeb63cbaab))
- set brand heading to 'nebutra intelligence' (en/zh/ja) ([46cff33](https://github.com/Nebutra/Nebutra-Sailor/commit/46cff33edc3fcfb01fe06ee86c567a05b2ce41b6))
- update README with billing, legal, marketing UI features ([a848709](https://github.com/Nebutra/Nebutra-Sailor/commit/a848709b62cd749a56fbea85bd8a1ddd1216d5cc))

## [1.2.0](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.1.1...v1.2.0) (2025-12-01)

### 🆕 Features

- **billing:** add billing & monetization infrastructure ([a1618a0](https://github.com/Nebutra/Nebutra-Sailor/commit/a1618a031dd3f466cbff1f410cda897cab56c9ca))

## [1.1.1](https://github.com/Nebutra/Nebutra-Sailor/compare/v1.1.0...v1.1.1) (2025-12-01)

### 🐛 Bug Fixes

- add tsup config for custom-ui package ([d12cc80](https://github.com/Nebutra/Nebutra-Sailor/commit/d12cc80e0cb6c954f747511452eb2adb4b819ca8))

## 1.1.0 (2025-12-01)

### 🆕 Features

- add @nebutra/brand package for centralized brand assets ([92036e4](https://github.com/Nebutra/Nebutra-Sailor/commit/92036e43082b353476021a3ec1195657bafa92b5))
- add @nebutra/ui package with Lobe UI/Icons integration ([79c8fd6](https://github.com/Nebutra/Nebutra-Sailor/commit/79c8fd6bf5b8094efe57829a93fa60dadba7e934))
- add AI service (FastAPI) with generate, embed, translate endpoints ([886f8fd](https://github.com/Nebutra/Nebutra-Sailor/commit/886f8fdee00ae05abfc7cc9dea6e964365cc004b))
- add api-gateway BFF with Hono, health and status routes ([b2b3cf2](https://github.com/Nebutra/Nebutra-Sailor/commit/b2b3cf2e9b028eaa0c359c45fa8207e7d68b7b7d))
- add brand assets directory structure ([17b3645](https://github.com/Nebutra/Nebutra-Sailor/commit/17b3645723a89c34d72573c7bf4bb5037226ab20))
- add CAPTCHA infrastructure (Cloudflare Turnstile) ([9365f98](https://github.com/Nebutra/Nebutra-Sailor/commit/9365f98022157c57a9f8ee38b90aaeac375e67eb))
- add Cloudflare infrastructure (CDN, WAF, R2) ([0f611b3](https://github.com/Nebutra/Nebutra-Sailor/commit/0f611b3e8bd92f6f872fffb71578d92fd3cdcd2f))
- add content service and recsys recommendation service (Step 7) ([c350d31](https://github.com/Nebutra/Nebutra-Sailor/commit/c350d3148750d76d4c36cd54fb74ac23809414fc))
- add dynamic OG images and app icons ([4a57a39](https://github.com/Nebutra/Nebutra-Sailor/commit/4a57a397ef9bd3a62794766b9d448214a02ba865))
- add ecommerce and web3 services (Step 8) ([0765f08](https://github.com/Nebutra/Nebutra-Sailor/commit/0765f0886898c9916198f2e6d2f8c24a7bf3fd9a))
- add event-bus, saga, cache packages and infra configs (Step 9) ([dc9fe9b](https://github.com/Nebutra/Nebutra-Sailor/commit/dc9fe9bf400e2f6fc54f274b61bae00d64585717))
- add landing-page and web apps with Clerk auth and i18n ([bfac6d6](https://github.com/Nebutra/Nebutra-Sailor/commit/bfac6d61b87f2c5cdc37aab711afdea5af479411))
- add MCP/Smithery infrastructure package ([a493c00](https://github.com/Nebutra/Nebutra-Sailor/commit/a493c003b5098249a4cb1141b922271e8e7e4a29))
- add Nebutra brand assets ([8d970b5](https://github.com/Nebutra/Nebutra-Sailor/commit/8d970b5b1fd12530aef566dd8b86ace9acf5952d))
- add OpenStatus monitoring and production deployment configs (Steps 10-11) ([5b430f9](https://github.com/Nebutra/Nebutra-Sailor/commit/5b430f9ce03de273755b1905fe7ff5e09c6d6187))
- add packages/db with Prisma schema for multi-tenant support ([ae2f5e4](https://github.com/Nebutra/Nebutra-Sailor/commit/ae2f5e4318f49ff384cbf1d51fdbc8ad9f2c5fe8))
- add production domain configuration ([1317e55](https://github.com/Nebutra/Nebutra-Sailor/commit/1317e55418a180b27b4bb25556b8dfb68375dc9d))
- add rate-limit package and tenant/rateLimit middlewares ([c57427b](https://github.com/Nebutra/Nebutra-Sailor/commit/c57427b55de5ef59b4acf6e88c071b5cee2016c7))
- add robots.txt and noindex directives ([d63954e](https://github.com/Nebutra/Nebutra-Sailor/commit/d63954e48cd5050f29b5e12a32a2cfa93a9239d8))
- add Sanity CMS infrastructure ([2ddcd85](https://github.com/Nebutra/Nebutra-Sailor/commit/2ddcd85d01931344db2474321ea5999ece831c6f))
- add Vercel config for Sanity Studio deployment ([7b40393](https://github.com/Nebutra/Nebutra-Sailor/commit/7b403935bcd7135010fdc76fc376ddebfc222c0e))
- add white-label brand customization system ([52df4fa](https://github.com/Nebutra/Nebutra-Sailor/commit/52df4fa6c21a220e72259477e963b6a6fb28905d))
- **analytics:** add dub-powered analytics package ([13f41c5](https://github.com/Nebutra/Nebutra-Sailor/commit/13f41c514dc75f7557eb50b8c5970bca9078cf9f))
- **apps:** integrate @nebutra/ui into web and landing-page ([c13a2c4](https://github.com/Nebutra/Nebutra-Sailor/commit/c13a2c489115aa94a61908d26da3cd5625b3aa9a))
- **brand:** inline brand logo SVG paths into hero banners ([761c1cc](https://github.com/Nebutra/Nebutra-Sailor/commit/761c1cc6adf204020c3fb7fdd196c17fdc3bd215))
- complete sitemap with Sanity CMS integration ([b206613](https://github.com/Nebutra/Nebutra-Sailor/commit/b206613527f9fb5a006368b9ae7b632cb9948207))
- **design-system:** add @nebutra/ui with Primer integration ([40dea4c](https://github.com/Nebutra/Nebutra-Sailor/commit/40dea4c0cd8f1470d74cff95dcabbea42656068d))
- **design-system:** add typography system with open-source fonts ([8d3974d](https://github.com/Nebutra/Nebutra-Sailor/commit/8d3974d33c44a7581b0007af4be10b5ed744a238))
- enhance Clerk auth infrastructure ([581c052](https://github.com/Nebutra/Nebutra-Sailor/commit/581c052150a2d042b8b83e37558b2dd8a5b41a0b))
- **infra:** add n8n workflow automation platform ([73931b9](https://github.com/Nebutra/Nebutra-Sailor/commit/73931b9c869109f985ff71894d08b68307a80f79))
- SEO/GEO friendly configuration for Product Hunt ([d0b5c18](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b5c189d1ebfd12f1ba569919c3fd013fb2021c))
- **supabase:** add supabase package and update RLS policies ([7ddbfc6](https://github.com/Nebutra/Nebutra-Sailor/commit/7ddbfc68f5f2fef5f874286d2e2e29a16576d82b))
- **ui-infra:** complete design system integration infrastructure ([d0e7574](https://github.com/Nebutra/Nebutra-Sailor/commit/d0e75746d5eab16f5db7da092a82fa13ab2bccfc))

### 🐛 Bug Fixes

- add @clerk/nextjs dependency to landing-page ([19947a2](https://github.com/Nebutra/Nebutra-Sailor/commit/19947a23f05bd3f59f7264d5bd74c5fff02a4052))
- **ci:** remove explicit pnpm version (use packageManager from package.json) ([f707f40](https://github.com/Nebutra/Nebutra-Sailor/commit/f707f4007bf9c8105244f4ad8f956e386cc1f0e2))
- **ci:** remove invalid lint scripts from packages without eslint config ([9fee1b0](https://github.com/Nebutra/Nebutra-Sailor/commit/9fee1b06052411227fa8064add8188adbe204355))
- **ci:** remove test scripts from packages without test files ([e63b282](https://github.com/Nebutra/Nebutra-Sailor/commit/e63b282e6aefe492acc009afa48c5f2b9f79a347))
- **db:** add missing prisma models and integrate with api-gateway ([2bf33cb](https://github.com/Nebutra/Nebutra-Sailor/commit/2bf33cb37f224a01bd6f3d517f4681d0837947ef))
- **design-system:** resolve export conflicts with explicit named exports ([170fb29](https://github.com/Nebutra/Nebutra-Sailor/commit/170fb2939c7bb0a267c2a8c691aaf0f38905a1ad))
- make builds work without Clerk env vars ([745c497](https://github.com/Nebutra/Nebutra-Sailor/commit/745c497c32dcb2b97ba41a6ada5981ebf7d4f098))
- rename schemas to schemaTypes for Sanity convention ([3d6ac87](https://github.com/Nebutra/Nebutra-Sailor/commit/3d6ac8749b699cfdfe167c3b4a356c3a0957c79d))
- resolve CI/typecheck failures across monorepo ([75b3487](https://github.com/Nebutra/Nebutra-Sailor/commit/75b3487b119b771fa268c000185df5f79fe66a5b))
- resolve React 19 type conflicts with Primer React ([a2366e1](https://github.com/Nebutra/Nebutra-Sailor/commit/a2366e1ca359e355e4db986f40cb222d2f13df09))
- resolve unsupported shields.io badge logos ([ed6d5e7](https://github.com/Nebutra/Nebutra-Sailor/commit/ed6d5e79f02581a944cd53d42e581f48e5fd3653))
- **turbo:** remove duplicate db:generate task definition ([0904cba](https://github.com/Nebutra/Nebutra-Sailor/commit/0904cba7dbb2916219a815ada94e108aa29e29fc))
- unify typography CSS variables as SSOT ([76ec51d](https://github.com/Nebutra/Nebutra-Sailor/commit/76ec51d05f88ae01c9d4809e421f6334b5e7d96f))
- use actual brand logo in README header ([5bd35e8](https://github.com/Nebutra/Nebutra-Sailor/commit/5bd35e8232f894f7f2501d33bd1bce32783ee7b8))
- use correct package names in vercel build commands ([e0e2f0c](https://github.com/Nebutra/Nebutra-Sailor/commit/e0e2f0c4821898cd91db99f7d4f15bff94dd48b7))

### ♻️ Code Refactoring

- replace SQL schema with Prisma 7 as single source of truth ([d60211a](https://github.com/Nebutra/Nebutra-Sailor/commit/d60211a9c4def595b79cbec2589e5c57688367ef))
- restructure infra for enterprise-grade architecture ([fc5af06](https://github.com/Nebutra/Nebutra-Sailor/commit/fc5af063934f2d2bd815e390fa51e6b7a3adec0d))

### 📚 Documentation

- add design-system to README files ([6548502](https://github.com/Nebutra/Nebutra-Sailor/commit/65485020cbf0546684d6e6ef7c23d431b9c24d7e))
- add documentation index with complete navigation ([721ce0f](https://github.com/Nebutra/Nebutra-Sailor/commit/721ce0f7356c832e1fd84918a6e15e8b81b7b98a))
- add React 19 types compatibility note ([422269d](https://github.com/Nebutra/Nebutra-Sailor/commit/422269de5fe75d59f3a14697a73d53746a35aaa1))
- add readme files for services, infra, and packages ([e9d092a](https://github.com/Nebutra/Nebutra-Sailor/commit/e9d092a6675749fb06e3c1d3b8936636b09adfca))
- clarify design system architecture relationships ([f300b7f](https://github.com/Nebutra/Nebutra-Sailor/commit/f300b7f04ac80b706d1448475c96f787504148a7))
- **readme:** add new packages to project structure ([90dbd32](https://github.com/Nebutra/Nebutra-Sailor/commit/90dbd32bfed4702f865c2fc7fe0d2338db35d1db))
- **readme:** add White-label section ([6526b13](https://github.com/Nebutra/Nebutra-Sailor/commit/6526b139c64a6ff394b1abb1db04aa7694ae0e2c))
- **readme:** YC-style pitch sections (EN/ZH), brand vision, sanitized case blurbs ([310609f](https://github.com/Nebutra/Nebutra-Sailor/commit/310609f439f440c4821dac8299417add08434bf6))
- split README into separate EN/ZH versions with language switcher ([38f0da2](https://github.com/Nebutra/Nebutra-Sailor/commit/38f0da2affa3dd2510608466f483bb0aeba19a1b))
- update readme with documentation section and new packages ([668cd8c](https://github.com/Nebutra/Nebutra-Sailor/commit/668cd8c4f2db4dc9ce84121bcf1dc37129dedb6d))
- update README with YC-style branding and bilingual content ([d245514](https://github.com/Nebutra/Nebutra-Sailor/commit/d245514cfc6c674418976915802f3b6e536c86b5))
- update READMEs to reflect design system architecture ([eb14c8b](https://github.com/Nebutra/Nebutra-Sailor/commit/eb14c8b5d7ad74734b3aaa8091db6f2e5b86ee84))
- update READMEs with missing features ([ad0dfcb](https://github.com/Nebutra/Nebutra-Sailor/commit/ad0dfcb3366cc4981f1a1098185de0839f691595))
- **whitelabel:** add typography and design system customization guide ([acadd86](https://github.com/Nebutra/Nebutra-Sailor/commit/acadd86446da031750fbcfe25c261a59ec539e67))
- wire hero banners and icon grid into READMEs ([3ddd1ae](https://github.com/Nebutra/Nebutra-Sailor/commit/3ddd1ae05e5b1713361b295cc597ef20dc28d1c6))

# Changelog

All notable changes to Nebutra-Sailor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with monorepo architecture
- Multi-tenant BFF layer with rate limiting and circuit breaker
- AI service integration (LLM, embeddings, translation)
- Content management microservice
- Recommendation system pipeline
- E-commerce sync service (Shopify/Shopline)
- Web3 blockchain indexer
- MCP (Model Context Protocol) integration for AI agent tools
- Comprehensive caching strategies (TTL, lock, stampede prevention, lazy refresh)
- Event-driven communication via event bus
- Saga pattern for distributed transactions
- Inngest workflow integration for background jobs

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

---

<!--
Release history will be automatically generated below this line.
Each release follows the format:

## [X.Y.Z] - YYYY-MM-DD
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

[Unreleased]: https://github.com/your-org/nebutra-sailor/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/nebutra-sailor/releases/tag/v1.0.0
-->
