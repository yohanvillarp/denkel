import { IAIProvider } from './IAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { LocalFallbackProvider } from './LocalFallbackProvider';
import { TreeIntegrityGuard } from './TreeIntegrityGuard';
import { AICategorizationResult, TreeTaxonomySummary, TreeReorganizationResult } from '../../types/ai';

export class AIOrchestrator {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider;
  private guard: TreeIntegrityGuard;

  constructor(
    primaryProvider: IAIProvider = new GeminiProvider(),
    fallbackProvider: IAIProvider = new LocalFallbackProvider(),
    guard: TreeIntegrityGuard = new TreeIntegrityGuard()
  ) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
    this.guard = guard;
  }

  /**
   * Evaluates new task placement with Google Gemini AI, with automatic failover to local fallback
   * and strict verification through TreeIntegrityGuard.
   * Guarantees resolution within timeout window so the UI never hangs.
   */
  async categorizeTask(
    input: string,
    existingNodes: TreeTaxonomySummary[]
  ): Promise<AICategorizationResult> {
    let proposal: AICategorizationResult;

    // Timeout safety race: 8000ms max for primary provider
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI Orchestrator primary provider timed out')), 8000);
    });

    try {
      proposal = await Promise.race([
        this.primaryProvider.analyzeTask(input, existingNodes),
        timeoutPromise
      ]);
    } catch (err: any) {
      console.warn('[AIOrchestrator] Primary AI provider error or timeout; engaging local fallback:', err?.message || err);
      proposal = await this.fallbackProvider.analyzeTask(input, existingNodes);
    }

    return this.guard.sanitizeAndValidate(proposal, existingNodes, input);
  }

  /**
   * Evaluates whole-tree taxonomy and identifies opportunities to group independent branches into thematic categories.
   */
  async reorganizeTree(
    existingNodes: TreeTaxonomySummary[]
  ): Promise<TreeReorganizationResult> {
    let proposal: TreeReorganizationResult;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI Orchestrator reorganization timed out')), 8000);
    });

    try {
      if (this.primaryProvider.reorganizeTree) {
        proposal = await Promise.race([
          this.primaryProvider.reorganizeTree(existingNodes),
          timeoutPromise
        ]);
      } else {
        proposal = { clusters: [], reasoning: 'Provider does not support reorganization.', isFallback: true };
      }
    } catch (err: any) {
      console.warn('[AIOrchestrator] Reorganization error; engaging fallback:', err?.message || err);
      if (this.fallbackProvider.reorganizeTree) {
        proposal = await this.fallbackProvider.reorganizeTree(existingNodes);
      } else {
        proposal = { clusters: [], reasoning: 'Fallback reorganization.', isFallback: true };
      }
    }

    return this.guard.sanitizeAndValidateReorganization(proposal, existingNodes);
  }
}
