import { useCallback, useEffect, useMemo, useState } from "react";

import { GoogleCalendarConnectorPanel } from "@/connectors/google-calendar/GoogleCalendarConnectorPanel";
import {
  BrowserGoogleCalendarTokenProvider,
  MockGoogleCalendarTokenProvider,
} from "@/connectors/google-calendar/google-calendar-auth";
import {
  GOOGLE_CALENDAR_CELL_ID,
  ensureGoogleCalendarCell,
} from "@/connectors/google-calendar/google-calendar-cell";
import type {
  CellDefinition,
  CellEvaluationResult,
  ConnectorAccount,
  DslValidationWarning,
  EvaluationClock,
  ProvenanceEvidence,
  SourceAdapter,
  SourceSchema,
  WovithError,
} from "@/domain/types";
import { parseCanonicalDsl } from "@/dsl/parse";
import { summarizeValidationWarnings } from "@/dsl/warning-summary";
import { validateCellAst } from "@/dsl/validate";
import { explainEmptyCell, explainWhyItem } from "@/provenance/why";
import { CountRenderer } from "@/renderers/CountRenderer";
import { ListRenderer } from "@/renderers/ListRenderer";
import { RawRenderer } from "@/renderers/RawRenderer";
import { TableRenderer } from "@/renderers/TableRenderer";
import { RuntimeScheduler } from "@/runtime/scheduler";
import { createDailyWorkLens, updateCellAst } from "@/runtime/starter-lens";
import {
  GoogleCalendarSourceAdapter,
  MockGoogleCalendarSourceAdapter,
} from "@/sources/google-calendar/google-calendar-adapter";
import { GOOGLE_CALENDAR_EVENTS_SOURCE_ID } from "@/sources/google-calendar/schema";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { STAGE_0_RENDERERS } from "@/sources/synthetic/schema";
import { sourceSchemaRegistry } from "@/sources/registry";
import { LocalStage0Store } from "@/storage/local-store";

const DEMO_CLOCK: EvaluationClock = {
  now: new Date("2026-05-20T13:00:00.000Z"),
  timeZone: "America/New_York",
};

interface WhySelection {
  cell: CellDefinition;
  result: CellEvaluationResult;
  evidence: ProvenanceEvidence;
}

export function App() {
  const googleMockEnabled = useMemo(() => isGoogleCalendarMockEnabled(), []);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined;
  const googleTokenProvider = useMemo(
    () =>
      googleMockEnabled
        ? new MockGoogleCalendarTokenProvider()
        : new BrowserGoogleCalendarTokenProvider({
            clientId: googleClientId,
          }),
    [googleClientId, googleMockEnabled],
  );
  const [googleAccount, setGoogleAccount] = useState<ConnectorAccount>(() =>
    googleTokenProvider.status(),
  );
  const adapters = useMemo<Record<string, SourceAdapter | undefined>>(() => {
    const next: Record<string, SourceAdapter | undefined> =
      createSyntheticAdapters();
    if (googleAccount.status === "connected") {
      next[GOOGLE_CALENDAR_EVENTS_SOURCE_ID] = googleMockEnabled
        ? new MockGoogleCalendarSourceAdapter(googleTokenProvider)
        : new GoogleCalendarSourceAdapter({
            tokenProvider: googleTokenProvider,
          });
    }
    return next;
  }, [googleAccount.status, googleMockEnabled, googleTokenProvider]);
  const store = useMemo(() => new LocalStage0Store(window.localStorage), []);
  const [lens, setLens] = useState(() => {
    const existing = store.listLenses()[0];
    if (existing) {
      return existing;
    }
    const starter = createDailyWorkLens();
    store.saveLens(starter);
    return starter;
  });
  const [results, setResults] = useState<Record<string, CellEvaluationResult>>(
    {},
  );
  const [selectedCellId, setSelectedCellId] = useState(lens.cells[0]?.id);
  const selectedCell =
    lens.cells.find((cell) => cell.id === selectedCellId) ?? lens.cells[0];
  const [editorText, setEditorText] = useState(
    selectedCell?.canonicalDsl ?? "",
  );
  const [editorErrors, setEditorErrors] = useState<WovithError[]>([]);
  const [editorWarnings, setEditorWarnings] = useState<DslValidationWarning[]>(
    [],
  );
  const [whySelection, setWhySelection] = useState<WhySelection | null>(null);
  const [pendingGoogleRefresh, setPendingGoogleRefresh] = useState(false);

  const validationContext = useMemo(
    () => ({
      sourceSchemas: sourceSchemaRegistry,
      maxTake: 100,
      allowedRenderers: [...STAGE_0_RENDERERS],
    }),
    [],
  );
  const scheduler = useMemo(
    () =>
      new RuntimeScheduler({
        adapters,
        sourceSchemas: sourceSchemaRegistry,
        validationContext,
        clock: DEMO_CLOCK,
        adapterUnavailableErrors: {
          [GOOGLE_CALENDAR_EVENTS_SOURCE_ID]: {
            code: "google-calendar-not-connected",
            message:
              "Connect Google Calendar read-only access to evaluate this cell.",
          },
        },
      }),
    [adapters, validationContext],
  );

  const refreshCell = useCallback(
    async (
      cell: CellDefinition,
      reason: "manual" | "refresh-all" | "on-open" = "manual",
    ) => {
      const result = await scheduler.refreshCell(cell, lens, reason);
      store.saveEvaluation(result, lens.snapshotPolicy);
      setResults((current) => ({ ...current, [cell.id]: result }));
      if (cell.ast.from.sourceId === GOOGLE_CALENDAR_EVENTS_SOURCE_ID) {
        setGoogleAccount(googleTokenProvider.status());
      }
    },
    [googleTokenProvider, lens, scheduler, store],
  );

  useEffect(() => {
    void scheduler.refreshOnOpen(lens).then((nextResults) => {
      nextResults.forEach((result) =>
        store.saveEvaluation(result, lens.snapshotPolicy),
      );
      if (
        nextResults.some(
          (result) =>
            lens.cells.find((cell) => cell.id === result.cellId)?.ast.from
              .sourceId === GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
        )
      ) {
        setGoogleAccount(googleTokenProvider.status());
      }
      setResults((current) => ({
        ...current,
        ...Object.fromEntries(
          nextResults.map((result) => [result.cellId, result]),
        ),
      }));
    });
  }, [googleTokenProvider, lens, scheduler, store]);

  useEffect(() => {
    if (!pendingGoogleRefresh) {
      return;
    }
    const googleCell = lens.cells.find(
      (cell) => cell.id === GOOGLE_CALENDAR_CELL_ID,
    );
    setPendingGoogleRefresh(false);
    if (googleCell) {
      void refreshCell(googleCell);
    }
  }, [lens, pendingGoogleRefresh, refreshCell]);

  useEffect(() => {
    setEditorText(selectedCell?.canonicalDsl ?? "");
    setEditorErrors([]);
    if (selectedCell) {
      const report = validateCellAst(selectedCell.ast, validationContext);
      setEditorWarnings(report.warnings);
    }
  }, [selectedCell, validationContext]);

  function resetStarterLens() {
    const starter = createDailyWorkLens();
    store.clearEvaluationsForLens(lens.id);
    store.saveLens(starter);
    setLens(starter);
    setSelectedCellId(starter.cells[0]?.id);
    setResults({});
    setWhySelection(null);
  }

  async function connectGoogleCalendar() {
    setGoogleAccount({ ...googleTokenProvider.status(), status: "connecting" });
    const result = await googleTokenProvider.connect();
    const nextAccount = googleTokenProvider.status();
    setGoogleAccount(nextAccount);
    if (!result.ok) {
      return;
    }
    const nextLens = ensureGoogleCalendarCell(lens, new Date().toISOString());
    store.saveLens(nextLens);
    setLens(nextLens);
    setSelectedCellId(GOOGLE_CALENDAR_CELL_ID as CellDefinition["id"]);
    setPendingGoogleRefresh(true);
  }

  function disconnectGoogleCalendar() {
    googleTokenProvider.disconnect();
    setGoogleAccount(googleTokenProvider.status());
    setPendingGoogleRefresh(true);
  }

  function saveEditor() {
    if (!selectedCell) {
      return;
    }
    const parsed = parseCanonicalDsl(editorText);
    if (!parsed.ok) {
      setEditorErrors([parsed.error]);
      return;
    }
    const report = validateCellAst(parsed.value, validationContext);
    if (!report.valid) {
      setEditorErrors(
        report.errors.map((error) => ({
          code: error.code,
          message: error.message,
          details: error.path,
        })),
      );
      setEditorWarnings(report.warnings);
      return;
    }
    const updatedCell = updateCellAst(
      selectedCell,
      parsed.value,
      new Date().toISOString(),
    );
    const nextLens = {
      ...lens,
      updatedAt: updatedCell.updatedAt,
      cells: lens.cells.map((cell) =>
        cell.id === updatedCell.id ? updatedCell : cell,
      ),
    };
    store.saveLens(nextLens);
    setLens(nextLens);
    setEditorErrors([]);
    setEditorWarnings(report.warnings);
    void refreshCell(updatedCell);
  }

  function clearCachedResults() {
    store.clearEvaluationsForLens(lens.id);
    setResults({});
    setWhySelection(null);
  }

  function openWhy(
    cell: CellDefinition,
    result: CellEvaluationResult,
    evidence: ProvenanceEvidence,
  ) {
    setWhySelection({ cell, result, evidence });
  }

  return (
    <main className="app-shell" data-testid="wovith-app">
      <aside className="sidebar" aria-label="Lens list">
        <div className="brand-block">
          <div className="brand-mark">W</div>
          <div>
            <h1>Wovith</h1>
            <p>Stage 0.5</p>
          </div>
        </div>
        <button className="lens-button active" type="button">
          <span>{lens.name}</span>
          <small>{lens.cells.length} cells</small>
        </button>
        <GoogleCalendarConnectorPanel
          account={googleAccount}
          clientIdConfigured={Boolean(googleClientId?.trim())}
          mockEnabled={googleMockEnabled}
          onConnect={() => void connectGoogleCalendar()}
          onDisconnect={disconnectGoogleCalendar}
        />
        <button
          className="ghost-button"
          type="button"
          onClick={resetStarterLens}
        >
          Reset Demo Lens
        </button>
        <button
          className="ghost-button"
          type="button"
          data-testid="clear-cache"
          onClick={clearCachedResults}
        >
          Clear Cached Results
        </button>
      </aside>

      <section className="workspace" aria-label="Lens detail">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Local lens runtime</p>
            <h2>{lens.name}</h2>
          </div>
          <div className="header-actions">
            <span className="storage-pill">Local persistence on</span>
            <button
              className="primary-button"
              type="button"
              data-testid="refresh-all"
              onClick={() =>
                void scheduler.refreshAll(lens).then((nextResults) => {
                  nextResults.forEach((result) =>
                    store.saveEvaluation(result, lens.snapshotPolicy),
                  );
                  if (
                    nextResults.some(
                      (result) =>
                        lens.cells.find((cell) => cell.id === result.cellId)
                          ?.ast.from.sourceId ===
                        GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
                    )
                  ) {
                    setGoogleAccount(googleTokenProvider.status());
                  }
                  setResults((current) => ({
                    ...current,
                    ...Object.fromEntries(
                      nextResults.map((result) => [result.cellId, result]),
                    ),
                  }));
                })
              }
            >
              Refresh All
            </button>
          </div>
        </header>

        <div className="content-grid">
          <section className="cell-stack" aria-label="Cells">
            {lens.cells.map((cell) => (
              <CellCard
                key={cell.id}
                cell={cell}
                result={results[cell.id]}
                sourceSchema={sourceSchemaRegistry[cell.ast.from.sourceId]}
                onEdit={() => setSelectedCellId(cell.id)}
                onRefresh={() => void refreshCell(cell)}
                onWhy={(evidence) => {
                  const result = results[cell.id];
                  if (result) {
                    openWhy(cell, result, evidence);
                  }
                }}
              />
            ))}
          </section>

          <aside className="editor-panel" aria-label="Cell editor">
            <div className="editor-tabs">
              {lens.cells.map((cell) => (
                <button
                  className={
                    cell.id === selectedCell?.id ? "tab active" : "tab"
                  }
                  key={cell.id}
                  type="button"
                  onClick={() => setSelectedCellId(cell.id)}
                >
                  {cell.title}
                </button>
              ))}
            </div>
            <label className="editor-label" htmlFor="dsl-editor">
              Canonical DSL
            </label>
            <textarea
              id="dsl-editor"
              data-testid="dsl-editor"
              value={editorText}
              spellCheck={false}
              onChange={(event) => setEditorText(event.target.value)}
            />
            {editorErrors.length > 0 ? (
              <div className="error-box" role="alert">
                {editorErrors.map((error) => (
                  <p key={`${error.code}-${error.message}`}>{error.message}</p>
                ))}
              </div>
            ) : null}
            {editorWarnings.length > 0 ? (
              <WarningList warnings={editorWarnings} />
            ) : null}
            <button
              className="primary-button full-width"
              type="button"
              data-testid="save-cell"
              onClick={saveEditor}
            >
              Save Cell
            </button>
          </aside>
        </div>
      </section>

      {whySelection ? (
        <WhyPanel
          selection={whySelection}
          sourceSchema={
            sourceSchemaRegistry[whySelection.cell.ast.from.sourceId]
          }
          onClose={() => setWhySelection(null)}
        />
      ) : null}
    </main>
  );
}

interface CellCardProps {
  cell: CellDefinition;
  result?: CellEvaluationResult;
  sourceSchema?: SourceSchema;
  onEdit: () => void;
  onRefresh: () => void;
  onWhy: (evidence: ProvenanceEvidence) => void;
}

function CellCard({
  cell,
  onEdit,
  onRefresh,
  onWhy,
  result,
  sourceSchema,
}: CellCardProps) {
  const emptyReason =
    result &&
    sourceSchema &&
    result.errors.length === 0 &&
    (result.snapshot.outputCount ?? 0) === 0
      ? explainEmptyCell({
          ast: cell.ast,
          sourceSchema,
          evaluatedAt: result.evaluatedAt,
        })
      : null;

  return (
    <article className="cell-card" data-testid="cell-card">
      <header className="cell-header">
        <div>
          <h3>{cell.title}</h3>
          <p>{cell.description}</p>
        </div>
        <div className="cell-actions">
          <span className={`freshness ${result?.freshness ?? "idle"}`}>
            {result?.freshness ?? "idle"}
          </span>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </header>

      {result?.errors.length ? (
        <div className="error-box" role="alert">
          {result.errors.map((error) => (
            <p key={`${error.code}-${error.message}`}>{error.message}</p>
          ))}
        </div>
      ) : null}

      {!result ? (
        <div className="loading-row">
          No current result. Refresh to evaluate.
        </div>
      ) : null}
      {result && result.errors.length === 0 ? (
        <>
          {result.warnings.length > 0 ? (
            <WarningList warnings={result.warnings} />
          ) : null}
          <RendererSwitch result={result} onWhy={onWhy} />
          {emptyReason ? <p className="empty-reason">{emptyReason}</p> : null}
          <footer className="cell-footer">
            <span>{result.snapshot.outputSummary}</span>
            <span>{result.durationMs} ms</span>
          </footer>
        </>
      ) : null}
    </article>
  );
}

function RendererSwitch({
  onWhy,
  result,
}: {
  result: CellEvaluationResult;
  onWhy: (evidence: ProvenanceEvidence) => void;
}) {
  if (result.renderer === "count") {
    return <CountRenderer result={result} />;
  }
  if (result.renderer === "table") {
    return <TableRenderer result={result} onWhy={onWhy} />;
  }
  if (result.renderer === "raw") {
    return <RawRenderer result={result} onWhy={onWhy} />;
  }
  return <ListRenderer result={result} onWhy={onWhy} />;
}

function WhyPanel({
  onClose,
  selection,
  sourceSchema,
}: {
  onClose: () => void;
  selection: WhySelection;
  sourceSchema: SourceSchema;
}) {
  const why = explainWhyItem({
    ast: selection.cell.ast,
    sourceSchema,
    evidence: selection.evidence,
    snapshot: selection.result.snapshot,
  });

  return (
    <aside
      className="why-panel"
      aria-label="Why am I seeing this?"
      data-testid="why-panel"
    >
      <header>
        <div>
          <p className="eyebrow">Why am I seeing this?</p>
          <h2>{selection.cell.title}</h2>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <section>
        <h3>Reason</h3>
        <p>{why.plainLanguage}</p>
      </section>
      <section>
        <h3>Rule Trace</h3>
        <ol className="trace-list">
          {why.ruleTrace.map((step) => (
            <li key={`${step.kind}-${step.label}`}>{step.label}</li>
          ))}
        </ol>
      </section>
      <section>
        <h3>Evidence</h3>
        {why.evidence.map((evidence) => (
          <div className="evidence-block" key={evidence.id}>
            <p>Source: {sourceSchema.displayName}</p>
            <p>Item ID: {evidence.itemId}</p>
            <p>Source timestamp: {evidence.sourceTimestamp ?? "unknown"}</p>
            <p>Evidence recorded: {evidence.observedAt}</p>
            <ul>
              {evidence.matchedPredicates.map((predicate) => (
                <li key={predicate.predicateId}>
                  {predicate.field}: {predicate.actualPreview ?? "unknown"}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section>
        <h3>Evaluation</h3>
        <dl className="metadata-grid">
          <div>
            <dt>Renderer</dt>
            <dd>{why.metadata.renderer}</dd>
          </div>
          <div>
            <dt>Evaluated</dt>
            <dd>{why.metadata.evaluatedAt}</dd>
          </div>
          <div>
            <dt>Snapshot</dt>
            <dd>{why.metadata.snapshotId}</dd>
          </div>
        </dl>
      </section>
      <details>
        <summary>Raw evidence</summary>
        <pre>{JSON.stringify(selection.evidence, null, 2)}</pre>
      </details>
    </aside>
  );
}

function WarningList({ warnings }: { warnings: DslValidationWarning[] }) {
  const summary = summarizeValidationWarnings(warnings);
  if (!summary) {
    return null;
  }

  return (
    <div className="warning-box" role="status">
      <p className="warning-summary" data-testid="warning-summary">
        {summary.summary}
      </p>
      <details data-testid="warning-details">
        <summary>Details</summary>
        <ul>
          {summary.details.map((detail, index) => (
            <li key={`${index}-${detail}`}>{detail}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function isGoogleCalendarMockEnabled(): boolean {
  return (
    import.meta.env.VITE_WOVITH_E2E_MOCK_GOOGLE === "1" ||
    window.localStorage.getItem("wovith.e2e.mockGoogle") === "1"
  );
}
