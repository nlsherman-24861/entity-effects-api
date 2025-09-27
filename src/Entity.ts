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
  InteractionNotifier
} from './types';
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
}
