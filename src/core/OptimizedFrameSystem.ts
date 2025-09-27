import { 
  FrameContainer, 
  FrameView, 
  EntityId, 
  StatType, 
  StatValue, 
  StatMap, 
  EffectId, 
  EffectContext,
  EventType
} from './types';

/**
 * Configuration for what information to track in frames
 */
export interface FrameConfig {
  readonly trackStats: StatType[] | 'all';
  readonly trackEffects: boolean;
  readonly trackContext: boolean;
  readonly maxCacheSize: number;
  readonly enableLazyEvaluation: boolean;
}

import { Entity } from './Entity';
import { eventSystem } from './EventSystem';

/**
 * High-performance frame container with lazy evaluation and minimal allocations
 */
export class OptimizedFrameContainer implements FrameContainer {
  private readonly _frameId: string;
  private readonly _timestamp: number;
  private readonly _entityIds: EntityId[];
  private readonly _metadata?: Record<string, any>;
  private readonly _config: FrameConfig;
  
  // Lazy-loaded data (only allocated when accessed)
  private _statsCache: Map<EntityId, StatMap> | undefined;
  private _effectsCache: Map<EntityId, EffectId[]> | undefined;
  private _contextCache: Map<EntityId, EffectContext> | undefined;
  
  // Entity references for lazy evaluation
  private readonly _entities: Map<EntityId, Entity>;
  
  constructor(
    frameId: string,
    entities: Entity[],
    config: FrameConfig,
    metadata?: Record<string, any>
  ) {
    this._frameId = frameId;
    this._timestamp = Date.now();
    this._entityIds = entities.map(e => e.id);
    this._metadata = metadata;
    this._config = config;
    this._entities = new Map(entities.map(e => [e.id, e]));
    
    // Pre-allocate caches only if needed
    if (config.trackStats) {
      this._statsCache = new Map();
    }
    if (config.trackEffects) {
      this._effectsCache = new Map();
    }
    if (config.trackContext) {
      this._contextCache = new Map();
    }
  }
  
  get frameId(): string { return this._frameId; }
  get timestamp(): number { return this._timestamp; }
  get entityIds(): EntityId[] { return [...this._entityIds]; }
  get metadata(): Record<string, any> | undefined { return this._metadata; }
  
  /**
   * Lazy evaluation of entity stats
   */
  getEntityStats(entityId: EntityId): StatMap | undefined {
    if (!this._config.trackStats) return undefined;
    
    // Check cache first
    if (this._statsCache!.has(entityId)) {
      return this._statsCache!.get(entityId);
    }
    
    // Lazy load from entity
    const entity = this._entities.get(entityId);
    if (!entity) return undefined;
    
    const stats = entity.getCurrentStats();
    this._statsCache!.set(entityId, new Map(stats));
    return this._statsCache!.get(entityId);
  }
  
  /**
   * Lazy evaluation of entity effects
   */
  getEntityEffects(entityId: EntityId): EffectId[] | undefined {
    if (!this._config.trackEffects) return undefined;
    
    // Check cache first
    if (this._effectsCache!.has(entityId)) {
      return this._effectsCache!.get(entityId);
    }
    
    // Lazy load from entity
    const entity = this._entities.get(entityId);
    if (!entity) return undefined;
    
    const effects = entity.getEffects().map(e => e.id);
    this._effectsCache!.set(entityId, [...effects]);
    return this._effectsCache!.get(entityId);
  }
  
  /**
   * Lazy evaluation of entity context
   */
  getEntityContext(entityId: EntityId): EffectContext | undefined {
    if (!this._config.trackContext) return undefined;
    
    // Check cache first
    if (this._contextCache!.has(entityId)) {
      return this._contextCache!.get(entityId);
    }
    
    // Lazy load from entity
    const entity = this._entities.get(entityId);
    if (!entity) return undefined;
    
    const stats = entity.getCurrentStats();
    const context: EffectContext = {
      entityId: entity.id,
      effectStack: entity.getEffects(),
      currentStats: new Map(stats),
      baseStats: entity.baseStats,
      timestamp: this._timestamp
    };
    
    this._contextCache!.set(entityId, context);
    return this._contextCache!.get(entityId);
  }
  
  /**
   * Update entity stats (minimal allocation)
   */
  updateEntityStats(entityId: EntityId, stats: StatMap): void {
    if (!this._config.trackStats) return;
    
    // Reuse existing map or create new one
    if (this._statsCache!.has(entityId)) {
      const existing = this._statsCache!.get(entityId)!;
      existing.clear();
      stats.forEach((value, key) => existing.set(key, value));
    } else {
      this._statsCache!.set(entityId, new Map(stats));
    }
  }
  
  /**
   * Update entity effects (minimal allocation)
   */
  updateEntityEffects(entityId: EntityId, effects: EffectId[]): void {
    if (!this._config.trackEffects) return;
    
    // Reuse existing array or create new one
    if (this._effectsCache!.has(entityId)) {
      const existing = this._effectsCache!.get(entityId)!;
      existing.length = 0;
      existing.push(...effects);
    } else {
      this._effectsCache!.set(entityId, [...effects]);
    }
  }
  
  /**
   * Get only stats of interest (selective access)
   */
  getStatsOfInterest(entityId: EntityId, statTypes: StatType[]): Partial<Record<StatType, StatValue>> {
    const stats = this.getEntityStats(entityId);
    if (!stats) return {};
    
    const result: Partial<Record<StatType, StatValue>> = {};
    for (const statType of statTypes) {
      const value = stats.get(statType);
      if (value !== undefined) {
        result[statType] = value;
      }
    }
    return result;
  }
  
  /**
   * Get effects of interest (selective access)
   */
  getEffectsOfInterest(entityId: EntityId, effectTypes?: string[]): EffectId[] {
    const effects = this.getEntityEffects(entityId);
    if (!effects) return [];
    
    if (!effectTypes) return [...effects];
    
    // Filter by effect types (simplified - would need effect registry)
    return effects.filter(effectId => 
      effectTypes.some(type => effectId.includes(type))
    );
  }
  
  /**
   * Create a read-only view of this frame
   */
  createView(): FrameView {
    return new OptimizedFrameView(this);
  }
  
  /**
   * Clear caches to free memory
   */
  clearCaches(): void {
    this._statsCache?.clear();
    this._effectsCache?.clear();
    this._contextCache?.clear();
  }
  
  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    let size = 0;
    size += this._statsCache?.size || 0;
    size += this._effectsCache?.size || 0;
    size += this._contextCache?.size || 0;
    return size;
  }
}

/**
 * Read-only view of frame data with optimized access patterns
 */
export class OptimizedFrameView implements FrameView {
  private readonly _container: OptimizedFrameContainer;
  
  constructor(container: OptimizedFrameContainer) {
    this._container = container;
  }
  
  get frameId(): string { return this._container.frameId; }
  get timestamp(): number { return this._container.timestamp; }
  get entityCount(): number { return this._container.entityIds.length; }
  get entityIds(): readonly EntityId[] { return this._container.entityIds; }
  
  getEntityStats(entityId: EntityId): StatMap | undefined {
    return this._container.getEntityStats(entityId);
  }
  
  getEntityEffects(entityId: EntityId): EffectId[] | undefined {
    return this._container.getEntityEffects(entityId);
  }
  
  getStatsOfInterest(entityId: EntityId, statTypes: StatType[]): Partial<Record<StatType, StatValue>> {
    return this._container.getStatsOfInterest(entityId, statTypes);
  }
  
  /**
   * Batch operation to get all entity stats
   */
  getAllEntityStats(): Map<EntityId, StatMap> {
    const result = new Map<EntityId, StatMap>();
    for (const entityId of this._container.entityIds) {
      const stats = this._container.getEntityStats(entityId);
      if (stats) {
        result.set(entityId, stats);
      }
    }
    return result;
  }
  
  /**
   * Batch operation to get stats for multiple entities
   */
  getStatsForEntities(entityIds: EntityId[], statTypes: StatType[]): Map<EntityId, Partial<Record<StatType, StatValue>>> {
    const result = new Map<EntityId, Partial<Record<StatType, StatValue>>>();
    for (const entityId of entityIds) {
      const stats = this._container.getStatsOfInterest(entityId, statTypes);
      if (Object.keys(stats).length > 0) {
        result.set(entityId, stats);
      }
    }
    return result;
  }
}

/**
 * Factory for creating optimized frame containers
 */
export class FrameFactory {
  private _frameCounter: number = 0;
  private readonly _defaultConfig: FrameConfig;
  
  constructor(defaultConfig?: Partial<FrameConfig>) {
    this._defaultConfig = {
      trackStats: ['health', 'attack', 'defense', 'speed', 'mana'],
      trackEffects: true,
      trackContext: false, // Usually not needed for most use cases
      maxCacheSize: 1000,
      enableLazyEvaluation: true,
      ...defaultConfig
    };
  }
  
  /**
   * Create a new frame container with minimal allocations
   */
  createFrame(
    entities: Entity[], 
    config?: Partial<FrameConfig>,
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    const frameId = `frame-${++this._frameCounter}`;
    const finalConfig = { ...this._defaultConfig, ...config };
    
    const container = new OptimizedFrameContainer(
      frameId,
      entities,
      finalConfig,
      metadata
    );
    
    // Emit event
    eventSystem.emitEvent(EventType.FRAME_CREATED, {
      frameId,
      entityCount: entities.length,
      config: finalConfig
    });
    
    return container;
  }
  
  /**
   * Create a frame container for a single entity
   */
  createSingleEntityFrame(
    entity: Entity,
    config?: Partial<FrameConfig>,
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    return this.createFrame([entity], config, metadata);
  }
  
  /**
   * Create a lightweight frame container (minimal tracking)
   */
  createLightweightFrame(
    entities: Entity[],
    statTypes: StatType[],
    metadata?: Record<string, any>
  ): OptimizedFrameContainer {
    return this.createFrame(entities, {
      trackStats: statTypes,
      trackEffects: false,
      trackContext: false,
      maxCacheSize: 100,
      enableLazyEvaluation: true
    }, metadata);
  }
}
