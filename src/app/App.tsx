import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GoogleCalendarConnectorPanel } from "@/connectors/google-calendar/GoogleCalendarConnectorPanel";
import {
  BrowserGoogleCalendarTokenProvider,
  MockGoogleCalendarTokenProvider,
} from "@/connectors/google-calendar/google-calendar-auth";
import { ensureGoogleCalendarCell } from "@/connectors/google-calendar/google-calendar-cell";
import { asAlphaFeedbackId, asIsoDateTime, stableHash } from "@/domain/ids";
import type {
  AlphaFeedbackEntry,
  AlphaFeedbackKind,
  CellDefinition,
  CellEvaluationResult,
  ConnectorAccount,
  DslValidationWarning,
  EvaluationClock,
  LensDefinition,
  ProvenanceEvidence,
  SourceAdapter,
  SourceSchema,
  WovithError,
} from "@/domain/types";
import { parseCanonicalDsl } from "@/dsl/parse";
import { summarizeValidationWarnings } from "@/dsl/warning-summary";
import { validateCellAst } from "@/dsl/validate";
import { createLensFromTemplate } from "@/lenses/template-instantiation";
import { listLensTemplates } from "@/lenses/templates";
import type { LensTemplate } from "@/lenses/template-types";
import { explainEmptyCell, explainWhyItem } from "@/provenance/why";
import { CountRenderer } from "@/renderers/CountRenderer";
import { ListRenderer } from "@/renderers/ListRenderer";
import { RawRenderer } from "@/renderers/RawRenderer";
import { TableRenderer } from "@/renderers/TableRenderer";
import {
  deleteCell,
  duplicateCell,
  renameCell,
  setCellEnabled,
} from "@/runtime/cell-lifecycle";
import { RuntimeScheduler } from "@/runtime/scheduler";
import { createDailyWorkLens, updateCellAst } from "@/runtime/starter-lens";
import {
  GoogleCalendarSourceAdapter,
  MockGoogleCalendarSourceAdapter,
} from "@/sources/google-calendar/google-calendar-adapter";
import { GOOGLE_CALENDAR_EVENTS_SOURCE_ID } from "@/sources/google-calendar/schema";
import { sourceSchemaRegistry } from "@/sources/registry";
import { STAGE_0_RENDERERS } from "@/sources/synthetic/schema";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
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
  const googleMockScenario = useMemo(() => googleCalendarMockScenario(), []);
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
        ? new MockGoogleCalendarSourceAdapter(
            googleTokenProvider,
            googleMockScenario,
          )
        : new GoogleCalendarSourceAdapter({
            tokenProvider: googleTokenProvider,
          });
    }
    return next;
  }, [
    googleAccount.status,
    googleMockEnabled,
    googleMockScenario,
    googleTokenProvider,
  ]);
  const store = useMemo(() => new LocalStage0Store(window.localStorage), []);
  const templates = useMemo(() => listLensTemplates(), []);
  const [lenses, setLenses] = useState<LensDefinition[]>(() =>
    store.listLenses(),
  );
  const [activeLensId, setActiveLensId] = useState<LensDefinition["id"] | null>(
    () => store.listLenses()[0]?.id ?? null,
  );
  const activeLens =
    lenses.find((entry) => entry.id === activeLensId) ?? lenses[0] ?? null;
  const [results, setResults] = useState<Record<string, CellEvaluationResult>>(
    {},
  );
  const [feedbackEntries, setFeedbackEntries] = useState<AlphaFeedbackEntry[]>(
    () => store.listFeedback(),
  );
  const [selectedCellId, setSelectedCellId] = useState<
    CellDefinition["id"] | undefined
  >(activeLens?.cells[0]?.id);
  const selectedCell =
    activeLens?.cells.find((cell) => cell.id === selectedCellId) ??
    activeLens?.cells[0];
  const [editorText, setEditorText] = useState(
    selectedCell?.canonicalDsl ?? "",
  );
  const [editorErrors, setEditorErrors] = useState<WovithError[]>([]);
  const [editorWarnings, setEditorWarnings] = useState<DslValidationWarning[]>(
    [],
  );
  const [whySelection, setWhySelection] = useState<WhySelection | null>(null);
  const whyReturnFocusRef = useRef<HTMLElement | null>(null);
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

  const saveLensState = useCallback(
    (nextLens: LensDefinition) => {
      store.saveLens(nextLens);
      setLenses((current) => [
        ...current.filter((entry) => entry.id !== nextLens.id),
        nextLens,
      ]);
      setActiveLensId(nextLens.id);
    },
    [store],
  );

  const refreshCell = useCallback(
    async (
      cell: CellDefinition,
      lensForCell: LensDefinition,
      reason: "manual" | "refresh-all" | "on-open" = "manual",
    ) => {
      if (!cell.enabled) {
        return;
      }
      const result = await scheduler.refreshCell(cell, lensForCell, reason);
      store.saveEvaluation(result, lensForCell.snapshotPolicy);
      setResults((current) => ({
        ...current,
        [resultKey(result.lensId, result.cellId)]: result,
      }));
      if (cell.ast.from.sourceId === GOOGLE_CALENDAR_EVENTS_SOURCE_ID) {
        setGoogleAccount(googleTokenProvider.status());
      }
    },
    [googleTokenProvider, scheduler, store],
  );

  useEffect(() => {
    if (!activeLens) {
      return;
    }
    void scheduler.refreshOnOpen(activeLens).then((nextResults) => {
      nextResults.forEach((result) =>
        store.saveEvaluation(result, activeLens.snapshotPolicy),
      );
      if (
        nextResults.some(
          (result) =>
            activeLens.cells.find((cell) => cell.id === result.cellId)?.ast.from
              .sourceId === GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
        )
      ) {
        setGoogleAccount(googleTokenProvider.status());
      }
      setResults((current) => ({
        ...current,
        ...Object.fromEntries(
          nextResults.map((result) => [
            resultKey(result.lensId, result.cellId),
            result,
          ]),
        ),
      }));
    });
  }, [activeLens, googleTokenProvider, scheduler, store]);

  useEffect(() => {
    if (!activeLens) {
      setSelectedCellId(undefined);
      return;
    }
    if (!activeLens.cells.some((cell) => cell.id === selectedCellId)) {
      setSelectedCellId(activeLens.cells[0]?.id);
    }
  }, [activeLens, selectedCellId]);

  useEffect(() => {
    if (!pendingGoogleRefresh || !activeLens) {
      return;
    }
    const googleCell = findGoogleCalendarCell(activeLens);
    setPendingGoogleRefresh(false);
    if (googleCell) {
      void refreshCell(googleCell, activeLens);
    }
  }, [activeLens, pendingGoogleRefresh, refreshCell]);

  useEffect(() => {
    setEditorText(selectedCell?.canonicalDsl ?? "");
    setEditorErrors([]);
    if (selectedCell) {
      const report = validateCellAst(selectedCell.ast, validationContext);
      setEditorWarnings(report.warnings);
    } else {
      setEditorWarnings([]);
    }
  }, [selectedCell, validationContext]);

  function createTemplateLens(templateId: string) {
    const nextLens = createLensFromTemplate(templateId, new Date());
    saveLensState(nextLens);
    setSelectedCellId(nextLens.cells[0]?.id);
    setWhySelection(null);
  }

  function createSyntheticDemoLens() {
    const starter = createDailyWorkLens();
    saveLensState(starter);
    setSelectedCellId(starter.cells[0]?.id);
    setWhySelection(null);
  }

  function renameActiveLens() {
    if (!activeLens) {
      return;
    }
    const name = window.prompt("Rename lens", activeLens.name)?.trim();
    if (!name) {
      return;
    }
    saveLensState({
      ...activeLens,
      name,
      updatedAt: asIsoDateTime(new Date().toISOString()),
    });
  }

  function deleteActiveLens() {
    if (!activeLens) {
      return;
    }
    if (!window.confirm(`Delete ${activeLens.name}?`)) {
      return;
    }
    store.deleteLens(activeLens.id);
    const nextLenses = lenses.filter((lens) => lens.id !== activeLens.id);
    setLenses(nextLenses);
    setActiveLensId(nextLenses[0]?.id ?? null);
    setSelectedCellId(nextLenses[0]?.cells[0]?.id);
    setResults((current) => omitResultsForLens(current, activeLens.id));
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
    if (!activeLens) {
      return;
    }
    const hasCalendarCell = Boolean(findGoogleCalendarCell(activeLens));
    const nextLens = hasCalendarCell
      ? activeLens
      : ensureGoogleCalendarCell(activeLens, new Date().toISOString());
    if (!hasCalendarCell) {
      saveLensState(nextLens);
    }
    setSelectedCellId(findGoogleCalendarCell(nextLens)?.id);
    setPendingGoogleRefresh(true);
  }

  function disconnectGoogleCalendar() {
    googleTokenProvider.disconnect();
    setGoogleAccount(googleTokenProvider.status());
    setPendingGoogleRefresh(true);
  }

  function saveEditor() {
    if (!activeLens || !selectedCell) {
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
      ...activeLens,
      updatedAt: updatedCell.updatedAt,
      cells: activeLens.cells.map((cell) =>
        cell.id === updatedCell.id ? updatedCell : cell,
      ),
    };
    saveLensState(nextLens);
    setEditorErrors([]);
    setEditorWarnings(report.warnings);
    if (updatedCell.enabled) {
      void refreshCell(updatedCell, nextLens);
    }
  }

  function clearCachedResults() {
    if (!activeLens) {
      return;
    }
    store.clearEvaluationsForLens(activeLens.id);
    setResults((current) => omitResultsForLens(current, activeLens.id));
    setWhySelection(null);
  }

  function updateActiveLens(nextLens: LensDefinition) {
    saveLensState(nextLens);
    if (!nextLens.cells.some((cell) => cell.id === selectedCellId)) {
      setSelectedCellId(nextLens.cells[0]?.id);
    }
  }

  function renameSelectedCell(cell: CellDefinition) {
    if (!activeLens) {
      return;
    }
    const title = window.prompt("Rename cell", cell.title)?.trim();
    if (!title) {
      return;
    }
    updateActiveLens(
      renameCell(activeLens, cell.id, title, new Date().toISOString()),
    );
  }

  function duplicateSelectedCell(cell: CellDefinition) {
    if (!activeLens) {
      return;
    }
    const nextLens = duplicateCell(
      activeLens,
      cell.id,
      new Date().toISOString(),
    );
    updateActiveLens(nextLens);
    const index = activeLens.cells.findIndex((entry) => entry.id === cell.id);
    setSelectedCellId(nextLens.cells[index + 1]?.id ?? cell.id);
  }

  function toggleSelectedCell(cell: CellDefinition) {
    if (!activeLens) {
      return;
    }
    const nextLens = setCellEnabled(
      activeLens,
      cell.id,
      !cell.enabled,
      new Date().toISOString(),
    );
    updateActiveLens(nextLens);
  }

  function deleteSelectedCell(cell: CellDefinition) {
    if (!activeLens) {
      return;
    }
    if (!window.confirm(`Delete ${cell.title}?`)) {
      return;
    }
    const nextLens = deleteCell(activeLens, cell.id, new Date().toISOString());
    store.clearEvaluationsForCell(cell.id);
    setResults((current) => {
      const next = { ...current };
      delete next[resultKey(activeLens.id, cell.id)];
      return next;
    });
    updateActiveLens(nextLens);
    setWhySelection(null);
  }

  function recordFeedback(cell: CellDefinition, kind: AlphaFeedbackKind) {
    if (!activeLens) {
      return;
    }
    const createdAt = asIsoDateTime(new Date().toISOString());
    const entry: AlphaFeedbackEntry = {
      id: asAlphaFeedbackId(
        `feedback_${stableHash(
          `${activeLens.id}:${cell.id}:${kind}:${createdAt}`,
        ).slice(1, 9)}`,
      ),
      lensId: activeLens.id,
      cellId: cell.id,
      kind,
      createdAt,
    };
    store.saveFeedback(entry);
    setFeedbackEntries(store.listFeedback());
  }

  function openWhy(
    cell: CellDefinition,
    result: CellEvaluationResult,
    evidence: ProvenanceEvidence,
    trigger?: HTMLElement | null,
  ) {
    whyReturnFocusRef.current = trigger ?? null;
    setWhySelection({ cell, result, evidence });
  }

  function closeWhy() {
    setWhySelection(null);
    window.setTimeout(() => whyReturnFocusRef.current?.focus(), 0);
  }

  return (
    <main className="app-shell" data-testid="wovith-app">
      <aside className="sidebar" aria-label="Lens list">
        <div className="brand-block">
          <div className="brand-mark">W</div>
          <div>
            <h1>Wovith</h1>
            <p>Stage 1</p>
          </div>
        </div>

        <section className="lens-list" aria-label="Saved lenses">
          {lenses.length > 0 ? (
            lenses.map((lens) => (
              <button
                className={
                  lens.id === activeLens?.id
                    ? "lens-button active"
                    : "lens-button"
                }
                key={lens.id}
                type="button"
                onClick={() => {
                  setActiveLensId(lens.id);
                  setSelectedCellId(lens.cells[0]?.id);
                  setWhySelection(null);
                }}
              >
                <span>{lens.name}</span>
                <small>{lens.cells.length} cells</small>
              </button>
            ))
          ) : (
            <p className="muted-copy">No lenses yet.</p>
          )}
        </section>

        <TemplatePicker templates={templates} onCreate={createTemplateLens} />

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
          onClick={createSyntheticDemoLens}
        >
          Add Synthetic Demo Lens
        </button>
        <button
          className="ghost-button"
          type="button"
          data-testid="clear-cache"
          disabled={!activeLens}
          onClick={clearCachedResults}
        >
          Clear Cached Results
        </button>
      </aside>

      <section className="workspace" aria-label="Lens detail">
        {!activeLens ? (
          <FirstRunCard templates={templates} onCreate={createTemplateLens} />
        ) : (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">Local lens runtime</p>
                <h2>{activeLens.name}</h2>
                {activeLens.description ? (
                  <p>{activeLens.description}</p>
                ) : null}
              </div>
              <div className="header-actions">
                <span className="storage-pill">Local persistence on</span>
                <button type="button" onClick={renameActiveLens}>
                  Rename Lens
                </button>
                <button type="button" onClick={deleteActiveLens}>
                  Delete Lens
                </button>
                <button
                  className="primary-button"
                  type="button"
                  data-testid="refresh-all"
                  onClick={() =>
                    void scheduler
                      .refreshAll(activeLens)
                      .then((nextResults) => {
                        nextResults.forEach((result) =>
                          store.saveEvaluation(
                            result,
                            activeLens.snapshotPolicy,
                          ),
                        );
                        if (
                          nextResults.some(
                            (result) =>
                              activeLens.cells.find(
                                (cell) => cell.id === result.cellId,
                              )?.ast.from.sourceId ===
                              GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
                          )
                        ) {
                          setGoogleAccount(googleTokenProvider.status());
                        }
                        setResults((current) => ({
                          ...current,
                          ...Object.fromEntries(
                            nextResults.map((result) => [
                              resultKey(result.lensId, result.cellId),
                              result,
                            ]),
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
                {activeLens.cells.map((cell) => (
                  <CellCard
                    key={cell.id}
                    cell={cell}
                    feedbackCount={
                      feedbackEntries.filter(
                        (entry) =>
                          entry.lensId === activeLens.id &&
                          entry.cellId === cell.id,
                      ).length
                    }
                    result={results[resultKey(activeLens.id, cell.id)]}
                    sourceSchema={sourceSchemaRegistry[cell.ast.from.sourceId]}
                    onDelete={() => deleteSelectedCell(cell)}
                    onDuplicate={() => duplicateSelectedCell(cell)}
                    onEdit={() => setSelectedCellId(cell.id)}
                    onFeedback={(kind) => recordFeedback(cell, kind)}
                    onRefresh={() => void refreshCell(cell, activeLens)}
                    onRename={() => renameSelectedCell(cell)}
                    onToggleEnabled={() => toggleSelectedCell(cell)}
                    onWhy={(evidence, trigger) => {
                      const result = results[resultKey(activeLens.id, cell.id)];
                      if (result) {
                        openWhy(cell, result, evidence, trigger);
                      }
                    }}
                  />
                ))}
              </section>

              {selectedCell ? (
                <aside className="editor-panel" aria-label="Cell editor">
                  <div
                    className="editor-tabs"
                    role="tablist"
                    aria-label="Cell editor tabs"
                  >
                    {activeLens.cells.map((cell) => (
                      <button
                        aria-controls="dsl-editor"
                        aria-selected={cell.id === selectedCell?.id}
                        className={
                          cell.id === selectedCell?.id ? "tab active" : "tab"
                        }
                        id={`cell-tab-${cell.id}`}
                        key={cell.id}
                        role="tab"
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
                    aria-label={`Canonical DSL for ${
                      selectedCell?.title ?? "selected cell"
                    }`}
                    data-testid="dsl-editor"
                    value={editorText}
                    spellCheck={false}
                    onChange={(event) => setEditorText(event.target.value)}
                  />
                  {editorErrors.length > 0 ? (
                    <div className="error-box" role="alert">
                      {editorErrors.map((error) => (
                        <p key={`${error.code}-${error.message}`}>
                          {error.message}
                        </p>
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
              ) : null}
            </div>
          </>
        )}
      </section>

      {whySelection ? (
        <WhyPanel
          selection={whySelection}
          sourceSchema={
            sourceSchemaRegistry[whySelection.cell.ast.from.sourceId]
          }
          onClose={closeWhy}
        />
      ) : null}
    </main>
  );
}

interface CellCardProps {
  cell: CellDefinition;
  feedbackCount: number;
  result?: CellEvaluationResult;
  sourceSchema?: SourceSchema;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onFeedback: (kind: AlphaFeedbackKind) => void;
  onRefresh: () => void;
  onRename: () => void;
  onToggleEnabled: () => void;
  onWhy: (evidence: ProvenanceEvidence, trigger?: HTMLElement | null) => void;
}

function CellCard({
  cell,
  feedbackCount,
  onDelete,
  onDuplicate,
  onEdit,
  onFeedback,
  onRefresh,
  onRename,
  onToggleEnabled,
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
  const freshnessLabel = cell.enabled
    ? (result?.freshness ?? "idle")
    : "disabled";

  return (
    <article
      className={cell.enabled ? "cell-card" : "cell-card disabled-cell"}
      data-testid="cell-card"
    >
      <header className="cell-header">
        <div>
          <h3>{cell.title}</h3>
          <p>{cell.description}</p>
        </div>
        <div className="cell-actions">
          <span
            className={`freshness ${freshnessLabel}`}
            role="status"
            aria-live="polite"
          >
            {freshnessLabel}
          </span>
          <button type="button" onClick={onRename}>
            Rename
          </button>
          <button type="button" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" onClick={onToggleEnabled}>
            {cell.enabled ? "Disable" : "Enable"}
          </button>
          <button type="button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" disabled={!cell.enabled} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </header>

      <div className="feedback-row" aria-label={`Feedback for ${cell.title}`}>
        <button type="button" onClick={() => onFeedback("useful")}>
          Useful
        </button>
        <button type="button" onClick={() => onFeedback("noisy")}>
          Noisy
        </button>
        {feedbackCount > 0 ? (
          <span>
            {feedbackCount} local feedback entr
            {feedbackCount === 1 ? "y" : "ies"}
          </span>
        ) : null}
      </div>

      {!cell.enabled ? (
        <div className="loading-row" role="status">
          Cell disabled. Enable to evaluate.
        </div>
      ) : null}

      {cell.enabled && result?.errors.length ? (
        <div className="error-box" role="alert">
          {result.errors.map((error) => (
            <p key={`${error.code}-${error.message}`}>{error.message}</p>
          ))}
        </div>
      ) : null}

      {cell.enabled && !result ? (
        <div className="loading-row" role="status">
          No current result. Refresh to evaluate this cell.
        </div>
      ) : null}
      {cell.enabled && result && result.errors.length === 0 ? (
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
  onWhy: (evidence: ProvenanceEvidence, trigger?: HTMLElement | null) => void;
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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const why = explainWhyItem({
    ast: selection.cell.ast,
    sourceSchema,
    evidence: selection.evidence,
    snapshot: selection.result.snapshot,
  });
  const titleId = `why-title-${selection.cell.id}`;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside
      className="why-panel"
      aria-label="Why am I seeing this?"
      aria-labelledby={titleId}
      data-testid="why-panel"
      role="dialog"
      tabIndex={-1}
    >
      <header>
        <div>
          <p className="eyebrow">Why am I seeing this?</p>
          <h2 id={titleId}>{selection.cell.title}</h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close why panel"
          onClick={onClose}
        >
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
        <summary>Warning details</summary>
        <ul>
          {summary.details.map((detail, index) => (
            <li key={`${index}-${detail}`}>{detail}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function TemplatePicker({
  onCreate,
  templates,
}: {
  onCreate: (templateId: string) => void;
  templates: LensTemplate[];
}) {
  return (
    <section className="template-panel" aria-label="Lens templates">
      <h2>Create Lens</h2>
      {templates.map((template) => (
        <button
          className="template-button"
          key={template.id}
          type="button"
          onClick={() => onCreate(template.id)}
        >
          <span>{template.name}</span>
          <small>{template.cells.length} cells</small>
        </button>
      ))}
    </section>
  );
}

function FirstRunCard({
  onCreate,
  templates,
}: {
  onCreate: (templateId: string) => void;
  templates: LensTemplate[];
}) {
  return (
    <section className="first-run-card" data-testid="first-run-card">
      <p className="eyebrow">Private alpha</p>
      <h2>Create your first lens</h2>
      <p>
        Wovith creates inspectable local lenses. Stage 1 uses Google Calendar
        read-only access only; it does not connect Gmail, Drive, writes, sync,
        or model calls.
      </p>
      <div className="template-grid">
        {templates.map((template) => (
          <button
            className="template-choice"
            key={template.id}
            type="button"
            onClick={() => onCreate(template.id)}
          >
            <span>{template.name}</span>
            <small>{template.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function resultKey(
  lensId: LensDefinition["id"],
  cellId: CellDefinition["id"],
): string {
  return `${lensId}:${cellId}`;
}

function omitResultsForLens(
  results: Record<string, CellEvaluationResult>,
  lensId: LensDefinition["id"],
): Record<string, CellEvaluationResult> {
  return Object.fromEntries(
    Object.entries(results).filter(([key]) => !key.startsWith(`${lensId}:`)),
  );
}

function findGoogleCalendarCell(
  lens: LensDefinition,
): CellDefinition | undefined {
  return lens.cells.find(
    (cell) => cell.ast.from.sourceId === GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
  );
}

function isGoogleCalendarMockEnabled(): boolean {
  return (
    import.meta.env.VITE_WOVITH_E2E_MOCK_GOOGLE === "1" ||
    window.localStorage.getItem("wovith.e2e.mockGoogle") === "1"
  );
}

function googleCalendarMockScenario(): "default" | "no-events" {
  return window.localStorage.getItem("wovith.e2e.mockGoogleScenario") ===
    "no-events"
    ? "no-events"
    : "default";
}
