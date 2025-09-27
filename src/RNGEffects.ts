import { 
  Effect, 
  EffectId, 
  EffectContext, 
  StatType, 
  StatValue,
  StatStackability,
  EventType,
  Event,
  EntityId
} from './types';
import { 
  RNGGenerator, 
  WeightedChoice, 
  GaussianParams, 
  Range,
  ProbabilityConfig,
  rngManager
} from './RNG';
import { BaseEffect } from './effects';

/**
 * RNG-based effect that applies random stat modifications
 */
export class RandomEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly range: Range,
    private readonly distribution: 'uniform' | 'gaussian' = 'uniform',
    private readonly gaussianParams?: GaussianParams,
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator(),
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
    let randomValue: number;
    
    if (this.distribution === 'gaussian' && this.gaussianParams) {
      const gaussianRNG = rngManager.getGenerator('gaussian') as any;
      if (gaussianRNG && typeof gaussianRNG.gaussian === 'function') {
        randomValue = gaussianRNG.gaussianInRange(this.range, this.gaussianParams);
      } else {
        // Fallback to uniform if Gaussian RNG not available
        randomValue = this.rng.randomFloat(this.range.min, this.range.max);
      }
    } else {
      randomValue = this.rng.randomFloat(this.range.min, this.range.max);
    }
    
    const current = stats.get(this.statType) ?? 0;
    stats.set(this.statType, current + randomValue);
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // Note: This is a simplified reverse - in practice, you'd need to store the applied value
    const current = stats.get(this.statType) ?? 0;
    const averageValue = (this.range.min + this.range.max) / 2;
    stats.set(this.statType, current - averageValue);
  }
}

/**
 * Chance-based effect that applies modifications based on probability
 */
export class ChanceBasedEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly statType: StatType,
    private readonly probability: number,
    private readonly modifier: (baseValue: StatValue) => StatValue,
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator(),
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
    if (this.rng.chance(this.probability)) {
      const current = stats.get(this.statType) ?? 0;
      const modifiedValue = this.modifier(current);
      stats.set(this.statType, modifiedValue);
    }
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // Chance-based effects are typically not reversible
  }
}

/**
 * Weighted random effect that selects from multiple possible outcomes
 */
export class WeightedRandomEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly choices: WeightedChoice<{ statType: StatType; value: StatValue }>[],
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator(),
    stackable: boolean = true,
    priority: number = 0
  ) {
    const statTypes = choices.map(choice => choice.value.statType);
    super(
      id, 
      name, 
      priority, 
      statTypes, 
      statTypes.map(statType => ({ statType, stackable }))
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    const weightedRNG = rngManager.getGenerator('weighted') as any;
    let selectedChoice;
    
    if (weightedRNG && typeof weightedRNG.weightedChoice === 'function') {
      selectedChoice = weightedRNG.weightedChoice(this.choices);
    } else {
      // Fallback to simple random selection
      const totalWeight = this.choices.reduce((sum, choice) => sum + choice.weight, 0);
      let randomValue = this.rng.random() * totalWeight;
      
      for (const choice of this.choices) {
        randomValue -= choice.weight;
        if (randomValue <= 0) {
          selectedChoice = choice;
          break;
        }
      }
    }
    
    if (selectedChoice) {
      const { statType, value } = selectedChoice.value;
      const current = stats.get(statType) ?? 0;
      stats.set(statType, current + value);
    }
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // Note: This is simplified - in practice, you'd need to track what was applied
    for (const choice of this.choices) {
      const { statType, value } = choice.value;
      const current = stats.get(statType) ?? 0;
      stats.set(statType, current - value);
    }
  }
}

/**
 * Probability-based effect that applies different effects based on conditions
 */
export class ConditionalProbabilityEffect extends BaseEffect {
  constructor(
    id: EffectId,
    name: string,
    private readonly baseEffect: Effect,
    private readonly probabilityConfig: ProbabilityConfig,
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator(),
    priority: number = 0
  ) {
    super(
      id, 
      name, 
      priority, 
      baseEffect.statTypes, 
      baseEffect.stackabilityRules
    );
  }
  
  apply(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // Calculate final probability with modifiers
    let finalProbability = this.probabilityConfig.baseProbability;
    
    if (this.probabilityConfig.modifiers) {
      // This would need context about active conditions
      // For now, we'll use the base probability
      finalProbability = this.probabilityConfig.baseProbability;
    }
    
    if (this.rng.chance(finalProbability)) {
      this.baseEffect.apply(context, stats);
    }
  }
  
  reverse(context: EffectContext, stats: Map<StatType, StatValue>): void {
    // Only reverse if the effect was actually applied
    // This is simplified - in practice, you'd need to track application
    this.baseEffect.reverse(context, stats);
  }
}

/**
 * RNG-based effect applicator that triggers effects based on random events
 */
export class RandomEventApplicator {
  constructor(
    public readonly id: string,
    public readonly name: string,
    private readonly triggerProbability: number,
    private readonly effectsToAdd: Effect[],
    private readonly effectsToRemove: EffectId[],
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator()
  ) {}
  
  /**
   * Check if this applicator should trigger based on random chance
   */
  shouldTrigger(): boolean {
    return this.rng.chance(this.triggerProbability);
  }
  
  /**
   * Handle a random event for an entity
   */
  handleRandomEvent(entity: any): boolean {
    if (!this.shouldTrigger()) {
      return false;
    }
    
    let anyChanges = false;
    
    // Add effects
    for (const effect of this.effectsToAdd) {
      entity.addEffect(effect);
      anyChanges = true;
    }
    
    // Remove effects
    for (const effectId of this.effectsToRemove) {
      if (entity.removeEffect(effectId)) {
        anyChanges = true;
      }
    }
    
    return anyChanges;
  }
}

/**
 * Weighted selection generator for random choices
 */
export class WeightedSelectionGenerator<T> {
  constructor(
    private readonly choices: WeightedChoice<T>[],
    private readonly rng: RNGGenerator = rngManager.getDefaultGenerator()
  ) {}
  
  /**
   * Generate random selection from the weighted choices
   */
  select(): T | undefined {
    const weightedRNG = rngManager.getGenerator('weighted') as any;
    
    if (weightedRNG && typeof weightedRNG.weightedChoice === 'function') {
      return weightedRNG.weightedChoice(this.choices);
    } else {
      // Fallback to simple random selection
      const totalWeight = this.choices.reduce((sum, choice) => sum + choice.weight, 0);
      let randomValue = this.rng.random() * totalWeight;
      
      for (const choice of this.choices) {
        randomValue -= choice.weight;
        if (randomValue <= 0) {
          return choice.value;
        }
      }
      
      return undefined;
    }
  }
  
  /**
   * Generate multiple random selections
   */
  selectMultiple(count: number): T[] {
    const selections: T[] = [];
    
    for (let i = 0; i < count; i++) {
      const selection = this.select();
      if (selection !== undefined) {
        selections.push(selection);
      }
    }
    
    return selections;
  }
  
  /**
   * Generate selection with minimum weight threshold
   */
  selectWithMinimumWeight(minimumWeight: number): T | undefined {
    const filteredChoices = this.choices.filter(choice => choice.weight >= minimumWeight);
    
    if (filteredChoices.length === 0) {
      return this.select(); // Fallback to normal selection
    }
    
    const weightedRNG = rngManager.getGenerator('weighted') as any;
    
    if (weightedRNG && typeof weightedRNG.weightedChoice === 'function') {
      return weightedRNG.weightedChoice(filteredChoices);
    } else {
      // Fallback implementation
      const totalWeight = filteredChoices.reduce((sum, choice) => sum + choice.weight, 0);
      let randomValue = this.rng.random() * totalWeight;
      
      for (const choice of filteredChoices) {
        randomValue -= choice.weight;
        if (randomValue <= 0) {
          return choice.value;
        }
      }
      
      return undefined;
    }
  }
}

/**
 * Utility functions for RNG-based operations
 */
export class RNGEffectsUtils {
  /**
   * Create a random effect with uniform distribution
   */
  static createUniformRandomEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    minValue: number,
    maxValue: number,
    rng?: RNGGenerator
  ): RandomEffect {
    return new RandomEffect(
      id,
      name,
      statType,
      { min: minValue, max: maxValue },
      'uniform',
      undefined,
      rng
    );
  }
  
  /**
   * Create a random effect with Gaussian distribution
   */
  static createGaussianRandomEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    range: Range,
    mean: number,
    standardDeviation: number,
    rng?: RNGGenerator
  ): RandomEffect {
    return new RandomEffect(
      id,
      name,
      statType,
      range,
      'gaussian',
      { mean, standardDeviation },
      rng
    );
  }
  
  /**
   * Create a chance-based effect
   */
  static createChanceBasedEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    probability: number,
    modifier: (baseValue: StatValue) => StatValue,
    rng?: RNGGenerator
  ): ChanceBasedEffect {
    return new ChanceBasedEffect(
      id,
      name,
      statType,
      probability,
      modifier,
      rng
    );
  }
  
  /**
   * Create a weighted random effect
   */
  static createWeightedRandomEffect(
    id: EffectId,
    name: string,
    choices: WeightedChoice<{ statType: StatType; value: StatValue }>[],
    rng?: RNGGenerator
  ): WeightedRandomEffect {
    return new WeightedRandomEffect(id, name, choices, rng);
  }
}
