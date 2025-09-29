import {
  EffectContext,
  StatType,
  StatValue,
  EffectApplicability,
  EffectImpact,
  EffectTarget,
  EffectApplication,
  StatMap,
  StatBoundConfig,
  StatBoundResult,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS
} from './types';
import { StatBoundCalculator } from './StatBoundCalculator';

// ===== Applicability Components =====

/**
 * Always applicable
 */
export class AlwaysApplicable implements EffectApplicability {
  isApplicable(context: EffectContext): boolean {
    return true;
  }
}

/**
 * Applicable based on a custom condition function
 */
export class ConditionalApplicable implements EffectApplicability {
  constructor(private readonly condition: (context: EffectContext) => boolean) {}

  isApplicable(context: EffectContext): boolean {
    return this.condition(context);
  }
}

/**
 * Applicable based on bound conditions
 */
export class BoundBasedApplicable implements EffectApplicability {
  constructor(
    private readonly statType: StatType,
    private readonly boundConfig: StatBoundConfig,
    private readonly condition: (ratio: number, boundResult: StatBoundResult) => boolean,
    private readonly thresholdConfig: BoundThresholdConfig = DEFAULT_BOUND_THRESHOLDS
  ) {}

  isApplicable(context: EffectContext): boolean {
    const boundResult = StatBoundCalculator.calculateBounds(this.statType, this.boundConfig, context.currentStats);
    const ratio = StatBoundCalculator.calculateRatio(boundResult);
    return this.condition(ratio, boundResult);
  }
}

/**
 * Applicable based on stat thresholds
 */
export class StatThresholdApplicable implements EffectApplicability {
  constructor(
    private readonly statType: StatType,
    private readonly operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
    private readonly threshold: StatValue
  ) {}

  isApplicable(context: EffectContext): boolean {
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
  }
}

/**
 * Applicable based on bound state
 */
export class BoundStateApplicable implements EffectApplicability {
  constructor(
    private readonly statType: StatType,
    private readonly boundConfig: StatBoundConfig,
    private readonly allowedStates: string[],
    private readonly thresholdConfig: BoundThresholdConfig = DEFAULT_BOUND_THRESHOLDS
  ) {}

  isApplicable(context: EffectContext): boolean {
    const boundResult = StatBoundCalculator.calculateBounds(this.statType, this.boundConfig, context.currentStats);
    const state = StatBoundCalculator.getStateDescription(boundResult, this.thresholdConfig);
    return this.allowedStates.includes(state);
  }
}

// ===== Impact Components =====

/**
 * Fixed additive impact
 */
export class AdditiveImpact implements EffectImpact {
  constructor(private readonly value: StatValue) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    return this.value;
  }
}

/**
 * Fixed multiplicative impact
 */
export class MultiplicativeImpact implements EffectImpact {
  constructor(private readonly factor: StatValue) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const current = context.currentStats.get(statType) ?? 0;
    return current * (this.factor - 1); // Return the difference
  }
}

/**
 * Percentage-based impact
 */
export class PercentageImpact implements EffectImpact {
  constructor(private readonly percentage: StatValue) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const current = context.currentStats.get(statType) ?? 0;
    return current * this.percentage;
  }
}

/**
 * Bound-based impact
 */
export class BoundBasedImpact implements EffectImpact {
  constructor(
    private readonly boundStatType: StatType,
    private readonly boundConfig: StatBoundConfig,
    private readonly impactFn: (ratio: number, boundResult: StatBoundResult) => StatValue
  ) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const boundResult = StatBoundCalculator.calculateBounds(this.boundStatType, this.boundConfig, context.currentStats);
    const ratio = StatBoundCalculator.calculateRatio(boundResult);
    return this.impactFn(ratio, boundResult);
  }
}

/**
 * Stat-based impact (based on another stat's value)
 */
export class StatBasedImpact implements EffectImpact {
  constructor(
    private readonly sourceStatType: StatType,
    private readonly multiplier: StatValue = 1.0
  ) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const sourceValue = context.currentStats.get(this.sourceStatType) ?? 0;
    return sourceValue * this.multiplier;
  }
}

/**
 * Function-based impact
 */
export class FunctionBasedImpact implements EffectImpact {
  constructor(private readonly impactFn: (context: EffectContext, statType: StatType) => StatValue) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    return this.impactFn(context, statType);
  }
}

// ===== Target Components =====

/**
 * Single stat target
 */
export class SingleStatTarget implements EffectTarget {
  constructor(private readonly statType: StatType) {}

  getTargets(context: EffectContext): StatType[] {
    return [this.statType];
  }
}

/**
 * Multiple stat targets
 */
export class MultipleStatTarget implements EffectTarget {
  constructor(private readonly statTypes: StatType[]) {}

  getTargets(context: EffectContext): StatType[] {
    return [...this.statTypes];
  }
}

/**
 * Conditional stat targets
 */
export class ConditionalStatTarget implements EffectTarget {
  constructor(
    private readonly condition: (context: EffectContext) => StatType[],
    private readonly fallback: StatType[] = []
  ) {}

  getTargets(context: EffectContext): StatType[] {
    try {
      return this.condition(context);
    } catch {
      return this.fallback;
    }
  }
}

/**
 * Bound-based stat targets
 */
export class BoundBasedStatTarget implements EffectTarget {
  constructor(
    private readonly boundStatType: StatType,
    private readonly boundConfig: StatBoundConfig,
    private readonly targetFn: (ratio: number, boundResult: StatBoundResult) => StatType[],
    private readonly fallback: StatType[] = []
  ) {}

  getTargets(context: EffectContext): StatType[] {
    try {
      const boundResult = StatBoundCalculator.calculateBounds(this.boundStatType, this.boundConfig, context.currentStats);
      const ratio = StatBoundCalculator.calculateRatio(boundResult);
      return this.targetFn(ratio, boundResult);
    } catch {
      return this.fallback;
    }
  }
}

// ===== Application Components =====

/**
 * Additive application (adds impact to current value)
 */
export class AdditiveApplication implements EffectApplication {
  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    stats.set(statType, current + impact);
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    stats.set(statType, current - impact);
  }
}

/**
 * Multiplicative application (multiplies current value)
 */
export class MultiplicativeApplication implements EffectApplication {
  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    const factor = 1 + (impact / current); // Convert impact to factor
    stats.set(statType, current * factor);
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    const factor = 1 - (impact / current); // Convert impact to factor
    stats.set(statType, current * factor);
  }
}

/**
 * Set value application (sets to specific value)
 */
export class SetValueApplication implements EffectApplication {
  constructor(private readonly baseValue: StatValue) {}

  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    stats.set(statType, this.baseValue + impact);
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    stats.set(statType, this.baseValue);
  }
}

/**
 * Percentage application (adds percentage of current value)
 */
export class PercentageApplication implements EffectApplication {
  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    stats.set(statType, current + (current * impact));
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const current = stats.get(statType) ?? 0;
    stats.set(statType, current - (current * impact));
  }
}

/**
 * Function-based application
 */
export class FunctionBasedApplication implements EffectApplication {
  constructor(
    private readonly applyFn: (context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue) => void,
    private readonly reverseFn: (context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue) => void
  ) {}

  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    this.applyFn(context, stats, statType, impact);
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    this.reverseFn(context, stats, statType, impact);
  }
}

// ===== RNG-Specific Components =====

/**
 * RNG-based applicability (chance-based)
 */
export class RNGApplicable implements EffectApplicability {
  constructor(
    private readonly probability: number,
    private readonly rng: any = null // Will be injected from context
  ) {}

  isApplicable(context: EffectContext): boolean {
    // Get RNG from instance or use default
    const rng = this.rng || require('./RNG').rngManager.getDefaultGenerator();
    return rng.chance(this.probability);
  }
}

/**
 * Random impact based on range and distribution
 */
export class RandomImpact implements EffectImpact {
  constructor(
    private readonly range: { min: number; max: number },
    private readonly distribution: 'uniform' | 'gaussian' = 'uniform',
    private readonly gaussianParams?: { mean: number; standardDeviation: number },
    private readonly rng: any = null
  ) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const rng = this.rng || null || require('./RNG').rngManager.getDefaultGenerator();
    
    if (this.distribution === 'gaussian' && this.gaussianParams) {
      const gaussianRNG = require('./RNG').rngManager.getGenerator('gaussian');
      if (gaussianRNG && typeof gaussianRNG.gaussianInRange === 'function') {
        return gaussianRNG.gaussianInRange(this.range, this.gaussianParams);
      }
    }
    
    return rng.randomFloat(this.range.min, this.range.max);
  }
}

/**
 * Weighted random impact
 */
export class WeightedRandomImpact implements EffectImpact {
  constructor(
    private readonly choices: Array<{ value: { statType: StatType; value: StatValue }; weight: number }>,
    private readonly rng: any = null
  ) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    const rng = this.rng || null || require('./RNG').rngManager.getDefaultGenerator();
    
    // Find the choice that matches the target stat type
    const relevantChoices = this.choices.filter(choice => choice.value.statType === statType);
    if (relevantChoices.length === 0) return 0;
    
    const weightedRNG = require('./RNG').rngManager.getGenerator('weighted');
    let selectedChoice;
    
    if (weightedRNG && typeof weightedRNG.weightedChoice === 'function') {
      selectedChoice = weightedRNG.weightedChoice(relevantChoices);
    } else {
      // Fallback to simple random selection
      const totalWeight = relevantChoices.reduce((sum, choice) => sum + choice.weight, 0);
      let randomValue = rng.random() * totalWeight;
      
      for (const choice of relevantChoices) {
        randomValue -= choice.weight;
        if (randomValue <= 0) {
          selectedChoice = choice;
          break;
        }
      }
    }
    
    return selectedChoice ? selectedChoice.value.value : 0;
  }
}

/**
 * Conditional random impact
 */
export class ConditionalRandomImpact implements EffectImpact {
  constructor(
    private readonly condition: (context: EffectContext) => boolean,
    private readonly impactIfTrue: StatValue,
    private readonly impactIfFalse: StatValue = 0
  ) {}

  calculateImpact(context: EffectContext, statType: StatType): StatValue {
    return this.condition(context) ? this.impactIfTrue : this.impactIfFalse;
  }
}

/**
 * RNG-based target selection
 */
export class RNGTarget implements EffectTarget {
  constructor(
    private readonly choices: Array<{ statTypes: StatType[]; weight: number }>,
    private readonly rng: any = null
  ) {}

  getTargets(context: EffectContext): StatType[] {
    const rng = this.rng || null || require('./RNG').rngManager.getDefaultGenerator();
    
    const weightedRNG = require('./RNG').rngManager.getGenerator('weighted');
    let selectedChoice;
    
    if (weightedRNG && typeof weightedRNG.weightedChoice === 'function') {
      selectedChoice = weightedRNG.weightedChoice(this.choices);
    } else {
      // Fallback to simple random selection
      const totalWeight = this.choices.reduce((sum, choice) => sum + choice.weight, 0);
      let randomValue = rng.random() * totalWeight;
      
      for (const choice of this.choices) {
        randomValue -= choice.weight;
        if (randomValue <= 0) {
          selectedChoice = choice;
          break;
        }
      }
    }
    
    return selectedChoice ? selectedChoice.statTypes : [];
  }
}

/**
 * Chance-based application (only applies if chance succeeds)
 */
export class ChanceBasedApplication implements EffectApplication {
  constructor(
    private readonly probability: number,
    private readonly baseApplication: EffectApplication,
    private readonly rng: any = null
  ) {}

  applyImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const rng = this.rng || null || require('./RNG').rngManager.getDefaultGenerator();
    if (rng.chance(this.probability)) {
      this.baseApplication.applyImpact(context, stats, statType, impact);
    }
  }

  reverseImpact(context: EffectContext, stats: StatMap, statType: StatType, impact: StatValue): void {
    const rng = this.rng || null || require('./RNG').rngManager.getDefaultGenerator();
    if (rng.chance(this.probability)) {
      this.baseApplication.reverseImpact(context, stats, statType, impact);
    }
  }
}
