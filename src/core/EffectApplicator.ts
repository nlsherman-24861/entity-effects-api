import { 
  EffectApplicator, 
  EffectCondition, 
  Effect, 
  EffectId, 
  Event, 
  EventType, 
  EffectContext,
  EntityId,
  StatType,
  StatValue,
  StatBoundConfig,
  StatBoundResult,
  BoundEventConfig,
  BoundEventData,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS
} from './types';
import { Entity } from './Entity';
import { eventSystem } from './EventSystem';
import { StatBoundCalculator } from './StatBoundCalculator';

/**
 * Base implementation of EffectApplicator
 */
export abstract class BaseEffectApplicator implements EffectApplicator {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly conditions: EffectCondition[],
    public readonly effectsToAdd: Effect[],
    public readonly effectsToRemove: EffectId[]
  ) {}
  
  abstract handleEvent(event: Event, entityId: EntityId): boolean;
  
  isInterestedIn(eventType: EventType): boolean {
    return this.conditions.some(condition => condition.eventType === eventType);
  }
  
  /**
   * Check if any conditions are met for the given event and context
   */
  protected checkConditions(event: Event, context: EffectContext): boolean {
    return this.conditions.some(condition => 
      condition.eventType === event.type && condition.predicate(event, context)
    );
  }
  
  /**
   * Get effect context for an entity (helper method)
   */
  protected getEntityContext(entity: Entity): EffectContext {
    const stats = entity.getCurrentStats();
    return {
      entityId: entity.id,
      effectStack: entity.getEffects(),
      currentStats: new Map(stats),
      baseStats: entity.baseStats,
      timestamp: Date.now()
    };
  }
  
  /**
   * Add effects to entity if they can stack properly
   */
  protected addEffects(entity: Entity): boolean {
    let added = false;
    
    for (const effect of this.effectsToAdd) {
      if (this.canAddEffect(entity, effect)) {
        entity.addEffect(effect);
        added = true;
      }
    }
    
    return added;
  }
  
  /**
   * Remove effects from entity
   */
  protected removeEffects(entity: Entity): boolean {
    let removed = false;
    
    for (const effectId of this.effectsToRemove) {
      if (entity.removeEffect(effectId)) {
        removed = true;
      }
    }
    
    return removed;
  }
  
  /**
   * Check if an effect can be added considering stackability rules
   */
  protected canAddEffect(entity: Entity, effect: Effect): boolean {
    const existingEffects = entity.getEffects();
    
    // Check stackability for each stat type this effect modifies
    for (const statType of effect.statTypes) {
      const stackabilityRule = effect.stackabilityRules.find(rule => rule.statType === statType);
      if (!stackabilityRule) continue;
      
      // If not stackable, check if there's already an effect modifying this stat type
      if (!stackabilityRule.stackable) {
        const conflictingEffect = existingEffects.find(existing => 
          existing.statTypes.includes(statType) && 
          !existing.canStackWith(effect, statType)
        );
        
        if (conflictingEffect) {
          return false; // Cannot add non-stackable effect
        }
      }
      
      // Check max stack size if specified
      if (stackabilityRule.maxStackSize) {
        const currentStackSize = existingEffects.filter(existing => 
          existing.statTypes.includes(statType)
        ).length;
        
        if (currentStackSize >= stackabilityRule.maxStackSize) {
          return false; // Stack size limit reached
        }
      }
    }
    
    return true;
  }
}

/**
 * Generic effect applicator for stat threshold-based effects
 */
export class StatThresholdApplicator extends BaseEffectApplicator {
  constructor(
    id: string,
    name: string,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[],
    private readonly statType: StatType,
    private readonly operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
    private readonly threshold: StatValue,
    private readonly baseValue?: StatValue // Optional base value for percentage calculations
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.STAT_CHANGED,
        predicate: (event, context) => {
          const currentValue = context.currentStats.get(this.statType) ?? 0;
          
          switch (this.operator) {
            case '>': return currentValue > this.threshold;
            case '<': return currentValue < this.threshold;
            case '>=': return currentValue >= this.threshold;
            case '<=': return currentValue <= this.threshold;
            case '==': return currentValue === this.threshold;
            case '!=': return currentValue !== this.threshold;
            default: return false;
          }
        },
        description: `${statType} ${operator} ${threshold}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false;
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const context = this.getEntityContext(entity);
    if (!this.checkConditions(event, context)) {
      return false;
    }
    
    return this.addEffects(entity);
  }
}

/**
 * Generic effect applicator for percentage-based thresholds
 */
export class PercentageThresholdApplicator extends BaseEffectApplicator {
  constructor(
    id: string,
    name: string,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[],
    private readonly statType: StatType,
    private readonly operator: '>' | '<' | '>=' | '<=',
    private readonly percentage: number, // 0.0 to 1.0
    private readonly baseStatType?: StatType // Optional base stat for percentage calculation
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.STAT_CHANGED,
        predicate: (event, context) => {
          const currentValue = context.currentStats.get(this.statType) ?? 0;
          const baseValue = this.baseStatType 
            ? context.currentStats.get(this.baseStatType) ?? context.baseStats[this.baseStatType] ?? 0
            : context.baseStats[this.statType] ?? 0;
          
          const threshold = baseValue * this.percentage;
          
          switch (this.operator) {
            case '>': return currentValue > threshold;
            case '<': return currentValue < threshold;
            case '>=': return currentValue >= threshold;
            case '<=': return currentValue <= threshold;
            default: return false;
          }
        },
        description: `${statType} ${operator} ${(percentage * 100).toFixed(0)}% of ${baseStatType || statType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false;
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const context = this.getEntityContext(entity);
    if (!this.checkConditions(event, context)) {
      return false;
    }
    
    return this.addEffects(entity);
  }
}

/**
 * Generic effect applicator for cooldown-based effects
 */
export class CooldownEffectApplicator extends BaseEffectApplicator {
  private readonly _entityTimings: Map<EntityId, Map<EffectId, number>> = new Map();
  
  constructor(
    id: string,
    name: string,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[],
    private readonly cooldownDuration: number, // Cooldown duration in milliseconds
    private readonly triggerEventType: EventType = EventType.CUSTOM_EVENT,
    private readonly triggerEventTypeName?: string // Optional custom event type name
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: triggerEventType,
        predicate: (event, context) => {
          // Check if this is the right custom event type
          if (triggerEventType === EventType.CUSTOM_EVENT && triggerEventTypeName) {
            return event.data?.type === triggerEventTypeName;
          }
          return true; // For non-custom events, always trigger
        },
        description: `Cooldown trigger: ${triggerEventTypeName || triggerEventType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false;
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const now = Date.now();
    
    // Check if any effects are on cooldown
    if (this.isOnCooldown(entity.id, now)) {
      return false; // Still on cooldown
    }
    
    const context = this.getEntityContext(entity);
    if (!this.checkConditions(event, context)) {
      return false;
    }
    
    // Add effects with cooldown duration
    let added = false;
    for (const effect of this.effectsToAdd) {
      if (this.canAddEffect(entity, effect)) {
        entity.addEffect(effect, this.cooldownDuration);
        this.setCooldown(entity.id, effect.id, now);
        added = true;
      }
    }
    
    return added;
  }
  
  checkExpiredEffects(entityId: EntityId, currentTime: number): boolean {
    const entityTimings = this._entityTimings.get(entityId);
    if (!entityTimings) return false;
    
    let removed = false;
    const expiredEffects: EffectId[] = [];
    
    for (const [effectId, appliedAt] of entityTimings) {
      if (currentTime - appliedAt >= this.cooldownDuration) {
        expiredEffects.push(effectId);
      }
    }
    
    // Remove expired cooldowns
    for (const effectId of expiredEffects) {
      entityTimings.delete(effectId);
      removed = true;
    }
    
    // Clean up empty entity timing maps
    if (entityTimings.size === 0) {
      this._entityTimings.delete(entityId);
    }
    
    return removed;
  }
  
  /**
   * Check if entity is on cooldown for any of the effects this applicator manages
   */
  private isOnCooldown(entityId: EntityId, currentTime: number): boolean {
    const entityTimings = this._entityTimings.get(entityId);
    if (!entityTimings) return false;
    
    for (const [effectId, appliedAt] of entityTimings) {
      if (currentTime - appliedAt < this.cooldownDuration) {
        return true; // Still on cooldown
      }
    }
    
    return false;
  }
  
  /**
   * Set cooldown for an effect on an entity
   */
  private setCooldown(entityId: EntityId, effectId: EffectId, appliedAt: number): void {
    if (!this._entityTimings.has(entityId)) {
      this._entityTimings.set(entityId, new Map());
    }
    
    const entityTimings = this._entityTimings.get(entityId)!;
    entityTimings.set(effectId, appliedAt);
  }
  
  /**
   * Get cooldown status for an entity
   */
  getCooldownStatus(entityId: EntityId, currentTime: number = Date.now()): {
    isOnCooldown: boolean;
    remainingTime: number;
    activeCooldowns: Array<{ effectId: EffectId; remainingTime: number }>;
  } {
    const entityTimings = this._entityTimings.get(entityId);
    if (!entityTimings) {
      return {
        isOnCooldown: false,
        remainingTime: 0,
        activeCooldowns: []
      };
    }
    
    const activeCooldowns: Array<{ effectId: EffectId; remainingTime: number }> = [];
    let maxRemainingTime = 0;
    
    for (const [effectId, appliedAt] of entityTimings) {
      const remainingTime = Math.max(0, this.cooldownDuration - (currentTime - appliedAt));
      if (remainingTime > 0) {
        activeCooldowns.push({ effectId, remainingTime });
        maxRemainingTime = Math.max(maxRemainingTime, remainingTime);
      }
    }
    
    return {
      isOnCooldown: activeCooldowns.length > 0,
      remainingTime: maxRemainingTime,
      activeCooldowns
    };
  }
}

/**
 * Generic effect applicator for custom events
 */
export class CustomEventApplicator extends BaseEffectApplicator {
  constructor(
    id: string,
    name: string,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[],
    private readonly customEventType: string,
    private readonly customPredicate: (event: Event, context: EffectContext) => boolean
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.CUSTOM_EVENT,
        predicate: (event, context) => {
          return event.data?.type === this.customEventType && this.customPredicate(event, context);
        },
        description: `Custom event: ${customEventType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false;
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const context = this.getEntityContext(entity);
    if (!this.checkConditions(event, context)) {
      return false;
    }
    
    return this.addEffects(entity);
  }
}

/**
 * Manager for effect applicators
 */
export class EffectApplicatorManager {
  private readonly _applicators: Map<string, EffectApplicator> = new Map();
  private readonly _eventSubscriptions: Map<EventType, Set<EffectApplicator>> = new Map();
  
  constructor() {
    this.setupEventHandling();
  }
  
  /**
   * Register an effect applicator
   */
  registerApplicator(applicator: EffectApplicator): void {
    this._applicators.set(applicator.id, applicator);
    
    // Subscribe to relevant events
    for (const condition of applicator.conditions) {
      if (!this._eventSubscriptions.has(condition.eventType)) {
        this._eventSubscriptions.set(condition.eventType, new Set());
      }
      this._eventSubscriptions.get(condition.eventType)!.add(applicator);
    }
    
    console.log(`📝 Registered effect applicator: ${applicator.name}`);
  }
  
  /**
   * Unregister an effect applicator
   */
  unregisterApplicator(applicatorId: string): boolean {
    const applicator = this._applicators.get(applicatorId);
    if (!applicator) return false;
    
    // Remove from event subscriptions
    for (const condition of applicator.conditions) {
      const subscribers = this._eventSubscriptions.get(condition.eventType);
      if (subscribers) {
        subscribers.delete(applicator);
        if (subscribers.size === 0) {
          this._eventSubscriptions.delete(condition.eventType);
        }
      }
    }
    
    this._applicators.delete(applicatorId);
    console.log(`🗑️ Unregistered effect applicator: ${applicator.name}`);
    return true;
  }
  
  /**
   * Get all registered applicators
   */
  getAllApplicators(): EffectApplicator[] {
    return Array.from(this._applicators.values());
  }
  
  /**
   * Get applicators interested in a specific event type
   */
  getApplicatorsForEvent(eventType: EventType): EffectApplicator[] {
    const subscribers = this._eventSubscriptions.get(eventType);
    return subscribers ? Array.from(subscribers) : [];
  }
  
  /**
   * Handle an event for a specific entity
   */
  handleEventForEntity(event: Event, entity: Entity): boolean {
    const applicators = this.getApplicatorsForEvent(event.type);
    let anyChanges = false;
    
    for (const applicator of applicators) {
      // Use the handleEventWithEntity method if available
      if ('handleEventWithEntity' in applicator) {
        if ((applicator as any).handleEventWithEntity(event, entity)) {
          anyChanges = true;
        }
      } else {
        // Fallback to the interface method
        if (applicator.handleEvent(event, entity.id)) {
          anyChanges = true;
        }
      }
    }
    
    return anyChanges;
  }
  
  /**
   * Check for expired effects on an entity (called during frame generation)
   */
  checkExpiredEffectsForEntity(entity: Entity, currentTime: number = Date.now()): boolean {
    let anyChanges = false;
    
    // Check entity's own expired effects
    const expiredEffects = entity.checkExpiredEffects(currentTime);
    if (expiredEffects.length > 0) {
      anyChanges = true;
    }
    
    // Check applicator-specific expired effects
    for (const applicator of this._applicators.values()) {
      if (applicator.checkExpiredEffects) {
        if (applicator.checkExpiredEffects(entity.id, currentTime)) {
          anyChanges = true;
        }
      }
    }
    
    return anyChanges;
  }
  
  /**
   * Check for expired effects across all entities (batch operation)
   */
  checkExpiredEffectsForEntities(entities: Entity[], currentTime: number = Date.now()): boolean {
    let anyChanges = false;
    
    for (const entity of entities) {
      if (this.checkExpiredEffectsForEntity(entity, currentTime)) {
        anyChanges = true;
      }
    }
    
    return anyChanges;
  }
  
  /**
   * Setup event handling
   */
  private setupEventHandling(): void {
    // Subscribe to all relevant events
    Object.values(EventType).forEach(eventType => {
      eventSystem.on(eventType, (event) => {
        // This would need to be connected to entity management
        // For now, we'll handle it in the examples
      });
    });
  }
}

/**
 * Bound-based effect applicator that triggers effects based on bound state changes
 */
export class BoundStateApplicator extends BaseEffectApplicator {
  private readonly _previousStates: Map<EntityId, string> = new Map();
  
  constructor(
    id: string,
    name: string,
    private readonly boundEventConfig: BoundEventConfig,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[] = []
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.BOUND_STATE_CHANGED,
        predicate: (event, context) => {
          const eventData = event.data as BoundEventData;
          return eventData.statType === boundEventConfig.statType;
        },
        description: `Bound state changed for ${boundEventConfig.statType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false; // Not used for bound applicators
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const eventData = event.data as BoundEventData;
    const previousState = this._previousStates.get(entity.id);
    
    // Check if state actually changed
    if (previousState === eventData.currentState) {
      return false;
    }
    
    // Update previous state
    this._previousStates.set(entity.id, eventData.currentState);
    
    return this.addEffects(entity);
  }
}

/**
 * Bound threshold applicator that triggers effects when bound ratios cross thresholds
 */
export class BoundThresholdApplicator extends BaseEffectApplicator {
  private readonly _previousRatios: Map<EntityId, number> = new Map();
  
  constructor(
    id: string,
    name: string,
    private readonly boundEventConfig: BoundEventConfig,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[] = []
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.BOUND_THRESHOLD_CROSSED,
        predicate: (event, context) => {
          const eventData = event.data as BoundEventData;
          return eventData.statType === boundEventConfig.statType;
        },
        description: `Bound threshold crossed for ${boundEventConfig.statType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false; // Not used for bound applicators
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const eventData = event.data as BoundEventData;
    const previousRatio = this._previousRatios.get(entity.id);
    
    // Check ratio change threshold
    if (this.boundEventConfig.ratioChangeThreshold && eventData.ratioChange) {
      const absChange = Math.abs(eventData.ratioChange);
      if (absChange < this.boundEventConfig.ratioChangeThreshold) {
        return false;
      }
    }
    
    // Check positive/negative change filters
    if (this.boundEventConfig.positiveChangeOnly && eventData.ratioChange && eventData.ratioChange <= 0) {
      return false;
    }
    
    if (this.boundEventConfig.negativeChangeOnly && eventData.ratioChange && eventData.ratioChange >= 0) {
      return false;
    }
    
    // Check distance from bounds
    if (this.boundEventConfig.minDistanceFromMin && eventData.distanceFromMin < this.boundEventConfig.minDistanceFromMin) {
      return false;
    }
    
    if (this.boundEventConfig.minDistanceFromMax && eventData.distanceFromMax < this.boundEventConfig.minDistanceFromMax) {
      return false;
    }
    
    if (this.boundEventConfig.maxDistanceFromMin && eventData.distanceFromMin > this.boundEventConfig.maxDistanceFromMin) {
      return false;
    }
    
    if (this.boundEventConfig.maxDistanceFromMax && eventData.distanceFromMax > this.boundEventConfig.maxDistanceFromMax) {
      return false;
    }
    
    // Update previous ratio
    this._previousRatios.set(entity.id, StatBoundCalculator.calculateRatio(eventData.boundResult));
    
    return this.addEffects(entity);
  }
}

/**
 * Bound ratio change applicator that triggers effects based on ratio magnitude changes
 */
export class BoundRatioChangeApplicator extends BaseEffectApplicator {
  private readonly _previousRatios: Map<EntityId, number> = new Map();
  
  constructor(
    id: string,
    name: string,
    private readonly boundEventConfig: BoundEventConfig,
    effectsToAdd: Effect[],
    effectsToRemove: EffectId[] = []
  ) {
    const conditions: EffectCondition[] = [
      {
        eventType: EventType.BOUND_RATIO_CHANGED,
        predicate: (event, context) => {
          const eventData = event.data as BoundEventData;
          return eventData.statType === boundEventConfig.statType;
        },
        description: `Bound ratio changed for ${boundEventConfig.statType}`
      }
    ];
    
    super(id, name, conditions, effectsToAdd, effectsToRemove);
  }
  
  handleEvent(event: Event, entityId: EntityId): boolean {
    return false; // Not used for bound applicators
  }
  
  handleEventWithEntity(event: Event, entity: Entity): boolean {
    const eventData = event.data as BoundEventData;
    const previousRatio = this._previousRatios.get(entity.id);
    
    // Check ratio change threshold
    if (this.boundEventConfig.ratioChangeThreshold && eventData.ratioChange) {
      const absChange = Math.abs(eventData.ratioChange);
      if (absChange < this.boundEventConfig.ratioChangeThreshold) {
        return false;
      }
    }
    
    // Check positive/negative change filters
    if (this.boundEventConfig.positiveChangeOnly && eventData.ratioChange && eventData.ratioChange <= 0) {
      return false;
    }
    
    if (this.boundEventConfig.negativeChangeOnly && eventData.ratioChange && eventData.ratioChange >= 0) {
      return false;
    }
    
    // Update previous ratio
    this._previousRatios.set(entity.id, StatBoundCalculator.calculateRatio(eventData.boundResult));
    
    return this.addEffects(entity);
  }
}

/**
 * Global effect applicator manager
 */
export const effectApplicatorManager = new EffectApplicatorManager();
