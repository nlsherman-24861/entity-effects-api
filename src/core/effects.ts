import { 
  Effect, 
  EffectId, 
  EffectContext, 
  StatType, 
  StatValue,
  StatStackability,
  StatBoundConfig,
  StatBoundResult,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS
} from './types';
import { StatBoundCalculator } from './StatBoundCalculator';

/**
 * Abstract base class for effects with per-stat-type stackability
 */
export abstract class BaseEffect implements Effect {
  constructor(
    public readonly id: EffectId,
    public readonly name: string,
    public readonly priority: number = 0,
    public readonly statTypes: StatType[],
    public readonly stackabilityRules: StatStackability[]
  ) {}
  
  abstract apply(context: EffectContext, stats: Map<StatType, StatValue>): void;
  abstract reverse(context: EffectContext, stats: Map<StatType, StatValue>): void;
  
  isActive(context: EffectContext): boolean {
    return true; // Override in subclasses for conditional effects
  }
  
  canStackWith(otherEffect: Effect, statType: StatType): boolean {
    const myRule = this.stackabilityRules.find(rule => rule.statType === statType);
    const otherRule = otherEffect.stackabilityRules.find(rule => rule.statType === statType);
    
    if (!myRule || !otherRule) return true; // Default to stackable if no rules
    
    return myRule.stackable && otherRule.stackable;
  }
}

/**
 * Effect that adds a flat value to a stat
 */
export class AdditiveEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly value: StatValue,
    stackable: boolean = true,
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      [statType], 
      [{ statType, stackable }]
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    stats.set(this.statType, current + this.value);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    stats.set(this.statType, current - this.value);
  }
}

/**
 * Effect that multiplies a stat by a factor
 */
export class MultiplicativeEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly factor: StatValue,
    stackable: boolean = true,
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      [statType], 
      [{ statType, stackable }]
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    stats.set(this.statType, current * this.factor);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    stats.set(this.statType, current / this.factor);
  }
}

/**
 * Effect that sets a stat to a specific value (non-stackable)
 */
export class SetValueEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly value: StatValue,
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      [statType], 
      [{ statType, stackable: false }] // Set effects are never stackable
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    stats.set(this.statType, this.value);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // For set effects, we need to restore the previous value
    // This is complex and might require storing previous values
    const baseValue = context.baseStats[this.statType] ?? 0;
    stats.set(this.statType, baseValue);
  }
}

/**
 * Effect that applies a percentage bonus to a stat
 */
export class PercentageEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly percentage: StatValue, // e.g., 0.1 for 10% bonus
    stackable: boolean = true,
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      [statType], 
      [{ statType, stackable }]
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    const bonus = current * this.percentage;
    stats.set(this.statType, current + bonus);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const current = stats.get(this.statType) ?? 0;
    const bonus = current * this.percentage / (1 + this.percentage);
    stats.set(this.statType, current - bonus);
  }
}

/**
 * Conditional effect that only applies under certain conditions
 */
export class ConditionalEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly condition: (context: EffectContext) => boolean,
    private readonly effect: Effect,
    stackable: boolean = true,
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      effect.statTypes, 
      effect.stackabilityRules
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    if (this.condition(context)) {
      this.effect.apply(context, stats);
    }
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    if (this.condition(context)) {
      this.effect.reverse(context, stats);
    }
  }
  
  isActive(context: EffectContext): boolean {
    return this.condition(context);
  }
}

/**
 * Effect that cancels out other effects
 */
export class CancellationEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly targetEffectIds: EffectId[],
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      [], // Doesn't directly modify stats
      [] // No stackability rules needed
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // This effect doesn't directly modify stats
    // Instead, it prevents other effects from being applied
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // No-op
  }
  
  isActive(context: EffectContext): boolean {
    // Check if any of the target effects are present
    return this.targetEffectIds.some(targetId => 
      context.effectStack.some(effect => effect.id === targetId)
    );
  }
}

/**
 * Complex effect that can modify multiple stats based on complex logic
 */
export class ComplexEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly applyFn: (context: EffectContext, stats: Map<StatType, StatValue>) => void,
    private readonly reverseFn: (context: EffectContext, stats: Map<StatType, StatValue>) => void,
    private readonly conditionFn?: (context: EffectContext) => boolean,
    statTypes: StatType[] = [],
    stackabilityRules: StatStackability[] = [],
    priority: number = 0
  ) {
    super(id, name, priority, statTypes, stackabilityRules);
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    this.applyFn(context, stats);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    this.reverseFn(context, stats);
  }
  
  isActive(context: EffectContext): boolean {
    return this.conditionFn ? this.conditionFn(context) : true;
  }
}

// Note: Bound-based effects have been moved to the composition system
// Use EffectFactory.createBoundBasedEffect() instead
