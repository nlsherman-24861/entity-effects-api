import { Entity } from '../core/Entity';
import { StatBoundCalculator } from '../core/StatBoundCalculator';
import { 
  BoundStateApplicator, 
  BoundThresholdApplicator, 
  BoundRatioChangeApplicator,
  effectApplicatorManager 
} from '../core/EffectApplicator';
import { 
  AdditiveEffect 
} from '../core/effects';
import { 
  EffectFactory 
} from '../core/EffectFactory';
import { 
  StatBoundConfig, 
  BoundEventConfig, 
  BoundEventData, 
  BoundThresholdConfig, 
  DEFAULT_BOUND_THRESHOLDS,
  EventType 
} from '../core/types';
import { eventSystem } from '../core/EventSystem';

/**
 * Comprehensive Bound Event System Demonstration
 * 
 * This demonstrates how to use the bound event system to create effects
 * that respond to bound state changes, threshold crossings, and ratio changes
 * with configurable magnitude, direction, and distance filters.
 * 
 * Key concepts:
 * - Bound events are triggered by changes in bound states, ratios, and thresholds
 * - Events can be filtered by magnitude of change, direction (positive/negative)
 * - Events can be filtered by distance from bounds (min/max)
 * - Effect applicators can respond to these events to add/remove effects
 * - Bound-aware effects can modify stats based on bound ratios and states
 */

/**
 * Example stats interface for bound event demonstrations
 */
interface ExampleStatsWithBounds {
  // Basic stats
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  resource: number;
  maxResource: number;
  
  // Derived stats
  power: number;
  defense: number;
  speed: number;
  accuracy: number;
  
  // Base stats for calculations
  baseHealth: number;
  baseEnergy: number;
  baseResource: number;
}

/**
 * Demonstrate bound event system setup and basic usage
 */
function demonstrateBoundEventSystem(): Entity {
  console.log('\n🎯 Bound Event System Setup:');
  
  const entity = new Entity('entity-bound-events', {
    health: 80,
    maxHealth: 100,
    energy: 60,
    maxEnergy: 100,
    resource: 30,
    maxResource: 50,
    power: 25,
    defense: 15,
    speed: 20,
    accuracy: 0.15,
    baseHealth: 100,
    baseEnergy: 100,
    baseResource: 50
  });
  
  // Create bound configurations
  const healthConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const energyConfig = StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy');
  const resourceConfig = StatBoundCalculator.createStatBasedBoundConfig('resource', 'maxResource');
  
  // Create bound event configurations
  const healthEventConfig: BoundEventConfig = {
    statType: 'health',
    boundConfig: healthConfig,
    ratioChangeThreshold: 0.1, // Only trigger on 10%+ ratio changes
    positiveChangeOnly: false, // Trigger on both positive and negative changes
    negativeChangeOnly: false,
    minDistanceFromMin: 5, // Only trigger when at least 5 units from min
    minDistanceFromMax: 5, // Only trigger when at least 5 units from max
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  const energyEventConfig: BoundEventConfig = {
    statType: 'energy',
    boundConfig: energyConfig,
    ratioChangeThreshold: 0.05, // Only trigger on 5%+ ratio changes
    positiveChangeOnly: true, // Only trigger on positive changes (energy gain)
    negativeChangeOnly: false,
    minDistanceFromMin: 10, // Only trigger when at least 10 units from min
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  const resourceEventConfig: BoundEventConfig = {
    statType: 'resource',
    boundConfig: resourceConfig,
    ratioChangeThreshold: 0.2, // Only trigger on 20%+ ratio changes
    positiveChangeOnly: false,
    negativeChangeOnly: true, // Only trigger on negative changes (resource loss)
    maxDistanceFromMax: 10, // Only trigger when within 10 units of max
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  // Register bound event configurations
  entity.registerBoundEventConfig(healthEventConfig);
  entity.registerBoundEventConfig(energyEventConfig);
  entity.registerBoundEventConfig(resourceEventConfig);
  
  console.log('Registered bound event configurations:');
  console.log(`  Health: ${(healthEventConfig.ratioChangeThreshold ?? 0) * 100}%+ changes, distance filters`);
  console.log(`  Energy: ${(energyEventConfig.ratioChangeThreshold ?? 0) * 100}%+ positive changes, min distance filter`);
  console.log(`  Resource: ${(resourceEventConfig.ratioChangeThreshold ?? 0) * 100}%+ negative changes, max distance filter`);
  
  return entity;
}

/**
 * Demonstrate bound-based effect applicators
 */
function demonstrateBoundEffectApplicators(entity: Entity): void {
  console.log('\n⚡ Bound-Based Effect Applicators:');
  
  // Create effects to apply
  const healthRegenEffect = new AdditiveEffect('health-regen', 'Health Regeneration', 'health', 5);
  const energyBoostEffect = new AdditiveEffect('energy-boost', 'Energy Boost', 'power', 10);
  const resourcePenaltyEffect = new AdditiveEffect('resource-penalty', 'Resource Penalty', 'defense', -5);
  
  // Create bound event configurations for applicators
  const healthEventConfig: BoundEventConfig = {
    statType: 'health',
    boundConfig: StatBoundCalculator.createSimpleBoundConfig(0, 100),
    ratioChangeThreshold: 0.15, // 15%+ changes
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  const energyEventConfig: BoundEventConfig = {
    statType: 'energy',
    boundConfig: StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy'),
    ratioChangeThreshold: 0.1, // 10%+ changes
    positiveChangeOnly: true, // Only on energy gain
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  const resourceEventConfig: BoundEventConfig = {
    statType: 'resource',
    boundConfig: StatBoundCalculator.createStatBasedBoundConfig('resource', 'maxResource'),
    ratioChangeThreshold: 0.25, // 25%+ changes
    negativeChangeOnly: true, // Only on resource loss
    thresholdConfig: DEFAULT_BOUND_THRESHOLDS
  };
  
  // Create bound state applicator (triggers on state changes)
  const healthStateApplicator = new BoundStateApplicator(
    'health-state-applicator',
    'Health State Applicator',
    healthEventConfig,
    [healthRegenEffect]
  );
  
  // Create bound threshold applicator (triggers on threshold crossings)
  const energyThresholdApplicator = new BoundThresholdApplicator(
    'energy-threshold-applicator',
    'Energy Threshold Applicator',
    energyEventConfig,
    [energyBoostEffect]
  );
  
  // Create bound ratio change applicator (triggers on ratio changes)
  const resourceRatioApplicator = new BoundRatioChangeApplicator(
    'resource-ratio-applicator',
    'Resource Ratio Applicator',
    resourceEventConfig,
    [resourcePenaltyEffect]
  );
  
  // Register applicators
  effectApplicatorManager.registerApplicator(healthStateApplicator);
  effectApplicatorManager.registerApplicator(energyThresholdApplicator);
  effectApplicatorManager.registerApplicator(resourceRatioApplicator);
  
  console.log('Registered bound effect applicators:');
  console.log('  Health State Applicator: Triggers on health state changes');
  console.log('  Energy Threshold Applicator: Triggers on energy threshold crossings');
  console.log('  Resource Ratio Applicator: Triggers on resource ratio changes');
}

/**
 * Demonstrate bound-aware effects
 */
function demonstrateBoundAwareEffects(entity: Entity): void {
  console.log('\n🔮 Bound-Aware Effects:');
  
  // Create bound configurations
  const healthConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const energyConfig = StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy');
  
  // Bound-based effect: Power scales with health ratio
  const healthPowerEffect = EffectFactory.createBoundBasedEffect(
    'health-power-effect',
    'Health Power Effect',
    'power',
    healthConfig,
    (ratio: number, boundResult: any) => {
      // Power bonus = 20 * health ratio (0-20 bonus)
      return 20 * ratio;
    }
  );
  
  // Bound conditional effect: Defense bonus only when energy is low
  const lowEnergyDefenseEffect = EffectFactory.createBoundConditionalEffect(
    'low-energy-defense',
    'Low Energy Defense',
    'energy',
    energyConfig,
    (ratio: number, boundResult: any) => ratio < 0.3, // Only when energy < 30%
    new AdditiveEffect('defense-bonus', 'Defense Bonus', 'defense', 10)
  );
  
  // Bound multiplier effect: Speed scales with energy ratio (using complex effect)
  const energySpeedEffect = EffectFactory.createComplexEffect(
    'energy-speed-effect',
    'Energy Speed Effect',
    (context: any, stats: Map<string, number>) => {
      const boundResult = StatBoundCalculator.calculateBounds('energy', energyConfig, context.currentStats);
      const ratio = StatBoundCalculator.calculateRatio(boundResult);
      const multiplier = 0.5 + (0.5 * ratio); // Speed multiplier = 0.5 + 0.5 * energy ratio
      
      const current = stats.get('speed') ?? 0;
      const baseValue = context.baseStats['speed'] ?? 0;
      stats.set('speed', baseValue * multiplier);
    },
    (context: any, stats: Map<string, number>) => {
      const baseValue = context.baseStats['speed'] ?? 0;
      stats.set('speed', baseValue);
    },
    undefined, // Always active
    ['speed'],
    [{ statType: 'speed', stackable: true }]
  );
  
  // Bound state effect: Different effects based on health state
  const healthStateEffects = new Map<string, any>();
  healthStateEffects.set('Critical', new AdditiveEffect('critical-healing', 'Critical Healing', 'health', 15));
  healthStateEffects.set('Low', new AdditiveEffect('low-healing', 'Low Healing', 'health', 8));
  healthStateEffects.set('Normal', new AdditiveEffect('normal-healing', 'Normal Healing', 'health', 3));
  healthStateEffects.set('High', new AdditiveEffect('high-healing', 'High Healing', 'health', 1));
  
  const healthStateEffect = EffectFactory.createBoundStateEffect(
    'health-state-effect',
    'Health State Effect',
    'health',
    healthConfig,
    healthStateEffects,
    DEFAULT_BOUND_THRESHOLDS
  );
  
  // Add effects to entity
  entity.addEffect(healthPowerEffect);
  entity.addEffect(lowEnergyDefenseEffect);
  entity.addEffect(energySpeedEffect);
  entity.addEffect(healthStateEffect);
  
  console.log('Added bound-aware effects:');
  console.log('  Health Power Effect: Power scales with health ratio (0-20 bonus)');
  console.log('  Low Energy Defense: Defense bonus when energy < 30%');
  console.log('  Energy Speed Effect: Speed scales with energy ratio (0.5x-1.0x)');
  console.log('  Health State Effect: Different healing based on health state');
}

/**
 * Demonstrate bound event triggering and handling
 */
function demonstrateBoundEventTriggering(entity: Entity): void {
  console.log('\n🎪 Bound Event Triggering and Handling:');
  
  // Set up event listeners
  const boundEventListeners = {
    [EventType.BOUND_STATE_CHANGED]: (event: any) => {
      const data = event.data as BoundEventData;
      console.log(`📊 Bound State Changed: ${data.statType} - ${data.previousState} → ${data.currentState}`);
    },
    
    [EventType.BOUND_THRESHOLD_CROSSED]: (event: any) => {
      const data = event.data as BoundEventData;
      console.log(`🎯 Threshold Crossed: ${data.statType} - Ratio: ${data.boundResult.currentValue}/${data.boundResult.maxBound} (${(StatBoundCalculator.calculateRatio(data.boundResult) * 100).toFixed(1)}%)`);
    },
    
    [EventType.BOUND_RATIO_CHANGED]: (event: any) => {
      const data = event.data as BoundEventData;
      if (data.ratioChange) {
        const changePercent = (data.ratioChange * 100).toFixed(1);
        const direction = data.ratioChange > 0 ? '+' : '';
        console.log(`📈 Ratio Changed: ${data.statType} - ${direction}${changePercent}% (${data.previousRatio?.toFixed(3)} → ${StatBoundCalculator.calculateRatio(data.boundResult).toFixed(3)})`);
      }
    }
  };
  
  // Register event listeners
  Object.entries(boundEventListeners).forEach(([eventType, listener]) => {
    eventSystem.on(eventType as EventType, listener);
  });
  
  console.log('Registered bound event listeners');
  
  // Simulate stat changes to trigger events
  console.log('\n🔄 Simulating stat changes:');
  
  // Initial state
  console.log('Initial stats:', {
    health: entity.getStat('health'),
    energy: entity.getStat('energy'),
    resource: entity.getStat('resource'),
    power: entity.getStat('power'),
    defense: entity.getStat('defense'),
    speed: entity.getStat('speed')
  });
  
  // Change health (should trigger state change and ratio change)
  console.log('\n1. Changing health from 80 to 60:');
  entity.setStat('health', 60);
  
  // Change energy (should trigger positive change)
  console.log('\n2. Changing energy from 60 to 80:');
  entity.setStat('energy', 80);
  
  // Change resource (should trigger negative change)
  console.log('\n3. Changing resource from 30 to 10:');
  entity.setStat('resource', 10);
  
  // Change health to critical (should trigger state change)
  console.log('\n4. Changing health from 60 to 20 (critical):');
  entity.setStat('health', 20);
  
  // Change energy to low (should trigger threshold crossing)
  console.log('\n5. Changing energy from 80 to 25 (low):');
  entity.setStat('energy', 25);
  
  // Final state
  console.log('\nFinal stats:', {
    health: entity.getStat('health'),
    energy: entity.getStat('energy'),
    resource: entity.getStat('resource'),
    power: entity.getStat('power'),
    defense: entity.getStat('defense'),
    speed: entity.getStat('speed')
  });
  
  // Show bound calculations
  console.log('\n📊 Final Bound Calculations:');
  const healthBounds = entity.getStatBounds('health', 0, 100);
  const energyBounds = entity.getStatBasedBounds('energy', 'energy', 'maxEnergy');
  const resourceBounds = entity.getStatBasedBounds('resource', 'resource', 'maxResource');
  
  console.log('Health bounds:', StatBoundCalculator.formatBoundResult(healthBounds, true));
  console.log('Energy bounds:', StatBoundCalculator.formatBoundResult(energyBounds, true));
  console.log('Resource bounds:', StatBoundCalculator.formatBoundResult(resourceBounds, true));
}

/**
 * Demonstrate advanced bound event configurations
 */
function demonstrateAdvancedBoundEventConfigurations(entity: Entity): void {
  console.log('\n🔧 Advanced Bound Event Configurations:');
  
  // Create a complex bound event configuration
  const complexEventConfig: BoundEventConfig = {
    statType: 'health',
    boundConfig: StatBoundCalculator.createSimpleBoundConfig(0, 100),
    ratioChangeThreshold: 0.05, // 5%+ changes
    positiveChangeOnly: false,
    negativeChangeOnly: false,
    minDistanceFromMin: 15, // At least 15 units from min
    minDistanceFromMax: 15, // At least 15 units from max
    maxDistanceFromMin: 85, // At most 85 units from min
    maxDistanceFromMax: 85, // At most 85 units from max
    thresholdConfig: {
      critical: 0.2,
      low: 0.4,
      high: 0.8,
      full: 1.0,
      empty: 0.0
    }
  };
  
  // Register the complex configuration
  entity.registerBoundEventConfig(complexEventConfig);
  
  console.log('Registered complex bound event configuration:');
  console.log(`  Stat: ${complexEventConfig.statType}`);
  console.log(`  Ratio change threshold: ${(complexEventConfig.ratioChangeThreshold ?? 0) * 100}%`);
  console.log(`  Distance from min: ${complexEventConfig.minDistanceFromMin}-${complexEventConfig.maxDistanceFromMin}`);
  console.log(`  Distance from max: ${complexEventConfig.minDistanceFromMax}-${complexEventConfig.maxDistanceFromMax}`);
  console.log(`  Custom thresholds: critical=${complexEventConfig.thresholdConfig?.critical}, low=${complexEventConfig.thresholdConfig?.low}, high=${complexEventConfig.thresholdConfig?.high}`);
  
  // Test the complex configuration
  console.log('\n🧪 Testing complex configuration:');
  
  // Test 1: Change within distance constraints
  console.log('1. Changing health to 50 (within distance constraints):');
  entity.setStat('health', 50);
  
  // Test 2: Change outside distance constraints
  console.log('2. Changing health to 5 (too close to min):');
  entity.setStat('health', 5);
  
  // Test 3: Change outside distance constraints
  console.log('3. Changing health to 95 (too close to max):');
  entity.setStat('health', 95);
  
  // Test 4: Change within distance constraints
  console.log('4. Changing health to 30 (within distance constraints):');
  entity.setStat('health', 30);
}

/**
 * Run all bound event examples
 */
export function runBoundEventExamples(): void {
  console.log('\n🎯 Bound Event System Comprehensive Demonstration');
  console.log('='.repeat(60));
  
  const entity = demonstrateBoundEventSystem();
  console.log('\n' + '='.repeat(60));
  
  demonstrateBoundEffectApplicators(entity);
  console.log('\n' + '='.repeat(60));
  
  demonstrateBoundAwareEffects(entity);
  console.log('\n' + '='.repeat(60));
  
  demonstrateBoundEventTriggering(entity);
  console.log('\n' + '='.repeat(60));
  
  demonstrateAdvancedBoundEventConfigurations(entity);
  console.log('\n' + '='.repeat(60));
  
  console.log('\n✅ Bound Event System Demonstration Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('• Bound event configurations with magnitude, direction, and distance filters');
  console.log('• Bound-based effect applicators (state, threshold, ratio change)');
  console.log('• Bound-aware effects (bound-based, conditional, multiplier, state)');
  console.log('• Event triggering and handling with configurable thresholds');
  console.log('• Advanced bound event configurations with complex constraints');
  console.log('• Integration with existing effect and event systems');
}
