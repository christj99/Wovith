# Future Research Prompt — Wovith

Use this prompt when asking a research agent to update Wovith’s external research base.

---

Research Wovith’s current assumptions and update the project docs with current facts. Focus on sources that are official, primary, or highly reliable.

Areas to verify:

1. Google Workspace MCP status, capabilities, availability, and production-readiness.
2. Gmail/Drive/Calendar API scope classifications, restricted-scope verification, and security assessment requirements.
3. OAuth 2.1 / OAuth security best-current-practice requirements relevant to browser, mobile, and MCP clients.
4. MCP authorization, tool safety, resources/tools semantics, and changes in the latest spec.
5. OWASP and NIST guidance on LLM application security, AI agents, prompt injection, excessive agency, and sensitive data disclosure.
6. Automerge/local-first state capabilities, version changes, storage/sync caveats, and alternatives.
7. Structured output capabilities and limitations from major model providers.
8. Capacitor/mobile platform requirements, Android/iOS SDK requirements, and support policy.
9. Competitors: Notion AI/Agents, Raycast AI, Microsoft Copilot agents/connectors, Zapier MCP, Airtable AI, Obsidian Bases, and other personal-data/AI-workspace tools.
10. Privacy/security expectations for personal productivity tools that process email, docs, and calendar data.

Update:

- `canonical_docs/13_research_compendium.md`
- `canonical_docs/01_project_lifecycle_staging.md` if staging assumptions changed
- `canonical_docs/06_connectors_permissions_security_contract.md` if compliance/security requirements changed
- `canonical_docs/10_gtm_positioning_contract.md` if competitive positioning changed

For every factual claim, include source title, URL, access date, and implication for Wovith.
