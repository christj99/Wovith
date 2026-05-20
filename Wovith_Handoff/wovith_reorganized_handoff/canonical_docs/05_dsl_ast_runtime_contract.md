# 05 — DSL, AST, and Runtime Contract

**Status:** Canonical  
**Purpose:** resolve the original DSL contradictions and define the implementation path for NL→AST→DSL.

## 1. Core decision

Wovith is **AST-first**.

Natural language should not produce free-form DSL strings. The model produces a typed JSON AST candidate. Deterministic code validates it, repairs or rejects it, and serializes it into canonical DSL.

Pipeline:

```txt
User request
  → available source schemas + permissions
  → model returns AST candidate
  → schema validation
  → semantic validation
  → safety validation
  → deterministic serializer
  → canonical DSL preview
  → user accepts/saves cell
```

## 2. Why AST-first

AST-first solves several problems:

- prevents model-generated syntax drift;
- allows deterministic tests;
- makes source/field/permission validation easier;
- enables canonical DSL display;
- supports repair/refusal loops;
- prevents aliases and grammar looseness from becoming product confusion;
- supports model/provider changes without rewriting the runtime.

Research cross-reference: R-STRUCT-01, R-STRUCT-02, R-STRUCT-03.

## 3. Original contradictions resolved

| Issue in original docs | Canonical decision |
|---|---|
| Equality described as `is`, grammar accepted `=`, `==`, `!=` | Canonical generated DSL uses `is` and `is not`. Parser may accept aliases later but serializer never emits them. |
| Grammar allowed `take`, `first`, `top` | Canonical serializer emits `take`. Aliases are parse-only leniency in later stages. |
| Grammar allowed `asc`/`ascending` | Canonical serializer emits `asc` or `desc`; full words may be parse-only later. |
| Enrichment position unclear | Enrichment is a transform before render. Renderer receives enriched values. |
| Renderer ID also stored outside DSL | Canonical AST owns render clause; persisted cell may cache renderer ID for UI, but AST is source of truth. |
| Model writes DSL strings | Model returns AST candidate only. |

## 4. Stage 0 canonical DSL subset

Stage 0 supports a small, readable subset:

```txt
from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list
```

Supported clauses:

- `from <source>`
- `where <field> is <value>`
- `where <field> is not <value>`
- `where <field> contains <string>`
- `where <field> after <time_expr>`
- `where <field> before <time_expr>`
- `sort by <field> asc|desc`
- `take <number>`
- `show as list|count|raw|table`

Supported value literals:

- strings in quotes;
- numbers;
- booleans `true`/`false`;
- `null`;
- time helpers: `now()`, `today()`, `days_ago(n)`.

## 5. Stage 0.5 additions

- Real connector sources.
- Permission-aware field validation.
- NL→AST.
- `show as cards` or `show as feed` if renderer exists.
- More time helpers if needed:
  - `start_of_week()`
  - `end_of_week()`
  - `hours_ago(n)`

## 6. Stage 1 additions

- Source aliases displayed to the user, but canonical internal IDs remain stable.
- Multi-source lens generation.
- Limited enrichments:

```txt
from google.drive.files
where modified_at after days_ago(14)
enrich each with summary using small_model max_units 2
show as cards
```

The exact syntax may change, but the AST rule is fixed: enrichment is a transform before render.

## 7. AST shape

The AST should be explicit, typed, and conservative.

```ts
type CellExpressionAst = {
  kind: 'cell-expression';
  version: 1;
  source: SourceClause;
  steps: PipelineStep[];
  render: RenderClause;
};
```

A source clause:

```ts
type SourceClause = {
  kind: 'source';
  sourceId: string; // e.g. synthetic.mail.threads, google.calendar.events
  params: Record<string, AstValue>;
};
```

Pipeline steps:

```ts
type PipelineStep =
  | { kind: 'filter'; predicate: Predicate }
  | { kind: 'sort'; fields: SortField[] }
  | { kind: 'take'; count: number }
  | { kind: 'map'; expression: MapExpression }
  | { kind: 'group'; by: string; aggregations: Aggregation[] }
  | { kind: 'enrich'; enrichment: EnrichmentSpec };
```

Comparison operators:

```ts
type ComparisonOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'after'
  | 'before'
  | 'exists';
```

Renderer:

```ts
type RenderClause = {
  kind: 'render';
  rendererId: BuiltInRendererId;
  options: Record<string, AstValue>;
};
```

## 8. Canonical source IDs

Use stable, namespaced source IDs:

```txt
synthetic.calendar.events
synthetic.mail.threads
synthetic.drive.files
synthetic.tasks
google.calendar.events
google.drive.files
google.gmail.threads
```

User-facing labels can be friendly, but the DSL should be stable. A label like “Personal Gmail” should map to a connection, not change the canonical source ID.

## 9. Source schema validation

Every source schema must define:

- field name;
- display name;
- type;
- sensitivity;
- allowed operators;
- whether field is metadata or content;
- required connector permission;
- whether it can be used for pushdown filtering/sorting.

Example:

```ts
{
  name: 'subject',
  type: 'string',
  sensitivity: 'metadata',
  allowedOperators: ['is', 'is_not', 'contains'],
  requiredPermission: 'gmail.read.metadata'
}
```

The analyzer rejects any predicate that uses a field/operator/permission not supported by the current schema.

## 10. Canonical serializer rules

The serializer is deterministic:

- one clause per line;
- source line first;
- filters preserve user/model order unless normalized;
- sort before take;
- render last;
- booleans lowercase;
- strings double-quoted;
- renderer options sorted by key;
- no aliases;
- no comments in canonical output.

Example:

```txt
from google.calendar.events
where start_time after today()
where start_time before days_from_now(7)
sort by start_time asc
take 20
show as timeline
```

## 11. Parser leniency policy

Stage 0: parser accepts only canonical syntax.

Stage 1+: parser may accept common aliases for user convenience, but must immediately serialize back to canonical form. Accepted aliases are never stored as-is.

Example:

Input:

```txt
from gmail.threads
where unread == true
first 10
show feed
```

Saved canonical output:

```txt
from google.gmail.threads
where unread is true
take 10
show as feed
```

## 12. NL compiler behavior

The NL compiler receives:

- user request;
- available sources;
- available fields;
- granted permissions;
- renderer list;
- examples;
- current lens context;
- current date/time/timezone.

It returns:

```ts
type NlCompileResult =
  | {
      kind: 'success';
      ast: CellExpressionAst;
      confidence: number;
      assumptions: string[];
      requiredPermissions: ConnectorPermission[];
    }
  | {
      kind: 'needs_clarification';
      question: string;
      options: ClarificationOption[];
    }
  | {
      kind: 'refused_or_impossible';
      reason: string;
      suggestedAlternatives: string[];
    };
```

The compiler must not invent unsupported fields or connectors. It must ask for clarification or return impossible.

## 13. Preview before save

Before saving a generated cell, show:

- interpreted plain-language summary;
- canonical DSL;
- source and fields used;
- permissions required;
- whether AI enrichment is used;
- estimated refresh cost/budget impact if applicable.

## 14. Enrichment policy

Agent enrichment is not a write. It is a transform that creates new derived fields.

Rules:

- enrichment input must be explicitly selected fields;
- content fields are labeled as sensitive if applicable;
- enrichment output is tainted as `agent-output`;
- enrichment cannot trigger actions;
- enrichment is budgeted;
- enrichment prompts are templates, not arbitrary source instructions.

## 15. Runtime execution order

1. Parse/validate DSL into AST.
2. Resolve source and connection.
3. Plan query.
4. Perform source read.
5. Apply filters/transforms.
6. Apply enrichment if present and allowed.
7. Compute renderer-compatible value.
8. Record provenance evidence and snapshot.
9. Update cell state.

## 16. Golden test corpus

Maintain these corpora:

### 16.1 Parser corpus

- valid canonical DSL;
- invalid syntax;
- invalid operator;
- invalid time expression;
- renderer mismatch.

### 16.2 Serializer corpus

- AST snapshots → DSL output.
- Round-trip tests.

### 16.3 Analyzer corpus

- missing field;
- insufficient permission;
- wrong operator for field type;
- unsupported source;
- unsupported renderer.

### 16.4 NL corpus

- simple cells;
- ambiguous requests;
- impossible requests;
- permission-limited requests;
- adversarial requests;
- multi-cell requests.

## 17. Example golden cases

### Valid

Request:

> Show unread emails from the last week.

AST source:

```json
{
  "kind": "cell-expression",
  "version": 1,
  "source": { "kind": "source", "sourceId": "google.gmail.threads", "params": {} },
  "steps": [
    { "kind": "filter", "predicate": { "kind": "comparison", "field": "unread", "op": "is", "value": { "kind": "boolean", "value": true } } },
    { "kind": "filter", "predicate": { "kind": "comparison", "field": "received_at", "op": "after", "value": { "kind": "time-fn", "name": "days_ago", "args": [{ "kind": "number", "value": 7 }] } } } }
  ],
  "render": { "kind": "render", "rendererId": "list", "options": {} }
}
```

DSL:

```txt
from google.gmail.threads
where unread is true
where received_at after days_ago(7)
show as list
```

### Impossible

Request:

> Send a reply to everyone who emailed me last week.

Stage 1 behavior:

- Refuse as a cell expression/action.
- Explain that Wovith can show matching threads or create reviewed drafts later, but cannot send emails automatically.

## 18. Implementation warnings

- Do not let model output bypass analyzer.
- Do not let renderer options become arbitrary script/config execution.
- Do not include source text in system prompts without tainting and separation.
- Do not silently upgrade permissions to satisfy NL requests.
- Do not store model-generated assumptions as facts.

## 19. Research cross-references

- Structured output support and limitations: R-STRUCT-01, R-STRUCT-02, R-STRUCT-03.
- Prompt injection and instruction/data separation: R-LLMSEC-01, R-LLMSEC-02, R-LLMSEC-03.
- MCP tool safety: R-MCP-03, R-MCP-05.
