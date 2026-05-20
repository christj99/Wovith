import type { CellEvaluationResult, LensDefinition } from '@/domain/types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedState {
  lenses: LensDefinition[];
  evaluations: CellEvaluationResult[];
}

const defaultState: PersistedState = {
  lenses: [],
  evaluations: [],
};

export class LocalStage0Store {
  private readonly key = 'wovith.stage0.store.v1';

  constructor(private readonly storage: StorageLike) {}

  listLenses(): LensDefinition[] {
    return this.read().lenses;
  }

  getLens(id: LensDefinition['id']): LensDefinition | null {
    return this.read().lenses.find((lens) => lens.id === id) ?? null;
  }

  saveLens(lens: LensDefinition): void {
    const state = this.read();
    const next = {
      ...state,
      lenses: [...state.lenses.filter((entry) => entry.id !== lens.id), lens],
    };
    this.write(next);
  }

  deleteLens(id: LensDefinition['id']): void {
    const state = this.read();
    this.write({
      lenses: state.lenses.filter((lens) => lens.id !== id),
      evaluations: state.evaluations.filter((result) => result.lensId !== id),
    });
  }

  saveEvaluation(result: CellEvaluationResult): void {
    const state = this.read();
    const withoutExisting = state.evaluations.filter((entry) => entry.evaluationId !== result.evaluationId);
    this.write({
      ...state,
      evaluations: [...withoutExisting, result].slice(-50),
    });
  }

  listEvaluations(cellId?: CellEvaluationResult['cellId']): CellEvaluationResult[] {
    const evaluations = this.read().evaluations;
    return cellId ? evaluations.filter((entry) => entry.cellId === cellId) : evaluations;
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }

  private read(): PersistedState {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return defaultState;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      return {
        lenses: Array.isArray(parsed.lenses) ? parsed.lenses : [],
        evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
      };
    } catch {
      return defaultState;
    }
  }

  private write(state: PersistedState): void {
    this.storage.setItem(this.key, JSON.stringify(state));
  }
}

export class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
