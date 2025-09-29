import {
  Effect,
  EffectId,
  StatType,
  StatValue,
  StatStackability,
  StatBoundConfig,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS
} from './types';
import { ComposedEffect, ComposedEffectBuilder } from './ComposedEffect';
import {
  AlwaysApplicable,
  ConditionalApplicable,
  BoundBasedApplicable,
  StatThresholdApplicable,
  BoundStateApplicable,
  AdditiveImpact,
  MultiplicativeImpact,
  PercentageImpact,
  BoundBasedImpact,
  StatBasedImpact,
  FunctionBasedImpact,
  SingleStatTarget,
  MultipleStatTarget,
  ConditionalStatTarget,
  BoundBasedStatTarget,
  AdditiveApplication,
  MultiplicativeApplication,
  SetValueApplication,
  PercentageApplication,
  FunctionBasedApplication,
  RNGApplicable,
  RandomImpact,
  WeightedRandomImpact,
  ConditionalRandomImpact,
  RNGTarget,
  ChanceBasedApplication
} from './EffectComponents';

/**
 * Factory for creating common composed effects
 */
export class EffectFactory {
  /**
   * Create a simple additive effect
   */
  static createAdditiveEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    value: StatValue,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new AdditiveImpact(value))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new AdditiveApplication())
      .build();
  }

  /**
   * Create a multiplicative effect
   */
  static createMultiplicativeEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    factor: StatValue,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new MultiplicativeImpact(factor))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new MultiplicativeApplication())
      .build();
  }

  /**
   * Create a percentage effect
   */
  static createPercentageEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    percentage: StatValue,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new PercentageImpact(percentage))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new PercentageApplication())
      .build();
  }

  /**
   * Create a set value effect
   */
  static createSetValueEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    value: StatValue,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable: false }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new AdditiveImpact(0)) // Impact is handled by application
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new SetValueApplication(value))
      .build();
  }

  /**
   * Create a conditional effect
   */
  static createConditionalEffect(
    id: EffectId,
    name: string,
    condition: (context: any) => boolean,
    effect: Effect,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(effect.statTypes)
      .withStackabilityRules(effect.stackabilityRules)
      .withApplicability(new ConditionalApplicable(condition))
      .withImpact(new FunctionBasedImpact((context, statType) => {
        // This is a wrapper - the actual effect will be applied
        return 0;
      }))
      .withTarget(new MultipleStatTarget(effect.statTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          if (condition(context)) {
            effect.apply(context, stats);
          }
        },
        (context, stats, statType, impact) => {
          if (condition(context)) {
            effect.reverse(context, stats);
          }
        }
      ))
      .build();
  }

  /**
   * Create a bound-based effect
   */
  static createBoundBasedEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    boundConfig: StatBoundConfig,
    impactFn: (ratio: number, boundResult: any) => StatValue,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new BoundBasedImpact(statType, boundConfig, impactFn))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new AdditiveApplication())
      .build();
  }

  /**
   * Create a bound-conditional effect
   */
  static createBoundConditionalEffect(
    id: EffectId,
    name: string,
    boundStatType: StatType,
    boundConfig: StatBoundConfig,
    condition: (ratio: number, boundResult: any) => boolean,
    effect: Effect,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(effect.statTypes)
      .withStackabilityRules(effect.stackabilityRules)
      .withApplicability(new BoundBasedApplicable(boundStatType, boundConfig, condition))
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(effect.statTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          effect.apply(context, stats);
        },
        (context, stats, statType, impact) => {
          effect.reverse(context, stats);
        }
      ))
      .build();
  }

  /**
   * Create a stat threshold effect
   */
  static createStatThresholdEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
    threshold: StatValue,
    effect: Effect,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(effect.statTypes)
      .withStackabilityRules(effect.stackabilityRules)
      .withApplicability(new StatThresholdApplicable(statType, operator, threshold))
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(effect.statTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          effect.apply(context, stats);
        },
        (context, stats, statType, impact) => {
          effect.reverse(context, stats);
        }
      ))
      .build();
  }

  /**
   * Create a bound state effect
   */
  static createBoundStateEffect(
    id: EffectId,
    name: string,
    boundStatType: StatType,
    boundConfig: StatBoundConfig,
    stateEffects: Map<string, Effect>,
    thresholdConfig: BoundThresholdConfig = DEFAULT_BOUND_THRESHOLDS,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    const allStatTypes = Array.from(new Set(
      Array.from(stateEffects.values()).flatMap(effect => effect.statTypes)
    ));

    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(allStatTypes)
      .withStackabilityRules(allStatTypes.map(statType => ({ statType, stackable })))
      .withApplicability(new AlwaysApplicable())
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(allStatTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          // This would need access to bound calculation - simplified for now
          // In practice, you'd want to calculate the state and apply the appropriate effect
        },
        (context, stats, statType, impact) => {
          // Reverse logic
        }
      ))
      .build();
  }

  /**
   * Create a complex effect with custom logic
   */
  static createComplexEffect(
    id: EffectId,
    name: string,
    applyFn: (context: any, stats: Map<StatType, StatValue>) => void,
    reverseFn: (context: any, stats: Map<StatType, StatValue>) => void,
    conditionFn?: (context: any) => boolean,
    statTypes: StatType[] = [],
    stackabilityRules: StatStackability[] = [],
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(statTypes)
      .withStackabilityRules(stackabilityRules)
      .withApplicability(conditionFn ? new ConditionalApplicable(conditionFn) : new AlwaysApplicable())
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(statTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          applyFn(context, stats);
        },
        (context, stats, statType, impact) => {
          reverseFn(context, stats);
        }
      ))
      .build();
  }

  // ===== RNG-Based Effects =====

  /**
   * Create a random effect with uniform distribution
   */
  static createRandomEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    minValue: number,
    maxValue: number,
    rng?: any,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new RandomImpact({ min: minValue, max: maxValue }, 'uniform', undefined, rng))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new AdditiveApplication())
      .build();
  }

  /**
   * Create a random effect with Gaussian distribution
   */
  static createGaussianRandomEffect(
    id: EffectId,
    name: string,
    statType: StatType,
    range: { min: number; max: number },
    mean: number,
    standardDeviation: number,
    rng?: any,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new RandomImpact(range, 'gaussian', { mean, standardDeviation }, rng))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new AdditiveApplication())
      .build();
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
    rng?: any,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes([statType])
      .withStackabilityRules([{ statType, stackable }])
      .withApplicability(new AlwaysApplicable())
      .withImpact(new FunctionBasedImpact((context, statType) => {
        const current = context.currentStats.get(statType) ?? 0;
        return modifier(current) - current; // Return the difference
      }))
      .withTarget(new SingleStatTarget(statType))
      .withApplication(new ChanceBasedApplication(probability, new SetValueApplication(0), rng))
      .build();
  }

  /**
   * Create a weighted random effect
   */
  static createWeightedRandomEffect(
    id: EffectId,
    name: string,
    choices: Array<{ value: { statType: StatType; value: StatValue }; weight: number }>,
    rng?: any,
    stackable: boolean = true,
    priority: number = 0
  ): Effect {
    const statTypes = choices.map(choice => choice.value.statType);
    
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(statTypes)
      .withStackabilityRules(statTypes.map(statType => ({ statType, stackable })))
      .withApplicability(new AlwaysApplicable())
      .withImpact(new WeightedRandomImpact(choices, rng))
      .withTarget(new MultipleStatTarget(statTypes))
      .withApplication(new AdditiveApplication())
      .build();
  }

  /**
   * Create a conditional probability effect
   */
  static createConditionalProbabilityEffect(
    id: EffectId,
    name: string,
    baseEffect: Effect,
    probability: number,
    rng?: any,
    priority: number = 0
  ): Effect {
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(baseEffect.statTypes)
      .withStackabilityRules(baseEffect.stackabilityRules)
      .withApplicability(new RNGApplicable(probability, rng))
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(baseEffect.statTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          baseEffect.apply(context, stats);
        },
        (context, stats, statType, impact) => {
          baseEffect.reverse(context, stats);
        }
      ))
      .build();
  }

  /**
   * Create a random event applicator effect
   */
  static createRandomEventEffect(
    id: EffectId,
    name: string,
    triggerProbability: number,
    effectsToAdd: Effect[],
    rng?: any,
    priority: number = 0
  ): Effect {
    const allStatTypes = Array.from(new Set(
      effectsToAdd.flatMap(effect => effect.statTypes)
    ));
    
    return new ComposedEffectBuilder(id, name)
      .withPriority(priority)
      .withStatTypes(allStatTypes)
      .withStackabilityRules(allStatTypes.map(statType => ({ statType, stackable: true })))
      .withApplicability(new RNGApplicable(triggerProbability, rng))
      .withImpact(new FunctionBasedImpact((context, statType) => 0))
      .withTarget(new MultipleStatTarget(allStatTypes))
      .withApplication(new FunctionBasedApplication(
        (context, stats, statType, impact) => {
          // This would need access to the entity to add effects
          // For now, this is a simplified version
        },
        (context, stats, statType, impact) => {
          // Reverse logic
        }
      ))
      .build();
  }
}
