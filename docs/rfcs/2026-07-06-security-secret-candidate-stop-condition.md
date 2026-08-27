# RFC B4: 候选密钥位置触发安全停机条件

Status: Proposed
Priority: Highest
Date: 2026-07-06
Dimensions: B4 安全架构评审

## Delta Scope

本提案来自 2026-06-28 自动化基线之后的治理评审。安全子项先执行了只输出位置、不输出正文的候选密钥扫描。扫描仍留下少量非占位符语义过滤后的候选位置，因此 B4 中“硬编码密钥/连接串排查”子项按停机条件处理。

本评审没有修改代码、配置或权限。

## Current State

以下位置需要人工安全复核。为避免泄露，本文只记录位置，不记录任何疑似明文：

| Location | Note |
| --- | --- |
| `apps/sailor-docs/content/docs/en/configuration/environment-variables.mdx:20` | redacted candidate |
| `apps/sailor-docs/content/docs/en/integrations/github.mdx:30` | redacted candidate |
| `apps/sailor-docs/content/docs/zh/configuration/environment-variables.mdx:20` | redacted candidate |
| `docs/阿里云ECS部署指南.md:156` | redacted candidate |
| `infra/iac/k8s/base/configmaps/pgbouncer-config.yaml:15` | redacted candidate |
| `packages/platform/db/README.md:89` | redacted candidate |

这些位置可能是文档示例、测试样例或占位配置，也可能包含真实样式的凭据。当前自动化不能安全地区分二者，因此需要人工复核。

## Tradeoffs

Option A: 立即人工复核这些位置，确认是否为真实凭据。

- Pros: 最快降低泄露风险，符合“疑似即停”的安全边界。
- Cons: 需要安全或平台 owner 读取上下文；自动化不能代替人工判断。

Option B: 在代码评审中继续架构分析，但暂不处理候选位置。

- Pros: 不阻塞其他治理提案。
- Cons: 如果候选为真实凭据，继续推进其他事项会把高优先级泄露风险后置。

Option C: 自动删除或重写候选行。

- Pros: 表面上快速消除扫描命中。
- Cons: 可能破坏文档、示例或部署配置；也违反本次任务禁止修改代码/配置的约束。

Recommended direction: Option A. 先完成候选位置复核；如果任一位置是真实凭据，立即走撤销、轮换、审计和历史清理流程。

## Decision Information Needed

- 每个候选位置是否为真实凭据、无效示例、占位符，或仅因格式类似被误报。
- 若为真实凭据：凭据类型、作用域、是否已暴露到远端仓库、是否仍有效。
- 若为示例：是否应改为更明显的占位写法，避免后续扫描重复报警。
- 是否需要将这些路径加入“安全示例允许列表”，以及允许列表是否必须带 owner 和到期日。
- 是否需要补充一个只输出位置、绝不输出值的 CI 安全扫描模式。

## Proposed Decision Path

1. 由安全或平台 owner 在本地查看候选上下文，不在 issue、RFC 或日志中复制明文。
2. 对真实凭据执行撤销/轮换，并检查历史记录和下游部署状态。
3. 对示例凭据改用不可误用的占位格式，但该改动应在单独实现 PR 中进行。
4. 为允许存在的示例建立带 owner、原因和复核周期的规则。

## Non-Goals

- 本 RFC 不回显任何疑似密钥、token、连接串或私钥。
- 本 RFC 不修改候选文件。
- 本 RFC 不自动创建账号、不授予权限、不调整共享访问控制。
