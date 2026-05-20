/**
 * wovith_schemas.ts
 *
 * The authoritative type definitions for Wovith. Every other file in the
 * codebase imports types from this module (transitively, through the
 * domain/types/ folder once it's split up).
 *
 * Organization (intended for src/domain/types/ split):
 *   1. Primitives and IDs                  -> domain/types/primitives.ts
 *   2. Document schemas (Automerge)        -> domain/types/documents/*.ts
 *   3. Cell types and state                -> domain/types/cell.ts
 *   4. DSL AST types                       -> domain/dsl/ast.ts
 *   5. Runtime types                       -> domain/types/runtime.ts
 *   6. MCP / connector types               -> domain/types/mcp.ts
 *   7. Agent / budget types                -> domain/types/agent.ts
 *   8. Provenance types                    -> domain/types/provenance.ts
 *   9. Audit log types                     -> domain/types/audit.ts
 *  10. Calibration types                   -> domain/types/calibration.ts
 *  11. Storage adapter ports               -> domain/types/storage.ts
 *
 * This single file exists to lock the cross-subsystem type contracts before
 * any code is split into modules. Treat as canonical; if a doc disagrees
 * with a type here, the type wins.
 *
 * Conventions:
 *   - All times are unix milliseconds (number) unless typed Timestamp.
 *   - All IDs are ULIDs (string) unless typed otherwise.
 *   - All optional fields use `| null`, not `?`, for explicit absence
 *     (CRDT-friendly: undefined doesn't merge, null does).
 *   - All counter types are Automerge.Counter where atomic increment matters.
 *   - Schema version fields are present on every document at the root.
 */

// =============================================================================
// 1. PRIMITIVES AND IDS
// =============================================================================

/** Unix milliseconds since epoch */
export type Timestamp = number

/** A monotonic ULID string (Crockford base32, 26 chars) */
export type Ulid = string

/** A user ID (Supabase Auth UUID) */
export type UserId = string

/** A device ID (random ULID, generated on first launch) */
export type DeviceId = string

/** A canvas ID (ULID) */
export type CanvasId = string

/** A lens ID (ULID) */
export type LensId = string

/** A cell ID (ULID) */
export type CellId = string

/** A connection ID (ULID) — the identity of one user's connection to one connector */
export type ConnectionId = string

/** An Automerge document URL: `automerge:<base58check>` */
export type AutomergeUrl = string

/** A renderer ID matching one of the 13 built-in renderers, or a custom registered renderer */
export type RendererId =
  | 'list' | 'feed' | 'card' | 'cards' | 'timeline' | 'grid'
  | 'chart' | 'table' | 'kanban' | 'map' | 'text' | 'count' | 'raw'
  | string  // custom renderers

/** A connector ID (e.g., 'google-drive', 'gmail', 'google-calendar') */
export type ConnectorId = string

/** OAuth scope tier the user has granted */
export type ScopeTier = 'read-only' | 'read-and-write' | 'full'

/** Pricing tier */
export type PricingTier = 'free' | 'pro' | 'trust'

/** LLM model class for budget weighting */
export type ModelClass = 'haiku' | 'sonnet' | 'opus'

/** LLM provider */
export type LlmProvider = 'anthropic' | 'openai' | string

// =============================================================================
// 2. DOCUMENT SCHEMAS (AUTOMERGE)
// =============================================================================

// -----------------------------------------------------------------------------
// 2.1 UserProfileDoc — the root document, references all others
// -----------------------------------------------------------------------------

export type UserProfileDoc = {
  schemaVersion: 1
  
  userId: UserId
  displayName: string
  email: string
  createdAt: Timestamp
  
  canvases: { [canvasId: string]: AutomergeUrl }
  primaryCanvasId: CanvasId
  
  capturesDocUrl: AutomergeUrl
  calibrationDocUrl: AutomergeUrl
  budgetDocUrl: AutomergeUrl
  
  connections: { [connectionId: string]: ConnectionMetadata }
  
  preferences: UserPreferences
  
  knownDevices: { [deviceId: string]: DeviceRecord }
}

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system'
  language: string                    // BCP 47 (e.g., 'en-US')
  timeZone: string                    // IANA TZ database (e.g., 'America/New_York')
  notificationsEnabled: boolean
  backgroundRefreshEnabled: boolean
  doNotDisturbHours: { startHour: number; endHour: number } | null
  voiceModelPreference: ModelClass
}

export type ConnectionMetadata = {
  id: ConnectionId
  connectorId: ConnectorId
  displayName: string                 // user-set, e.g., 'Personal Gmail'
  accountIdentifier: string           // email or other identifier
  scopeTier: ScopeTier
  grantedScopes: string[]             // raw OAuth scopes for audit
  connectedAt: Timestamp
  lastUsedAt: Timestamp
  state: ConnectionState
}

export type ConnectionState = 'healthy' | 'degraded' | 'expired' | 'revoked' | 'scoped-out'

export type DeviceRecord = {
  name: string                        // user-named, e.g., "Chris's Pixel"
  platform: 'android' | 'ios' | 'web' | 'desktop'
  lastSeenAt: Timestamp
  trustedAt: Timestamp
}

// -----------------------------------------------------------------------------
// 2.2 CanvasDoc — the spatial workspace holding lenses
// -----------------------------------------------------------------------------

export type CanvasDoc = {
  schemaVersion: 1
  
  canvasId: CanvasId
  name: string
  
  lenses: {
    [lensId: string]: {
      lensDocUrl: AutomergeUrl
      position: number                // ordering on the canvas dock
      pinned: boolean
    }
  }
  
  currentLensId: LensId | null
  
  visualTheme: string                 // e.g., 'wovith-default'
}

// -----------------------------------------------------------------------------
// 2.3 LensDoc — a single lens with its cells
// -----------------------------------------------------------------------------

export type LensDoc = {
  schemaVersion: 1
  
  lensId: LensId
  
  name: string
  description: string
  iconHint: string | null
  
  authorId: UserId
  forkedFrom: AutomergeUrl | null
  createdAt: Timestamp
  modifiedAt: Timestamp
  version: number                     // bumped on each non-trivial edit
  
  cells: { [cellId: string]: CellDef }
  
  layout: LensLayout
  
  requiredConnectors: ConnectorId[]
  requiredScopes: { [connectorId: string]: ScopeTier }
  
  sharingState: 'private' | 'exported' | 'imported'
  exportSnapshot: AutomergeUrl | null
}

export type LensLayout = {
  type: 'grid' | 'stack' | 'freeform'
  cells: {
    [cellId: string]: {
      gridX: number
      gridY: number
      gridW: number
      gridH: number
    }
  }
}

export type CellDef = {
  cellId: CellId
  expression: string                  // the DSL source (canonical)
  // parsedExpression is NOT persisted; regenerated at read time from `expression`
  rendererId: RendererId
  
  ttl: number | null                  // ms; null = manual refresh only
  background: boolean                 // refresh in background?
  
  title: string | null
  notes: string | null
  
  calibrationHints: string[]
  
  createdAt: Timestamp
  modifiedAt: Timestamp
}

// -----------------------------------------------------------------------------
// 2.4 CapturesDoc — user-generated content (voice notes, snippets, etc.)
// -----------------------------------------------------------------------------

export type CapturesDoc = {
  schemaVersion: 1
  
  capturesByDate: {
    [yyyymmdd: string]: {
      [captureId: string]: CaptureEntry
    }
  }
}

export type CaptureEntry = {
  type: 'text' | 'voice-transcript' | 'image-reference' | 'link'
  content: string
  createdAt: Timestamp
  deviceId: DeviceId
  tags: string[]
  archivedAt: Timestamp | null        // soft-deleted entries
}

// -----------------------------------------------------------------------------
// 2.5 CalibrationDoc — what the user has dismissed, pinned, muted
// -----------------------------------------------------------------------------

export type CalibrationDoc = {
  schemaVersion: 1
  
  perCell: {
    [cellId: string]: {
      dismissedItemIds: string[]
      pinnedItemIds: string[]
      lastCalibratedAt: Timestamp
    }
  }
  
  perSource: {
    [sourceId: string]: {              // sourceId format: 'connector:aspect:identifier'
      preferredCount: number           // Automerge.Counter
      dispreferredCount: number        // Automerge.Counter
      muted: boolean
      lastSignal: Timestamp
    }
  }
  
  topics: {
    [topicId: string]: {
      preferred: boolean
      lastSignal: Timestamp
    }
  }
}

// -----------------------------------------------------------------------------
// 2.6 AgentBudgetDoc — budget tracking
// -----------------------------------------------------------------------------

export type AgentBudgetDoc = {
  schemaVersion: 1
  
  userId: UserId
  tier: PricingTier
  
  daysHistory: {
    [yyyymmdd: string]: {
      callCount: number                // Automerge.Counter
      unitTotal: number                // Automerge.Counter
      providerBreakdown: { [provider: string]: number }
      modelTierBreakdown: { [tier: string]: number }
    }
  }
  
  currentDay: string                   // yyyymmdd
  currentDayCalls: number              // Automerge.Counter
  currentDayUnits: number              // Automerge.Counter
  
  lastResetAt: Timestamp
  
  /** When did the user first sign up — for tenure bonus eligibility */
  signupAt: Timestamp
}

// =============================================================================
// 3. CELL TYPES AND STATE
// =============================================================================

/** The logical state of a cell, tracked by the runtime */
export type CellState =
  | 'idle'           // never observed; not yet evaluated
  | 'fetching'       // initial evaluation in progress
  | 'fresh'          // recently computed, current
  | 'stale'          // beyond freshness budget; pending refresh
  | 'recomputing'    // re-evaluation in progress
  | 'failed'         // last evaluation failed
  | 'waiting'        // blocked on user confirmation (Intent Preview)

/** The visual freshness state shown by renderers; finer-grained than logical state */
export type VisualFreshnessState =
  | 'Fresh' | 'Steady' | 'Stale'
  | 'Recomputing' | 'Working' | 'Stuck'
  | 'Failed' | 'Suspended' | 'Stub'

/** The runtime representation of a cell (in-memory; not persisted) */
export type Cell = {
  id: CellId
  lensId: LensId
  
  // Definition (cached from the Automerge LensDoc.cells[cellId])
  expression: DSLExpression           // parsed AST
  source: string                      // original DSL source string
  rendererId: RendererId
  
  // Runtime state
  state: CellState
  value: CellValue | null
  error: CellError | null
  
  // Reactivity
  dependencies: Set<CellId>           // cells this cell reads from
  dependents: Set<CellId>             // cells that read from this cell
  observerCount: number               // 0 = unobserved; > 0 = observed
  
  // Freshness
  lastFreshAt: Timestamp
  staleAt: Timestamp | null
  ttl: number | null
  
  // Provenance (the latest)
  provenance: ProvenanceRecord | null
  
  // Performance metrics (rolling)
  evaluationCount: number
  lastEvalMs: number
  
  // Agent budget usage in current/last evaluation
  agentCallsThisRun: number
  agentUnitsThisRun: number
}

/** A cell's output value, typed by the data shape */
export type CellValue =
  | RecordSetValue
  | RecordValue
  | TextValue
  | NumberValue
  | TimeSeriesValue
  | GroupedValue
  | RawValue

export type RecordSetValue = {
  kind: 'record-set'
  records: Record<string, unknown>[]
  totalCount: number                  // may exceed records.length if paginated
  fields: FieldDescriptor[]
}

export type RecordValue = {
  kind: 'record'
  record: Record<string, unknown>
  fields: FieldDescriptor[]
}

export type TextValue = {
  kind: 'text'
  text: string
  format: 'plain' | 'markdown' | 'html'
}

export type NumberValue = {
  kind: 'number'
  value: number
  formatHint: 'count' | 'currency' | 'percentage' | 'duration-ms' | null
  unit: string | null
}

export type TimeSeriesValue = {
  kind: 'time-series'
  points: { t: Timestamp; v: number; label?: string }[]
  series: { name: string; color?: string }[]
}

export type GroupedValue = {
  kind: 'grouped'
  groups: { key: string; label: string; records: Record<string, unknown>[] }[]
  fields: FieldDescriptor[]
}

export type RawValue = {
  kind: 'raw'
  data: unknown
}

export type FieldDescriptor = {
  name: string
  type: 'string' | 'number' | 'timestamp' | 'boolean' | 'url' | 'email' | 'object'
  displayName: string
  isPrimary: boolean                  // is this the cell's "main" field for ranking/displaying?
}

/** Typed error from cell evaluation */
export type CellError =
  | { kind: 'connection_expired'; connector: ConnectorId; reconnectUrl: string }
  | { kind: 'connection_not_granted'; connector: ConnectorId; scope: string }
  | { kind: 'mcp_timeout'; connector: ConnectorId; afterMs: number }
  | { kind: 'mcp_rate_limit'; connector: ConnectorId; retryAfterMs: number }
  | { kind: 'mcp_error'; connector: ConnectorId; status: number; message: string }
  | { kind: 'expression_syntax'; line: number; column: number; message: string }
  | { kind: 'expression_runtime'; message: string; stack?: string }
  | { kind: 'agent_budget_exceeded'; resetAt: Timestamp }
  | { kind: 'agent_call_failed'; provider: LlmProvider; reason: string }
  | { kind: 'cell_dependency_failed'; failedCellId: CellId }
  | { kind: 'cell_eval_timeout'; afterMs: number }
  | { kind: 'circuit_breaker_open'; resetAt: Timestamp }
  | { kind: 'unknown'; message: string }

// =============================================================================
// 4. DSL AST TYPES
// =============================================================================

/** The root of a parsed cell expression */
export type DSLExpression = {
  kind: 'cell-expression'
  source: SourceClause
  steps: Step[]                       // applied in order
  renderer: RenderClause | null       // null = use default dispatch
  agentEnrichments: EnrichmentClause[]
}

export type SourceClause =
  | { kind: 'connector-source'; connector: string; resource: string; params: Record<string, ASTValue> }
  | { kind: 'cell-ref'; cellId: string }
  | { kind: 'variable-ref'; name: string }
  | { kind: 'union'; sources: SourceClause[] }
  | { kind: 'join'; left: SourceClause; right: SourceClause; on: Predicate }
  | { kind: 'literal-collection'; items: ASTValue[] }

export type Step =
  | FilterStep
  | SortStep
  | TakeStep
  | GroupStep
  | DistinctStep
  | MapStep

export type FilterStep = {
  kind: 'filter'
  predicate: Predicate
}

export type SortStep = {
  kind: 'sort'
  fields: { field: string; direction: 'asc' | 'desc' }[]
}

export type TakeStep = {
  kind: 'take'
  count: number
}

export type GroupStep = {
  kind: 'group'
  byField: string
  aggregations: { field: string; agg: 'count' | 'sum' | 'avg' | 'min' | 'max' }[]
}

export type DistinctStep = {
  kind: 'distinct'
  byField: string | null              // null = full-record distinct
}

export type MapStep = {
  kind: 'map'
  expression: string                  // sub-expression evaluated per record
}

export type Predicate =
  | { kind: 'comparison'; field: string; op: ComparisonOp; value: ASTValue }
  | { kind: 'and'; predicates: Predicate[] }
  | { kind: 'or'; predicates: Predicate[] }
  | { kind: 'not'; predicate: Predicate }
  | { kind: 'in-set'; field: string; set: ASTValue[] }
  | { kind: 'time-relative'; field: string; window: TimeWindow }
  | { kind: 'exists'; field: string }

export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts-with' | 'matches'

export type TimeWindow =
  | { kind: 'last-n-units'; n: number; unit: TimeUnit }
  | { kind: 'this-period'; period: 'day' | 'week' | 'month' | 'quarter' | 'year' }
  | { kind: 'between'; start: ASTValue; end: ASTValue }
  | { kind: 'after'; t: ASTValue }
  | { kind: 'before'; t: ASTValue }

export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export type ASTValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' }
  | { kind: 'time-literal'; value: 'now' | 'today' | 'yesterday' | 'this-week' | 'this-month' | string }
  | { kind: 'field-ref'; field: string }
  | { kind: 'variable-ref'; name: string }
  | { kind: 'list'; values: ASTValue[] }

export type RenderClause = {
  kind: 'render'
  rendererId: RendererId
  options: Record<string, ASTValue>
}

export type EnrichmentClause = {
  kind: 'enrichment'
  prompt: string                      // the literal prompt template
  model: ModelClass | null            // null = use user default
  required: boolean
  maxUnitsPerCall: number | null
  outputFieldName: string             // where to attach the agent's output
}

// =============================================================================
// 5. RUNTIME TYPES
// =============================================================================

export type Subscription = {
  readonly id: string
  unsubscribe(): void
  onChange(callback: (cell: Cell) => void): () => void
}

/** Context passed to a cell during evaluation */
export type EvalContext = {
  cellId: CellId
  lensId: LensId
  userId: UserId
  
  readCell(cellId: CellId): Promise<CellValue>
  
  mcp: McpClient
  agent: AgentClient
  
  recordRead(source: string, payload: unknown): void
  recordTransform(description: string): void
  recordCall(target: string, params: unknown): void
  recordUserInput(input: string): void
  
  now(): Date
  
  signal: AbortSignal
  
  logger: Logger
}

export type Logger = {
  trace(event: string, fields?: Record<string, unknown>): void
  debug(event: string, fields?: Record<string, unknown>): void
  info(event: string, fields?: Record<string, unknown>): void
  warn(event: string, fields?: Record<string, unknown>): void
  error(event: string, fields?: Record<string, unknown>): void
}

export interface CellRegistry {
  registerCell(definition: CellDef, lensId: LensId): Cell
  unregisterCell(id: CellId): void
  
  getCell(id: CellId): Cell | null
  getCells(lensId: LensId): Cell[]
  
  observe(id: CellId): Subscription
  
  refresh(id: CellId): Promise<void>
  refreshLens(lensId: LensId): Promise<void>
  
  onCellStateChange(
    callback: (id: CellId, oldState: CellState, newState: CellState) => void
  ): () => void
  
  onCellValue(id: CellId, callback: (value: CellValue) => void): () => void
}

/** Cell evaluation result, internal to the scheduler */
export type EvalResult =
  | { kind: 'success'; value: CellValue; provenance: ProvenanceRecord; durationMs: number }
  | { kind: 'failure'; error: CellError; provenance: ProvenanceRecord | null; durationMs: number }
  | { kind: 'cancelled' }

// =============================================================================
// 6. MCP / CONNECTOR TYPES
// =============================================================================

export type ConnectorDescriptor = {
  id: ConnectorId
  displayName: string
  
  canonicalUri: string                // e.g., 'https://drivemcp.googleapis.com/mcp/v1'
  
  clientId: string                    // OAuth client ID
  clientIdMetadataUrl?: string        // CIMD URL (RFC 8707)
  authorizationServer: string
  
  scopeTiers: {
    'read-only': string[]
    'read-and-write': string[]
    'full': string[]
  }
  
  iconUrl: string | null
  description: string
  preOAuthDisclosure: string
}

export type TokenSet = {
  accessToken: string
  refreshToken: string | null
  expiresAt: Timestamp
  scope: string[]
  tokenType: 'Bearer'
  resource: string                    // canonical URI this token is bound to (RFC 8707)
}

export type ConnectionHealth = {
  state: ConnectionState
  lastSuccessAt: Timestamp | null
  lastFailureAt: Timestamp | null
  lastFailureReason: string | null
  consecutiveFailures: number
}

export type CallOptions = {
  signal?: AbortSignal
  cacheKey?: string
  cacheTtlMs?: number
  longRunning?: boolean
  priority?: 'normal' | 'background'
}

export type TaskHandle = {
  taskId: string
  connector: ConnectorId
  pollUrl: string
  estimatedDurationMs?: number
}

export type TaskState = {
  status: 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled'
  progress: number                    // 0..1
  result?: unknown
  error?: { message: string; code?: string }
  inputRequest?: { prompt: string; schema?: unknown }
  pollAfterMs: number
}

export type ToolDescriptor = {
  name: string
  description: string
  inputSchema: unknown                // JSON schema
  outputSchema?: unknown
}

export interface McpClient {
  call(
    connectorId: ConnectorId,
    toolName: string,
    params: Record<string, unknown>,
    options?: CallOptions
  ): Promise<unknown>
  
  listConnectors(): Promise<ConnectorDescriptor[]>
  getConnectionState(connectorId: ConnectorId): ConnectionState
  connect(connectorId: ConnectorId, scopeTier: ScopeTier): Promise<ConnectionResult>
  disconnect(connectorId: ConnectorId): Promise<void>
  upgradeScope(connectorId: ConnectorId, newTier: ScopeTier): Promise<ConnectionResult>
  
  listTools(connectorId: ConnectorId): Promise<ToolDescriptor[]>
  describeTool(connectorId: ConnectorId, toolName: string): Promise<ToolDescriptor>
  
  pollTask(taskHandle: TaskHandle): Promise<TaskState>
  cancelTask(taskHandle: TaskHandle): Promise<void>
  
  isHealthy(connectorId: ConnectorId): boolean
  getHealth(connectorId: ConnectorId): ConnectionHealth
  onHealthChange(
    callback: (id: ConnectorId, oldHealth: ConnectionHealth, newHealth: ConnectionHealth) => void
  ): () => void
}

export type ConnectionResult = {
  connectionId: ConnectionId
  state: ConnectionState
  grantedScopes: string[]
  scopeTier: ScopeTier
}

// =============================================================================
// 7. AGENT / BUDGET TYPES
// =============================================================================

export type AgentRequest = {
  cellId: CellId
  lensId: LensId
  provider: LlmProvider
  model: string                       // exact model ID, e.g., 'claude-sonnet-4-6'
  modelClass: ModelClass
  prompt: string
  systemPrompt: string | null
  maxTokens: number
  temperature: number | null
  promptFingerprint: string           // hash of full input for caching
  signal: AbortSignal
}

export type AgentResponse = {
  text: string
  inputTokens: number
  outputTokens: number
  model: string
  durationMs: number
  cacheHit: boolean
  units: number                       // budget units consumed
}

export type CostEstimate = {
  inputTokens: number
  estimatedOutputTokens: number
  totalTokens: number
  units: number
  model: string
  modelClass: ModelClass
}

export type BudgetDecision =
  | { allow: true; degrade: DegradationStrategy | null }
  | { allow: false; reason: BudgetDenyReason; retryAfterMs?: number; resetAt?: Timestamp }

export type BudgetDenyReason =
  | 'circuit_breaker_open'
  | 'rpm_exceeded'
  | 'tpm_exceeded'
  | 'daily_hard_cap'

export type DegradationStrategy =
  | { kind: 'use-cache-only' }
  | { kind: 'downgrade-model'; from: ModelClass; to: ModelClass }
  | { kind: 'defer'; reason: string }
  | { kind: 'skip-enrichment' }

export interface AgentClient {
  call(request: AgentRequest): Promise<AgentResponse>
  estimateCost(request: Omit<AgentRequest, 'signal'>): CostEstimate
  countTokens(text: string, model: string): number
}

export interface BudgetTracker {
  check(estimate: CostEstimate): BudgetDecision
  recordCall(actualUnits: number, response: AgentResponse): Promise<void>
  recordFailure(estimatedUnits: number, reason: string): Promise<void>
  
  getSnapshot(): BudgetSnapshot
  onSnapshotChange(callback: (s: BudgetSnapshot) => void): () => void
}

export type BudgetSnapshot = {
  tier: PricingTier
  currentDayUnits: number
  softCap: number
  hardCap: number
  rpmRemaining: number
  tpmRemaining: number
  circuitBreakerState: 'closed' | 'open' | 'half-open'
  tenureBonusApplied: boolean
  resetsAt: Timestamp
}

// =============================================================================
// 8. PROVENANCE TYPES (W3C PROV-DM specialized)
// =============================================================================

export type ProvEntity =
  | CellValueEntity
  | McpResponseEntity
  | AgentResponseEntity
  | UserInputEntity
  | CacheEntryEntity

export type CellValueEntity = {
  kind: 'cell-value'
  id: string
  cellId: CellId
  lensId: LensId
  hash: string
  size: number
  createdAt: Timestamp
  metadata: {
    rendererId: RendererId
    itemCount?: number
    summary?: string
  }
}

export type McpResponseEntity = {
  kind: 'mcp-response'
  id: string
  connectorId: ConnectorId
  toolName: string
  paramsHash: string
  responseHash: string
  size: number
  createdAt: Timestamp
  ttlMs: number
}

export type AgentResponseEntity = {
  kind: 'agent-response'
  id: string
  provider: LlmProvider
  model: string
  promptFingerprint: string
  responseHash: string
  size: number
  inputTokens: number
  outputTokens: number
  createdAt: Timestamp
}

export type UserInputEntity = {
  kind: 'user-input'
  id: string
  source: 'voice' | 'text' | 'tap'
  contentHash: string
  createdAt: Timestamp
}

export type CacheEntryEntity = {
  kind: 'cache-entry'
  id: string
  cacheLayer: 'mcp' | 'agent' | 'cell-value'
  key: string
  storedAt: Timestamp
  retrievedAt: Timestamp
}

export type ProvActivity =
  | CellEvaluationActivity
  | McpCallActivity
  | AgentCallActivity
  | TransformActivity
  | UserActionActivity
  | CacheReadActivity

export type CellEvaluationActivity = {
  kind: 'cell-evaluation'
  id: string
  cellId: CellId
  expressionHash: string
  startedAt: Timestamp
  endedAt: Timestamp
  status: 'completed' | 'failed' | 'cancelled'
  evaluationCount: number
}

export type McpCallActivity = {
  kind: 'mcp-call'
  id: string
  connectorId: ConnectorId
  toolName: string
  startedAt: Timestamp
  endedAt: Timestamp
  status: 'completed' | 'failed' | 'timeout'
  durationMs: number
  cacheHit: boolean
}

export type AgentCallActivity = {
  kind: 'agent-call'
  id: string
  provider: LlmProvider
  model: string
  startedAt: Timestamp
  endedAt: Timestamp
  status: 'completed' | 'failed'
  inputTokens: number
  outputTokens: number
  cacheHit: boolean
  durationMs: number
  budgetUnits: number
}

export type TransformActivity = {
  kind: 'transform'
  id: string
  description: string
  appliedAt: Timestamp
}

export type UserActionActivity = {
  kind: 'user-action'
  id: string
  action: string
  performedAt: Timestamp
}

export type CacheReadActivity = {
  kind: 'cache-read'
  id: string
  cacheLayer: 'mcp' | 'agent' | 'cell-value'
  cacheKey: string
  readAt: Timestamp
  hit: boolean
}

export type ProvAgent =
  | { kind: 'user'; id: UserId }
  | { kind: 'system'; id: string; version: string }
  | { kind: 'llm'; id: string; provider: LlmProvider; modelVersion: string }

export type ProvenanceRelation = {
  type: 'used' | 'wasGeneratedBy' | 'wasAssociatedWith'
      | 'wasDerivedFrom' | 'wasInformedBy' | 'actedOnBehalfOf'
  subject: string                     // entity or activity ID
  object: string
}

export type ProvenanceRecord = {
  resultEntity: CellValueEntity
  evaluationActivity: CellEvaluationActivity
  upstream: ProvenanceNode[]
  relations: ProvenanceRelation[]
}

export type ProvenanceNode =
  | { kind: 'entity'; entity: ProvEntity }
  | { kind: 'activity'; activity: ProvActivity }

// =============================================================================
// 9. AUDIT LOG TYPES
// =============================================================================

export type AuditLogEntry =
  | { 
      type: 'mcp_read'
      logId: Ulid
      timestamp: Timestamp
      cellId: CellId
      lensId: LensId
      connectorId: ConnectorId
      toolName: string
      paramsHash: string
      resultSize: number
      cacheHit: boolean
      durationMs: number
    }
  | {
      type: 'mcp_write'
      logId: Ulid
      timestamp: Timestamp
      cellId: CellId
      lensId: LensId
      connectorId: ConnectorId
      toolName: string
      target: string
      summary: string
      userConfirmed: boolean
      durationMs: number
    }
  | {
      type: 'agent_call'
      logId: Ulid
      timestamp: Timestamp
      cellId: CellId
      lensId: LensId
      provider: LlmProvider
      model: string
      promptFingerprint: string
      inputTokens: number
      outputTokens: number
      cacheHit: boolean
      durationMs: number
      units: number
    }
  | {
      type: 'user_action'
      logId: Ulid
      timestamp: Timestamp
      cellId: CellId | null
      lensId: LensId | null
      action: string
      details: Record<string, unknown>
    }

// =============================================================================
// 10. CALIBRATION TYPES
// =============================================================================

export type CalibrationSignal =
  | { kind: 'dismiss'; cellId: CellId; itemStableId: string; itemSource: SourceIdentifier }
  | { kind: 'pin'; cellId: CellId; itemStableId: string }
  | { kind: 'mute-source'; source: SourceIdentifier }
  | { kind: 'unmute-source'; source: SourceIdentifier }
  | { kind: 'prefer-topic'; topicId: string }
  | { kind: 'block-topic'; topicId: string }
  | { kind: 'tap-through'; cellId: CellId; itemStableId: string }
  | { kind: 'long-dwell'; cellId: CellId; itemStableId: string; durationMs: number }

/** Format: 'connector:aspect:identifier' (e.g., 'gmail:sender:alice@x.com') */
export type SourceIdentifier = string

// =============================================================================
// 11. STORAGE ADAPTER PORTS
// =============================================================================

export interface AutomergeStore {
  loadDocument<T>(url: AutomergeUrl): Promise<T | null>
  createDocument<T>(initial: T): Promise<AutomergeUrl>
  change<T>(url: AutomergeUrl, mutator: (doc: T) => void): Promise<void>
  subscribe<T>(url: AutomergeUrl, callback: (doc: T) => void): () => void
}

export interface CacheStore {
  get<T>(table: 'mcp_cache' | 'agent_cache' | 'cell_cache', key: string): Promise<T | null>
  set<T>(
    table: 'mcp_cache' | 'agent_cache' | 'cell_cache',
    key: string,
    value: T,
    ttlMs: number
  ): Promise<void>
  delete(table: string, key: string): Promise<void>
  evictExpired(table: string): Promise<number>
}

export interface AuditStore {
  append(entry: AuditLogEntry): Promise<void>
  query(filters: AuditQuery): AsyncIterable<AuditLogEntry>
  archive(beforeTimestamp: Timestamp): Promise<number>
}

export type AuditQuery = {
  cellId?: CellId
  lensId?: LensId
  connectorId?: ConnectorId
  type?: AuditLogEntry['type']
  since?: Timestamp
  until?: Timestamp
  limit?: number
}

export interface TokenStorage {
  store(connectionId: ConnectionId, tokens: TokenSet): Promise<void>
  retrieve(connectionId: ConnectionId): Promise<TokenSet | null>
  delete(connectionId: ConnectionId): Promise<void>
  list(): Promise<ConnectionId[]>
}

// =============================================================================
// 12. PORT INTERFACES (for hexagonal architecture dependency injection)
// =============================================================================

/**
 * The full set of ports the runtime depends on.
 * Composed at app boot in app/boot/compose-effects.ts.
 * Tests substitute fake implementations.
 */
export type RuntimeEffects = {
  mcp: McpClient
  agent: AgentClient
  budget: BudgetTracker
  audit: AuditStore
  cache: CacheStore
  docs: AutomergeStore
  tokens: TokenStorage
  clock: Clock
  logger: Logger
}

export interface Clock {
  now(): Date
  nowMs(): Timestamp
  setTimeout(fn: () => void, ms: number): { cancel(): void }
  setInterval(fn: () => void, ms: number): { cancel(): void }
}
