import { IAIProvider } from './IAIProvider';
import { AICategorizationResult, TreeTaxonomySummary, TreeReorganizationResult } from '../../types/ai';

export class GeminiProvider implements IAIProvider {
  private endpoint: string;
  private reorganizeEndpoint: string;
  private timeoutMs: number;

  constructor(
    endpoint: string = '/api/analyze-task',
    reorganizeEndpoint: string = '/api/reorganize-tree',
    timeoutMs = 7000
  ) {
    this.endpoint = endpoint;
    this.reorganizeEndpoint = reorganizeEndpoint;
    this.timeoutMs = timeoutMs;
  }

  async analyzeTask(
    input: string,
    existingNodes: TreeTaxonomySummary[]
  ): Promise<AICategorizationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input,
          existingNodes
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini proxy HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.result) {
        return data.result as AICategorizationResult;
      }

      throw new Error('Gemini proxy returned no analysis result');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs / 1000}s`);
      }
      throw err;
    }
  }

  async reorganizeTree(
    existingNodes: TreeTaxonomySummary[]
  ): Promise<TreeReorganizationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.reorganizeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          existingNodes
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini proxy HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.result) {
        return data.result as TreeReorganizationResult;
      }

      throw new Error('Gemini proxy returned no reorganization result');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs / 1000}s`);
      }
      throw err;
    }
  }
}
