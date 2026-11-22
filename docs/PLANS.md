# PLANS.md — Initial Delivery Plan (Phases 1–3)

> **Status:** DRAFT v0.1 — preliminary and subject to change as new information or requirements emerge.
> **Prepared:** 2026-11-18
> **Project start:** November 2026
> **Overall approach:** Three-phase delivery roadmap, approximately 14–15 weeks, with working functionality delivered incrementally.

Items marked **[TBC]** are to be confirmed. Items marked **[ASSUMPTION]** are taken as true for planning purposes and must be validated. Items marked **[PROPOSED]** are my suggestions, not agreed decisions.

---

## 1. Summary

| Phase | Name | Indicative window | Outcome |
|---|---|---|---|
| 1 | Agent Time Savers | Weeks 1–5 (late Nov – late Dec 2026) | Platform foundation, extended CMA skill, core integrations, first usable agent time savers |
| 2 | Living Listing Record and Agent Dashboard | Weeks 6–10 (late Dec 2026 – Jan 2027) | **MVP** of the living listing record and agent dashboard (MVP, not full completion) |
| 3 | Listing Marketing Intelligence | Weeks 11–15 (from Feb 2027) | Marketing intelligence on top of a stable living listing record |

Total: ~15 weeks. The holiday period (late Dec – early Jan) is a schedule risk; see Section 9.

---

## 2. Clarifications and Assumptions

### 2.1 Project-level assumptions

- **[ASSUMPTION]** UI designs are complete and approved.
- **[ASSUMPTION]** Workflows are complete and approved.
- **[ASSUMPTION]** Project materials (briefs, designs, sample reports, access details) will be provided by the client at kickoff.
- **[ASSUMPTION]** The platform foundation is built from scratch (no existing codebase to inherit).
- **[ASSUMPTION]** Phase 3 depends on Phase 2 being stable, particularly the living listing record.

### 2.2 Phase 1 assumptions

- **[ASSUMPTION]** A CMA (comparative market analysis) skill already exists and only needs to be extended.
- **[TBC]** Which software or platform is currently used to generate CMA reports.
- **[ASSUMPTION]** For every integration below, the client will provide the necessary authentication details, the service will already be available, and permissions will be granted **before** integration development begins.

### 2.3 Integrations in scope

| Integration | Purpose (to confirm) | Known constraints | Status |
|---|---|---|---|
| Granola (https://www.granola.ai) | Meeting notes / transcripts as input to agent workflows | Need to verify API availability, auth model, and data access | [TBC] |
| Compass | Brokerage platform data the agents use | **No public API.** See Section 8 for options | [TBC] — decision required |
| MLS (Triangle MLS / Flexmls) | Authoritative listing data | Licensed feed; credentials and terms from MLS; verify API access and cost | [TBC] |
| Google Workspace (email) | Drafting, sending, and reading agent email | OAuth consent, scopes, and admin approval likely required | [TBC] |

---

## 3. Open Questions (resolve early)

1. Which platform/software generates CMA reports today, and what format are the outputs?
2. What does the existing CMA skill do, where does it live, and how is it invoked?
3. What exactly are the "agent time savers" in Phase 1? (Confirm the prioritized list with the client.)
4. Compass: official access, MLS-only, or accepted-risk alternative? (Section 8.)
5. Does Granola offer an API suitable for this use, and what are its limits?
6. What MLS access exists via Triangle MLS/Flexmls, what does it cost, and what data-use restrictions apply?
7. Who administers Google Workspace, and what is the approval process for OAuth scopes?
8. Who are the users (number of agents), and what are their roles and permissions?
9. Hosting and compliance requirements (cloud provider, data residency, retention)?
10. What does "MVP" mean for Phase 2 — which features are in and which are explicitly deferred?
11. Success metrics for each phase (time saved per agent, adoption, accuracy)?
12. What is "feature vs complexity" for Phase 3 — which marketing intelligence features does the client want, and which are costly relative to value?

---

## 4. Proposed Technical Approach

> All items in this section are **[PROPOSED]** and open to change.

### 4.1 Stack

- **Runtime/language:** Node.js with TypeScript
- **API layer:** REST (e.g., Fastify or Express); consider a job queue for long-running work
- **Database:** PostgreSQL (listing record needs relational integrity and change history)
- **Queue/background jobs:** Redis-backed queue (e.g., BullMQ) for syncs, report generation, and email
- **Frontend:** Per approved UI designs (framework to be confirmed against the designs)
- **Auth:** Single sign-on via Google Workspace if the client uses it for staff **[TBC]**
- **Hosting:** Cloud provider **[TBC]**; containerized deployment
- **Observability:** Structured logging, error tracking, basic metrics and alerts
- **CI/CD:** Automated lint, test, build, and deploy to staging and production

### 4.2 Architecture principles

- **Adapter pattern for every external source.** Each integration (Granola, MLS, Compass, Google Workspace) sits behind an interface, so sources can be added, swapped, or removed without reworking core logic. This is especially important for Compass.
- **Source of truth is explicit.** For each data field, document which system owns it (e.g., MLS owns listing status and price).
- **Idempotent, resumable syncs.** Integrations can fail partway; re-running must be safe.
- **Audit trail.** Every change to a listing record is stored with source, timestamp, and actor. This underpins the "living" listing record.
- **Least privilege.** Request the minimum OAuth scopes and API permissions needed.
- **Secrets management.** No credentials in code or repos; use a secrets manager or environment-level secrets.

### 4.3 High-level components

1. **Core platform:** auth, users/roles, configuration, job runner, logging
2. **Integration layer:** adapters for Granola, MLS, Google Workspace, and Compass (if approved)
3. **Agent skills:** CMA (extended), meeting-to-action workflows, email drafting, and others as confirmed
4. **Listing domain:** living listing record, change history, and sync engine
5. **Agent dashboard:** UI surfacing listings, tasks, and activity
6. **Marketing intelligence:** analysis and recommendations built on listing data (Phase 3)

---

## 5. Phase 1 — Agent Time Savers

**Goal:** Stand up the platform foundation and deliver the first agent-facing time savers, so value is visible early.

**Indicative window:** Weeks 1–5

### 5.1 Scope

1. **Platform foundation (from scratch)**
2. **Existing CMA platform:** confirm the current tooling and extend the existing CMA skill
3. **Integrations:** Granola, MLS (Triangle MLS/Flexmls), Google Workspace (email), and Compass per the Section 8 decision
4. **Initial agent time savers** (final list to be confirmed with the client)

### 5.2 Work breakdown

**Week 1 — Kickoff and foundations**
- Kickoff; collect project materials, designs, workflows, and access details
- Resolve the Section 3 open questions that block work (CMA platform, integration access)
- Repository, branching strategy, CI/CD pipeline, and environments (dev/staging/prod)
- Data model v0; architecture decision records (ADRs) for key choices
- Request all integration credentials and permissions (start approvals now; they have lead time)

**Week 2 — Core platform**
- Auth, user/role model, configuration management
- Job queue and scheduler, logging, error tracking
- Adapter interfaces for external sources
- Test harness and fixtures

**Week 3 — CMA skill extension**
- Review the existing CMA skill and report output
- Define the extension requirements with the client
- Implement the extension; connect to MLS data when available
- Validate against sample CMA reports provided by the client

**Week 4 — Integrations**
- Google Workspace: OAuth flow, email draft/send/read as required
- Granola: ingest meeting notes/transcripts (subject to API availability)
- MLS: read-only listing data adapter with caching and rate-limit handling
- Compass: implement per the Section 8 decision (or document it as out of scope)

**Week 5 — Time-saver workflows, hardening, handover**
- Wire integrations into the agreed time-saver workflows
- End-to-end testing with real or realistic data
- Security review, error handling, retry behavior
- Documentation, runbook, demo to the client, collect feedback

### 5.3 Deliverables

- Deployed platform foundation in staging (and production if agreed)
- Extended CMA skill
- Working adapters for the integrations that are approved and accessible
- At least the agreed first set of agent time savers
- Technical documentation and runbook

### 5.4 Acceptance criteria (draft)

- Agents can run the extended CMA flow end to end and produce a report matching client-approved expectations
- Integration adapters authenticate, fetch data, and handle failures without data loss
- Email actions work through Google Workspace with correct permissions
- Test suite passes in CI; deployment is repeatable

### 5.5 Dependencies

- Credentials, permissions, and service availability for all integrations (per the assumption in 2.2)
- Project materials and approved designs and workflows
- Client availability for review and feedback

---

## 6. Phase 2 — Living Listing Record and Agent Dashboard (MVP)

**Goal:** Deliver an MVP of the living listing record and agent dashboard. This is **MVP scope, not full completion**.

**Indicative window:** Weeks 6–10, target **January 2027**.

### 6.1 What "living listing record" means (working definition — TBC)

A single, continuously updated record per listing that merges data from multiple sources (MLS first), keeps a full history of changes, and links related activity (CMA reports, meeting notes, emails, tasks).

### 6.2 MVP scope (proposed — to be agreed)

**In scope**
- Listing record data model with source attribution and change history
- MLS-driven sync: create/update listings, track status and price changes
- Linking of related artifacts (CMA reports, emails, meeting notes) to a listing
- Agent dashboard: list view, listing detail view, recent activity, basic filters and search
- Role-based access (agents see the listings they are permitted to see)

**Out of scope for MVP (candidates for later)**
- Advanced analytics and reporting
- Bulk editing and automation rules
- Mobile-optimized or native apps
- Full Compass data merge (unless Section 8 yields an approved source)
- Anything deferred in the MVP definition agreed with the client

### 6.3 Work breakdown

**Week 6 — Design and data model**
- Finalize the listing record schema, history model, and source-of-truth rules
- Map approved UI designs to components and API endpoints
- Plan the MLS sync strategy (frequency, deltas, deletions, rate limits)

**Week 7 — Sync engine and listing API**
- Build the MLS sync (initial load and incremental updates)
- Listing API (read, search, filter, history)
- Conflict-handling rules when sources disagree

**Week 8 — Dashboard UI (core views)**
- Implement dashboard shell, list view, and listing detail
- Wire the activity feed and linked artifacts

**Week 9 — Integration with Phase 1 capabilities**
- Attach CMA reports, emails, and meeting notes to listing records
- Permissions and role enforcement
- Performance tuning and pagination

**Week 10 — Stabilization and MVP release**
- Bug fixing, UX polish, accessibility pass
- Data quality checks against MLS
- UAT with a pilot group of agents
- MVP release and feedback capture

### 6.4 Deliverables

- Living listing record (MVP) with change history
- Agent dashboard (MVP) per approved designs
- Documentation of data model, sync behavior, and known gaps
- MVP backlog: what was deferred and why

### 6.5 Acceptance criteria (draft)

- Listing changes in the MLS appear in the record within the agreed latency, with history preserved
- Agents can find a listing, view its record and history, and see linked artifacts
- Access controls prevent users from viewing data outside their permissions
- No data loss or duplication across repeated syncs (idempotency verified)

### 6.6 Dependencies and risks specific to Phase 2

- MLS access, licensing, and data-use terms (display and storage restrictions may apply — verify)
- Quality and consistency of MLS data
- Holiday-period availability of the client and MLS contacts

### 6.7 Exit gate for Phase 3

Phase 3 begins only when the living listing record is **stable**. Proposed definition of stable (TBC):
- Sync running reliably for a sustained period (e.g., two weeks) without data-integrity incidents
- Schema changes have slowed to a minimum
- Pilot users confirm the record is trustworthy

---

## 7. Phase 3 — Listing Marketing Intelligence

**Goal:** Use the stable living listing record to provide marketing intelligence for agents.

**Indicative window:** Weeks 11–15, beginning next year (Feb 2027), **contingent on Phase 2 stability**.

> **Note:** Feature scope versus complexity needs to be discussed with the client before this phase is committed. The items below are placeholders, not agreed scope.

### 7.1 Candidate features (to prioritize with the client)

- Listing performance insights (views, inquiries, time on market) — depends on what data is accessible
- Comparable and market-position analysis using MLS data
- Pricing and positioning recommendations
- Marketing content suggestions (listing descriptions, emails, social copy) tied to listing data
- Campaign tracking and activity summaries per listing
- Alerts (price changes, stale listings, market shifts)

### 7.2 Discovery and prioritization (Week 11)

- Workshop with the client to rank candidate features by value versus complexity
- Confirm which data is actually available (marketing and engagement data may sit in systems without public APIs, such as Compass)
- Define success metrics and a reduced first-release scope

### 7.3 Work breakdown (indicative, depends on chosen scope)

**Week 12 — Data foundation for intelligence**
- Identify additional data sources and adapters needed
- Build derived metrics pipeline on top of the listing record
- Define data refresh cadence

**Weeks 13–14 — Feature implementation**
- Implement the prioritized intelligence features
- Integrate into the agent dashboard and listing detail views
- Validate outputs with sample listings and agent feedback

**Week 15 — Validation, release, handover**
- Accuracy and usefulness review with pilot agents
- Documentation and training material
- Release and post-release monitoring plan

### 7.4 Deliverables

- Prioritized and delivered marketing intelligence features (scope TBC)
- Dashboard integration
- Documentation and metrics report

### 7.5 Acceptance criteria (draft, finalize in Week 11)

- Each delivered feature has agreed success measures
- Outputs are explainable (agents can see what data supports a recommendation)
- Performance is acceptable on the full listing set

### 7.6 Risks specific to Phase 3

- Required engagement or marketing data may be inaccessible (no public Compass API)
- Scope creep, since "intelligence" is open-ended
- Recommendation quality is hard to verify without agent feedback

---

## 8. Compass Integration — Decision Required

Compass does not offer a public API. I could not find an official one, and no documented endpoint exists to build against. Options:

| Option | Description | Pros | Cons |
|---|---|---|---|
| A. Official access | Ask Compass (or the client's brokerage contacts) about sanctioned access or data export | Supported, stable, lowest legal risk | Uncertain availability and lead time |
| B. MLS-only | Rely on MLS for listing data; skip Compass | Licensed, stable, already planned | Excludes Compass-internal data (CRM, marketing) |
| C. Third-party scraper | Use community scraping tools (e.g., Apify actors) | Fast to prototype | Unofficial, can break at any time, terms-of-service and data-licensing risk for the client |

**Recommendation [PROPOSED]:** Make **B (MLS)** the foundation, pursue **A (official access)** in parallel as an enhancement, and avoid **C** for production. Use C, if at all, only as a throwaway prototype.

**Actions**
1. Raise on the client call: what is needed from Compass that the MLS does not provide?
2. If the answer is "nothing critical," drop Compass integration and simplify the plan.
3. Build the integration layer with an adapter interface so a Compass source can be added later without rework.
4. If scraping is ever considered, get the client's counsel to review the terms and data-licensing implications first.

---

## 9. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Integration credentials/permissions not ready at start | Medium | High | Request on day one; track approvals weekly; stub adapters meanwhile |
| 2 | Compass has no public API | Certain | Medium–High | Section 8 decision; adapter pattern |
| 3 | MLS licensing/data-use restrictions limit storage or display | Medium | High | Confirm terms with Triangle MLS in Week 1; design for compliance |
| 4 | Granola API limited or unavailable | Medium | Medium | Verify in Week 1; fall back to manual upload/export if needed |
| 5 | Google Workspace OAuth approval delays | Medium | Medium | Start the admin approval process early; minimal scopes |
| 6 | Holiday period reduces availability and throughput | High | Medium | Plan around known dates; front-load blocking work in Phase 1 |
| 7 | Assumed-complete designs/workflows turn out to be incomplete | Medium | High | Design review in Week 1; flag gaps early |
| 8 | CMA skill needs more than "extension" | Medium | Medium | Review in Week 1 before committing Phase 1 estimates |
| 9 | Phase 2 scope expands beyond MVP | Medium | High | Written MVP definition; change control |
| 10 | Phase 3 scope is open-ended | High | Medium | Value-versus-complexity workshop; reduced first release |
| 11 | Data quality issues in MLS feed | Medium | Medium | Validation checks, source attribution, anomaly alerts |
| 12 | Security/privacy exposure (client and consumer data) | Low–Medium | High | Least privilege, secrets management, access logs, security review |

---

## 10. Cross-Cutting Concerns

### 10.1 Security and privacy
- Encrypt data in transit and at rest
- Role-based access control; audit logging for sensitive actions
- Rotate and securely store credentials; no secrets in source control
- Review personal data in emails and meeting notes: retention, access, and consent **[TBC with client]**
- Respect MLS data-use rules

### 10.2 Testing
- Unit tests for domain logic; contract tests for each adapter
- Integration tests using recorded fixtures or sandbox accounts where available
- End-to-end tests for key workflows (CMA, sync, dashboard)
- UAT with a pilot group before each phase release

### 10.3 Delivery and communication
- Weekly demo and status update to the client
- Short written change log for scope or timeline changes
- Incremental releases at the end of each phase (and mid-phase where practical)

### 10.4 Documentation
- ADRs for significant technical decisions
- Data model and sync behavior documentation
- Runbook: deployment, monitoring, common failures
- User guide for agents (before pilot)

---

## 11. Milestones (indicative)

| Milestone | Target |
|---|---|
| Kickoff and access requests submitted | Week 1 |
| Platform foundation in staging | End of Week 2 |
| Extended CMA skill demo | End of Week 3 |
| Phase 1 integrations working | End of Week 4 |
| **Phase 1 complete** — time savers demo | End of Week 5 |
| Listing record data model and sync design signed off | End of Week 6 |
| Sync engine running against MLS | End of Week 7 |
| Dashboard core views | End of Week 8 |
| **Phase 2 MVP release** (target January 2027) | End of Week 10 |
| Phase 3 scope workshop (gated on Phase 2 stability) | Week 11 |
| **Phase 3 release** | End of Week 15 |

Dates are approximate and depend on the start date, access approvals, and holiday availability.

---

## 12. Decisions Needed From the Client

1. Confirm the prioritized list of Phase 1 agent time savers
2. Compass approach (Section 8)
3. MVP definition for Phase 2
4. Hosting environment and compliance requirements
5. Pilot group of agents for UAT
6. Point of contact for each integration (Granola, MLS, Google Workspace, Compass)
7. Phase 3 feature priorities (after Phase 2 stability)

---

## 13. Change Log

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-11-18 | 0.1 | Initial draft | — |

---

## 14. Notice of Potential Changes

The scope, timeline, and phasing outlined above may change as new information or requirements emerge. Adjustments will be communicated as soon as they are identified.
