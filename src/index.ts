import dotenv from 'dotenv';
import { runExample, setupEventListeners } from './examples';

// Load environment variables
dotenv.config();

// Main application entry point
function main(): void {
  console.log('🚀 Entity Effects API');
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  // Set up event listeners
  setupEventListeners();
  
  // Run the comprehensive example
  runExample();
  
  console.log('=' .repeat(60));
  console.log('✅ Application completed successfully!');
}

// Run the application
main();

// Export the main components for external use
export { Entity } from './Entity';
export { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect, 
  ConditionalEffect,
  ComplexEffect,
  BaseEffect 
} from './effects';
export { eventSystem, EventSystem } from './EventSystem';
export { FrameManager } from './FrameManager';
export { 
  OptimizedFrameContainer, 
  OptimizedFrameView, 
  FrameFactory 
} from './OptimizedFrameSystem';
export { 
  effectApplicatorManager,
  EffectApplicatorManager,
  BaseEffectApplicator,
  StatThresholdApplicator,
  PercentageThresholdApplicator,
  CustomEventApplicator,
  CooldownEffectApplicator
} from './EffectApplicator';
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
} from './RNG';
export {
  RandomEffect,
  ChanceBasedEffect,
  WeightedRandomEffect,
  ConditionalProbabilityEffect,
  RandomEventApplicator,
  WeightedSelectionGenerator,
  RNGEffectsUtils
} from './RNGEffects';
export {
  BaseActiveEffect,
  GenericGear,
  BaseStatValueProvider,
  ActiveEffectUtils
} from './ActiveEffects';
export {
  BaseInteractionModifier,
  BaseStateAdjuster,
  BaseInteractionNotifier,
  InteractionManager,
  interactionManager
} from './InteractionSystem';
export {
  DefenseModifier,
  CriticalHitModifier,
  HealthDamageAdjuster,
  HealthHealingAdjuster,
  InteractionLogger,
  EffectTriggerNotifier,
  InteractionUtils,
  setupExampleInteractionSystem
} from './InteractionExamples';
export {
  GearEffectApplicator,
  GearEffectApplicatorUtils,
  ExampleGearEffectApplicators
} from './GearEffectApplicators';
export * from './types';

export default main;
