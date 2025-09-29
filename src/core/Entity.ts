import {
  EntityId,
  StatType,
  StatValue,
  StatMap,
  BaseStats,
  Effect,
  EffectId,
  EffectContext,
  EventType,
  Event,
  StatsCacheEntry,
  EffectCacheEntry,
  EffectTiming,
  ValueProvider,
  ValueRequestContext,
  ValueRequestResult,
  Gear,
  ActiveEffect,
  InteractionModifier,
  StateAdjuster,
  InteractionNotifier,
  StatBoundConfig,
  StatBoundResult,
  BoundEventConfig,
  BoundEventData,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS
} from './types';
import { StatBoundCalculator } from './StatBoundCalculator';
import { eventSystem } from './EventSystem';

/**
 * Core Entity class for managing stats and effects
 */
export class Entity {
  private readonly _id: EntityId;
  private readonly _baseStats: BaseStats;
  private readonly _effects: Map<EffectId, Effect> = new Map();
  private readonly _effectTimings: Map<EffectId, EffectTiming> = new Map();
  private readonly _statsCache: Map<string, StatsCacheEntry> = new Map();
  private readonly _effectCache: Map<EffectId, EffectCacheEntry> = new Map();
  private readonly _valueProviders: Map<string, ValueProvider> = new Map();
  private readonly _equippedGear: Map<string, Gear> = new Map(); // slot -> gear
  private readonly _interactionModifiers: Map<string, InteractionModifier> = new Map();
  private readonly _stateAdjusters: Map<string, StateAdjuster> = new Map();
  private readonly _interactionNotifiers: Map<string, InteractionNotifier> = new Map();
  private readonly _boundEventConfigs: Map<StatType, BoundEventConfig> = new Map();
  private readonly _previousBoundStates: Map<StatType, string> = new Map();
  private readonly _previousBoundRatios: Map<StatType, number> = new Map();
  private _lastCalculationTime: number = 0;
  
  constructor(id: EntityId, baseStats: BaseStats) {
    this._id = id;
    this._baseStats = { ...baseStats };
  }
  
  get id(): EntityId {
    return this._id;
  }
  
  get baseStats(): BaseStats {
    return { ...this._baseStats };
  }
  
  /**
   * Get current stats with all effects applied
   */
  getCurrentStats(): StatMap {
    const cacheKey = this.getCacheKey();
    const cached = this._statsCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return new Map(cached.stats);
    }
    
    return this.calculateStats();
  }
  
  /**
   * Calculate stats from base values and active effects
   */
  private calculateStats(): StatMap {
    const stats = new Map<StatType, StatValue>();
    
    // Start with base stats
    for (const [statType, value] of Object.entries(this._baseStats)) {
      stats.set(statType, value);
    }
    
    // Apply effects in priority order
    const sortedEffects = this.getSortedActiveEffects();
    const context = this.createEffectContext(stats);
    
    for (const effect of sortedEffects) {
      if (effect.isActive(context)) {
        effect.apply(context, stats);
      }
    }
    
    // Cache the result
    this.cacheStats(stats, sortedEffects.map(e => e.id));
    
    return stats;
  }
  
  /**
   * Get effects sorted by priority (lower priority first)
   */
  private getSortedActiveEffects(): Effect[] {
    const effects: Effect[] = [];
    
    for (const [effectId, effect] of this._effects) {
      const cached = this._effectCache.get(effectId);
      
      // Check if effect is active (use cache if valid)
      let isActive: boolean;
      if (cached && this.isCacheValid(cached)) {
        isActive = cached.isActive;
      } else {
        const context = this.createEffectContext(new Map());
        isActive = effect.isActive(context);
        this._effectCache.set(effectId, {
          effect,
          isActive,
          timestamp: Date.now()
        });
      }
      
      if (isActive) {
        effects.push(effect);
      }
    }
    
    return effects.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Create effect context for calculations
   */
  private createEffectContext(currentStats: StatMap): EffectContext {
    return {
      entityId: this._id,
      effectStack: Array.from(this._effects.values()),
      currentStats: new Map(currentStats),
      baseStats: this.baseStats,
      timestamp: Date.now()
    };
  }
  
  /**
   * Add an effect to this entity
   */
  addEffect(effect: Effect, duration?: number): void {
    const now = Date.now();
    this._effects.set(effect.id, effect);
    
    // Track effect timing for cooldown management
    const timing: EffectTiming = {
      effectId: effect.id,
      appliedAt: now,
      duration,
      expiresAt: duration ? now + duration : undefined
    };
    this._effectTimings.set(effect.id, timing);
    
    this.invalidateCache();
    
    this.emitEvent({
      type: EventType.EFFECT_ADDED,
      timestamp: now,
      data: { entityId: this._id, effect, duration }
    });
  }
  
  /**
   * Remove an effect from this entity
   */
  removeEffect(effectId: EffectId): boolean {
    const removed = this._effects.delete(effectId);
    if (removed) {
      this._effectCache.delete(effectId);
      this._effectTimings.delete(effectId);
      this.invalidateCache();
      
      this.emitEvent({
        type: EventType.EFFECT_REMOVED,
        timestamp: Date.now(),
        data: { entityId: this._id, effectId }
      });
    }
    return removed;
  }
  
  /**
   * Get a specific stat value
   */
  getStat(statType: StatType): StatValue {
    const stats = this.getCurrentStats();
    return stats.get(statType) ?? 0;
  }
  
  /**
   * Set a base stat value
   */
  setBaseStat(statType: StatType, value: StatValue): void {
    this._baseStats[statType] = value;
    this.invalidateCache();
    
    this.emitEvent({
      type: EventType.STAT_CHANGED,
      timestamp: Date.now(),
      data: { entityId: this._id, statType, value }
    });
  }
  
  /**
   * Get current stats for frame creation (used by FrameManager)
   */
  getStatsForFrame(): { stats: StatMap; activeEffects: EffectId[] } {
    const stats = this.getCurrentStats();
    const activeEffects = this.getEffects().map(effect => effect.id);
    
    return {
      stats: new Map(stats),
      activeEffects
    };
  }
  
  /**
   * Get all active effects
   */
  getEffects(): Effect[] {
    return Array.from(this._effects.values());
  }
  
  /**
   * Check if entity has a specific effect
   */
  hasEffect(effectId: EffectId): boolean {
    return this._effects.has(effectId);
  }
  
  /**
   * Get effect timing information
   */
  getEffectTiming(effectId: EffectId): EffectTiming | undefined {
    return this._effectTimings.get(effectId);
  }
  
  /**
   * Check for expired effects and remove them
   * @param currentTime - Current timestamp (defaults to now)
   * @returns Array of removed effect IDs
   */
  checkExpiredEffects(currentTime: number = Date.now()): EffectId[] {
    const expiredEffects: EffectId[] = [];
    
    for (const [effectId, timing] of this._effectTimings) {
      if (timing.expiresAt && currentTime >= timing.expiresAt) {
        expiredEffects.push(effectId);
      }
    }
    
    // Remove expired effects
    for (const effectId of expiredEffects) {
      this.removeEffect(effectId);
    }
    
    return expiredEffects;
  }
  
  /**
   * Get all effect timings
   */
  getAllEffectTimings(): Map<EffectId, EffectTiming> {
    return new Map(this._effectTimings);
  }

  /**
   * Request a value for a specific purpose
   * @param purpose - The purpose for which a value is requested
   * @param parameters - Additional context parameters
   * @returns The calculated value and metadata
   */
  requestValue(purpose: string, parameters?: Record<string, any>): ValueRequestResult | undefined {
    const requestId = `${this._id}-${purpose}-${Date.now()}`;
    const timestamp = Date.now();
    
    const context: ValueRequestContext = {
      entityId: this._id,
      requestId,
      purpose,
      timestamp,
      parameters,
      baseStats: new Map(Object.entries(this._baseStats)),
      currentStats: this.getCurrentStats(),
      activeEffects: Array.from(this._effects.values())
    };
    
    // Collect all potential providers (gear + value providers + active effects)
    const providers: Array<{ provider: ValueProvider | Gear | ActiveEffect; priority: number; type: string }> = [];
    
    // Add equipped gear
    for (const gear of this._equippedGear.values()) {
      if (gear.canHandlePurpose(purpose) && gear.isEquipped(context)) {
        providers.push({ provider: gear, priority: gear.priority, type: 'gear' });
      }
    }
    
    // Add value providers
    for (const provider of this._valueProviders.values()) {
      if (provider.canHandlePurpose(purpose) && provider.isActive(context)) {
        providers.push({ provider, priority: provider.priority, type: 'provider' });
      }
    }
    
    // Add active effects
    for (const effect of this._effects.values()) {
      if (this.isActiveEffect(effect) && effect.supportedPurposes?.includes(purpose)) {
        const activeEffect = effect as ActiveEffect;
        if (activeEffect.isActiveForPurpose?.(purpose, context) !== false) {
          providers.push({ provider: activeEffect, priority: effect.priority, type: 'effect' });
        }
      }
    }
    
    // Sort by priority (highest first)
    providers.sort((a, b) => b.priority - a.priority);
    
    // Try each provider until one provides a value
    for (const { provider, type } of providers) {
      let value: StatValue | undefined;
      
      if (type === 'gear') {
        value = (provider as Gear).provideValue(purpose, context);
      } else if (type === 'provider') {
        value = (provider as ValueProvider).provideValue(purpose, context);
      } else if (type === 'effect') {
        value = (provider as ActiveEffect).provideValue?.(purpose, context);
      }
      
      if (value !== undefined) {
        return {
          value,
          provider: provider.id,
          purpose,
          timestamp,
          context
        };
      }
    }
    
    return undefined; // No provider could handle the request
  }
  
  /**
   * Check if an effect is an active effect
   */
  private isActiveEffect(effect: Effect): effect is ActiveEffect {
    return 'supportedPurposes' in effect && Array.isArray(effect.supportedPurposes);
  }
  
  /**
   * Register a value provider
   */
  registerValueProvider(provider: ValueProvider): void {
    this._valueProviders.set(provider.id, provider);
    
    this.emitEvent({
      type: EventType.CUSTOM_EVENT,
      timestamp: Date.now(),
      data: { 
        type: 'value_provider_registered',
        entityId: this._id,
        providerId: provider.id,
        providerName: provider.name
      }
    });
  }
  
  /**
   * Unregister a value provider
   */
  unregisterValueProvider(providerId: string): boolean {
    const removed = this._valueProviders.delete(providerId);
    
    if (removed) {
      this.emitEvent({
        type: EventType.CUSTOM_EVENT,
        timestamp: Date.now(),
        data: { 
          type: 'value_provider_unregistered',
          entityId: this._id,
          providerId
        }
      });
    }
    
    return removed;
  }
  
  /**
   * Equip gear in a specific slot
   */
  equipGear(gear: Gear, slot?: string): void {
    const gearSlot = slot || gear.slot || 'default';
    this._equippedGear.set(gearSlot, gear);

    // Apply passive effects from the gear
    if (gear.hasPassiveEffects()) {
      const passiveEffects = gear.getPassiveEffects();
      for (const effect of passiveEffects) {
        this.addEffect(effect);
      }
    }

    this.emitEvent({
      type: EventType.GEAR_EQUIPPED,
      timestamp: Date.now(),
      data: {
        entityId: this._id,
        gearId: gear.id,
        gearName: gear.name,
        slot: gearSlot,
        passiveEffectsApplied: gear.hasPassiveEffects() ? gear.getPassiveEffects().length : 0
      }
    });
  }
  
  /**
   * Unequip gear from a specific slot
   */
  unequipGear(slot: string): Gear | undefined {
    const gear = this._equippedGear.get(slot);
    if (gear) {
      this._equippedGear.delete(slot);

      // Remove passive effects from the gear
      if (gear.hasPassiveEffects()) {
        const passiveEffects = gear.getPassiveEffects();
        for (const effect of passiveEffects) {
          this.removeEffect(effect.id);
        }
      }

      this.emitEvent({
        type: EventType.GEAR_UNEQUIPPED,
        timestamp: Date.now(),
        data: {
          entityId: this._id,
          gearId: gear.id,
          gearName: gear.name,
          slot,
          passiveEffectsRemoved: gear.hasPassiveEffects() ? gear.getPassiveEffects().length : 0
        }
      });
    }

    return gear;
  }
  
  /**
   * Get equipped gear by slot
   */
  getEquippedGear(slot: string): Gear | undefined {
    return this._equippedGear.get(slot);
  }
  
  /**
   * Get all equipped gear
   */
  getAllEquippedGear(): Map<string, Gear> {
    return new Map(this._equippedGear);
  }
  
  /**
   * Get all value providers
   */
  getAllValueProviders(): Map<string, ValueProvider> {
    return new Map(this._valueProviders);
  }

  /**
   * Register an interaction modifier
   */
  registerInteractionModifier(modifier: InteractionModifier): void {
    this._interactionModifiers.set(modifier.id, modifier);

    this.emitEvent({
      type: EventType.CUSTOM_EVENT,
      timestamp: Date.now(),
      data: {
        type: 'interaction_modifier_registered',
        entityId: this._id,
        modifierId: modifier.id,
        modifierName: modifier.name
      }
    });
  }

  /**
   * Unregister an interaction modifier
   */
  unregisterInteractionModifier(modifierId: string): boolean {
    const removed = this._interactionModifiers.delete(modifierId);

    if (removed) {
      this.emitEvent({
        type: EventType.CUSTOM_EVENT,
        timestamp: Date.now(),
        data: {
          type: 'interaction_modifier_unregistered',
          entityId: this._id,
          modifierId
        }
      });
    }

    return removed;
  }

  /**
   * Register a state adjuster
   */
  registerStateAdjuster(adjuster: StateAdjuster): void {
    this._stateAdjusters.set(adjuster.id, adjuster);

    this.emitEvent({
      type: EventType.CUSTOM_EVENT,
      timestamp: Date.now(),
      data: {
        type: 'state_adjuster_registered',
        entityId: this._id,
        adjusterId: adjuster.id,
        adjusterName: adjuster.name
      }
    });
  }

  /**
   * Unregister a state adjuster
   */
  unregisterStateAdjuster(adjusterId: string): boolean {
    const removed = this._stateAdjusters.delete(adjusterId);

    if (removed) {
      this.emitEvent({
        type: EventType.CUSTOM_EVENT,
        timestamp: Date.now(),
        data: {
          type: 'state_adjuster_unregistered',
          entityId: this._id,
          adjusterId
        }
      });
    }

    return removed;
  }

  /**
   * Register an interaction notifier
   */
  registerInteractionNotifier(notifier: InteractionNotifier): void {
    this._interactionNotifiers.set(notifier.id, notifier);

    this.emitEvent({
      type: EventType.CUSTOM_EVENT,
      timestamp: Date.now(),
      data: {
        type: 'interaction_notifier_registered',
        entityId: this._id,
        notifierId: notifier.id,
        notifierName: notifier.name
      }
    });
  }

  /**
   * Unregister an interaction notifier
   */
  unregisterInteractionNotifier(notifierId: string): boolean {
    const removed = this._interactionNotifiers.delete(notifierId);

    if (removed) {
      this.emitEvent({
        type: EventType.CUSTOM_EVENT,
        timestamp: Date.now(),
        data: {
          type: 'interaction_notifier_unregistered',
          entityId: this._id,
          notifierId
        }
      });
    }

    return removed;
  }

  /**
   * Get all interaction modifiers
   */
  getAllInteractionModifiers(): Map<string, InteractionModifier> {
    return new Map(this._interactionModifiers);
  }

  /**
   * Get all state adjusters
   */
  getAllStateAdjusters(): Map<string, StateAdjuster> {
    return new Map(this._stateAdjusters);
  }

  /**
   * Get all interaction notifiers
   */
  getAllInteractionNotifiers(): Map<string, InteractionNotifier> {
    return new Map(this._interactionNotifiers);
  }

  /**
   * Set a stat value (for state adjustments)
   */
  setStat(statType: StatType, value: StatValue): void {
    this._baseStats[statType] = value;
    
    // Clear cache for this stat
    this._statsCache.clear();
    
    this.emitEvent({
      type: EventType.STAT_CHANGED,
      timestamp: Date.now(),
      data: {
        entityId: this._id,
        statType,
        value,
        previousValue: this._baseStats[statType]
      }
    });
    
    // Check and emit bound events
    this.checkAndEmitBoundEvents();
  }
  
  
  
  
  
  /**
   * Cache management
   */
  private getCacheKey(): string {
    const effectIds = Array.from(this._effects.keys()).sort().join(',');
    return `${this._id}:${effectIds}`;
  }
  
  private isCacheValid(entry: StatsCacheEntry | EffectCacheEntry): boolean {
    const now = Date.now();
    const maxAge = 1000; // 1 second cache validity
    return (now - entry.timestamp) < maxAge;
  }
  
  private cacheStats(stats: StatMap, effectIds: EffectId[]): void {
    const cacheKey = this.getCacheKey();
    this._statsCache.set(cacheKey, {
      stats: new Map(stats),
      timestamp: Date.now(),
      effectIds
    });
  }
  
  private invalidateCache(): void {
    this._statsCache.clear();
    this._effectCache.clear();
    this._lastCalculationTime = Date.now();
  }
  
  /**
   * Event emission through the event system
   */
  private emitEvent(event: Event): void {
    eventSystem.emit(event);
  }
  
  // ===== Stat Bound Methods =====
  
  /**
   * Calculate stat bounds for a specific stat type
   * @param statType - The stat type to calculate bounds for
   * @param config - Configuration for the bound calculation
   * @returns The calculated bound result
   */
  calculateStatBounds(statType: StatType, config: StatBoundConfig): StatBoundResult {
    const currentStats = this.getCurrentStats();
    return StatBoundCalculator.calculateBounds(statType, config, currentStats);
  }
  
  /**
   * Calculate multiple stat bounds at once
   * @param configs - Map of stat type to bound configuration
   * @returns Map of stat type to bound result
   */
  calculateMultipleStatBounds(configs: Map<StatType, StatBoundConfig>): Map<StatType, StatBoundResult> {
    const currentStats = this.getCurrentStats();
    return StatBoundCalculator.calculateMultipleBounds(configs, currentStats);
  }
  
  /**
   * Get a stat bound with simple configuration
   * @param statType - The stat type to get bounds for
   * @param min - Minimum bound (default: 0)
   * @param max - Maximum bound (default: 100)
   * @param clampToBounds - Whether to clamp values to bounds (default: false)
   * @returns The calculated bound result
   */
  getStatBounds(
    statType: StatType,
    min: number = 0,
    max: number = 100,
    clampToBounds: boolean = false
  ): StatBoundResult {
    const config = StatBoundCalculator.createSimpleBoundConfig(min, max, clampToBounds);
    return this.calculateStatBounds(statType, config);
  }
  
  /**
   * Get a stat bound with stat-based configuration
   * @param statType - The stat type to get bounds for
   * @param minStat - Stat to use as minimum bound
   * @param maxStat - Stat to use as maximum bound
   * @param clampToBounds - Whether to clamp values to bounds (default: false)
   * @returns The calculated bound result
   */
  getStatBasedBounds(
    statType: StatType,
    minStat: StatType,
    maxStat: StatType,
    clampToBounds: boolean = false
  ): StatBoundResult {
    const config = StatBoundCalculator.createStatBasedBoundConfig(minStat, maxStat, clampToBounds);
    return this.calculateStatBounds(statType, config);
  }
  
  /**
   * Get ratio of a stat within its bounds
   * @param statType - The stat type to get ratio for
   * @param config - Bound configuration
   * @returns Ratio value (0.0-1.0)
   */
  getStatRatioFromBounds(statType: StatType, config: StatBoundConfig): number {
    const result = this.calculateStatBounds(statType, config);
    return StatBoundCalculator.calculateRatio(result);
  }
  
  /**
   * Get percentage of a stat within its bounds
   * @param statType - The stat type to get percentage for
   * @param config - Bound configuration
   * @returns Percentage value (0-100)
   */
  getStatPercentageFromBounds(statType: StatType, config: StatBoundConfig): number {
    const result = this.calculateStatBounds(statType, config);
    return StatBoundCalculator.calculatePercentage(result);
  }
  
  /**
   * Check if a stat is at its minimum bound
   * @param statType - The stat type to check
   * @param config - Bound configuration
   * @param tolerance - Tolerance for equality check (default: 0.001)
   * @returns true if stat is at minimum bound
   */
  isStatAtMin(statType: StatType, config: StatBoundConfig, tolerance: number = 0.001): boolean {
    const result = this.calculateStatBounds(statType, config);
    return StatBoundCalculator.isAtMin(result, tolerance);
  }
  
  /**
   * Check if a stat is at its maximum bound
   * @param statType - The stat type to check
   * @param config - Bound configuration
   * @param tolerance - Tolerance for equality check (default: 0.001)
   * @returns true if stat is at maximum bound
   */
  isStatAtMax(statType: StatType, config: StatBoundConfig, tolerance: number = 0.001): boolean {
    const result = this.calculateStatBounds(statType, config);
    return StatBoundCalculator.isAtMax(result, tolerance);
  }
  
  /**
   * Check if a stat is within its bounds
   * @param statType - The stat type to check
   * @param config - Bound configuration
   * @param tolerance - Tolerance for bounds check (default: 0.001)
   * @returns true if stat is within bounds
   */
  isStatWithinBounds(statType: StatType, config: StatBoundConfig, tolerance: number = 0.001): boolean {
    const result = this.calculateStatBounds(statType, config);
    return StatBoundCalculator.isWithinBounds(result, tolerance);
  }
  
  // ===== Bound Event Management =====
  
  /**
   * Register a bound event configuration for a stat type
   * @param config - Bound event configuration
   */
  registerBoundEventConfig(config: BoundEventConfig): void {
    this._boundEventConfigs.set(config.statType, config);
  }
  
  /**
   * Unregister a bound event configuration for a stat type
   * @param statType - The stat type to unregister
   */
  unregisterBoundEventConfig(statType: StatType): void {
    this._boundEventConfigs.delete(statType);
    this._previousBoundStates.delete(statType);
    this._previousBoundRatios.delete(statType);
  }
  
  /**
   * Get all registered bound event configurations
   * @returns Map of stat type to bound event configuration
   */
  getBoundEventConfigs(): Map<StatType, BoundEventConfig> {
    return new Map(this._boundEventConfigs);
  }
  
  /**
   * Check and emit bound events for all registered stat types
   * This should be called whenever stats change
   */
  checkAndEmitBoundEvents(): void {
    const currentStats = this.getCurrentStats();
    
    for (const [statType, config] of this._boundEventConfigs) {
      this.checkAndEmitBoundEventsForStat(statType, config, currentStats);
    }
  }
  
  /**
   * Check and emit bound events for a specific stat type
   * @param statType - The stat type to check
   * @param config - The bound event configuration
   * @param currentStats - Current entity stats
   */
  private checkAndEmitBoundEventsForStat(
    statType: StatType, 
    config: BoundEventConfig, 
    currentStats: StatMap
  ): void {
    const boundResult = StatBoundCalculator.calculateBounds(statType, config.boundConfig, currentStats);
    const currentRatio = StatBoundCalculator.calculateRatio(boundResult);
    const currentState = StatBoundCalculator.getStateDescription(
      boundResult, 
      config.thresholdConfig ?? DEFAULT_BOUND_THRESHOLDS
    );
    
    const previousRatio = this._previousBoundRatios.get(statType);
    const previousState = this._previousBoundStates.get(statType);
    
    // Calculate changes
    const ratioChange = previousRatio !== undefined ? currentRatio - previousRatio : undefined;
    const stateChanged = previousState !== currentState;
    const ratioChanged = previousRatio !== undefined && Math.abs(currentRatio - previousRatio) > 0.001;
    
    // Create event data
    const eventData: BoundEventData = {
      statType,
      boundResult,
      previousRatio,
      ratioChange,
      previousState,
      currentState,
      distanceFromMin: StatBoundCalculator.calculateDistanceFromMin(boundResult),
      distanceFromMax: StatBoundCalculator.calculateDistanceFromMax(boundResult),
      isAtMin: StatBoundCalculator.isAtMin(boundResult),
      isAtMax: StatBoundCalculator.isAtMax(boundResult),
      isWithinBounds: StatBoundCalculator.isWithinBounds(boundResult)
    };
    
    // Emit events based on changes
    if (stateChanged) {
      this.emitEvent({
        type: EventType.BOUND_STATE_CHANGED,
        timestamp: Date.now(),
        data: eventData
      });
    }
    
    if (ratioChanged && this.shouldEmitRatioChangeEvent(eventData, config)) {
      this.emitEvent({
        type: EventType.BOUND_RATIO_CHANGED,
        timestamp: Date.now(),
        data: eventData
      });
    }
    
    if (this.shouldEmitThresholdCrossedEvent(eventData, config)) {
      this.emitEvent({
        type: EventType.BOUND_THRESHOLD_CROSSED,
        timestamp: Date.now(),
        data: eventData
      });
    }
    
    // Update previous values
    this._previousBoundRatios.set(statType, currentRatio);
    this._previousBoundStates.set(statType, currentState);
  }
  
  /**
   * Check if a ratio change event should be emitted
   * @param eventData - The bound event data
   * @param config - The bound event configuration
   * @returns true if event should be emitted
   */
  private shouldEmitRatioChangeEvent(eventData: BoundEventData, config: BoundEventConfig): boolean {
    if (!eventData.ratioChange) return false;
    
    // Check ratio change threshold
    if (config.ratioChangeThreshold) {
      const absChange = Math.abs(eventData.ratioChange);
      if (absChange < config.ratioChangeThreshold) {
        return false;
      }
    }
    
    // Check positive/negative change filters
    if (config.positiveChangeOnly && eventData.ratioChange <= 0) {
      return false;
    }
    
    if (config.negativeChangeOnly && eventData.ratioChange >= 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if a threshold crossed event should be emitted
   * @param eventData - The bound event data
   * @param config - The bound event configuration
   * @returns true if event should be emitted
   */
  private shouldEmitThresholdCrossedEvent(eventData: BoundEventData, config: BoundEventConfig): boolean {
    // Check distance from bounds
    if (config.minDistanceFromMin && eventData.distanceFromMin < config.minDistanceFromMin) {
      return false;
    }
    
    if (config.minDistanceFromMax && eventData.distanceFromMax < config.minDistanceFromMax) {
      return false;
    }
    
    if (config.maxDistanceFromMin && eventData.distanceFromMin > config.maxDistanceFromMin) {
      return false;
    }
    
    if (config.maxDistanceFromMax && eventData.distanceFromMax > config.maxDistanceFromMax) {
      return false;
    }
    
    return true;
  }
}
