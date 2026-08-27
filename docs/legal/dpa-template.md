# Data Processing Agreement — Template

> ⚠️ **Template for review, not an executed agreement.** This is provided so
> your privacy and legal teams can assess our position early in procurement.
> The binding instrument is a DPA signed by both parties. **Have counsel
> review before signing.** We are also willing to execute against your
> standard DPA paper.

## 0. Read this first: who processes what

In the **standard self-hosted deployment, Nebutra is not a processor of your
personal data at all.** You run the software; you choose and contract with
every downstream provider (database, authentication, email, LLM, object
storage); we never receive, store, or access the data.

In that configuration:

- **You** are the controller **and** you engage your own processors directly.
- **We** supply software, not a data-processing service. A DPA with us is
  usually unnecessary, and signing one that inaccurately casts us as a
  processor creates a misleading record.

A DPA with us is appropriate only where we actually process personal data on
your behalf, namely:

| Scenario | Our role |
| --- | --- |
| Self-hosted, no support data shared | **Not a processor.** No DPA required. |
| Support engagement where you share logs, dumps, or grant access to your systems | **Processor**, limited to support data |
| Any hosted or managed capability we operate for you | **Processor**, per the service description |
| Marketing site, sales contact, licence purchase | **Controller** of that contact data — see our privacy notice |

The rest of this template covers the processor scenarios.

---

## 1. Definitions

"GDPR" means Regulation (EU) 2016/679. "PIPL" means the Personal Information
Protection Law of the PRC. "Controller", "Processor", "Data Subject",
"Personal Data", "Processing", and "Supervisory Authority" have the meanings
given in the GDPR, and their functional equivalents under PIPL and other
applicable law. "Customer" is the party engaging Nebutra. "Nebutra" is Wuxi
Nebutra Intelligence Technology Co., Ltd.

## 2. Roles and scope

Customer is the Controller. Nebutra is the Processor, and processes Personal
Data only to deliver the services described in the applicable order form.

## 3. Processing details

To be completed per engagement:

| Item | Value |
| --- | --- |
| Subject matter | *e.g. technical support for the Sailor platform* |
| Duration | Term of the applicable agreement, plus the deletion window in §9 |
| Nature and purpose | *e.g. diagnosing defects from logs and database extracts supplied by Customer* |
| Categories of Data Subject | *e.g. Customer's end users, Customer's staff* |
| Categories of Personal Data | *e.g. identifiers, email addresses, IP addresses, application-log contents* |
| Special-category data | *Default: none. If any, list it — it changes the controls required.* |

## 4. Nebutra's obligations

Nebutra shall:

1. Process Personal Data **only on Customer's documented instructions**,
   including as to international transfers, unless required otherwise by law —
   in which case Nebutra will notify Customer first unless the law forbids it.
2. Ensure personnel authorised to process Personal Data are bound by
   confidentiality.
3. Implement the technical and organisational measures in §6.
4. Respect the sub-processor conditions in §5.
5. Assist Customer, taking account of the nature of processing, in responding
   to Data Subject rights requests.
6. Assist Customer with obligations under GDPR Articles 32–36 (security, breach
   notification, impact assessments, prior consultation).
7. Delete or return Personal Data per §9.
8. Make available information necessary to demonstrate compliance and allow
   audits per §8.

## 5. Sub-processors

1. Customer grants **general written authorisation** for Nebutra to engage
   sub-processors.
2. Nebutra maintains a current sub-processor list, provided on request and with
   the Enterprise compliance pack.
3. Nebutra gives Customer **at least 30 days' notice** before adding or
   replacing a sub-processor.
4. Customer may object on reasonable data-protection grounds within the notice
   period. If the objection cannot be resolved, Customer may terminate the
   affected service and receive a pro-rata refund of prepaid fees.
5. Nebutra imposes data-protection obligations on each sub-processor no less
   protective than this DPA, and remains fully liable for their performance.

## 6. Security measures

Nebutra maintains appropriate technical and organisational measures, including:

- Encryption of Personal Data in transit (TLS 1.2+) and at rest
- Access on a least-privilege, need-to-know basis, with MFA required
- Logging and monitoring of access to systems holding Personal Data
- Secure development practices — static analysis, dependency auditing, secret
  scanning, build provenance (see
  [Security & Compliance](./security-compliance.md))
- Documented incident response
- Regular review of measures against the state of the art and the risk

**Support-data minimisation.** Where Customer shares data for support,
both parties will use anonymised or synthetic reproductions where these are
sufficient, and Nebutra will request only the minimum data needed.

## 7. Personal data breach

Nebutra notifies Customer **without undue delay and in any case within 48
hours** of becoming aware of a Personal Data Breach affecting Customer's data,
providing the nature of the breach, categories and approximate numbers
affected, likely consequences, and measures taken or proposed. Where full
information is not available at once, it is supplied in phases without
further undue delay.

## 8. Audit

1. Nebutra makes available information necessary to demonstrate compliance.
2. Customer may audit no more than **once per 12 months**, on 30 days' notice,
   during business hours, subject to confidentiality — plus additionally after
   a Personal Data Breach or where required by a Supervisory Authority.
3. Nebutra may satisfy audit requests with an independent third-party report
   where one covers the scope in question.
4. Each party bears its own audit costs, save that Customer reimburses
   Nebutra's reasonable costs for audits beyond the annual allowance.

## 9. Return and deletion

On termination, or on Customer's written request, Nebutra deletes or returns
all Personal Data and deletes existing copies within **30 days**, except where
storage is required by law. Support artefacts (logs, extracts) are deleted on
closure of the support matter or within 90 days, whichever is sooner.

## 10. International transfers

Where processing involves transfer of Personal Data out of the EEA, UK, or
Switzerland, the parties execute the **EU Standard Contractual Clauses**
(Decision 2021/914, Module Two: Controller to Processor) and the UK
International Data Transfer Addendum, which are incorporated by reference and
prevail over this DPA in the event of conflict.

Where PIPL applies to outbound transfers from the PRC, the parties execute the
CAC **Standard Contract for Cross-border Transfer of Personal Information** and
complete the associated filing and impact assessment.

## 11. Liability

Liability under this DPA is subject to the limitations in the master
agreement, save where applicable law does not permit limitation.

## 12. Precedence

In case of conflict: the SCCs prevail over this DPA; this DPA prevails over
the master agreement on data-protection matters; the master agreement governs
everything else.

---

**Signature block, effective date, and completed §3 table are supplied on the
executed version.**

**Contact:** [legal@nebutra.com](mailto:legal@nebutra.com)

*Template version: 2026-07-26*
