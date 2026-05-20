import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CellDefinition, CellEvaluationResult, ProvenanceEvidence, SourceSchema, WovithError } from '@/domain/types';
import { parseCanonicalDsl } from '@/dsl/parse';
import { validateCellAst } from '@/dsl/validate';
import { explainEmptyCell, explainWhyItem } from '@/provenance/why';
import { CountRenderer } from '@/renderers/CountRenderer';
import { ListRenderer } from '@/renderers/ListRenderer';
import { RawRenderer } from '@/renderers/RawRenderer';
import { TableRenderer } from '@/renderers/TableRenderer';
import { evaluateCell } from '@/runtime/evaluator';
import { createDailyWorkLens, updateCellAst } from '@/runtime/starter-lens';
import { createSyntheticAdapters } from '@/sources/synthetic/synthetic-adapter';
import { STAGE_0_RENDERERS } from '@/sources/synthetic/schema';
import { sourceSchemaRegistry } from '@/sources/registry';
import { LocalStage0Store } from '@/storage/local-store';

const DEMO_NOW = new Date('2026-05-20T13:00:00.000Z');

interface WhySelection {
  cell: CellDefinition;
  result: CellEvaluationResult;
  evidence: ProvenanceEvidence;
}

export function App() {
  const adapters = useMemo(() => createSyntheticAdapters(), []);
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
  const [results, setResults] = useState<Record<string, CellEvaluationResult>>(() =>
    Object.fromEntries(store.listEvaluations().map((result) => [result.cellId, result])),
  );
  const [selectedCellId, setSelectedCellId] = useState(lens.cells[0]?.id);
  const selectedCell = lens.cells.find((cell) => cell.id === selectedCellId) ?? lens.cells[0];
  const [editorText, setEditorText] = useState(selectedCell?.canonicalDsl ?? '');
  const [editorErrors, setEditorErrors] = useState<WovithError[]>([]);
  const [whySelection, setWhySelection] = useState<WhySelection | null>(null);

  const validationContext = useMemo(
    () => ({
      sourceSchemas: sourceSchemaRegistry,
      maxTake: 100,
      allowedRenderers: [...STAGE_0_RENDERERS],
    }),
    [],
  );

  const refreshCell = useCallback(
    async (cell: CellDefinition) => {
      const sourceSchema = sourceSchemaRegistry[cell.ast.from.sourceId];
      const adapter = adapters[cell.ast.from.sourceId];
      if (!sourceSchema || !adapter) {
        return;
      }
      const result = await evaluateCell({
        cell,
        lensId: lens.id,
        adapter,
        sourceSchema,
        validationContext,
        now: DEMO_NOW,
      });
      store.saveEvaluation(result);
      setResults((current) => ({ ...current, [cell.id]: result }));
    },
    [adapters, lens.id, store, validationContext],
  );

  useEffect(() => {
    lens.cells.filter((cell) => cell.enabled).forEach((cell) => {
      void refreshCell(cell);
    });
  }, [lens.cells, refreshCell]);

  useEffect(() => {
    setEditorText(selectedCell?.canonicalDsl ?? '');
    setEditorErrors([]);
  }, [selectedCell]);

  function resetStarterLens() {
    const starter = createDailyWorkLens();
    store.saveLens(starter);
    setLens(starter);
    setSelectedCellId(starter.cells[0]?.id);
    setResults({});
    setWhySelection(null);
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
      setEditorErrors(report.errors.map((error) => ({ code: error.code, message: error.message, details: error.path })));
      return;
    }
    const updatedCell = updateCellAst(selectedCell, parsed.value, new Date().toISOString());
    const nextLens = {
      ...lens,
      updatedAt: updatedCell.updatedAt,
      cells: lens.cells.map((cell) => (cell.id === updatedCell.id ? updatedCell : cell)),
    };
    store.saveLens(nextLens);
    setLens(nextLens);
    setEditorErrors([]);
    void refreshCell(updatedCell);
  }

  function openWhy(cell: CellDefinition, result: CellEvaluationResult, evidence: ProvenanceEvidence) {
    setWhySelection({ cell, result, evidence });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Lens list">
        <div className="brand-block">
          <div className="brand-mark">W</div>
          <div>
            <h1>Wovith</h1>
            <p>Stage 0</p>
          </div>
        </div>
        <button className="lens-button active" type="button">
          <span>{lens.name}</span>
          <small>{lens.cells.length} cells</small>
        </button>
        <button className="ghost-button" type="button" onClick={resetStarterLens}>
          Reset Demo Lens
        </button>
      </aside>

      <section className="workspace" aria-label="Lens detail">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Local synthetic runtime</p>
            <h2>{lens.name}</h2>
          </div>
          <div className="header-actions">
            <span className="storage-pill">Local persistence on</span>
            <button
              className="primary-button"
              type="button"
              onClick={() => lens.cells.forEach((cell) => void refreshCell(cell))}
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
                  className={cell.id === selectedCell?.id ? 'tab active' : 'tab'}
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
            <button className="primary-button full-width" type="button" onClick={saveEditor}>
              Save Cell
            </button>
          </aside>
        </div>
      </section>

      {whySelection ? (
        <WhyPanel selection={whySelection} sourceSchema={sourceSchemaRegistry[whySelection.cell.ast.from.sourceId]} onClose={() => setWhySelection(null)} />
      ) : null}
    </main>
  );
}

interface CellCardProps {
  cell: CellDefinition;
  result?: CellEvaluationResult;
  sourceSchema: SourceSchema;
  onEdit: () => void;
  onRefresh: () => void;
  onWhy: (evidence: ProvenanceEvidence) => void;
}

function CellCard({ cell, onEdit, onRefresh, onWhy, result, sourceSchema }: CellCardProps) {
  const emptyReason =
    result && result.errors.length === 0 && (result.snapshot.outputCount ?? 0) === 0
      ? explainEmptyCell({ ast: cell.ast, sourceSchema, evaluatedAt: result.evaluatedAt })
      : null;

  return (
    <article className="cell-card">
      <header className="cell-header">
        <div>
          <h3>{cell.title}</h3>
          <p>{cell.description}</p>
        </div>
        <div className="cell-actions">
          <span className={`freshness ${result?.freshness ?? 'idle'}`}>{result?.freshness ?? 'idle'}</span>
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

      {!result ? <div className="loading-row">Evaluating...</div> : null}
      {result && result.errors.length === 0 ? (
        <>
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

function RendererSwitch({ onWhy, result }: { result: CellEvaluationResult; onWhy: (evidence: ProvenanceEvidence) => void }) {
  if (result.renderer === 'count') {
    return <CountRenderer result={result} />;
  }
  if (result.renderer === 'table') {
    return <TableRenderer result={result} onWhy={onWhy} />;
  }
  if (result.renderer === 'raw') {
    return <RawRenderer result={result} onWhy={onWhy} />;
  }
  return <ListRenderer result={result} onWhy={onWhy} />;
}

function WhyPanel({ onClose, selection, sourceSchema }: { onClose: () => void; selection: WhySelection; sourceSchema: SourceSchema }) {
  const why = explainWhyItem({
    ast: selection.cell.ast,
    sourceSchema,
    evidence: selection.evidence,
    snapshot: selection.result.snapshot,
  });

  return (
    <aside className="why-panel" aria-label="Why am I seeing this?">
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
            <p>Source timestamp: {evidence.sourceTimestamp ?? 'unknown'}</p>
            <p>Evidence recorded: {evidence.observedAt}</p>
            <ul>
              {evidence.matchedPredicates.map((predicate) => (
                <li key={predicate.predicateId}>
                  {predicate.field}: {predicate.actualPreview ?? 'unknown'}
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
