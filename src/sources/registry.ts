import type { SourceSchema } from "@/domain/types";

import { syntheticSourceSchemas } from "./synthetic/schema";

export const sourceSchemaRegistry: Record<string, SourceSchema> =
  syntheticSourceSchemas;
