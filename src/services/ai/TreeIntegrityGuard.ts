import { AICategorizationResult, TreeTaxonomySummary, TreeReorganizationResult, RestructureClusterProposal, RestructureCorrection } from '../../types/ai';

export class TreeIntegrityGuard {
  /**
   * Sanitizes and verifies an AI categorization proposal against active tree taxonomy.
   * Guarantees that no cycles, non-existent parent pointers, or corrupted titles can compromise the living tree.
   */
  public sanitizeAndValidate(
    rawProposal: AICategorizationResult,
    existingNodes: TreeTaxonomySummary[],
    rawInput: string
  ): AICategorizationResult {
    const existingNodeIds = new Set(existingNodes.map(n => n.id));

    // 1. Sanitize task title
    let taskTitle = (rawProposal.taskTitle || '').trim();
    if (!taskTitle) {
      taskTitle = rawInput.trim() || 'New Task';
    }

    // 2. Validate action and parent connectivity
    let action = rawProposal.action;
    let targetParentId = rawProposal.targetParentId;
    let newCategoryTitle = rawProposal.newCategoryTitle?.trim();
    let reasoning = rawProposal.reasoning || '';
    let confidence = typeof rawProposal.confidence === 'number' ? rawProposal.confidence : 0.8;

    if (action === 'nest_under_existing') {
      // Must point to a real existing parent
      if (!targetParentId || !existingNodeIds.has(targetParentId)) {
        console.warn(
          `[TreeIntegrityGuard] AI requested parent ID "${targetParentId}" which does not exist in active tree. Reverting to top-level stem.`
        );
        action = 'create_top_level';
        targetParentId = null;
        reasoning = 'Attached to central trunk because proposed parent was not found.';
        confidence = 0.6;
      }
    } else if (action === 'create_category_wrapper') {
      if (!newCategoryTitle) {
        console.warn(
          '[TreeIntegrityGuard] AI suggested category wrapper without a category title. Reverting to top-level stem.'
        );
        action = 'create_top_level';
        targetParentId = null;
        reasoning = 'Sprouted as primary stem on central trunk.';
        confidence = 0.6;
      }
    } else {
      // 'create_top_level' must always have null parent
      action = 'create_top_level';
      targetParentId = null;
    }

    // 3. Sanitize and validate reparentExistingTaskIds
    const rawReparentIds = Array.isArray(rawProposal.reparentExistingTaskIds)
      ? rawProposal.reparentExistingTaskIds
      : [];

    const validatedReparentIds: string[] = [];
    for (const id of rawReparentIds) {
      if (typeof id === 'string' && existingNodeIds.has(id)) {
        // Prevent reparenting targetParentId to itself if action is nest_under_existing
        if (action === 'nest_under_existing' && id === targetParentId) {
          continue;
        }
        validatedReparentIds.push(id);
      }
    }

    return {
      action,
      taskTitle,
      targetParentId,
      newCategoryTitle,
      reparentExistingTaskIds: validatedReparentIds,
      reasoning,
      confidence,
      isFallback: rawProposal.isFallback
    };
  }

  /**
   * Sanitizes whole-tree reorganization proposals, validating corrections and cluster groupings.
   */
  public sanitizeAndValidateReorganization(
    proposal: TreeReorganizationResult,
    existingNodes: TreeTaxonomySummary[]
  ): TreeReorganizationResult {
    const existingNodeIds = new Set(existingNodes.map(n => n.id));
    const nodeMap = new Map(existingNodes.map(n => [n.id, n]));
    const claimedTaskIds = new Set<string>();

    // Helper to check circular descendant references
    const isDescendant = (currentParentId: string | null, targetAncestorId: string): boolean => {
      if (!currentParentId) return false;
      if (currentParentId === targetAncestorId) return true;
      const parent = nodeMap.get(currentParentId);
      return parent ? isDescendant(parent.parentId, targetAncestorId) : false;
    };

    // 1. Sanitize corrections (detaching or moving misplaced tasks)
    const validCorrections: RestructureCorrection[] = [];
    for (const correction of (proposal.corrections || [])) {
      if (!correction || typeof correction.taskId !== 'string') continue;
      const { taskId, newParentId, reasoning } = correction;

      // Misplaced task must exist in tree
      if (!existingNodeIds.has(taskId)) continue;

      if (newParentId !== null) {
        // Target parent must exist, cannot be self, and cannot be a descendant
        if (!existingNodeIds.has(newParentId)) continue;
        if (newParentId === taskId) continue;
        if (isDescendant(newParentId, taskId)) continue;
      }

      validCorrections.push({
        taskId,
        newParentId,
        reasoning: reasoning || (newParentId ? `Relocated to parent ${newParentId}` : 'Detached to primary stem on central trunk.')
      });
      claimedTaskIds.add(taskId);
    }

    // 2. Sanitize clusters (grouping independent or detached tasks)
    const validClusters: RestructureClusterProposal[] = [];
    for (const cluster of (proposal.clusters || [])) {
      const cleanTitle = (cluster.categoryTitle || '').trim();
      if (!cleanTitle) continue;

      const validTaskIds: string[] = [];
      for (const id of (cluster.taskIds || [])) {
        if (typeof id === 'string' && existingNodeIds.has(id) && !claimedTaskIds.has(id)) {
          validTaskIds.push(id);
          claimedTaskIds.add(id);
        }
      }

      // Only clusters grouping 2 or more tasks are meaningful
      if (validTaskIds.length >= 2) {
        validClusters.push({
          categoryTitle: cleanTitle,
          taskIds: validTaskIds,
          reasoning: cluster.reasoning || `Grouped ${validTaskIds.length} tasks under ${cleanTitle}.`
        });
      }
    }

    return {
      corrections: validCorrections,
      clusters: validClusters,
      reasoning: proposal.reasoning || 'Taxonomy review validated.',
      isFallback: proposal.isFallback
    };
  }
}
