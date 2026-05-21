export type LensTemplateStage = "stage-1";

export interface LensTemplate {
  id: string;
  name: string;
  description: string;
  stage: LensTemplateStage;
  cells: CellTemplate[];
}

export interface CellTemplate {
  id: string;
  title: string;
  description: string;
  dsl: string;
  enabled: boolean;
}
