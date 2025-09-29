import { Entity } from '../core/Entity';
import { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect, 
  ConditionalEffect,
  ComplexEffect 
} from '../core/effects';
import { FrameManager } from '../core/FrameManager';
import { 
  effectApplicatorManager,
  StatThresholdApplicator,
  PercentageThresholdApplicator,
  CustomEventApplicator,
  CooldownEffectApplicator
} from '../core/EffectApplicator';
import {
  rngManager,
  SeededRNG,
  WeightedRNG,
  GaussianRNG,
  ProbabilityUtils,
  WeightedChoice,
  Range,
  GaussianParams
} from '../core/RNG';
import {
  RandomEventApplicator,
  WeightedSelectionGenerator
} from '../core/RNGEffects';
import { EffectFactory } from '../core/EffectFactory';
import { eventSystem } from '../core/EventSystem';
import { EventType, FrameConfig } from '../core/types';

/**
 * Comprehensive RNG System Demonstration
 */
function runRNGExample(): void {
  console.log('🎲 RNG System Demonstration\n');
  
  // Set up different RNG generators
  console.log('🎯 Setting up RNG Generators...');
  
  // Create seeded RNG for reproducible results
  const seededRNG = rngManager.createSeededGenerator(12345, 'seeded');
  console.log('Created seeded RNG with seed:', seededRNG.getSeed());
  
  // Create weighted RNG for loot tables
  const weightedRNG = rngManager.createWeightedGenerator(undefined, 'weighted');
  console.log('Created weighted RNG');
  
  // Create Gaussian RNG for normal distribution
  const gaussianRNG = rngManager.createGaussianGenerator(undefined, 'gaussian');
  console.log('Created Gaussian RNG');
  
  // Create entities with generic stat types
  const player = new Entity('player-1', {
    vitality: 100,
    power: 20,
    resilience: 10,
    agility: 15,
    energy: 50,
    luck: 5
  });
  
  const enemy = new Entity('enemy-1', {
    vitality: 80,
    power: 15,
    resilience: 8,
    agility: 12,
    energy: 30,
    luck: 3
  });
  
  console.log('\n📊 Initial Stats:');
  console.log('Player - Vitality:', player.getStat('vitality'), 'Power:', player.getStat('power'), 'Luck:', player.getStat('luck'));
  console.log('Enemy - Vitality:', enemy.getStat('vitality'), 'Power:', enemy.getStat('power'), 'Luck:', enemy.getStat('luck'));
  
  // Demonstrate basic RNG operations
  console.log('\n🎲 Basic RNG Operations:');
  console.log('Random float (0-1):', rngManager.random().toFixed(4));
  console.log('Random int (1-10):', rngManager.randomInt(1, 10));
  console.log('Random float (10-20):', rngManager.randomFloat(10, 20).toFixed(2));
  console.log('Chance (25%):', rngManager.chance(0.25));
  
  // Demonstrate seeded RNG reproducibility
  console.log('\n🌱 Seeded RNG Reproducibility:');
  const seed1 = seededRNG.random();
  const seed2 = seededRNG.random();
  console.log('First two values:', seed1.toFixed(4), seed2.toFixed(4));
  
  // Reset seed and verify reproducibility
  seededRNG.setSeed(12345);
  const seed1Again = seededRNG.random();
  const seed2Again = seededRNG.random();
  console.log('Same seed values:', seed1Again.toFixed(4), seed2Again.toFixed(4));
  console.log('Reproducible:', seed1 === seed1Again && seed2 === seed2Again);
  
  // Demonstrate weighted random selection
  console.log('\n⚖️ Weighted Random Selection:');
  const weightedChoices: WeightedChoice<string>[] = [
    { value: 'Option A', weight: 50 },
    { value: 'Option B', weight: 25 },
    { value: 'Option C', weight: 15 },
    { value: 'Option D', weight: 8 },
    { value: 'Option E', weight: 2 }
  ];
  
  console.log('Weighted choices:');
  for (const choice of weightedChoices) {
    console.log(`  ${choice.value}: ${choice.weight}%`);
  }
  
  console.log('\nGenerating 10 random selections:');
  for (let i = 0; i < 10; i++) {
    const selection = weightedRNG.weightedChoice(weightedChoices);
    console.log(`  ${i + 1}. ${selection}`);
  }
  
  // Demonstrate Gaussian distribution
  console.log('\n📈 Gaussian Distribution:');
  const gaussianValues: number[] = [];
  for (let i = 0; i < 20; i++) {
    gaussianValues.push(gaussianRNG.gaussian(10, 2)); // mean=10, std=2
  }
  console.log('Gaussian values (mean=10, std=2):', gaussianValues.map(v => v.toFixed(2)).join(', '));
  
  // Demonstrate probability calculations
  console.log('\n📊 Probability Calculations:');
  const probabilities = [0.1, 0.2, 0.3];
  const compoundProb = ProbabilityUtils.compoundProbability(probabilities);
  console.log('Individual probabilities:', probabilities);
  console.log('Compound probability (at least one success):', compoundProb.toFixed(4));
  
  const binomialProb = ProbabilityUtils.binomialProbability(10, 3, 0.3);
  console.log('Binomial probability (3 successes in 10 trials, p=0.3):', binomialProb.toFixed(4));
  
  // Create RNG-based effects
  console.log('\n✨ Creating RNG-Based Effects...');
  
  // Random power boost effect
  const randomPowerBoost = EffectFactory.createRandomEffect(
    'random-power-boost',
    'Random Power Boost',
    'power',
    -5, // min
    15, // max
    seededRNG
  );
  
  // Chance-based effect
  const chanceBasedEffect = EffectFactory.createChanceBasedEffect(
    'chance-boost',
    'Chance-Based Boost',
    'power',
    0.3, // 30% chance
    (baseValue: number) => baseValue * 1.5, // 50% increase
    seededRNG
  );
  
  // Weighted random effect
  const weightedRandomEffect = EffectFactory.createWeightedRandomEffect(
    'weighted-random',
    'Weighted Random Effect',
    [
      { value: { statType: 'power', value: 10 }, weight: 40 },
      { value: { statType: 'agility', value: 8 }, weight: 30 },
      { value: { statType: 'resilience', value: 5 }, weight: 20 },
      { value: { statType: 'energy', value: 15 }, weight: 10 }
    ],
    weightedRNG
  );
  
  // Apply RNG effects to player
  console.log('\n🎯 Applying RNG Effects...');
  player.addEffect(randomPowerBoost);
  player.addEffect(chanceBasedEffect);
  player.addEffect(weightedRandomEffect);
  
  console.log('Player effects applied:', player.getEffects().map(e => e.name));
  
  // Demonstrate effect application with multiple calculations
  console.log('\n📊 Multiple Effect Calculations:');
  for (let i = 0; i < 5; i++) {
    const stats = player.getCurrentStats();
    console.log(`Calculation ${i + 1}:`, {
      power: stats.get('power')?.toFixed(2),
      agility: stats.get('agility')?.toFixed(2),
      resilience: stats.get('resilience')?.toFixed(2),
      energy: stats.get('energy')?.toFixed(2)
    });
  }
  
  // Demonstrate weighted selection generator
  console.log('\n🎁 Weighted Selection Generator:');
  const effectChoices: WeightedChoice<AdditiveEffect>[] = [
    { value: new AdditiveEffect('effect-a', 'Effect A', 'power', 5, true, 1), weight: 50 },
    { value: new AdditiveEffect('effect-b', 'Effect B', 'agility', 8, true, 2), weight: 25 },
    { value: new AdditiveEffect('effect-c', 'Effect C', 'resilience', 12, true, 3), weight: 15 },
    { value: new AdditiveEffect('effect-d', 'Effect D', 'energy', 20, true, 4), weight: 8 },
    { value: new AdditiveEffect('effect-e', 'Effect E', 'luck', 10, true, 5), weight: 2 }
  ];
  
  const selectionGenerator = new WeightedSelectionGenerator(effectChoices, weightedRNG);
  
  console.log('Generating random effect selections:');
  for (let i = 0; i < 5; i++) {
    const effect = selectionGenerator.select();
    if (effect) {
      console.log(`  Selection ${i + 1}: ${effect.name}`);
    }
  }
  
  // Demonstrate random event applicator
  console.log('\n⚡ Random Event Applicator:');
  const randomEventApplicator = new RandomEventApplicator(
    'random-event',
    'Random Event Applicator',
    0.3, // 30% chance to trigger
    [
      new AdditiveEffect('random-bonus', 'Random Bonus', 'luck', 2, true, 1)
    ],
    [],
    seededRNG
  );
  
  console.log('Testing random event triggers:');
  for (let i = 0; i < 10; i++) {
    const triggered = randomEventApplicator.shouldTrigger();
    console.log(`  Attempt ${i + 1}: ${triggered ? 'TRIGGERED' : 'missed'}`);
  }
  
  // Create FrameManager and demonstrate RNG with frames
  console.log('\n📸 RNG with Frame Generation:');
  const frameManager = new FrameManager({
    trackStats: 'all',
    trackEffects: true,
    trackContext: false,
    maxCacheSize: 50,
    enableLazyEvaluation: true
  }, 3);
  
  // Create initial frame
  const initialFrame = frameManager.createFrame([player, enemy], undefined, {
    phase: 'initial',
    rngSeed: seededRNG.getSeed()
  });
  
  console.log('Initial frame created with RNG seed:', initialFrame.metadata?.rngSeed);
  
  // Apply some random effects and create another frame
  const randomEffect = EffectFactory.createRandomEffect(
    'frame-random',
    'Frame Random Effect',
    'power',
    0,
    10,
    seededRNG
  );
  
  player.addEffect(randomEffect);
  
  const secondFrame = frameManager.createFrame([player, enemy], undefined, {
    phase: 'after_random',
    rngSeed: seededRNG.getSeed()
  });
  
  console.log('Second frame created with RNG seed:', secondFrame.metadata?.rngSeed);
  
  // Demonstrate frame comparison with RNG effects
  const comparison = frameManager.compareWithLatest(secondFrame);
  if (comparison) {
    console.log('Frame comparison:');
    for (const diff of comparison.differences) {
      console.log(`  ${diff.entityId} (${diff.type}):`);
      for (const change of diff.changes) {
        console.log(`    ${change.statType}: ${change.oldValue} → ${change.newValue} (${change.difference > 0 ? '+' : ''}${change.difference})`);
      }
    }
  }
  
  // Demonstrate RNG manager statistics
  console.log('\n📈 RNG Manager Statistics:');
  console.log('Available generators:', Array.from(rngManager['_generators'].keys()));
  console.log('Default generator type:', rngManager.getDefaultGenerator().constructor.name);
  
  console.log('\n✅ RNG System Demonstration completed successfully!');
  
}

/**
 * Set up event listeners for RNG system
 */
function setupRNGEventListeners(): void {
  eventSystem.on(EventType.EFFECT_ADDED, (event) => {
    if (event.data.effect.name.includes('Random') || event.data.effect.name.includes('Critical')) {
      console.log(`🎲 RNG Effect added: ${event.data.effect.name} to entity ${event.data.entityId}`);
    }
  });

  eventSystem.on(EventType.EFFECT_REMOVED, (event) => {
    console.log(`➖ Effect removed: ${event.data.effectId} from entity ${event.data.entityId}`);
  });

  eventSystem.on(EventType.STAT_CHANGED, (event) => {
    console.log(`📊 Stat changed: ${event.data.statType} = ${event.data.value} for entity ${event.data.entityId}`);
  });

  eventSystem.on(EventType.FRAME_CREATED, (event) => {
    console.log(`📸 Frame created: ${event.data.frameId} with ${event.data.entityCount} entities`);
  });
}

export { runRNGExample, setupRNGEventListeners };
