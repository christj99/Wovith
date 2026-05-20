/**
 * Wovith schemas vNext patch
 * Date: 2026-05-20
 *
 * Purpose:
 * - Provide a stricter type direction for the next implementation pass.
 * - Replace broad scope tiers with explicit permissions.
 * - Move the DSL toward AST-first execution.
 * - Add source schemas, trust labels, evaluation snapshots, provenance evidence,
 *   and Action Manifests.
 *
 * This file is not a drop-in replacement for original_docs/wovith_schemas.ts.
 * It is a migration target and reference contract for the coding agent.
 */

/* -------------------------------------------------------------------------------------------------
 * Branded IDs
 * ------------------------------------------------------------------------------------------------- */

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type LensId = Brand<string, 'LensId'>;
export type CellId = Brand<string, 'CellId'>;
export type SourceId = Brand<string, 'SourceId'>;
export type SourceItemId = Brand<string, 'SourceItemId'>;
export type RendererId = Brand<string, 'RendererId'>;
export type EvaluationId = Brand<string, 'EvaluationId'>;
export type ProvenanceEvidenceId = Brand<string, 'ProvenanceEvidenceId'>;
export type SnapshotId = Brand<string, 'SnapshotId'>;
export type ActionManifestId = Brand<string, 'ActionManifestId'>;
export type ConnectorId = Brand<string, 'ConnectorId'>;
export type UserId = Brand<string, 'UserId'>;
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
export type ContentHash = Brand<string, 'ContentHash'>;

/* -------------------------------------------------------------------------------------------------
 * Result helper
 * ------------------------------------------------------------------------------------------------- */

export type Result<T, E = WovithError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface WovithError {
  code: string;
  message: string;
  details?: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Trust and taint model
 * ------------------------------------------------------------------------------------------------- */

export type TrustLevel =
  | 'wovith-system'
  | 'user-authored'
  | 'connector-metadata'
  | 'external-content'
  | 'agent-output'
  | 'third-party-tool-output';

export interface TaintedValue<T> {
  value: T;
  trust: TrustLevel;
  sourceRef?: SourceRef;
  contentHash?: ContentHash;
}

export interface SourceRef {
  sourceId: SourceId;
  itemId?: SourceItemId;
  field?: string;
}

/* -------------------------------------------------------------------------------------------------
 * Explicit connector permissions
 * ------------------------------------------------------------------------------------------------- */

export type ConnectorPermission =
  | 'calendar.read.events'
  | 'calendar.write.events'
  | 'drive.read.metadata'
  | 'drive.read.file_content'
  | 'drive.write.file'
  | 'gmail.read.metadata'
  | 'gmail.read.body'
  | 'gmail.create_draft'
  | 'gmail.modify_labels'
  | 'gmail.send'
  | 'gmail.delete'
  | 'contacts.read'
  | 'slack.read.channels'
  | 'slack.read.messages'
  | 'slack.write.messages'
  | 'github.read.issues'
  | 'github.write.issues'
  | 'notion.read.pages'
  | 'notion.write.pages'
  | 'mcp.read.resources'
  | 'mcp.call.tools';

export type PermissionRiskTier = 0 | 1 | 2 | 3;

export interface PermissionDescriptor {
  permission: ConnectorPermission;
  riskTier: PermissionRiskTier;
  userLabel: string;
  userExplanation: string;
  readsExternalContent: boolean;
  canWriteExternally: boolean;
  irreversiblePossible: boolean;
}

export interface ConnectorDescriptor {
  connectorId: ConnectorId;
  displayName: string;
  provider: 'google' | 'microsoft' | 'slack' | 'github' | 'notion' | 'mcp' | 'synthetic' | 'other';
  permissions: PermissionDescriptor[];
  sources: SourceSchema[];
  capabilities: ConnectorCapability[];
  auth: ConnectorAuthDescriptor;
}

export type ConnectorCapability =
  | 'read'
  | 'write'
  | 'draft-only'
  | 'delete'
  | 'delta-sync'
  | 'pushdown-filter'
  | 'pushdown-sort'
  | 'full-text-search'
  | 'pagination'
  | 'webhook'
  | 'mcp-resources'
  | 'mcp-tools';

export interface ConnectorAuthDescriptor {
  kind: 'none' | 'oauth2' | 'oauth2-pkce' | 'api-key' | 'local-only';
  tokenStorage: 'none' | 'device-secure-storage' | 'server-vault' | 'byok-user-managed';
  tokensMayBeSynced: false;
}

/* -------------------------------------------------------------------------------------------------
 * Source schema registry
 * ------------------------------------------------------------------------------------------------- */

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'duration'
  | 'enum'
  | 'person'
  | 'url'
  | 'id'
  | 'object'
  | 'array'
  | 'unknown';

export type CanonicalOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'not_contains'
  | 'before'
  | 'after'
  | 'on_or_before'
  | 'on_or_after'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists';

export interface FieldSchema {
  name: string;
  type: FieldType;
  label?: string;
  description?: string;
  nullable: boolean;
  repeated: boolean;
  containsExternalContent: boolean;
  sensitive: boolean;
  filterable: boolean;
  sortable: boolean;
  searchable: boolean;
  summarizable: boolean;
  expensiveToRead: boolean;
  allowedOperators: CanonicalOperator[];
  enumValues?: string[];
  rendererHints?: RendererKind[];
  requiredPermission?: ConnectorPermission;
}

export interface SourceSchema {
  sourceId: SourceId;
  connectorId: ConnectorId;
  displayName: string;
  description?: string;
  itemIdField: string;
  fields: Record<string, FieldSchema>;
  capabilities: SourceCapability[];
  defaultSort?: SortClause;
  defaultRenderer?: RendererKind;
}

export type SourceCapability =
  | 'local-only'
  | 'external-api'
  | 'mcp-resource'
  | 'mcp-tool-backed'
  | 'supports-delta'
  | 'supports-pushdown-filter'
  | 'supports-pushdown-sort'
  | 'supports-full-text-search'
  | 'supports-pagination'
  | 'read-metadata-only'
  | 'read-body-content'
  | 'write-capable';

/* -------------------------------------------------------------------------------------------------
 * AST-first DSL
 * ------------------------------------------------------------------------------------------------- */

export interface CellAst {
  version: 'wovith.dsl.ast.v1';
  from: FromClause;
  where: PredicateClause[];
  select?: SelectClause;
  enrich?: EnrichClause[];
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
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'datetime'; value: IsoDateTime }
  | { kind: 'date'; value: string }
  | { kind: 'duration'; value: string }
  | { kind: 'enum'; value: string }
  | { kind: 'null'; value: null }
  | { kind: 'array'; value: LiteralValue[] };

export type FunctionName = 'today' | 'now' | 'days_ago' | 'in_days';

export interface FunctionCallValue {
  kind: 'function';
  name: FunctionName;
  args: LiteralValue[];
}

export interface SelectClause {
  fields: string[];
}

export interface EnrichClause {
  id: string;
  kind: 'agent-classify' | 'agent-summarize' | 'deterministic-transform';
  inputFields: string[];
  outputField: string;
  instruction?: string;
  modelPolicy?: AgentModelPolicy;
}

export interface AgentModelPolicy {
  allowed: boolean;
  maxTokens?: number;
  cacheable: boolean;
  requiresUserApproval: boolean;
}

export interface SortClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TakeClause {
  count: number;
}

export type RendererKind = 'list' | 'count' | 'table' | 'raw' | 'feed' | 'cards' | 'timeline' | 'text' | 'chart' | 'grid' | 'kanban' | 'map';

export interface ShowClause {
  renderer: RendererKind;
  options?: RendererOptions;
}

export type RendererOptions =
  | ListRendererOptions
  | CountRendererOptions
  | TableRendererOptions
  | RawRendererOptions
  | FeedRendererOptions
  | TimelineRendererOptions
  | Record<string, never>;

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

export interface FeedRendererOptions {
  titleField?: string;
  bodyField?: string;
  timeField?: string;
}

export interface TimelineRendererOptions {
  startField: string;
  endField?: string;
  titleField?: string;
}

/* -------------------------------------------------------------------------------------------------
 * DSL validation and serialization
 * ------------------------------------------------------------------------------------------------- */

export interface DslValidationContext {
  sourceSchemas: Record<string, SourceSchema>;
  maxTake: number;
  allowedRenderers: RendererKind[];
  allowedPermissions: ConnectorPermission[];
}

export interface DslValidationReport {
  valid: boolean;
  errors: DslValidationError[];
  warnings: DslValidationWarning[];
  requiredPermissions: ConnectorPermission[];
  readsExternalContent: boolean;
  usesAgent: boolean;
  estimatedCost?: EvaluationCostEstimate;
}

export interface DslValidationError {
  code:
    | 'unknown-source'
    | 'unknown-field'
    | 'operator-not-allowed'
    | 'type-mismatch'
    | 'renderer-not-allowed'
    | 'renderer-field-missing'
    | 'take-too-large'
    | 'permission-missing'
    | 'unsupported-transform';
  message: string;
  path?: string;
}

export interface DslValidationWarning {
  code:
    | 'expensive-field-read'
    | 'external-content-read'
    | 'unbounded-query'
    | 'local-filter-required'
    | 'ai-enrichment-used'
    | 'stale-source-possible';
  message: string;
  path?: string;
}

export interface EvaluationCostEstimate {
  connectorCalls: number;
  modelTokens?: number;
  localCompute: 'low' | 'medium' | 'high';
}

/* -------------------------------------------------------------------------------------------------
 * Lens and cell definitions
 * ------------------------------------------------------------------------------------------------- */

export interface LensDefinition {
  id: LensId;
  version: 'wovith.lens.v1';
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
  mode: 'manual' | 'on-open' | 'interval';
  intervalMinutes?: number;
}

export type SnapshotTier = 'none' | 'evidence' | 'summary' | 'full-output';

export interface SnapshotPolicy {
  tier: SnapshotTier;
  retentionDays: number;
  syncSnapshots: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Runtime evaluation
 * ------------------------------------------------------------------------------------------------- */

export type FreshnessState = 'fresh' | 'stale' | 'recomputing' | 'failed' | 'blocked' | 'suspended';

export interface CellEvaluationResult {
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  freshness: FreshnessState;
  renderer: RendererKind;
  payload: RendererPayload;
  snapshot: CellEvaluationSnapshot;
  errors: WovithError[];
  warnings: DslValidationWarning[];
}

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
  fields: Record<string, TaintedValue<unknown>>;
  evidenceIds: ProvenanceEvidenceId[];
}

export interface TablePayload {
  columns: string[];
  rows: RenderedItem[];
}

/* -------------------------------------------------------------------------------------------------
 * Evaluation snapshots and provenance evidence
 * ------------------------------------------------------------------------------------------------- */

export interface CellEvaluationSnapshot {
  id: SnapshotId;
  evaluationId: EvaluationId;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: IsoDateTime;
  sourceCursors: Record<string, string | null>;
  inputHashes: ContentHash[];
  outputHash: ContentHash;
  outputSummary: string | null;
  evidenceIds: ProvenanceEvidenceId[];
  snapshotTier: SnapshotTier;
}

export interface ProvenanceEvidence {
  id: ProvenanceEvidenceId;
  evaluationId: EvaluationId;
  cellId: CellId;
  sourceId: SourceId;
  itemId: SourceItemId;
  sourceTimestamp: IsoDateTime | null;
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
  direction: 'asc' | 'desc';
  actualPreview?: string;
}

export interface FieldEvidence {
  field: string;
  trust: TrustLevel;
  contentHash?: ContentHash;
  redactedPreview?: string;
  permission?: ConnectorPermission;
}

export interface WhyExplanation {
  itemId: SourceItemId;
  plainLanguage: string;
  ruleTrace: RuleTraceStep[];
  evidence: ProvenanceEvidence[];
  warnings: string[];
}

export interface RuleTraceStep {
  kind: 'source' | 'filter' | 'sort' | 'take' | 'render' | 'enrich' | 'calibration';
  label: string;
  detail?: string;
}

/* -------------------------------------------------------------------------------------------------
 * Calibration
 * ------------------------------------------------------------------------------------------------- */

export type CalibrationActionKind = 'pin' | 'hide' | 'mute-source' | 'mute-field' | 'mute-person' | 'mark-useful' | 'mark-noisy';

export interface CalibrationRule {
  id: string;
  kind: CalibrationActionKind;
  lensId: LensId;
  cellId?: CellId;
  sourceId?: SourceId;
  itemId?: SourceItemId;
  field?: string;
  personRef?: string;
  reason?: string;
  createdAt: IsoDateTime;
  expiresAt?: IsoDateTime;
}

/* -------------------------------------------------------------------------------------------------
 * Action governance
 * ------------------------------------------------------------------------------------------------- */

export interface ActionManifest {
  id: ActionManifestId;
  proposedBy: 'user' | 'agent' | 'cell' | 'system';
  sourceLensId?: LensId;
  sourceCellId?: CellId;
  connectorId: ConnectorId;
  toolName: string;
  riskTier: PermissionRiskTier;
  requiredPermissions: ConnectorPermission[];
  reads: DataAccessSummary[];
  writes: ProposedWrite[];
  irreversible: boolean;
  undoPlan: UndoPlan | null;
  userVisibleSummary: string;
  rationale: string;
  createdAt: IsoDateTime;
  status: ActionManifestStatus;
}

export type ActionManifestStatus = 'proposed' | 'approved' | 'rejected' | 'executed' | 'failed' | 'cancelled';

export interface DataAccessSummary {
  sourceId: SourceId;
  fields: string[];
  includesExternalContent: boolean;
  permissions: ConnectorPermission[];
}

export interface ProposedWrite {
  target: string;
  operation: 'create' | 'update' | 'delete' | 'send' | 'label' | 'upload' | 'schedule';
  payloadPreview: string;
  payloadHash: ContentHash;
}

export interface UndoPlan {
  kind: 'none' | 'delete-created-resource' | 'revert-update' | 'compensating-action' | 'manual-only';
  explanation: string;
  expiresAt?: IsoDateTime;
}

/* -------------------------------------------------------------------------------------------------
 * Audit
 * ------------------------------------------------------------------------------------------------- */

export interface AuditRecord {
  id: string;
  createdAt: IsoDateTime;
  actor: 'user' | 'system' | 'agent';
  event:
    | 'lens-created'
    | 'cell-created'
    | 'cell-evaluated'
    | 'connector-connected'
    | 'connector-read'
    | 'permission-requested'
    | 'action-proposed'
    | 'action-approved'
    | 'action-executed'
    | 'action-rejected'
    | 'calibration-added';
  lensId?: LensId;
  cellId?: CellId;
  connectorId?: ConnectorId;
  actionManifestId?: ActionManifestId;
  summary: string;
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------------------------------
 * Lens discovery / onboarding
 * ------------------------------------------------------------------------------------------------- */

export interface LensDiscoveryProposal {
  id: string;
  title: string;
  description: string;
  suggestedForRole?: string;
  requiredSources: SourceId[];
  requiredPermissions: ConnectorPermission[];
  cells: Array<Pick<CellDefinition, 'title' | 'description' | 'ast' | 'canonicalDsl'>>;
  userVisibleDataAccessSummary: string;
  estimatedSetupTimeMinutes: number;
  riskNotes: string[];
}

/* -------------------------------------------------------------------------------------------------
 * Repository/service ports
 * ------------------------------------------------------------------------------------------------- */

export interface LensRepository {
  listLenses(): Promise<LensDefinition[]>;
  getLens(id: LensId): Promise<LensDefinition | null>;
  saveLens(lens: LensDefinition): Promise<void>;
  deleteLens(id: LensId): Promise<void>;
}

export interface SourceAdapter {
  sourceId: SourceId;
  schema(): Promise<SourceSchema>;
  query(request: SourceQueryRequest): Promise<Result<SourceQueryResult>>;
}

export interface SourceQueryRequest {
  ast: CellAst;
  pushdown?: QueryPushdownPlan;
  cursor?: string | null;
  limit?: number;
}

export interface QueryPushdownPlan {
  pushedPredicates: string[];
  localPredicates: string[];
  pushedSort?: SortClause[];
  pushedTake?: TakeClause;
  explanation: string;
}

export interface SourceQueryResult {
  items: SourceItem[];
  nextCursor?: string | null;
  sourceCursor?: string | null;
}

export interface SourceItem {
  id: SourceItemId;
  sourceId: SourceId;
  fields: Record<string, TaintedValue<unknown>>;
  updatedAt?: IsoDateTime;
  contentHash?: ContentHash;
}

export interface ProvenanceRecorder {
  recordEvidence(evidence: ProvenanceEvidence[]): Promise<void>;
  recordSnapshot(snapshot: CellEvaluationSnapshot): Promise<void>;
  explainItem(input: ExplainItemInput): Promise<WhyExplanation>;
}

export interface ExplainItemInput {
  evaluationId: EvaluationId;
  cellId: CellId;
  itemId: SourceItemId;
}

export interface ActionGate {
  propose(action: ActionManifest): Promise<ActionManifest>;
  approve(id: ActionManifestId, userId: UserId): Promise<ActionManifest>;
  reject(id: ActionManifestId, userId: UserId, reason?: string): Promise<ActionManifest>;
}

/* -------------------------------------------------------------------------------------------------
 * Stage-specific constants
 * ------------------------------------------------------------------------------------------------- */

export const STAGE_0_RENDERERS: RendererKind[] = ['list', 'count', 'table', 'raw'];

export const STAGE_0_ALLOWED_PERMISSIONS: ConnectorPermission[] = [];

export const STAGE_1_READ_ONLY_GOOGLE_PERMISSIONS: ConnectorPermission[] = [
  'calendar.read.events',
  'drive.read.metadata',
  'drive.read.file_content',
  'gmail.read.metadata',
  'gmail.read.body',
];

export const STAGE_2_DRAFT_PERMISSION: ConnectorPermission = 'gmail.create_draft';
