import { Entity } from '../core/Entity';
import { EffectFactory } from '../core/EffectFactory';
import { 
  ComposedEffect, 
  ComposedEffectBuilder 
} from '../core/ComposedEffect';
import {
  AlwaysApplicable,
  RNGApplicable,
  RandomImpact,
  WeightedRandomImpact,
  ConditionalRandomImpact,
  RNGTarget,
  ChanceBasedApplication,
  AdditiveApplication,
  SetValueApplication,
  SingleStatTarget,
  MultipleStatTarget
} from '../core/EffectComponents';
import { 
  rngManager,
  SeededRNG,
  WeightedRNG,
  GaussianRNG
} from '../core/RNG';

/**
 * Demonstrates the new RNG composition-based effect system
 */
export function demonstrateRNGCompositionSystem(): Entity {
  console.log('\n=== RNG Composition-Based Effect System Demo ===\n');

  // Create entity with initial stats
  const entity = new Entity('rng-composition-demo-entity', {
    health: 100,
    power: 20,
    defense: 15,
    speed: 10,
    luck: 5
  });

  console.log('Initial stats:', entity.getCurrentStats());

  // Create different RNG generators
  const seededRNG = rngManager.createSeededGenerator(12345, 'seeded');
  const weightedRNG = rngManager.createWeightedGenerator(undefined, 'weighted');
  const gaussianRNG = rngManager.createGaussianGenerator(undefined, 'gaussian');

  // 1. Simple random effect using factory
  console.log('\n1. Simple Random Effect:');
  const randomEffect = EffectFactory.createRandomEffect(
    'random-power-boost',
    'Random Power Boost',
    'power',
    -5, // min
    15, // max
    seededRNG
  );
  entity.addEffect(randomEffect);
  console.log('After adding random power boost:', entity.getCurrentStats());

  // 2. Gaussian random effect using factory
  console.log('\n2. Gaussian Random Effect:');
  const gaussianEffect = EffectFactory.createGaussianRandomEffect(
    'gaussian-defense',
    'Gaussian Defense',
    'defense',
    { min: 0, max: 20 },
    10, // mean
    3,  // standard deviation
    gaussianRNG
  );
  entity.addEffect(gaussianEffect);
  console.log('After adding Gaussian defense boost:', entity.getCurrentStats());

  // 3. Chance-based effect using factory
  console.log('\n3. Chance-Based Effect:');
  const chanceEffect = EffectFactory.createChanceBasedEffect(
    'lucky-power',
    'Lucky Power',
    'power',
    0.3, // 30% chance
    (baseValue) => baseValue * 1.5, // 50% increase
    seededRNG
  );
  entity.addEffect(chanceEffect);
  console.log('After adding chance-based power boost:', entity.getCurrentStats());

  // 4. Weighted random effect using factory
  console.log('\n4. Weighted Random Effect:');
  const weightedEffect = EffectFactory.createWeightedRandomEffect(
    'weighted-random',
    'Weighted Random Effect',
    [
      { value: { statType: 'power', value: 10 }, weight: 40 },
      { value: { statType: 'defense', value: 8 }, weight: 30 },
      { value: { statType: 'speed', value: 5 }, weight: 20 },
      { value: { statType: 'health', value: 15 }, weight: 10 }
    ],
    weightedRNG
  );
  entity.addEffect(weightedEffect);
  console.log('After adding weighted random effect:', entity.getCurrentStats());

  // 5. Complex composed RNG effect using builder
  console.log('\n5. Complex Composed RNG Effect:');
  const complexRNGEffect = new ComposedEffectBuilder('complex-rng', 'Complex RNG Effect')
    .withPriority(8)
    .withStatTypes(['power', 'defense', 'speed'])
    .withStackabilityRules([
      { statType: 'power', stackable: true },
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true }
    ])
    .withApplicability(new RNGApplicable(0.5, seededRNG)) // 50% chance to apply
    .withImpact(new RandomImpact({ min: 1, max: 10 }, 'uniform', undefined, seededRNG))
    .withTarget(new RNGTarget([
      { statTypes: ['power'], weight: 50 },
      { statTypes: ['defense'], weight: 30 },
      { statTypes: ['speed'], weight: 20 }
    ], weightedRNG))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(complexRNGEffect);
  console.log('After adding complex RNG effect:', entity.getCurrentStats());

  // 6. Conditional random effect
  console.log('\n6. Conditional Random Effect:');
  const conditionalRandomEffect = new ComposedEffectBuilder('conditional-rng', 'Conditional Random Effect')
    .withPriority(6)
    .withStatTypes(['luck'])
    .withStackabilityRules([{ statType: 'luck', stackable: true }])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new ConditionalRandomImpact(
      (context) => {
        const power = context.currentStats.get('power') ?? 0;
        return power > 25; // Only if power is high
      },
      5, // +5 luck if condition is true
      0  // +0 luck if condition is false
    ))
    .withTarget(new SingleStatTarget('luck'))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(conditionalRandomEffect);
  console.log('After adding conditional random effect:', entity.getCurrentStats());

  // 7. Chance-based application effect
  console.log('\n7. Chance-Based Application Effect:');
  const chanceApplicationEffect = new ComposedEffectBuilder('chance-app', 'Chance-Based Application')
    .withPriority(4)
    .withStatTypes(['health'])
    .withStackabilityRules([{ statType: 'health', stackable: true }])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new RandomImpact({ min: 10, max: 30 }, 'uniform', undefined, seededRNG))
    .withTarget(new SingleStatTarget('health'))
    .withApplication(new ChanceBasedApplication(0.7, new AdditiveApplication(), seededRNG)) // 70% chance to apply
    .build();

  entity.addEffect(chanceApplicationEffect);
  console.log('After adding chance-based application effect:', entity.getCurrentStats());

  // Demonstrate multiple calculations to show randomness
  console.log('\n=== Multiple Calculations (showing randomness) ===\n');
  
  for (let i = 0; i < 5; i++) {
    const stats = entity.getCurrentStats();
    console.log(`Calculation ${i + 1}:`, {
      health: stats.get('health')?.toFixed(2),
      power: stats.get('power')?.toFixed(2),
      defense: stats.get('defense')?.toFixed(2),
      speed: stats.get('speed')?.toFixed(2),
      luck: stats.get('luck')?.toFixed(2)
    });
  }

  return entity;
}

/**
 * Demonstrates advanced RNG composition patterns
 */
export function demonstrateAdvancedRNGComposition(): Entity {
  console.log('\n=== Advanced RNG Composition Patterns Demo ===\n');

  const entity = new Entity('advanced-rng-composition-entity', {
    health: 80,
    power: 15,
    defense: 12,
    speed: 8,
    magic: 10,
    luck: 3
  });

  console.log('Initial stats:', entity.getCurrentStats());

  // Create RNG generators
  const seededRNG = rngManager.createSeededGenerator(54321, 'seeded');
  const weightedRNG = rngManager.createWeightedGenerator(undefined, 'weighted');

  // 1. Multi-stat weighted random effect
  console.log('\n1. Multi-Stat Weighted Random Effect:');
  const multiStatWeightedEffect = new ComposedEffectBuilder('multi-stat-weighted', 'Multi-Stat Weighted Effect')
    .withPriority(10)
    .withStatTypes(['power', 'defense', 'speed', 'magic'])
    .withStackabilityRules([
      { statType: 'power', stackable: true },
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true },
      { statType: 'magic', stackable: true }
    ])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new WeightedRandomImpact([
      { value: { statType: 'power', value: 8 }, weight: 30 },
      { value: { statType: 'defense', value: 6 }, weight: 25 },
      { value: { statType: 'speed', value: 4 }, weight: 25 },
      { value: { statType: 'magic', value: 10 }, weight: 20 }
    ], weightedRNG))
    .withTarget(new MultipleStatTarget(['power', 'defense', 'speed', 'magic']))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(multiStatWeightedEffect);
  console.log('After adding multi-stat weighted effect:', entity.getCurrentStats());

  // 2. Luck-based random effect
  console.log('\n2. Luck-Based Random Effect:');
  const luckBasedEffect = new ComposedEffectBuilder('luck-based', 'Luck-Based Random Effect')
    .withPriority(8)
    .withStatTypes(['power', 'defense', 'speed'])
    .withStackabilityRules([
      { statType: 'power', stackable: true },
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true }
    ])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new ConditionalRandomImpact(
      (context) => {
        const luck = context.currentStats.get('luck') ?? 0;
        return luck > 5; // Only if luck is high
      },
      15, // High bonus if lucky
      5   // Low bonus if not lucky
    ))
    .withTarget(new RNGTarget([
      { statTypes: ['power'], weight: 40 },
      { statTypes: ['defense'], weight: 35 },
      { statTypes: ['speed'], weight: 25 }
    ], weightedRNG))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(luckBasedEffect);
  console.log('After adding luck-based effect:', entity.getCurrentStats());

  // 3. Health-based random effect
  console.log('\n3. Health-Based Random Effect:');
  const healthBasedEffect = new ComposedEffectBuilder('health-based', 'Health-Based Random Effect')
    .withPriority(6)
    .withStatTypes(['defense', 'speed'])
    .withStackabilityRules([
      { statType: 'defense', stackable: true },
      { statType: 'speed', stackable: true }
    ])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new ConditionalRandomImpact(
      (context) => {
        const health = context.currentStats.get('health') ?? 0;
        return health < 50; // Only if health is low
      },
      20, // High bonus if health is low (desperation)
      2   // Low bonus if health is high
    ))
    .withTarget(new RNGTarget([
      { statTypes: ['defense'], weight: 60 },
      { statTypes: ['speed'], weight: 40 }
    ], weightedRNG))
    .withApplication(new AdditiveApplication())
    .build();

  entity.addEffect(healthBasedEffect);
  console.log('After adding health-based effect:', entity.getCurrentStats());

  // 4. Complex chance-based application
  console.log('\n4. Complex Chance-Based Application:');
  const complexChanceEffect = new ComposedEffectBuilder('complex-chance', 'Complex Chance-Based Application')
    .withPriority(4)
    .withStatTypes(['magic'])
    .withStackabilityRules([{ statType: 'magic', stackable: true }])
    .withApplicability(new AlwaysApplicable())
    .withImpact(new RandomImpact({ min: 5, max: 25 }, 'uniform', undefined, seededRNG))
    .withTarget(new SingleStatTarget('magic'))
    .withApplication(new ChanceBasedApplication(0.6, new AdditiveApplication(), seededRNG)) // 60% chance
    .build();

  entity.addEffect(complexChanceEffect);
  console.log('After adding complex chance-based effect:', entity.getCurrentStats());

  // Demonstrate changes
  console.log('\n=== Advanced RNG Demonstrations ===\n');

  // Test multiple calculations
  console.log('Multiple calculations (showing randomness):');
  for (let i = 0; i < 5; i++) {
    const stats = entity.getCurrentStats();
    console.log(`Calculation ${i + 1}:`, {
      health: stats.get('health')?.toFixed(2),
      power: stats.get('power')?.toFixed(2),
      defense: stats.get('defense')?.toFixed(2),
      speed: stats.get('speed')?.toFixed(2),
      magic: stats.get('magic')?.toFixed(2),
      luck: stats.get('luck')?.toFixed(2)
    });
  }

  // Test luck changes
  console.log('\nChanging luck to 8 (high luck):');
  entity.setStat('luck', 8);
  console.log('Stats after luck change:', entity.getCurrentStats());

  console.log('\nChanging luck to 2 (low luck):');
  entity.setStat('luck', 2);
  console.log('Stats after luck change:', entity.getCurrentStats());

  // Test health changes
  console.log('\nChanging health to 30 (low health):');
  entity.setStat('health', 30);
  console.log('Stats after health change:', entity.getCurrentStats());

  console.log('\nChanging health to 90 (high health):');
  entity.setStat('health', 90);
  console.log('Stats after health change:', entity.getCurrentStats());

  return entity;
}

/**
 * Run all RNG composition examples
 */
export function runRNGCompositionExamples(): void {
  console.log('Running RNG Composition-Based Effect System Examples...\n');
  
  try {
    const entity1 = demonstrateRNGCompositionSystem();
    const entity2 = demonstrateAdvancedRNGComposition();
    
    console.log('\n=== RNG Composition Examples Complete ===');
    console.log('✅ All RNG composition examples ran successfully!');
    console.log('✅ RNG effects can now be composed from separate concerns:');
    console.log('   - RNG Applicability (chance-based application)');
    console.log('   - Random Impact (uniform, Gaussian, weighted, conditional)');
    console.log('   - RNG Target (weighted target selection)');
    console.log('   - Chance-Based Application (probability-based application)');
    console.log('✅ No more inheritance hierarchy headaches for RNG effects!');
    
  } catch (error) {
    console.error('❌ Error running RNG composition examples:', error);
  }
}
