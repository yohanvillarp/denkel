import { AICategorizationResult, TreeTaxonomySummary, TreeReorganizationResult } from '../../types/ai';

export interface IAIProvider {
  /**
   * Analyzes raw user input against current tree taxonomy to determine optimal botanical placement.
   */
  analyzeTask(
    input: string,
    existingNodes: TreeTaxonomySummary[]
  ): Promise<AICategorizationResult>;

  /**
   * Analyzes existing tree taxonomy to identify thematic clusters and propose structural umbrella categories.
   */
  reorganizeTree?(
    existingNodes: TreeTaxonomySummary[]
  ): Promise<TreeReorganizationResult>;
}
