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

// Note: RNG-based effects have been moved to the composition system
// Use EffectFactory.createRandomEffect(), EffectFactory.createChanceBasedEffect(), etc.

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

// Note: RNGEffectsUtils has been moved to EffectFactory
// Use EffectFactory.createRandomEffect(), EffectFactory.createChanceBasedEffect(), etc.
