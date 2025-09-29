/**
 * Core types and interfaces for the Entity Effects API
 */

// Base stat value type - all stats are floating point numbers
export type StatValue = number;

// Bound value type - represents a stat bound (min or max)
export type StatBound = number;

// Bound function type - function that calculates a bound from entity stats
export type StatBoundFunction = (stats: StatMap) => StatBound;

// Unique identifier for entities
export type EntityId = string;

// Unique identifier for effects
export type EffectId = string;

// Unique identifier for stat types
export type StatType = string;

// Mapping of stat types to their current values
export type StatMap = Map<StatType, StatValue>;

// Base stats configuration for an entity
export type BaseStats = Record<StatType, StatValue>;

/**
 * Represents a reusable container for frame data with lazy evaluation
 */
export interface FrameContainer {
  readonly frameId: string;
  readonly timestamp: number;
  readonly entityIds: EntityId[];
  readonly metadata?: Record<string, any>;
  
  // Lazy evaluation methods
  getEntityStats(entityId: EntityId): StatMap | undefined;
  getEntityEffects(entityId: EntityId): EffectId[] | undefined;
  getEntityContext(entityId: EntityId): EffectContext | undefined;
  
  // Update methods (minimal allocation)
  updateEntityStats(entityId: EntityId, stats: StatMap): void;
  updateEntityEffects(entityId: EntityId, effects: EffectId[]): void;
  
  // Selective information access
  getStatsOfInterest(entityId: EntityId, statTypes: StatType[]): Partial<Record<StatType, StatValue>>;
  getEffectsOfInterest(entityId: EntityId, effectTypes?: string[]): EffectId[];
}

/**
 * Read-only view of frame data for external consumers
 */
export interface FrameView {
  readonly frameId: string;
  readonly timestamp: number;
  readonly entityCount: number;
  readonly entityIds: readonly EntityId[];
  
  // Lazy read access
  getEntityStats(entityId: EntityId): StatMap | undefined;
  getEntityEffects(entityId: EntityId): EffectId[] | undefined;
  getStatsOfInterest(entityId: EntityId, statTypes: StatType[]): Partial<Record<StatType, StatValue>>;
  
  // Batch operations
  getAllEntityStats(): Map<EntityId, StatMap>;
  getStatsForEntities(entityIds: EntityId[], statTypes: StatType[]): Map<EntityId, Partial<Record<StatType, StatValue>>>;
}

/**
 * Frame comparison result
 */
export interface FrameComparison {
  readonly frame1Id: string;
  readonly frame2Id: string;
  readonly timeDifference: number;
  readonly differences: EntityDifference[];
}

/**
 * Entity difference in frame comparison
 */
export interface EntityDifference {
  readonly entityId: EntityId;
  readonly type: 'entity_added' | 'entity_removed' | 'stats_changed';
  readonly changes: StatChange[];
}

/**
 * Stat change in frame comparison
 */
export interface StatChange {
  readonly statType: StatType;
  readonly oldValue: StatValue;
  readonly newValue: StatValue;
  readonly difference: StatValue;
}

/**
 * Frame statistics
 */
export interface FrameStats {
  readonly totalFrames: number;
  readonly averageEntitiesPerFrame: number;
  readonly timeSpan: number;
  readonly entityCounts: Map<EntityId, number>;
}

/**
 * Configuration for what information to track in frames
 */
export interface FrameConfig {
  readonly trackStats: StatType[] | 'all'; // Track specific stats or all stats
  readonly trackEffects: boolean;
  readonly trackContext: boolean;
  readonly maxCacheSize: number;
  readonly enableLazyEvaluation: boolean;
}

/**
 * Condition for when an effect applicator should trigger
 */
export interface EffectCondition {
  readonly eventType: EventType;
  readonly predicate: (event: Event, context: EffectContext) => boolean;
  readonly description: string;
}

/**
 * Effect timing information for cooldown management
 */
export interface EffectTiming {
  readonly effectId: EffectId;
  readonly appliedAt: number;
  readonly duration?: number; // Optional duration in milliseconds
  readonly expiresAt?: number; // Optional expiration timestamp
}

/**
 * Value request context for on-demand value calculations
 */
export interface ValueRequestContext {
  readonly entityId: EntityId;
  readonly requestId: string;
  readonly purpose: string; // e.g., "damage", "healing", "movement", "defense"
  readonly timestamp: number;
  readonly parameters?: Record<string, any>; // Additional context parameters
  readonly baseStats: StatMap;
  readonly currentStats: StatMap;
  readonly activeEffects: Effect[];
}

/**
 * Value provider that can respond to on-demand value requests
 */
export interface ValueProvider {
  readonly id: string;
  readonly name: string;
  readonly priority: number; // Higher priority providers are consulted first
  readonly supportedPurposes: string[]; // Which purposes this provider can handle
  
  /**
   * Check if this provider can handle the given purpose
   */
  canHandlePurpose(purpose: string): boolean;
  
  /**
   * Provide a value for the given purpose and context
   * @param purpose - The purpose for which a value is requested
   * @param context - The context of the request
   * @returns The calculated value, or undefined if this provider cannot handle the request
   */
  provideValue(purpose: string, context: ValueRequestContext): StatValue | undefined;
  
  /**
   * Check if this provider is currently active/available
   * @param context - The context of the request
   * @returns true if the provider is active and can respond
   */
  isActive(context: ValueRequestContext): boolean;
}

/**
 * Active effect that can respond to value requests
 */
export interface ActiveEffect extends Effect {
  readonly supportedPurposes: string[];
  
  /**
   * Provide a value for a specific purpose
   * @param purpose - The purpose for which a value is requested
   * @param context - The context of the request
   * @returns The calculated value, or undefined if this effect cannot handle the request
   */
  provideValue?(purpose: string, context: ValueRequestContext): StatValue | undefined;
  
  /**
   * Check if this effect is active for the given purpose
   * @param purpose - The purpose being requested
   * @param context - The context of the request
   * @returns true if the effect is active for this purpose
   */
  isActiveForPurpose?(purpose: string, context: ValueRequestContext): boolean;
}

/**
 * Generic gear/item that can provide values for specific purposes and apply passive effects
 */
export interface Gear {
  readonly id: string;
  readonly name: string;
  readonly type: string; // e.g., "weapon", "armor", "tool", "accessory"
  readonly slot?: string; // Optional slot restriction
  readonly priority: number;
  readonly supportedPurposes: string[];
  readonly passiveEffects: Effect[]; // Effects applied when gear is equipped

  /**
   * Check if this gear can handle the given purpose
   */
  canHandlePurpose(purpose: string): boolean;

  /**
   * Provide a value for the given purpose and context
   * @param purpose - The purpose for which a value is requested
   * @param context - The context of the request
   * @returns The calculated value, or undefined if this gear cannot handle the request
   */
  provideValue(purpose: string, context: ValueRequestContext): StatValue | undefined;

  /**
   * Check if this gear is currently equipped/active
   * @param context - The context of the request
   * @returns true if the gear is equipped and can respond
   */
  isEquipped(context: ValueRequestContext): boolean;

  /**
   * Get passive effects that should be applied when this gear is equipped
   * @returns Array of effects to apply
   */
  getPassiveEffects(): Effect[];

  /**
   * Check if this gear should apply passive effects
   * @returns true if this gear has passive effects to apply
   */
  hasPassiveEffects(): boolean;
}

/**
 * Value request result
 */
export interface ValueRequestResult {
  readonly value: StatValue;
  readonly provider: string; // ID of the provider that calculated the value
  readonly purpose: string;
  readonly timestamp: number;
  readonly context: ValueRequestContext;
}

/**
 * Interaction phase in the interaction flow
 */
export enum InteractionPhase {
  INITIATION = 'initiation',
  VALUE_REQUEST = 'value_request',
  VALUE_MODIFICATION = 'value_modification',
  STATE_ADJUSTMENT = 'state_adjustment',
  NOTIFICATION = 'notification',
  COMPLETION = 'completion'
}

/**
 * Interaction context containing information about the ongoing interaction
 */
export interface InteractionContext {
  readonly interactionId: string;
  readonly initiatorId: EntityId;
  readonly targetId: EntityId;
  readonly interactionType: string;
  phase: InteractionPhase;
  readonly timestamp: number;
  readonly parameters: Record<string, any>;
  originalValue?: StatValue;
  modifiedValue?: StatValue;
  finalValue?: StatValue;
  readonly stateChanges: Map<EntityId, Map<StatType, StatValue>>;
  readonly metadata: Record<string, any>;
}

/**
 * Interaction modifier that can alter values during interactions
 */
export interface InteractionModifier {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly supportedInteractionTypes: string[];
  readonly supportedPhases: InteractionPhase[];
  
  /**
   * Check if this modifier can handle the given interaction type and phase
   */
  canModify(interactionType: string, phase: InteractionPhase): boolean;
  
  /**
   * Modify a value during an interaction
   * @param context - The interaction context
   * @param value - The current value to modify
   * @returns The modified value, or undefined if no modification
   */
  modifyValue(context: InteractionContext, value: StatValue): StatValue | undefined;
  
  /**
   * Check if this modifier is active for the given entity
   * @param entityId - The entity to check
   * @param context - The interaction context
   * @returns true if the modifier is active
   */
  isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * State adjuster that can modify entity state based on interaction outcomes
 */
export interface StateAdjuster {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly supportedInteractionTypes: string[];
  
  /**
   * Check if this adjuster can handle the given interaction type
   */
  canAdjust(interactionType: string): boolean;
  
  /**
   * Adjust entity state based on interaction outcome
   * @param context - The interaction context
   * @param entityId - The entity to adjust
   * @returns Map of stat changes to apply
   */
  adjustState(context: InteractionContext, entityId: EntityId): Map<StatType, StatValue>;
  
  /**
   * Check if this adjuster is active for the given entity
   * @param entityId - The entity to check
   * @param context - The interaction context
   * @returns true if the adjuster is active
   */
  isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * Interaction notification handler
 */
export interface InteractionNotifier {
  readonly id: string;
  readonly name: string;
  readonly supportedInteractionTypes: string[];
  
  /**
   * Check if this notifier can handle the given interaction type
   */
  canNotify(interactionType: string): boolean;
  
  /**
   * Notify an entity about interaction outcome
   * @param context - The interaction context
   * @param entityId - The entity to notify
   */
  notify(context: InteractionContext, entityId: EntityId): void;
  
  /**
   * Check if this notifier is active for the given entity
   * @param entityId - The entity to check
   * @param context - The interaction context
   * @returns true if the notifier is active
   */
  isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * Interaction result containing the outcome of an interaction
 */
export interface InteractionResult {
  readonly interactionId: string;
  readonly initiatorId: EntityId;
  readonly targetId: EntityId;
  readonly interactionType: string;
  readonly success: boolean;
  readonly originalValue: StatValue;
  readonly finalValue: StatValue;
  readonly stateChanges: Map<EntityId, Map<StatType, StatValue>>;
  readonly timestamp: number;
  readonly duration: number;
  readonly metadata: Record<string, any>;
}

/**
 * Interaction definition that describes how an interaction should be executed
 */
export interface InteractionDefinition {
  readonly id: string;
  readonly name: string;
  readonly interactionType: string;
  readonly valuePurpose: string; // The purpose for which to request a value
  readonly valueParameters?: Record<string, any>; // Parameters for value request
  readonly phases: InteractionPhase[];
  readonly modifiers: InteractionModifier[];
  readonly stateAdjusters: StateAdjuster[];
  readonly notifiers: InteractionNotifier[];
}

/**
 * Effect applicator that can register interest in events and manage effects
 */
export interface EffectApplicator {
  readonly id: string;
  readonly name: string;
  readonly conditions: EffectCondition[];
  readonly effectsToAdd: Effect[];
  readonly effectsToRemove: EffectId[];
  
  /**
   * Handle an event and potentially modify entity effects
   * @param event - The event that occurred
   * @param entityId - The entity ID to potentially modify
   * @returns true if any effects were added/removed
   */
  handleEvent(event: Event, entityId: EntityId): boolean;
  
  /**
   * Check if this applicator is interested in a specific event type
   * @param eventType - The event type to check
   * @returns true if interested
   */
  isInterestedIn(eventType: EventType): boolean;
  
  /**
   * Check for expired effects and remove them (called during frame generation)
   * @param entityId - The entity to check
   * @param currentTime - Current timestamp
   * @returns true if any effects were removed
   */
  checkExpiredEffects?(entityId: EntityId, currentTime: number): boolean;
}

/**
 * Context information available to effects during calculation
 */
export interface EffectContext {
  readonly entityId: EntityId;
  readonly effectStack: Effect[];
  readonly currentStats: StatMap;
  readonly baseStats: BaseStats;
  readonly timestamp: number;
  readonly boundConfigs?: Map<StatType, StatBoundConfig>; // Optional bound configurations
  readonly boundResults?: Map<StatType, StatBoundResult>; // Optional bound calculation results
}

/**
 * Stackability rules for stat types
 */
export interface StatStackability {
  readonly statType: StatType;
  readonly stackable: boolean; // Can multiple effects of this stat type stack?
  readonly maxStackSize?: number; // Optional limit on stack size
}

/**
 * Base interface for all effects
 */
export interface Effect {
  readonly id: EffectId;
  readonly name: string;
  readonly priority: number; // Higher priority effects are applied later
  readonly statTypes: StatType[]; // Which stat types this effect modifies
  readonly stackabilityRules: StatStackability[]; // Stackability rules per stat type
  
  /**
   * Apply this effect to modify stats
   * @param context - The current effect context
   * @param stats - The stats map to modify
   */
  apply(context: EffectContext, stats: StatMap): void;
  
  /**
   * Reverse this effect from stats
   * @param context - The current effect context
   * @param stats - The stats map to modify
   */
  reverse(context: EffectContext, stats: StatMap): void;
  
  /**
   * Check if this effect should be active given the current context
   * @param context - The current effect context
   * @returns true if the effect should be active
   */
  isActive(context: EffectContext): boolean;
  
  /**
   * Check if this effect can stack with another effect for a specific stat type
   * @param otherEffect - The other effect to check against
   * @param statType - The stat type to check stackability for
   * @returns true if the effects can stack for this stat type
   */
  canStackWith(otherEffect: Effect, statType: StatType): boolean;
}

/**
 * Event types for the event-driven system
 */
export enum EventType {
  EFFECT_ADDED = 'effect_added',
  EFFECT_REMOVED = 'effect_removed',
  STAT_CHANGED = 'stat_changed',
  ENTITY_CREATED = 'entity_created',
  ENTITY_DESTROYED = 'entity_destroyed',
  FRAME_CREATED = 'frame_created',
  GEAR_EQUIPPED = 'gear_equipped',
  GEAR_UNEQUIPPED = 'gear_unequipped',
  BOUND_STATE_CHANGED = 'bound_state_changed',
  BOUND_THRESHOLD_CROSSED = 'bound_threshold_crossed',
  BOUND_RATIO_CHANGED = 'bound_ratio_changed',
  // Interaction events
  INTERACTION_VALUE_REQUESTED = 'interaction_value_requested',
  INTERACTION_VALUE_MODIFIED = 'interaction_value_modified',
  INTERACTION_STATE_ADJUSTED = 'interaction_state_adjusted',
  INTERACTION_NOTIFICATIONS_SENT = 'interaction_notifications_sent',
  INTERACTION_COMPLETED = 'interaction_completed',
  CUSTOM_EVENT = 'custom_event'
}

/**
 * Base event interface
 */
export interface Event {
  readonly type: EventType;
  readonly timestamp: number;
  readonly data: any;
}

/**
 * Event handlers
 */
export type EventHandler<T = any> = (event: Event & { data: T }) => void;

/**
 * Cache entry for stats
 */
export interface StatsCacheEntry {
  readonly stats: StatMap;
  readonly timestamp: number;
  readonly effectIds: EffectId[];
}

/**
 * Cache entry for individual effects
 */
export interface EffectCacheEntry {
  readonly effect: Effect;
  readonly isActive: boolean;
  readonly timestamp: number;
}


/**
 * Configuration for stat bounds (min/max values)
 */
export interface StatBoundConfig {
  readonly min?: StatBound | StatBoundFunction; // Minimum bound (fixed value or function)
  readonly max?: StatBound | StatBoundFunction; // Maximum bound (fixed value or function)
  readonly clampToBounds?: boolean; // Whether to clamp stat values to bounds
  readonly defaultValue?: StatValue; // Default value if bounds are invalid
}

/**
 * Result of a stat bound calculation
 */
export interface StatBoundResult {
  readonly statType: StatType;
  readonly currentValue: StatValue;
  readonly minBound: StatBound;
  readonly maxBound: StatBound;
  readonly isClamped: boolean; // whether the current value was clamped
  readonly config: StatBoundConfig;
}

/**
 * Configuration for bound state thresholds
 */
export interface BoundThresholdConfig {
  readonly critical?: number; // Threshold below which is considered critical
  readonly low?: number; // Threshold below which is considered low
  readonly high?: number; // Threshold above which is considered high
  readonly full?: number; // Threshold above which is considered full
  readonly empty?: number; // Threshold below which is considered empty
}

/**
 * Default threshold configuration
 */
export const DEFAULT_BOUND_THRESHOLDS: BoundThresholdConfig = {
  critical: 0.25,
  low: 0.5,
  high: 0.75,
  full: 1.0,
  empty: 0.0
};

/**
 * Configuration for bound event triggers
 */
export interface BoundEventConfig {
  readonly statType: StatType;
  readonly boundConfig: StatBoundConfig;
  readonly ratioChangeThreshold?: number; // Minimum ratio change to trigger event (0.0-1.0)
  readonly positiveChangeOnly?: boolean; // Only trigger on positive ratio changes
  readonly negativeChangeOnly?: boolean; // Only trigger on negative ratio changes
  readonly minDistanceFromMin?: number; // Minimum distance from lower bound to trigger
  readonly minDistanceFromMax?: number; // Minimum distance from upper bound to trigger
  readonly maxDistanceFromMin?: number; // Maximum distance from lower bound to trigger
  readonly maxDistanceFromMax?: number; // Maximum distance from upper bound to trigger
  readonly thresholdConfig?: BoundThresholdConfig; // Thresholds for state changes
}

/**
 * Bound event data
 */
export interface BoundEventData {
  readonly statType: StatType;
  readonly boundResult: StatBoundResult;
  readonly previousRatio?: number; // Previous ratio value
  readonly ratioChange?: number; // Change in ratio (current - previous)
  readonly previousState?: string; // Previous state description
  readonly currentState: string; // Current state description
  readonly distanceFromMin: number; // Current distance from minimum bound
  readonly distanceFromMax: number; // Current distance from maximum bound
  readonly isAtMin: boolean; // Whether currently at minimum bound
  readonly isAtMax: boolean; // Whether currently at maximum bound
  readonly isWithinBounds: boolean; // Whether currently within bounds
}

// ===== Effect Composition Interfaces =====

/**
 * Determines when an effect should be applicable
 */
export interface EffectApplicability {
  /**
   * Check if the effect should be applicable in the given context
   * @param context - The current effect context
   * @returns true if the effect should be applicable
   */
  isApplicable(context: EffectContext): boolean;
}

/**
 * Calculates the impact/change amount for a stat
 */
export interface EffectImpact {
  /**
   * Calculate the impact amount for a specific stat type
   * @param context - The current effect context
   * @param statType - The stat type to calculate impact for
   * @returns The impact amount (positive or negative)
   */
  calculateImpact(context: EffectContext, statType: StatType): StatValue;
}

/**
 * Determines which stat types an effect should target
 */
export interface EffectTarget {
  /**
   * Get the stat types that this effect should target
   * @param context - The current effect context
   * @returns Array of stat types to target
   */
  getTargets(context: EffectContext): StatType[];
}

/**
 * Determines how an effect should be applied to stats
 */
export interface EffectApplication {
  /**
   * Apply the calculated impact to a stat
   * @param context - The current effect context
   * @param stats - The stats map to modify
   * @param statType - The stat type to modify
   * @param impact - The calculated impact amount
   */
  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void;
  
  /**
   * Reverse the calculated impact from a stat
   * @param context - The current effect context
   * @param stats - The stats map to modify
   * @param statType - The stat type to modify
   * @param impact - The calculated impact amount
   */
  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void;
}
