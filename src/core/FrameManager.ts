import { 
  EntityId, 
  StatType, 
  StatValue,
  EventType
} from './types';
import { Entity } from './Entity';
import { eventSystem } from './EventSystem';
import { 
  OptimizedFrameContainer, 
  OptimizedFrameView, 
  FrameFactory,
  FrameConfig 
} from './OptimizedFrameSystem';
import { effectApplicatorManager } from './EffectApplicator';

/**
 * Transient frame manager with optional snapshotting
 */
export class FrameManager {
  private readonly _snapshots: Map<string, OptimizedFrameContainer> = new Map();
  private readonly _recentCache: OptimizedFrameContainer[] = [];
  private readonly _frameFactory: FrameFactory;
  private readonly _defaultConfig: FrameConfig;
  private readonly _maxRecentCache: number;
  
  constructor(defaultConfig?: Partial<FrameConfig>, maxRecentCache: number = 5) {
    this._defaultConfig = {
      trackStats: 'all', // Track all stats by default
      trackEffects: true,
      trackContext: false,
      maxCacheSize: 100,
      enableLazyEvaluation: true,
      ...defaultConfig
    };
    this._frameFactory = new FrameFactory(this._defaultConfig);
    this._maxRecentCache = maxRecentCache;
  }
  
  /**
   * Create a transient frame (not stored by default)
   */
  createFrame(
    entities: Entity[],
    config?: Partial<FrameConfig>,
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    const currentTime = Date.now();
    
    // Check for expired effects before creating frame (performance optimization)
    effectApplicatorManager.checkExpiredEffectsForEntities(entities, currentTime);
    
    const container = this._frameFactory.createFrame(entities, config, metadata);

    // Add to recent cache (short-term storage)
    this.addToRecentCache(container);

    return container;
  }
  
  /**
   * Create and explicitly snapshot a frame with an identifier
   */
  createSnapshot(
    entities: Entity[], 
    snapshotId: string,
    config?: Partial<FrameConfig>,
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    const container = this._frameFactory.createFrame(entities, config, metadata);
    
    // Store as explicit snapshot
    this._snapshots.set(snapshotId, container);
    
    // Also add to recent cache
    this.addToRecentCache(container);
    
    return container;
  }
  
  /**
   * Create a transient frame snapshot of a single entity
   */
  createSingleEntityFrame(
    entity: Entity, 
    config?: Partial<FrameConfig>,
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    return this.createFrame([entity], config, metadata);
  }
  
  /**
   * Create a lightweight transient frame (minimal tracking for performance)
   */
  createLightweightFrame(
    entities: Entity[],
    statTypes: StatType[],
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    return this._frameFactory.createLightweightFrame(entities, statTypes, metadata);
  }
  
  /**
   * Get a snapshot by identifier
   */
  getSnapshot(snapshotId: string): OptimizedFrameContainer | undefined {
    return this._snapshots.get(snapshotId);
  }
  
  /**
   * Get recent frames from short-term cache
   */
  getRecentFrames(count?: number): OptimizedFrameContainer[] {
    const limit = count || this._recentCache.length;
    return this._recentCache.slice(-limit);
  }
  
  /**
   * Get the most recent frame
   */
  getLatestFrame(): OptimizedFrameContainer | undefined {
    return this._recentCache.length > 0 ? this._recentCache[this._recentCache.length - 1] : undefined;
  }
  
  /**
   * Get all snapshots
   */
  getAllSnapshots(): OptimizedFrameContainer[] {
    return Array.from(this._snapshots.values());
  }
  
  /**
   * Remove a snapshot
   */
  removeSnapshot(snapshotId: string): boolean {
    return this._snapshots.delete(snapshotId);
  }
  
  /**
   * Compare current frame against a snapshot
   */
  compareWithSnapshot(
    currentFrame: OptimizedFrameContainer, 
    snapshotId: string
  ): FrameComparison | undefined {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) return undefined;
    
    return this.compareFrameContainers(currentFrame, snapshot);
  }
  
  /**
   * Compare current frame against the most recent frame
   */
  compareWithLatest(currentFrame: OptimizedFrameContainer): FrameComparison | undefined {
    const latest = this.getLatestFrame();
    if (!latest) return undefined;
    
    return this.compareFrameContainers(currentFrame, latest);
  }
  
  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshot1Id: string, snapshot2Id: string): FrameComparison | undefined {
    const snapshot1 = this.getSnapshot(snapshot1Id);
    const snapshot2 = this.getSnapshot(snapshot2Id);
    
    if (!snapshot1 || !snapshot2) return undefined;
    
    return this.compareFrameContainers(snapshot1, snapshot2);
  }
  
  /**
   * Compare two frame containers
   */
  private compareFrameContainers(
    frame1: OptimizedFrameContainer, 
    frame2: OptimizedFrameContainer
  ): FrameComparison {
    const differences: EntityDifference[] = [];
    
    // Compare each entity using lazy evaluation
    for (const entityId of frame1.entityIds) {
      if (!frame2.entityIds.includes(entityId)) {
        differences.push({
          entityId,
          type: 'entity_removed',
          changes: []
        });
        continue;
      }
      
      const statChanges = this.compareEntityStatsOptimized(frame1, frame2, entityId);
      if (statChanges.length > 0) {
        differences.push({
          entityId,
          type: 'stats_changed',
          changes: statChanges
        });
      }
    }
    
    // Check for new entities in frame2
    for (const entityId of frame2.entityIds) {
      if (!frame1.entityIds.includes(entityId)) {
        differences.push({
          entityId,
          type: 'entity_added',
          changes: []
        });
      }
    }
    
    return {
      frame1Id: frame1.frameId,
      frame2Id: frame2.frameId,
      timeDifference: frame2.timestamp - frame1.timestamp,
      differences
    };
  }
  
  /**
   * Get frame statistics (snapshots and recent cache)
   */
  getFrameStats(): FrameStats {
    const snapshots = this.getAllSnapshots();
    const recentFrames = this.getRecentFrames();
    const totalFrames = snapshots.length + recentFrames.length;
    
    if (totalFrames === 0) {
      return {
        totalFrames: 0,
        averageEntitiesPerFrame: 0,
        timeSpan: 0,
        entityCounts: new Map()
      };
    }
    
    let totalEntities = 0;
    const entityCounts = new Map<EntityId, number>();
    let earliestTime = Date.now();
    let latestTime = 0;
    
    // Process snapshots
    for (const frame of snapshots) {
      totalEntities += frame.entityIds.length;
      earliestTime = Math.min(earliestTime, frame.timestamp);
      latestTime = Math.max(latestTime, frame.timestamp);
      
      for (const entityId of frame.entityIds) {
        entityCounts.set(entityId, (entityCounts.get(entityId) || 0) + 1);
      }
    }
    
    // Process recent frames
    for (const frame of recentFrames) {
      totalEntities += frame.entityIds.length;
      earliestTime = Math.min(earliestTime, frame.timestamp);
      latestTime = Math.max(latestTime, frame.timestamp);
      
      for (const entityId of frame.entityIds) {
        entityCounts.set(entityId, (entityCounts.get(entityId) || 0) + 1);
      }
    }
    
    return {
      totalFrames,
      averageEntitiesPerFrame: totalEntities / totalFrames,
      timeSpan: latestTime - earliestTime,
      entityCounts
    };
  }
  
  /**
   * Clear recent cache and free memory
   */
  clearRecentCache(): void {
    // Clear caches to free memory
    for (const frame of this._recentCache) {
      frame.clearCaches();
    }
    this._recentCache.length = 0;
  }
  
  /**
   * Clear all snapshots and free memory
   */
  clearSnapshots(): void {
    // Clear caches to free memory
    for (const frame of this._snapshots.values()) {
      frame.clearCaches();
    }
    this._snapshots.clear();
  }
  
  /**
   * Clear everything (snapshots and recent cache)
   */
  clearAll(): void {
    this.clearSnapshots();
    this.clearRecentCache();
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { 
    snapshots: number; 
    recentCache: number; 
    totalMemoryUsage: number; 
    averageMemoryPerFrame: number 
  } {
    const snapshots = this.getAllSnapshots();
    const recentFrames = this.getRecentFrames();
    const allFrames = [...snapshots, ...recentFrames];
    
    const totalMemoryUsage = allFrames.reduce((sum, frame) => sum + frame.getMemoryUsage(), 0);
    
    return {
      snapshots: snapshots.length,
      recentCache: recentFrames.length,
      totalMemoryUsage,
      averageMemoryPerFrame: allFrames.length > 0 ? totalMemoryUsage / allFrames.length : 0
    };
  }
  
  /**
   * Add frame to recent cache with size management
   */
  private addToRecentCache(frame: OptimizedFrameContainer): void {
    this._recentCache.push(frame);
    
    // Maintain cache size limit
    if (this._recentCache.length > this._maxRecentCache) {
      const removed = this._recentCache.shift();
      if (removed) {
        removed.clearCaches(); // Free memory
      }
    }
  }
  
  
  /**
   * Compare stats between two frames for a specific entity (optimized)
   */
  private compareEntityStatsOptimized(
    frame1: OptimizedFrameContainer, 
    frame2: OptimizedFrameContainer, 
    entityId: EntityId
  ): StatChange[] {
    const changes: StatChange[] = [];
    
    const stats1 = frame1.getEntityStats(entityId);
    const stats2 = frame2.getEntityStats(entityId);
    
    if (!stats1 || !stats2) return changes;
    
    // Check for stat changes
    for (const [statType, value1] of stats1) {
      const value2 = stats2.get(statType);
      if (value2 !== undefined && value1 !== value2) {
        changes.push({
          statType,
          oldValue: value1,
          newValue: value2,
          difference: value2 - value1
        });
      }
    }
    
    // Check for new stats in frame2
    for (const [statType, value2] of stats2) {
      if (!stats1.has(statType)) {
        changes.push({
          statType,
          oldValue: 0,
          newValue: value2,
          difference: value2
        });
      }
    }
    
    return changes;
  }
}

/**
 * Represents a change in a stat value
 */
export interface StatChange {
  readonly statType: string;
  readonly oldValue: number;
  readonly newValue: number;
  readonly difference: number;
}

/**
 * Represents differences between two frames
 */
export interface FrameComparison {
  readonly frame1Id: string;
  readonly frame2Id: string;
  readonly timeDifference: number;
  readonly differences: EntityDifference[];
}

/**
 * Represents changes to an entity between frames
 */
export interface EntityDifference {
  readonly entityId: EntityId;
  readonly type: 'entity_added' | 'entity_removed' | 'stats_changed';
  readonly changes: StatChange[];
}

/**
 * Statistics about frames in the system
 */
export interface FrameStats {
  readonly totalFrames: number;
  readonly averageEntitiesPerFrame: number;
  readonly timeSpan: number;
  readonly entityCounts: Map<EntityId, number>;
}
