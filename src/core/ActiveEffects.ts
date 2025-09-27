import {
  Effect,
  EffectId,
  EffectContext,
  StatType,
  StatValue,
  StatStackability,
  ActiveEffect,
  ValueRequestContext,
  ValueProvider,
  Gear
} from './types';
import { BaseEffect } from './effects';

/**
 * Base class for active effects that can respond to value requests
 */
export abstract class BaseActiveEffect extends BaseEffect implements ActiveEffect {
  constructor(
    id: EffectId,
    name: string,
    priority: number,
    statTypes: StatType[],
    stackabilityRules: StatStackability[],
    public readonly supportedPurposes: string[]
  ) {
    super(id, name, priority, statTypes, stackabilityRules);
  }

  abstract apply(context: EffectContext, stats: Map<StatType, StatValue>): void;
  abstract reverse(context: EffectContext, stats: Map<StatType, StatValue>): void;
  
  abstract provideValue?(purpose: string, context: ValueRequestContext): StatValue | undefined;
  
  isActiveForPurpose?(purpose: string, context: ValueRequestContext): boolean {
    return this.supportedPurposes.includes(purpose);
  }
}

/**
 * Generic gear implementation
 */
export class GenericGear implements Gear {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: string,
    public readonly priority: number,
    public readonly supportedPurposes: string[],
    private readonly valueCalculator: (purpose: string, context: ValueRequestContext) => StatValue | undefined,
    public readonly passiveEffects: Effect[] = [],
    public readonly slot?: string
  ) {}

  canHandlePurpose(purpose: string): boolean {
    return this.supportedPurposes.includes(purpose);
  }

  provideValue(purpose: string, context: ValueRequestContext): StatValue | undefined {
    if (!this.canHandlePurpose(purpose)) {
      return undefined;
    }

    return this.valueCalculator(purpose, context);
  }

  isEquipped(context: ValueRequestContext): boolean {
    return true; // Always equipped if in the entity's gear map
  }

  getPassiveEffects(): Effect[] {
    return [...this.passiveEffects];
  }

  hasPassiveEffects(): boolean {
    return this.passiveEffects.length > 0;
  }
}

/**
 * Value provider that uses base stats as fallback
 */
export class BaseStatValueProvider implements ValueProvider {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly priority: number,
    public readonly supportedPurposes: string[],
    private readonly statType: StatType,
    private readonly multiplier: number = 1.0
  ) {}

  canHandlePurpose(purpose: string): boolean {
    return this.supportedPurposes.includes(purpose);
  }

  provideValue(purpose: string, context: ValueRequestContext): StatValue | undefined {
    if (!this.canHandlePurpose(purpose)) {
      return undefined;
    }

    const statValue = context.baseStats.get(this.statType) || 0;
    return statValue * this.multiplier;
  }

  isActive(context: ValueRequestContext): boolean {
    return true; // Always active as fallback
  }
}

/**
 * Utility functions for creating active effects and gear
 */
export class ActiveEffectUtils {
  /**
   * Create a generic active effect
   */
  static createActiveEffect(
    id: EffectId,
    name: string,
    statTypes: StatType[],
    supportedPurposes: string[],
    valueCalculator: (purpose: string, context: ValueRequestContext) => StatValue | undefined,
    priority: number = 0,
    stackabilityRules: StatStackability[] = []
  ): BaseActiveEffect {
    return new (class extends BaseActiveEffect {
      apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
        // Generic active effects don't modify stats passively
      }

      reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
        // Generic active effects don't modify stats passively
      }

      provideValue(purpose: string, context: ValueRequestContext): StatValue | undefined {
        return valueCalculator(purpose, context);
      }
    })(id, name, priority, statTypes, stackabilityRules, supportedPurposes);
  }

  /**
   * Create a generic gear
   */
  static createGear(
    id: string,
    name: string,
    type: string,
    priority: number,
    supportedPurposes: string[],
    valueCalculator: (purpose: string, context: ValueRequestContext) => StatValue | undefined,
    passiveEffects: Effect[] = [],
    slot?: string
  ): GenericGear {
    return new GenericGear(id, name, type, priority, supportedPurposes, valueCalculator, passiveEffects, slot);
  }

  /**
   * Create a base stat value provider
   */
  static createBaseStatProvider(
    id: string,
    name: string,
    priority: number,
    supportedPurposes: string[],
    statType: StatType,
    multiplier: number = 1.0
  ): BaseStatValueProvider {
    return new BaseStatValueProvider(id, name, priority, supportedPurposes, statType, multiplier);
  }
}
