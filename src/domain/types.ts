export type Brand<T, B extends string> = T & { readonly __brand: B };

export type LensId = Brand<string, "LensId">;
export type CellId = Brand<string, "CellId">;
export type SourceId = Brand<string, "SourceId">;
export type SourceItemId = Brand<string, "SourceItemId">;
export type EvaluationId = Brand<string, "EvaluationId">;
export type ProvenanceEvidenceId = Brand<string, "ProvenanceEvidenceId">;
export type SnapshotId = Brand<string, "SnapshotId">;
export type ContentHash = Brand<string, "ContentHash">;
export type IsoDateTime = Brand<string, "IsoDateTime">;
export type ConnectorId = Brand<string, "ConnectorId">;
export type ConnectorAccountId = Brand<string, "ConnectorAccountId">;

export type Result<T, E = WovithError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface WovithError {
  code: string;
  message: string;
  details?: unknown;
  line?: number;
  column?: number;
}

export type TrustLevel =
  | "wovith-system"
  | "user-authored"
  | "connector-metadata"
  | "external-content"
  | "agent-output"
  | "third-party-tool-output";

export interface TaintedValue<T = unknown> {
  value: T;
  trust: TrustLevel;
  sourceRef?: {
    sourceId: SourceId;
    itemId?: SourceItemId;
    field?: string;
  };
  contentHash?: ContentHash;
}

export interface EvaluationClock {
  now: Date;
  timeZone: string;
}

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "date"
  | "enum"
  | "url"
  | "id"
  | "array"
  | "unknown";

export type CanonicalOperator =
  | "is"
  | "is_not"
  | "contains"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "greater_than"
  | "less_than"
  | "exists"
  | "not_exists";

export type RendererKind = "list" | "count" | "table" | "raw";

export interface FieldSchema {
  name: string;
  type: FieldType;
  label: string;
  nullable: boolean;
  repeated: boolean;
  containsExternalContent: boolean;
  sensitive: boolean;
  filterable: boolean;
  sortable: boolean;
  allowedOperators: CanonicalOperator[];
  rendererHints?: RendererKind[];
}

export interface SortClause {
  field: string;
  direction: "asc" | "desc";
}

export interface SourceSchema {
  sourceId: SourceId;
  displayName: string;
  description: string;
  itemIdField: string;
  fields: Record<string, FieldSchema>;
  capabilities: SourceCapability[];
  defaultTableColumns?: string[];
  defaultSort?: SortClause;
  defaultRenderer: RendererKind;
}

export type SourceCapability =
  | "local-only"
  | "supports-pushdown-filter"
  | "supports-pushdown-sort"
  | "supports-pagination";

export interface CellAst {
  version: "wovith.dsl.ast.v1";
  from: FromClause;
  where: PredicateClause[];
  sort?: SortClause[];
  take?: TakeClause;
  show: ShowClause;
}

export interface FromClause {
  sourceId: SourceId;
}

export interface PredicateClause {
  id: string;
  field: string;
  op: CanonicalOperator;
  value?: LiteralValue | FunctionCallValue;
}

export type LiteralValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "datetime"; value: IsoDateTime }
  | { kind: "date"; value: string }
  | { kind: "enum"; value: string }
  | { kind: "null"; value: null }
  | { kind: "array"; value: LiteralValue[] };

export type FunctionName = "today" | "now" | "days_ago" | "in_days";

export interface FunctionCallValue {
  kind: "function";
  name: FunctionName;
  args: LiteralValue[];
}

export interface TakeClause {
  count: number;
}

export interface ShowClause {
  renderer: RendererKind;
  options?: RendererOptions;
}

export type RendererOptions =
  | ListRendererOptions
  | CountRendererOptions
  | TableRendererOptions
  | RawRendererOptions;

export interface ListRendererOptions {
  titleField?: string;
  subtitleField?: string;
  timeField?: string;
}

export interface CountRendererOptions {
  label?: string;
}

export interface TableRendererOptions {
  columns?: string[];
}

export interface RawRendererOptions {
  expanded?: boolean;
}

export interface LensDefinition {
  id: LensId;
  version: "wovith.lens.v1";
  name: string;
  description?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  cells: CellDefinition[];
  calibration: CalibrationRule[];
  snapshotPolicy: SnapshotPolicy;
}

export interface CellDefinition {
  id: CellId;
  lensId: LensId;
  title: string;
  description?: string;
  ast: CellAst;
  canonicalDsl: string;
  enabled: boolean;
  refreshPolicy: RefreshPolicy;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RefreshPolicy {
  mode: "manual" | "on-open" | "interval";
  intervalMinutes?: number;
}

export interface CalibrationRule {
  id: string;
  kind:
    | "pin"
    | "hide"
    | "mute-source"
    | "mute-field"
    | "mark-useful"
    | "mark-noisy";
  createdAt: IsoDateTime;
  cellId?: CellId;
  itemId?: SourceItemId;
  reason?: string;
}

export type SnapshotTier = "none" | "evidence" | "summary" | "full-output";

export interface SnapshotPolicy {
  tier: SnapshotTier;
  retentionDays: number;
  syncSnapshots: false;
}

export type FreshnessState =
  | "idle"
  | "fetching"
  | "fresh"
  | "stale"
  | "recomputing"
  | "failed"
  | "blocked";

export interface SourceItem {
  id: SourceItemId;
  sourceId: SourceId;
  fields: Record<string, TaintedValue>;
  updatedAt?: IsoDateTime;
  contentHash?: ContentHash;
}

export interface SourceQueryResult {
  items: SourceItem[];
  sourceCursor?: string | null;
}

export interface SourceQueryContext {
  clock: EvaluationClock;
}

export interface SourceAdapter {
  readonly sourceId: SourceId;
  schema(): Promise<SourceSchema>;
  query(
    ast: CellAst,
    context?: SourceQueryContext,
  ): Promise<Result<SourceQueryResult>>;
}

export type ConnectorProvider = "google";

export type ConnectorStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "expired"
  | "revoked"
  | "blocked"
  | "error";

export type ConnectorPermission = "calendar.events.readonly";

export interface ConnectorAccount {
  id: ConnectorAccountId;
  connectorId: ConnectorId;
  provider: ConnectorProvider;
  displayName: string;
  status: ConnectorStatus;
  grantedScopes: string[];
  connectedAt?: IsoDateTime;
  expiresAt?: IsoDateTime;
  lastError?: WovithError;
}

export interface ConnectorError {
  connectorId: ConnectorId;
  error: WovithError;
}

export interface AccessTokenState {
  connectorId: ConnectorId;
  status: "missing" | "valid" | "expired";
  expiresAt?: IsoDateTime;
}

export interface DslValidationContext {
  sourceSchemas: Record<string, SourceSchema>;
  maxTake: number;
  allowedRenderers: RendererKind[];
}

export interface DslValidationReport {
  valid: boolean;
  errors: DslValidationError[];
  warnings: DslValidationWarning[];
  readsExternalContent: boolean;
}

export interface DslValidationError {
  code:
    | "unknown-source"
    | "unknown-field"
    | "operator-not-allowed"
    | "type-mismatch"
    | "renderer-not-allowed"
    | "renderer-field-missing"
    | "take-too-large"
    | "unsupported-transform";
  message: string;
  path?: string;
}

export interface DslValidationWarning {
  code:
    | "external-content-read"
    | "unbounded-query"
    | "local-filter-required"
    | "stale-source-possible"
    | "sensitive-field-display"
    | "raw-renderer-sensitive-output"
    | "renderer-external-content-display";
  message: string;
  path?: string;
}

export interface CellEvaluationResult {
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  freshness: FreshnessState;
  renderer: RendererKind;
  payload: RendererPayload;
  snapshot: CellEvaluationSnapshot;
  evidence: ProvenanceEvidence[];
  errors: WovithError[];
  warnings: DslValidationWarning[];
  durationMs: number;
}

export type CellRunReason = "on-open" | "manual" | "refresh-all" | "ttl-stale";

export type CellRunState =
  | "idle"
  | "queued"
  | "fetching"
  | "recomputing"
  | "fresh"
  | "stale"
  | "failed"
  | "blocked";

export interface RendererPayload {
  kind: RendererKind;
  items?: RenderedItem[];
  scalar?: string | number | boolean | null;
  table?: TablePayload;
  raw?: unknown;
}

export interface RenderedItem {
  itemId: SourceItemId;
  title?: string;
  subtitle?: string;
  body?: string;
  time?: IsoDateTime;
  fields: Record<string, TaintedValue>;
  evidenceIds: ProvenanceEvidenceId[];
}

export interface TablePayload {
  columns: string[];
  columnLabels?: Record<string, string>;
  columnTypes?: Record<string, FieldType>;
  displayTimeZone?: string;
  rows: RenderedItem[];
}

export interface CellEvaluationSnapshot {
  id: SnapshotId;
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  expressionHash: ContentHash;
  sourceCursors: Record<string, string | null>;
  inputEvidenceIds: ProvenanceEvidenceId[];
  outputHash: ContentHash;
  outputKind: RendererKind;
  outputCount: number | null;
  outputSummary: string | null;
  storageTier: SnapshotTier;
  cacheHit: boolean;
  durationMs: number;
}

export interface ProvenanceEvidence {
  id: ProvenanceEvidenceId;
  snapshotId: SnapshotId;
  evaluationId: EvaluationId;
  cellId: CellId;
  sourceId: SourceId;
  itemId: SourceItemId;
  sourceTimestamp: IsoDateTime | null;
  observedAt: IsoDateTime;
  matchedPredicates: PredicateEvidence[];
  sortEvidence?: SortEvidence;
  selectedFields: FieldEvidence[];
  contentHash?: ContentHash;
  redactedPreview?: string;
  trust: TrustLevel;
}

export interface PredicateEvidence {
  predicateId: string;
  field: string;
  op: CanonicalOperator;
  expected?: LiteralValue | FunctionCallValue;
  actualPreview?: string;
  matched: boolean;
}

export interface SortEvidence {
  field: string;
  direction: "asc" | "desc";
  actualPreview?: string;
}

export interface FieldEvidence {
  field: string;
  trust: TrustLevel;
  contentHash?: ContentHash;
  redactedPreview?: string;
  stored: boolean;
}

export interface WhyExplanation {
  itemId: SourceItemId;
  plainLanguage: string;
  ruleTrace: RuleTraceStep[];
  evidence: ProvenanceEvidence[];
  warnings: string[];
  metadata: {
    evaluatedAt: IsoDateTime;
    renderer: RendererKind;
    snapshotId: SnapshotId;
  };
}

export interface RuleTraceStep {
  kind: "source" | "filter" | "sort" | "take" | "render";
  label: string;
  detail?: string;
}

export interface PersistedEvaluationRecord {
  kind: "persisted-evaluation-record";
  version: 1;
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  freshness: FreshnessState;
  renderer: RendererKind;
  durationMs: number;
  warnings: DslValidationWarning[];
  errors: WovithError[];
  snapshot: PersistedEvaluationSnapshot;
  evidence: PersistedEvidenceRecord[];
  payloadPreview: PersistedPayloadPreview | null;
  fullOutput?: {
    payload: RendererPayload;
    evidence: ProvenanceEvidence[];
  };
}

export interface PersistedEvaluationSnapshot {
  id: SnapshotId;
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  expressionHash: ContentHash;
  sourceCursors: Record<string, string | null>;
  inputEvidenceIds: ProvenanceEvidenceId[];
  outputHash: ContentHash;
  outputKind: RendererKind;
  outputCount: number | null;
  outputSummary: string | null;
  storageTier: SnapshotTier;
  cacheHit: boolean;
  durationMs: number;
}

export interface PersistedEvidenceRecord {
  id: ProvenanceEvidenceId;
  snapshotId: SnapshotId;
  evaluationId: EvaluationId;
  cellId: CellId;
  sourceId: SourceId;
  itemId: SourceItemId;
  sourceTimestamp: IsoDateTime | null;
  observedAt: IsoDateTime;
  matchedPredicates: Array<{
    predicateId: string;
    field: string;
    op: CanonicalOperator;
    expected?: LiteralValue | FunctionCallValue;
    matched: boolean;
  }>;
  sortEvidence?: SortEvidence;
  selectedFields: Array<
    Pick<FieldEvidence, "field" | "trust" | "contentHash" | "stored"> & {
      redactedPreview?: string;
    }
  >;
  contentHash?: ContentHash;
  redactedPreview?: string;
  trust: TrustLevel;
}

export interface PersistedPayloadPreview {
  kind: RendererKind;
  outputCount: number | null;
  outputSummary: string | null;
  itemPreviews: Array<{
    itemId: SourceItemId;
    title?: string;
    subtitle?: string;
    time?: IsoDateTime;
    evidenceIds: ProvenanceEvidenceId[];
  }>;
  scalar?: string | number | boolean | null;
}
