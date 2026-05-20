import type {
  Result,
  SourceAdapter,
  SourceQueryResult,
  SourceSchema,
} from "@/domain/types";

import { syntheticFixtures } from "./fixtures";
import { syntheticSourceSchemas } from "./schema";

export class SyntheticSourceAdapter implements SourceAdapter {
  readonly sourceId;

  constructor(sourceId: keyof typeof syntheticFixtures) {
    this.sourceId = syntheticSourceSchemas[sourceId].sourceId;
  }

  async schema(): Promise<SourceSchema> {
    return syntheticSourceSchemas[this.sourceId];
  }

  async query(): Promise<Result<SourceQueryResult>> {
    const items = syntheticFixtures[this.sourceId] ?? [];
    return {
      ok: true,
      value: {
        items,
        sourceCursor: `synthetic:${this.sourceId}:${items.length}`,
      },
    };
  }
}

export function createSyntheticAdapters(): Record<
  string,
  SyntheticSourceAdapter
> {
  return Object.fromEntries(
    Object.keys(syntheticFixtures).map((sourceId) => [
      sourceId,
      new SyntheticSourceAdapter(sourceId),
    ]),
  );
}
