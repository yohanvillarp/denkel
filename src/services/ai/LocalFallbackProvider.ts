import { IAIProvider } from './IAIProvider';
import { AICategorizationResult, TreeTaxonomySummary, TreeReorganizationResult } from '../../types/ai';

export class LocalFallbackProvider implements IAIProvider {
  async analyzeTask(
    input: string,
    _existingNodes: TreeTaxonomySummary[]
  ): Promise<AICategorizationResult> {
    const cleaned = input.trim();

    return {
      action: 'create_top_level',
      taskTitle: cleaned,
      targetParentId: null,
      reparentExistingTaskIds: [],
      reasoning: 'Planted provisionally on the central trunk (offline mode).',
      confidence: 1.0,
      isFallback: true
    };
  }

  async reorganizeTree(
    _existingNodes: TreeTaxonomySummary[]
  ): Promise<TreeReorganizationResult> {
    return {
      clusters: [],
      reasoning: 'Reorganization unavailable in offline mode.',
      isFallback: true
    };
  }
}
