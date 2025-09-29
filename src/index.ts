// Pure barrel: export only core API (no example code)
export { Entity } from './core/Entity';
export { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect, 
  ConditionalEffect,
  ComplexEffect,
  BaseEffect 
} from './core/effects';
export { eventSystem, EventSystem } from './core/EventSystem';
export { FrameManager } from './core/FrameManager';
export { 
  OptimizedFrameContainer, 
  OptimizedFrameView, 
  FrameFactory 
} from './core/OptimizedFrameSystem';
export { 
  effectApplicatorManager,
  EffectApplicatorManager,
  BaseEffectApplicator,
  StatThresholdApplicator,
  PercentageThresholdApplicator,
  CustomEventApplicator,
  CooldownEffectApplicator
} from './core/EffectApplicator';
export {
  RNGGenerator,
  BaseRNGGenerator,
  StandardRNG,
  SeededRNG,
  WeightedRNG,
  GaussianRNG,
  ProbabilityUtils,
  RNGManager,
  rngManager,
  WeightedChoice,
  WeightedDistribution,
  GaussianParams,
  Range,
  ProbabilityConfig,
  RNGResult
} from './core/RNG';
export { 
  RandomEventApplicator, 
  WeightedSelectionGenerator 
} from './core/RNGEffects';
export {
  BaseActiveEffect,
  GenericGear,
  BaseStatValueProvider,
  ActiveEffectUtils
} from './core/ActiveEffects';
export {
  BaseInteractionModifier,
  BaseStateAdjuster,
  BaseInteractionNotifier,
  InteractionManager,
  interactionManager
} from './core/InteractionSystem';
export { GearEffectApplicator, GearEffectApplicatorUtils } from './core/GearEffectApplicators';
export { StatBoundCalculator } from './core/StatBoundCalculator';
export { 
  BoundStateApplicator, 
  BoundThresholdApplicator, 
  BoundRatioChangeApplicator 
} from './core/EffectApplicator';
export { 
  ComposedEffect, 
  ComposedEffectBuilder 
} from './core/ComposedEffect';
export { 
  EffectFactory 
} from './core/EffectFactory';
export * from './core/EffectComponents';
export * from './core/types';
