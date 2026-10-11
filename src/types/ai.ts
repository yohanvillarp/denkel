export type AICategorizationAction =
  | 'create_top_level'
  | 'nest_under_existing'
  | 'create_category_wrapper';

export interface AICategorizationResult {
  action: AICategorizationAction;
  taskTitle: string;
  targetParentId: string | null;
  newCategoryTitle?: string;
  reparentExistingTaskIds?: string[];
  reasoning?: string;
  confidence: number;
  isFallback?: boolean;
}

export interface TreeTaxonomySummary {
  id: string;
  title: string;
  type: 'category' | 'project' | 'task';
  parentId: string | null;
  directMinutes: number;
  isProvisional?: boolean;
}

export interface AnalyzeTaskPayload {
  input: string;
  existingNodes: TreeTaxonomySummary[];
}

export interface RestructureCorrection {
  taskId: string;
  newParentId: string | null;
  reasoning: string;
}

export interface RestructureClusterProposal {
  categoryTitle: string;
  taskIds: string[];
  reasoning: string;
}

export interface TreeReorganizationResult {
  corrections?: RestructureCorrection[];
  clusters?: RestructureClusterProposal[];
  reasoning: string;
  isFallback?: boolean;
}


