# 13 — Research Compendium

**Status:** Canonical research reference  
**Date compiled:** 2026-05-20  
**Purpose:** summarize external research relevant to Wovith’s staging, architecture, security, compliance, and positioning.

This document is intentionally practical. Each reference includes the implication for Wovith.

## R-MCP — Model Context Protocol and Google Workspace MCP

### R-MCP-01 — Google Workspace MCP servers are real, but preview-stage

**Source:** Google for Developers, “Configure the Google Workspace MCP servers”  
**URL:** https://developers.google.com/workspace/guides/configure-mcp-servers

Google documents remote MCP servers for Workspace products including Gmail, Drive, Calendar, and Chat. The documentation states that the feature is Developer Preview and that MCP servers allow AI agents to read data, take actions such as creating drafts/uploading/scheduling, and inherit user permissions/data governance.

**Implication for Wovith:** MCP is strategically aligned with Wovith, but Wovith should not hard-depend on Workspace MCP as the only connector path for early production. Build connector ports that can use MCP or direct APIs.

### R-MCP-02 — MCP authorization requires serious OAuth/resource handling

**Source:** Model Context Protocol Specification, Authorization, 2025-11-25  
**URL:** https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization

The MCP authorization spec frames protected MCP servers as OAuth resource servers. It emphasizes resource indicators/audience binding, protected resource metadata, token validation, and secure token storage.

**Implication for Wovith:** Connector security cannot be an afterthought. Tokens should be resource-bound where applicable, stored securely, and never synced in lens docs.

### R-MCP-03 — MCP specification emphasizes consent, privacy, and tool safety

**Source:** Model Context Protocol Specification, 2025-11-25  
**URL:** https://modelcontextprotocol.io/specification/2025-11-25

The MCP spec’s security guidance emphasizes explicit user consent, data privacy, tool safety, and caution around tools as arbitrary capabilities. It also warns that tool behavior metadata should be considered untrusted unless from a trusted server.

**Implication for Wovith:** Wovith should own a Wovith-side permission/action gate. It should not blindly trust tool descriptions or let MCP tools run without user-understandable consent.

### R-MCP-04 — MCP resources expose context; tools perform operations

**Source:** MCP Resources and Tools specs  
**URLs:**  
https://modelcontextprotocol.io/specification/2025-11-25/server/resources  
https://modelcontextprotocol.io/specification/2025-11-25/server/tools

MCP distinguishes resources, tools, and prompts. Resources expose context/data; tools allow external operations.

**Implication for Wovith:** Wovith should distinguish read context from executable tools in UI, policy, and audit. Resources may feed cells. Tools require action governance.

### R-MCP-05 — MCP launched as a standard for connecting AI assistants to data/tools

**Source:** Anthropic, “Introducing the Model Context Protocol”  
**URL:** https://anthropic.com/news/model-context-protocol

MCP was introduced as an open standard for secure, two-way connections between AI-powered tools and data sources.

**Implication for Wovith:** MCP is an important ecosystem direction, but Wovith’s differentiation should be inspectable lenses, not merely MCP support.

### R-MCP-06 — Google announced Workspace MCP as part of broader agent tools

**Source:** Google Workspace Updates, “New: Agent tools and security updates for Workspace developers,” May 2026  
**URL:** https://workspaceupdates.googleblog.com/2026/05/agent-tools-and-security-updates-for-workspace-developers.html

Google describes Workspace MCP server and agent tools as ways for developers to bring Workspace capabilities into AI applications and agents.

**Implication for Wovith:** The market is moving toward AI agents with app access. Wovith should differentiate through user-owned, inspectable, persistent views.

## R-GOOGLE — Gmail, OAuth, and Google user data policy

### R-GOOGLE-01 — Gmail restricted scopes require verification and may require security assessment

**Source:** Google for Developers, “Choose Gmail API scopes”  
**URL:** https://developers.google.com/workspace/gmail/api/auth/scopes

Google categorizes Gmail scopes and notes that restricted scopes provide wide access to Google user data. If restricted-scope data is stored on servers or transmitted, a security assessment is required.

**Implication for Wovith:** Avoid Gmail broad scopes and server-side storage of restricted data in early stages. Start metadata/read-only, then body read carefully, then drafts, then destructive actions much later.

### R-GOOGLE-02 — Google API Services User Data Policy requires limited use

**Source:** Google API Services User Data Policy  
**URL:** https://developers.google.com/terms/api-services-user-data-policy

Google’s Limited Use policy requires data obtained via specified scopes to be used only for user-facing features that are visible/prominent in the requesting app, with restricted transfers and human-access limitations.

**Implication for Wovith:** Wovith’s data use must be visible in the UI. Avoid hidden mining, raw-data transfer, or non-user-facing use of Google data.

### R-GOOGLE-03 — Sensitive scope verification

**Source:** Google Identity, “Sensitive scope verification”  
**URL:** https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification

Apps requesting sensitive or restricted scopes generally need verification unless an exception applies.

**Implication for Wovith:** Scope minimization is a product and business priority, not just engineering hygiene.

### R-GOOGLE-04 — Restricted scope verification

**Source:** Google Identity, “Restricted scope verification”  
**URL:** https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

Restricted scopes involve additional verification requirements. Google’s docs describe production readiness expectations for apps requesting such access.

**Implication for Wovith:** Build an explicit scope roadmap and do not surprise users or Google reviewers with broad access.

### R-GOOGLE-05 — Google Workspace API user data/developer policy

**Source:** Google Workspace API user data and developer policy  
**URL:** https://developers.google.com/workspace/workspace-api-user-data-developer-policy

Google requires limited use of data from Workspace APIs, visible/prominent user-facing use cases, and careful handling of data derived from sensitive/restricted scopes.

**Implication for Wovith:** Wovith’s lens UI should visibly correspond to data use. Hidden analysis and broad server storage are risky.

## R-OAUTH — OAuth and browser/native security

### R-OAUTH-01 — OAuth 2.0 for browser-based apps recommends secure browser patterns

**Source:** IETF OAuth 2.0 for Browser-Based Applications draft  
**URL:** https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps

The draft describes threats and best practices for OAuth clients running in browsers, including modern code-flow approaches instead of implicit flow.

**Implication for Wovith:** Web OAuth needs deliberate architecture. Avoid storing long-lived secrets in unsafe browser storage.

### R-OAUTH-02 — OAuth 2.0 Security Best Current Practice

**Source:** RFC 9700, OAuth 2.0 Security Best Current Practice  
**URL:** https://www.rfc-editor.org/rfc/rfc9700.html

RFC 9700 updates OAuth security guidance based on newer threats and deprecates insecure modes of operation.

**Implication for Wovith:** Use authorization code + PKCE, secure token storage, no implicit grant, and careful redirect/audience handling.

## R-LLMSEC — LLM and agent security

### R-LLMSEC-01 — OWASP Top 10 for LLM Applications

**Source:** OWASP Top 10 for Large Language Model Applications  
**URL:** https://owasp.org/www-project-top-10-for-large-language-model-applications/

OWASP tracks major LLM application risks including prompt injection, sensitive information disclosure, insecure plugin design, excessive agency, system prompt leakage, vector weaknesses, misinformation, and unbounded consumption.

**Implication for Wovith:** Wovith’s security model must treat prompt injection, excessive agency, sensitive data disclosure, and cost/budget exhaustion as core risks.

### R-LLMSEC-02 — OWASP LLM01 Prompt Injection

**Source:** OWASP GenAI Security Project, LLM01 Prompt Injection  
**URL:** https://genai.owasp.org/llmrisk/llm01-prompt-injection/

OWASP describes direct and indirect prompt injection as manipulations that can alter model behavior and bypass intended controls.

**Implication for Wovith:** Emails/docs/calendar descriptions/web pages are untrusted external content. They cannot become instructions.

### R-LLMSEC-03 — NIST AI Risk Management Framework / Generative AI Profile

**Source:** NIST AI Risk Management Framework  
**URL:** https://www.nist.gov/itl/ai-risk-management-framework

NIST’s Generative AI Profile identifies risks and actions for managing generative AI risk across lifecycle and governance.

**Implication for Wovith:** Use a risk register, red-team tests, transparency, monitoring, and lifecycle controls for agentic features.

### R-LLMSEC-04 — NIST work on AI agent security considerations

**Source:** NIST concept/RFI work on AI agent cybersecurity and authorization risks  
**URL:** https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd

NIST has highlighted risks from giving AI agents access to diverse data, tools, and applications, with emphasis on identification and authorization controls.

**Implication for Wovith:** Agent authority should be explicit and bounded by code-enforced controls.

## R-LOCAL — Local-first and Automerge

### R-LOCAL-01 — Local-first software principles

**Source:** Ink & Switch, “Local-first software: You own your data, in spite of the cloud”  
**URL:** https://www.inkandswitch.com/essay/local-first/

The local-first essay describes principles for software that supports offline work, collaboration, privacy, long-term preservation, and user control.

**Implication for Wovith:** Local-first is a strong product promise for lens definitions and calibration. Be precise about external source data.

### R-LOCAL-02 — Automerge as local-first sync engine

**Source:** Automerge  
**URL:** https://automerge.org/

Automerge describes itself as a local-first sync engine for apps that work offline, prevent conflicts, and support multiplayer data.

**Implication for Wovith:** Automerge fits lens/cell/canvas/calibration documents. It does not automatically solve external source history or token sync.

### R-LOCAL-03 — Automerge CRDT docs

**Source:** Automerge docs  
**URL:** https://automerge.org/docs/hello/

Automerge is based on CRDTs that merge concurrent changes without requiring a central server.

**Implication for Wovith:** Useful for collaborative/local-first definitions, but validation and invariants still matter.

## R-STRUCT — Structured outputs and NL→AST

### R-STRUCT-01 — Claude structured outputs

**Source:** Claude API Docs, Structured Outputs  
**URL:** https://platform.claude.com/docs/en/build-with-claude/structured-outputs

Claude structured outputs support JSON schema-based response shapes with limitations and operational considerations such as schema compilation latency/caching.

**Implication for Wovith:** Structured outputs support AST-first authoring but still require validation, repair, and tests.

### R-STRUCT-02 — Claude strict tool use

**Source:** Claude API Docs, Strict Tool Use  
**URL:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use

Strict tool use constrains tool inputs to match JSON schema.

**Implication for Wovith:** Useful for reliable tool/action parameters, but Wovith still executes tools only after policy and user approval.

### R-STRUCT-03 — OpenAI structured outputs

**Source:** OpenAI API Docs, Structured Outputs  
**URL:** https://developers.openai.com/api/docs/guides/structured-outputs

OpenAI structured outputs support schema-conformant responses.

**Implication for Wovith:** Provider abstraction can support structured AST generation. Schema conformance is not semantic correctness.

## R-MOBILE — Capacitor and platform requirements

### R-MOBILE-01 — Capacitor 8 environment setup

**Source:** Capacitor docs, Environment Setup  
**URL:** https://capacitorjs.com/docs/getting-started/environment-setup

Current Capacitor docs list core requirements such as NodeJS 22+ and mobile platform development dependencies.

**Implication for Wovith:** Do not scaffold mobile casually. Toolchain requirements affect CI and developer setup.

### R-MOBILE-02 — Capacitor 8 update guide

**Source:** Capacitor docs, Updating to 8.0  
**URL:** https://capacitorjs.com/docs/updating/8-0

Capacitor 8 update docs include native platform requirements such as Xcode 26+, Android Studio 2025.2.1+, and Android SDK variables including minSdkVersion 24 and compile/target SDK 36.

**Implication for Wovith:** Mobile should be staged after the web lens loop proves value.

## R-PROV — Provenance standards

### R-PROV-01 — W3C PROV-DM

**Source:** W3C, PROV-DM: The PROV Data Model  
**URL:** https://www.w3.org/TR/prov-dm/

PROV-DM defines domain-agnostic provenance concepts and relationships.

**Implication for Wovith:** Wovith can specialize entities, activities, and agents, but user-facing provenance should be simpler than a full graph.

### R-PROV-02 — W3C PROV-O

**Source:** W3C, PROV-O: The PROV Ontology  
**URL:** https://www.w3.org/TR/prov-o/

PROV-O maps provenance concepts into an ontology including entities, activities, and agents.

**Implication for Wovith:** Useful for future exports/compliance, not required for initial UI.

## R-STORAGE — Client-side storage

### R-STORAGE-01 — IndexedDB

**Source:** MDN, IndexedDB API  
**URL:** https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

IndexedDB supports client-side storage of significant structured data and files/blobs, using indexes for efficient search.

**Implication for Wovith:** IndexedDB is a reasonable web local-cache/storage substrate, but quotas and eviction must be handled.

### R-STORAGE-02 — Web storage quotas and eviction

**Source:** MDN, Storage quotas and eviction criteria  
**URL:** https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

Browser storage quotas and eviction behavior vary.

**Implication for Wovith:** Local caches/evidence need size management, eviction handling, and user controls.

### R-STORAGE-03 — SQLite WAL

**Source:** SQLite Write-Ahead Logging docs  
**URL:** https://sqlite.org/wal.html

SQLite WAL mode supports concurrent readers/writers and persists as a database journaling mode.

**Implication for Wovith:** For desktop/mobile local stores, SQLite with WAL may be attractive, but web Stage 0 can start simpler.

## R-COMP — Competitive/product landscape

### R-COMP-01 — Notion Agents

**Source:** Notion product page, Agents  
**URL:** https://www.notion.com/product/agents

Notion describes agents that use docs/databases as context and connect across Slack, Mail, Calendar, and MCP integrations, with custom agent permissions.

**Implication for Wovith:** “AI agents connected to apps” is no longer enough. Wovith must emphasize inspectable personal lenses and local-first ownership.

### R-COMP-02 — Notion Enterprise Search

**Source:** Notion Help, Enterprise Search  
**URL:** https://www.notion.com/help/enterprise-search

Notion Enterprise Search finds answers across Notion workspace and connected apps like Slack, Google Drive, Jira, and more.

**Implication for Wovith:** Search across connected apps is commoditizing. Wovith should focus on persistent views, not only search/Q&A.

### R-COMP-03 — Raycast AI

**Source:** Raycast AI product page  
**URL:** https://www.raycast.com/core-features/ai

Raycast emphasizes OS-integrated AI, local-first storage for data, cloud sync options, no model training, and local model support.

**Implication for Wovith:** Raycast is strong for command/launcher workflows. Wovith should not copy launcher UX; it should own spatial lenses.

### R-COMP-04 — Microsoft 365 Copilot agents

**Source:** Microsoft Learn, Agents for Microsoft 365 Copilot  
**URL:** https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agents-overview

Microsoft supports extending Copilot with agents across Microsoft 365 and organizational data.

**Implication for Wovith:** Enterprise agent ecosystems will be strong. Wovith should start as personal/private malleability before enterprise breadth.

### R-COMP-05 — Microsoft 365 Copilot connectors

**Source:** Microsoft Learn, Copilot connectors overview  
**URL:** https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/overview-copilot-connector

Microsoft supports synced connectors to bring external data into Microsoft 365 Copilot experiences.

**Implication for Wovith:** Connector breadth is becoming platform infrastructure. Wovith’s interface and trust model must be the differentiator.

### R-COMP-06 — Zapier MCP

**Source:** Zapier MCP product page  
**URL:** https://zapier.com/mcp

Zapier MCP connects AI tools to thousands of apps and tens of thousands of actions through MCP, with controls and action logs.

**Implication for Wovith:** Wovith should not try to out-Zapier breadth. It can later integrate with action providers, but the first wedge is seeing/trusting/tuning.

### R-COMP-07 — Airtable AI agents/app builder

**Source:** Airtable AI agents/app builder pages  
**URLs:**  
https://www.airtable.com/  
https://www.airtable.com/platform/ai-agents

Airtable markets AI workflows, apps, and agents over structured business data.

**Implication for Wovith:** Avoid becoming a generic app builder. Wovith is a personal lens over external context.

### R-COMP-08 — Obsidian Bases

**Source:** Obsidian Help, Bases  
**URL:** https://obsidian.md/help/bases

Obsidian Bases provides database-like views of notes with sorting/filtering and table/card layouts.

**Implication for Wovith:** There is demand for malleable views over personal data. Wovith extends that intuition beyond notes into live connected sources with provenance.

## Cross-cutting research conclusions

1. **MCP is directionally important but not enough as differentiation.** Many products will support it.
2. **Gmail is valuable but compliance-heavy.** Start safer and narrower.
3. **Prompt injection must shape architecture from day one.** It is not a polish task.
4. **Local-first is a strong trust story but must be precise.** Lens definitions are local-first; external sources are not automatically archived.
5. **Structured outputs help but do not solve semantics.** AST validation remains necessary.
6. **Mobile should wait until core value is proven.** Capacitor/native requirements add real complexity.
7. **The competitive world is moving toward AI agents everywhere.** Wovith’s moat is persistent, inspectable lenses.
