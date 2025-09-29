import { Entity } from '../core/Entity';
import { EffectFactory } from '../core/EffectFactory';
import { 
  ComposedEffect, 
  ComposedEffectBuilder 
} from '../core/ComposedEffect';
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
  FunctionBasedApplication
} from '../core/EffectComponents';
import { 
  StatBoundCalculator 
} from '../core/StatBoundCalculator';
import { 
  StatBoundConfig, 
  BoundThresholdConfig, 
  DEFAULT_BOUND_THRESHOLDS 
} from '../core/types';

/**
 * Demonstrates the new composition-based effect system
 */
export function demonstrateCompositionSystem(): Entity {
  console.log('\n=== Composition-Based Effect System Demo ===\n');

  // Create entity with initial stats
  const entity = new Entity('composition-demo-entity', {
    health: 50,
    maxHealth: 100,
    energy: 30,
    maxEnergy: 100,
    power: 10,
    defense: 5,
    speed: 8
  });

  console.log('Initial stats:', entity.getCurrentStats());

  // Create bound configurations
  const healthConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const energyConfig = StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy');

  // 1. Simple additive effect using factory
  console.log('\n1. Simple Additive Effect:');
  const simpleAdditive = EffectFactory.createAdditiveEffect(
    'simple-additive',
    'Simple Additive',
    'power',
    5
  );
  entity.addEffect(simpleAdditive);
  console.log('After adding +5 power:', entity.getCurrentStats());

  // 2. Bound-based effect using factory
  console.log('\n2. Bound-Based Effect:');
  const boundBased = EffectFactory.createBoundBasedEffect(
    'health-power-scaling',
    'Health Power Scaling',
    'power',
    healthConfig,
    (ratio: number, boundResult: any) => {
      // Power bonus = 10 * health ratio
      return 10 * ratio;
    }
  );
  entity.addEffect(boundBased);
  console.log('After adding health-based power scaling:', entity.getCurrentStats());

  // 3. Conditional effect using factory
  console.log('\n3. Conditional Effect:');
  const conditional = EffectFactory.createConditionalEffect(
    'low-energy-defense',
    'Low Energy Defense',
    (context: any) => {
      const energy = context.currentStats.get('energy') ?? 0;
      const maxEnergy = context.currentStats.get('maxEnergy') ?? 100;
      return (energy / maxEnergy) < 0.5; // When energy < 50%
    },
    EffectFactory.createAdditiveEffect('defense-bonus', 'Defense Bonus', 'defense', 8)
  );
  entity.addEffect(conditional);
  console.log('After adding conditional defense (energy < 50%):', entity.getCurrentStats());

  // 4. Complex composed effect using builder
  console.log('\n4. Complex Composed Effect:');
  const complexEffect = new ComposedEffectBuilder('complex-effect', 'Complex Effect')
    .withPriority(10)
    .withStatTypes(['speed', 'power'])
    .withStackabilityRules([
      { statType: 'speed', stackable: true },
      { statType: 'power', stackable: true }
    ])
    .withApplicability(new BoundBasedApplicable(
      'energy',
      energyConfig,
      (ratio: number, boundResult: any) => ratio > 0.3, // Only when energy > 30%
      DEFAULT_BOUND_THRESHOLDS
    ))
    .withImpact(new FunctionBasedImpact((context: any, statType: string) => {
      // Impact based on energy ratio and stat type
      const energy = context.currentStats.get('energy') ?? 0;
      const maxEnergy = context.currentStats.get('maxEnergy') ?? 100;
      const energyRatio = energy / maxEnergy;
      
      if (statType === 'speed') {
        return energyRatio * 5; // Speed bonus based on energy
      } else if (statType === 'power') {
        return energyRatio * 3; // Power bonus based on energy
      }
      return 0;
    }))
    .withTarget(new MultipleStatTarget(['speed', 'power']))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(complexEffect);
  console.log('After adding complex energy-based effect:', entity.getCurrentStats());

  // 5. Stat threshold effect
  console.log('\n5. Stat Threshold Effect:');
  const thresholdEffect = EffectFactory.createStatThresholdEffect(
    'high-health-bonus',
    'High Health Bonus',
    'health',
    '>',
    75, // When health > 75
    EffectFactory.createAdditiveEffect('health-bonus', 'Health Bonus', 'defense', 5)
  );
  entity.addEffect(thresholdEffect);
  console.log('After adding high health defense bonus:', entity.getCurrentStats());

  // 6. Bound state effect
  console.log('\n6. Bound State Effect:');
  const stateEffects = new Map<string, any>();
  stateEffects.set('Critical', EffectFactory.createAdditiveEffect('critical-bonus', 'Critical Bonus', 'power', 15));
  stateEffects.set('Low', EffectFactory.createAdditiveEffect('low-bonus', 'Low Bonus', 'power', 8));
  stateEffects.set('Normal', EffectFactory.createAdditiveEffect('normal-bonus', 'Normal Bonus', 'power', 3));
  stateEffects.set('High', EffectFactory.createAdditiveEffect('high-bonus', 'High Bonus', 'power', 1));

  const stateEffect = EffectFactory.createBoundStateEffect(
    'health-state-bonus',
    'Health State Bonus',
    'health',
    healthConfig,
    stateEffects,
    DEFAULT_BOUND_THRESHOLDS
  );
  entity.addEffect(stateEffect);
  console.log('After adding health state-based power bonus:', entity.getCurrentStats());

  // 7. Custom composed effect with multiple concerns
  console.log('\n7. Custom Multi-Concern Effect:');
  const multiConcernEffect = new ComposedEffectBuilder('multi-concern', 'Multi-Concern Effect')
    .withPriority(5)
    .withStatTypes(['defense', 'speed'])
    .withStackabilityRules([
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true }
    ])
    .withApplicability(new ConditionalApplicable((context: any) => {
      // Only active when both health and energy are above 25%
      const health = context.currentStats.get('health') ?? 0;
      const maxHealth = context.currentStats.get('maxHealth') ?? 100;
      const energy = context.currentStats.get('energy') ?? 0;
      const maxEnergy = context.currentStats.get('maxEnergy') ?? 100;
      
      return (health / maxHealth) > 0.25 && (energy / maxEnergy) > 0.25;
    }))
    .withImpact(new StatBasedImpact('power', 0.5)) // Impact = 50% of power stat
    .withTarget(new ConditionalStatTarget((context: any) => {
      // Target different stats based on current power
      const power = context.currentStats.get('power') ?? 0;
      return power > 15 ? ['defense'] : ['speed'];
    }))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(multiConcernEffect);
  console.log('After adding multi-concern effect:', entity.getCurrentStats());

  // Demonstrate stat changes
  console.log('\n=== Stat Change Demonstrations ===\n');

  // Change health to trigger different bound states
  console.log('Changing health to 20 (Critical state):');
  entity.setStat('health', 20);
  console.log('Stats after health change:', entity.getCurrentStats());

  console.log('\nChanging health to 60 (Normal state):');
  entity.setStat('health', 60);
  console.log('Stats after health change:', entity.getCurrentStats());

  console.log('\nChanging health to 90 (High state):');
  entity.setStat('health', 90);
  console.log('Stats after health change:', entity.getCurrentStats());

  // Change energy to trigger conditional effects
  console.log('\nChanging energy to 10 (Low energy):');
  entity.setStat('energy', 10);
  console.log('Stats after energy change:', entity.getCurrentStats());

  console.log('\nChanging energy to 80 (High energy):');
  entity.setStat('energy', 80);
  console.log('Stats after energy change:', entity.getCurrentStats());

  // Change power to trigger target selection
  console.log('\nChanging power to 20 (High power):');
  entity.setStat('power', 20);
  console.log('Stats after power change:', entity.getCurrentStats());

  console.log('\nChanging power to 10 (Low power):');
  entity.setStat('power', 10);
  console.log('Stats after power change:', entity.getCurrentStats());

  return entity;
}

/**
 * Demonstrates advanced composition patterns
 */
export function demonstrateAdvancedComposition(): Entity {
  console.log('\n=== Advanced Composition Patterns Demo ===\n');

  const entity = new Entity('advanced-composition-entity', {
    health: 80,
    maxHealth: 100,
    energy: 60,
    maxEnergy: 100,
    power: 12,
    defense: 8,
    speed: 10,
    intelligence: 15
  });

  console.log('Initial stats:', entity.getCurrentStats());

  // Create bound configurations
  const healthConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const energyConfig = StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy');

  // 1. Dynamic target selection based on bound state
  console.log('\n1. Dynamic Target Selection:');
  const dynamicTargetEffect = new ComposedEffectBuilder('dynamic-target', 'Dynamic Target Effect')
    .withPriority(8)
    .withStatTypes(['power', 'defense', 'speed'])
    .withStackabilityRules([
      { statType: 'power', stackable: true },
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true }
    ])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new AdditiveImpact(5))
    .withTarget(new BoundBasedStatTarget(
      'health',
      healthConfig,
      (ratio: number, boundResult: any) => {
        // Target different stats based on health state
        if (ratio < 0.3) return ['defense']; // Low health -> focus on defense
        if (ratio < 0.7) return ['power']; // Medium health -> focus on power
        return ['speed']; // High health -> focus on speed
      }
    ))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(dynamicTargetEffect);
  console.log('After adding dynamic target effect:', entity.getCurrentStats());

  // 2. Multi-stat impact calculation
  console.log('\n2. Multi-Stat Impact:');
  const multiStatImpact = new ComposedEffectBuilder('multi-stat-impact', 'Multi-Stat Impact')
    .withPriority(6)
    .withStatTypes(['intelligence'])
    .withStackabilityRules([{ statType: 'intelligence', stackable: true }])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new FunctionBasedImpact((context: any, statType: string) => {
      // Intelligence bonus = average of power, defense, and speed
      const power = context.currentStats.get('power') ?? 0;
      const defense = context.currentStats.get('defense') ?? 0;
      const speed = context.currentStats.get('speed') ?? 0;
      return (power + defense + speed) / 3;
    }))
    .withTarget(new SingleStatTarget('intelligence'))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(multiStatImpact);
  console.log('After adding multi-stat impact effect:', entity.getCurrentStats());

  // 3. Conditional application method
  console.log('\n3. Conditional Application:');
  const conditionalApplication = new ComposedEffectBuilder('conditional-app', 'Conditional Application')
    .withPriority(4)
    .withStatTypes(['power'])
    .withStackabilityRules([{ statType: 'power', stackable: true }])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new AdditiveImpact(10))
    .withTarget(new SingleStatTarget('power'))
    .withApplication(new FunctionBasedApplication(
      (context: any, stats: Map<string, number>, statType: string, impact: number) => {
        // Only apply if energy is above 50%
        const energy = context.currentStats.get('energy') ?? 0;
        const maxEnergy = context.currentStats.get('maxEnergy') ?? 100;
        if ((energy / maxEnergy) > 0.5) {
          const current = stats.get(statType) ?? 0;
          stats.set(statType, current + impact);
        }
      },
      (context: any, stats: Map<string, number>, statType: string, impact: number) => {
        // Only reverse if energy is above 50%
        const energy = context.currentStats.get('energy') ?? 0;
        const maxEnergy = context.currentStats.get('maxEnergy') ?? 100;
        if ((energy / maxEnergy) > 0.5) {
          const current = stats.get(statType) ?? 0;
          stats.set(statType, current - impact);
        }
      }
    ))
    .build();

  entity.addEffect(conditionalApplication);
  console.log('After adding conditional application effect:', entity.getCurrentStats());

  // Demonstrate changes
  console.log('\n=== Advanced Composition Demonstrations ===\n');

  // Test dynamic target selection
  console.log('Changing health to 20 (Low health -> defense focus):');
  entity.setStat('health', 20);
  console.log('Stats after health change:', entity.getCurrentStats());

  console.log('\nChanging health to 50 (Medium health -> power focus):');
  entity.setStat('health', 50);
  console.log('Stats after health change:', entity.getCurrentStats());

  console.log('\nChanging health to 90 (High health -> speed focus):');
  entity.setStat('health', 90);
  console.log('Stats after health change:', entity.getCurrentStats());

  // Test conditional application
  console.log('\nChanging energy to 30 (Low energy -> no power bonus):');
  entity.setStat('energy', 30);
  console.log('Stats after energy change:', entity.getCurrentStats());

  console.log('\nChanging energy to 70 (High energy -> power bonus applies):');
  entity.setStat('energy', 70);
  console.log('Stats after energy change:', entity.getCurrentStats());

  return entity;
}

/**
 * Run all composition examples
 */
export function runCompositionExamples(): void {
  console.log('Running Composition-Based Effect System Examples...\n');
  
  try {
    const entity1 = demonstrateCompositionSystem();
    const entity2 = demonstrateAdvancedComposition();
    
    console.log('\n=== Composition Examples Complete ===');
    console.log('✅ All composition examples ran successfully!');
    console.log('✅ Effects can now be composed from separate concerns:');
    console.log('   - Applicability (when to apply)');
    console.log('   - Impact (how much to change)');
    console.log('   - Target (what to change)');
    console.log('   - Application (how to apply the change)');
    console.log('✅ No more inheritance hierarchy headaches!');
    
  } catch (error) {
    console.error('❌ Error running composition examples:', error);
  }
}
