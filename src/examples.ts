import { Entity } from './Entity';
import { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect, 
  ConditionalEffect,
  ComplexEffect 
} from './effects';
import { FrameManager } from './FrameManager';
import { 
  effectApplicatorManager,
  StatThresholdApplicator,
  PercentageThresholdApplicator,
  CustomEventApplicator,
  CooldownEffectApplicator
} from './EffectApplicator';
import { eventSystem } from './EventSystem';
import { EventType, FrameConfig } from './types';
import { runRNGExample, setupRNGEventListeners } from './RNGExamples';
import { runActiveEffectsExample, setupActiveEffectsEventListeners } from './ActiveEffectsExamples';
import { runInteractionExample, setupInteractionEventListeners } from './InteractionSystemExamples';
import { runGearPassiveEffectsExample, setupGearPassiveEffectsEventListeners } from './GearPassiveEffectsExamples';

/**
 * Example usage of the Entity Effects API with event-driven effects
 */
function runExample(): void {
  console.log('🎮 Event-Driven Effect Management System Example\n');
  
  // Create multiple entities with generic stat types
  const player = new Entity('player-1', {
    vitality: 100,    // Generic health/resource stat
    power: 20,        // Generic attack/strength stat
    resilience: 10,   // Generic defense stat
    agility: 15,      // Generic speed stat
    energy: 50        // Generic mana/resource stat
  });
  
  const enemy = new Entity('enemy-1', {
    vitality: 80,
    power: 15,
    resilience: 8,
    agility: 12,
    energy: 30
  });
  
  const ally = new Entity('ally-1', {
    vitality: 120,
    power: 18,
    resilience: 12,
    agility: 14,
    energy: 40
  });
  
  console.log('📊 Initial Stats:');
  console.log('Player - Vitality:', player.getStat('vitality'), 'Power:', player.getStat('power'));
  console.log('Enemy - Vitality:', enemy.getStat('vitality'), 'Power:', enemy.getStat('power'));
  console.log('Ally - Vitality:', ally.getStat('vitality'), 'Power:', ally.getStat('power'));
  
  // Add effects to different entities
  console.log('\n✨ Adding Effects...');
  
  // Player gets power bonus and vitality boost
  const powerBonus = new AdditiveEffect('power-bonus', 'Enhanced Power', 'power', 10, true, 1);
  const vitalityBoost = new MultiplicativeEffect('vitality-boost', 'Vitality Enhancement', 'vitality', 2.0, true, 2);
  player.addEffect(powerBonus);
  player.addEffect(vitalityBoost);
  
  // Enemy gets defensive buff
  const defensiveAura = new PercentageEffect('defensive-aura', 'Defensive Aura', 'resilience', 0.5, true, 1);
  enemy.addEffect(defensiveAura);
  
  // Ally gets agility enhancement
  const agilityBoost = new PercentageEffect('agility-boost', 'Agility Enhancement', 'agility', 0.3, true, 1);
  ally.addEffect(agilityBoost);
  
  // Set up event-driven effect applicators
  console.log('\n🎯 Setting up Event-Driven Effect Applicators...');
  
  // Low vitality applicator: Add power boost when vitality drops below 50%
  const lowVitalityApplicator = new PercentageThresholdApplicator(
    'low-vitality-applicator',
    'Low Vitality Applicator',
    [
      new AdditiveEffect('desperation-power', 'Desperation Power', 'power', 15, true, 4),
      new AdditiveEffect('desperation-resilience', 'Desperation Resilience', 'resilience', -5, true, 4)
    ],
    [],
    'vitality',
    '<=',
    0.5 // Trigger at 50% vitality
  );
  effectApplicatorManager.registerApplicator(lowVitalityApplicator);
  
  // High vitality applicator: Add regeneration when vitality rises above 80%
  const highVitalityApplicator = new PercentageThresholdApplicator(
    'high-vitality-applicator',
    'High Vitality Applicator',
    [
      new AdditiveEffect('regeneration', 'Regeneration', 'vitality', 5, true, 1)
    ],
    [],
    'vitality',
    '>=',
    0.8 // Trigger at 80% vitality
  );
  effectApplicatorManager.registerApplicator(highVitalityApplicator);
  
  // Low energy applicator: Add energy drain when energy drops below 20
  const lowEnergyApplicator = new StatThresholdApplicator(
    'low-energy-applicator',
    'Low Energy Applicator',
    [
      new AdditiveEffect('energy-drain', 'Energy Drain', 'energy', -2, true, 2)
    ],
    [],
    'energy',
    '<',
    20
  );
  effectApplicatorManager.registerApplicator(lowEnergyApplicator);
  
  // Custom event applicator: Add special effects on custom events
  const specialEventApplicator = new CustomEventApplicator(
    'special-event-applicator',
    'Special Event Applicator',
    [
      new AdditiveEffect('special-power', 'Special Power', 'power', 25, false, 5) // Non-stackable
    ],
    [],
    'power_surge',
    (event, context) => {
      const powerLevel = event.data?.powerLevel ?? 0;
      return powerLevel > 5;
    }
  );
  effectApplicatorManager.registerApplicator(specialEventApplicator);
  
  // Cooldown effect applicator: Add temporary effects with cooldown
  const cooldownApplicator = new CooldownEffectApplicator(
    'cooldown-applicator',
    'Cooldown Effect Applicator',
    [
      new AdditiveEffect('burst-power', 'Burst Power', 'power', 30, true, 3),
      new AdditiveEffect('burst-agility', 'Burst Agility', 'agility', 20, true, 3)
    ],
    [],
    5000, // 5 second cooldown
    EventType.CUSTOM_EVENT,
    'ability_trigger'
  );
  effectApplicatorManager.registerApplicator(cooldownApplicator);
  
  // Create FrameManager with transient frames and small recent cache
  const frameManager = new FrameManager({
    trackStats: 'all', // Track all stats
    trackEffects: true,
    trackContext: false, // Skip context for performance
    maxCacheSize: 50,
    enableLazyEvaluation: true
  }, 3); // Keep only 3 recent frames
  
  // Create initial transient frame (not stored by default)
  console.log('\n📸 Creating Initial Transient Frame...');
  const initialFrame = frameManager.createFrame([player, enemy, ally], undefined, {
    battlePhase: 'preparation',
    location: 'forest',
    turnNumber: 1
  });
  
  console.log(`Transient frame ${initialFrame.frameId} created with ${initialFrame.entityIds.length} entities`);
  
  // Demonstrate lazy evaluation - stats are only calculated when accessed
  console.log('Demonstrating lazy evaluation:');
  const playerStats = initialFrame.getEntityStats('player-1');
  console.log(`Player stats (lazy loaded):`, playerStats ? Object.fromEntries(playerStats) : 'Not loaded');
  
  // Get only stats of interest (selective access)
  const combatStats = initialFrame.getStatsOfInterest('player-1', ['vitality', 'power', 'resilience']);
  console.log(`Player combat stats:`, combatStats);
  
  // Create an explicit snapshot for comparison
  console.log('\n📸 Creating Explicit Snapshot...');
  const snapshot = frameManager.createSnapshot([player, enemy, ally], 'battle-start', undefined, {
    battlePhase: 'preparation',
    location: 'forest',
    turnNumber: 1
  });
  console.log(`Snapshot 'battle-start' created with ${snapshot.entityIds.length} entities`);
  
  // Simulate events to trigger effect applicators
  console.log('\n⚡ Simulating Events to Trigger Effect Applicators...');
  
  // Simulate vitality drop (should trigger desperation power)
  console.log('Simulating vitality drop...');
  player.setBaseStat('vitality', 40); // Drop to 40% vitality
  eventSystem.emitEvent(EventType.STAT_CHANGED, {
    entityId: player.id,
    statType: 'vitality',
    value: 40
  });
  
  // Handle the event for the player
  effectApplicatorManager.handleEventForEntity({
    type: EventType.STAT_CHANGED,
    timestamp: Date.now(),
    data: { entityId: player.id, statType: 'vitality', value: 40 }
  }, player);
  
  console.log('Player effects after vitality drop:', player.getEffects().map(e => e.name));
  
  // Simulate vitality recovery (should trigger regeneration)
  console.log('\nSimulating vitality recovery...');
  player.setBaseStat('vitality', 85); // Rise to 85% vitality
  eventSystem.emitEvent(EventType.STAT_CHANGED, {
    entityId: player.id,
    statType: 'vitality',
    value: 85
  });
  
  // Handle the event for the player
  effectApplicatorManager.handleEventForEntity({
    type: EventType.STAT_CHANGED,
    timestamp: Date.now(),
    data: { entityId: player.id, statType: 'vitality', value: 85 }
  }, player);
  
  console.log('Player effects after vitality recovery:', player.getEffects().map(e => e.name));
  
  // Simulate energy drop (should trigger energy drain)
  console.log('\nSimulating energy drop...');
  player.setBaseStat('energy', 15); // Drop below 20
  eventSystem.emitEvent(EventType.STAT_CHANGED, {
    entityId: player.id,
    statType: 'energy',
    value: 15
  });
  
  // Handle the event for the player
  effectApplicatorManager.handleEventForEntity({
    type: EventType.STAT_CHANGED,
    timestamp: Date.now(),
    data: { entityId: player.id, statType: 'energy', value: 15 }
  }, player);
  
  console.log('Player effects after energy drop:', player.getEffects().map(e => e.name));
  
  // Simulate custom event (should trigger special power)
  console.log('\nSimulating custom power surge event...');
  eventSystem.emitEvent(EventType.CUSTOM_EVENT, {
    type: 'power_surge',
    powerLevel: 7,
    entityId: player.id
  });
  
  // Handle the event for the player
  effectApplicatorManager.handleEventForEntity({
    type: EventType.CUSTOM_EVENT,
    timestamp: Date.now(),
    data: { type: 'power_surge', powerLevel: 7, entityId: player.id }
  }, player);
  
  console.log('Player effects after power surge:', player.getEffects().map(e => e.name));
  
  // Demonstrate cooldown system
  console.log('\n⏰ Demonstrating Cooldown System...');
  
  // Trigger cooldown ability
  console.log('Triggering cooldown ability...');
  eventSystem.emitEvent(EventType.CUSTOM_EVENT, {
    type: 'ability_trigger',
    entityId: player.id
  });
  
  effectApplicatorManager.handleEventForEntity({
    type: EventType.CUSTOM_EVENT,
    timestamp: Date.now(),
    data: { type: 'ability_trigger', entityId: player.id }
  }, player);
  
  console.log('Player effects after ability trigger:', player.getEffects().map(e => e.name));
  
  // Check cooldown status
  const cooldownStatus = cooldownApplicator.getCooldownStatus(player.id);
  console.log('Cooldown status:', {
    isOnCooldown: cooldownStatus.isOnCooldown,
    remainingTime: cooldownStatus.remainingTime,
    activeCooldowns: cooldownStatus.activeCooldowns.length
  });
  
  // Try to trigger again (should be blocked by cooldown)
  console.log('\nTrying to trigger ability again (should be blocked)...');
  effectApplicatorManager.handleEventForEntity({
    type: EventType.CUSTOM_EVENT,
    timestamp: Date.now(),
    data: { type: 'ability_trigger', entityId: player.id }
  }, player);
  
  console.log('Player effects after second trigger attempt:', player.getEffects().map(e => e.name));
  
  // Create second transient frame (lightweight for performance)
  console.log('\n📸 Creating Second Transient Frame (Lightweight)...');
  const secondFrame = frameManager.createLightweightFrame([player, enemy, ally], ['vitality', 'power'], {
    battlePhase: 'combat',
    location: 'forest',
    turnNumber: 2
  });
  
  console.log(`Lightweight transient frame ${secondFrame.frameId} created with ${secondFrame.entityIds.length} entities`);
  
  // Demonstrate comparison with snapshot
  console.log('\n🔍 Comparing Current Frame with Snapshot...');
  const comparison = frameManager.compareWithSnapshot(secondFrame, 'battle-start');
  if (comparison) {
    console.log(`Time difference: ${comparison.timeDifference}ms`);
    console.log('Changes from snapshot:');
    for (const diff of comparison.differences) {
      console.log(`  ${diff.entityId} (${diff.type}):`);
      for (const change of diff.changes) {
        console.log(`    ${change.statType}: ${change.oldValue} → ${change.newValue} (${change.difference > 0 ? '+' : ''}${change.difference})`);
      }
    }
  }
  
  // Demonstrate comparison with latest frame
  console.log('\n🔍 Comparing with Latest Frame...');
  const latestComparison = frameManager.compareWithLatest(secondFrame);
  if (latestComparison) {
    console.log(`Time difference: ${latestComparison.timeDifference}ms`);
    console.log('Changes from latest:');
    for (const diff of latestComparison.differences) {
      console.log(`  ${diff.entityId} (${diff.type}):`);
      for (const change of diff.changes) {
        console.log(`    ${change.statType}: ${change.oldValue} → ${change.newValue} (${change.difference > 0 ? '+' : ''}${change.difference})`);
      }
    }
  }
  
  // Get frame statistics and memory usage
  console.log('\n📈 Frame Statistics:');
  const stats = frameManager.getFrameStats();
  console.log(`Total frames: ${stats.totalFrames}`);
  console.log(`Average entities per frame: ${stats.averageEntitiesPerFrame.toFixed(2)}`);
  console.log(`Time span: ${stats.timeSpan}ms`);
  console.log('Entity participation:');
  for (const [entityId, count] of stats.entityCounts) {
    console.log(`  ${entityId}: ${count} frames`);
  }
  
  // Memory usage statistics
  console.log('\n💾 Memory Usage Statistics:');
  const memoryStats = frameManager.getMemoryStats();
  console.log(`Snapshots: ${memoryStats.snapshots}`);
  console.log(`Recent cache: ${memoryStats.recentCache}`);
  console.log(`Total memory usage: ${memoryStats.totalMemoryUsage} cache entries`);
  console.log(`Average memory per frame: ${memoryStats.averageMemoryPerFrame.toFixed(2)} cache entries`);
  
  // Demonstrate recent cache management
  console.log('\n📋 Recent Cache Management:');
  const recentFrames = frameManager.getRecentFrames();
  console.log(`Recent frames (${recentFrames.length}):`);
  for (const frame of recentFrames) {
    console.log(`  ${frame.frameId} (${new Date(frame.timestamp).toISOString()})`);
  }
  
  // Demonstrate snapshot management
  console.log('\n📸 Snapshot Management:');
  const snapshots = frameManager.getAllSnapshots();
  console.log(`Snapshots (${snapshots.length}):`);
  for (const snapshot of snapshots) {
    console.log(`  ${snapshot.frameId} (${new Date(snapshot.timestamp).toISOString()})`);
  }
  
  // Demonstrate single entity frame (convenience method)
  console.log('\n📸 Creating Single Entity Frame...');
  const singleFrame = frameManager.createSingleEntityFrame(player, undefined, {
    action: 'special_ability',
    ability: 'fireball'
  });
  
  console.log(`Single entity frame created:`, {
    frameId: singleFrame.frameId,
    entityCount: singleFrame.entityIds.length,
    entityId: singleFrame.entityIds[0]
  });
  
  // Demonstrate stackability per stat type
  console.log('\n🔗 Demonstrating Per-Stat-Type Stackability...');
  console.log('Player current effects:');
  for (const effect of player.getEffects()) {
    console.log(`  ${effect.name}:`, effect.statTypes.map(statType => {
      const rule = effect.stackabilityRules.find(r => r.statType === statType);
      return `${statType} (${rule?.stackable ? 'stackable' : 'non-stackable'})`;
    }));
  }
  
  console.log('\n✅ Generic Event-Driven Effect Management System Example completed successfully!');
  
  // Run RNG system demonstration
  console.log('\n' + '='.repeat(60));
  runRNGExample();
  
      // Run active effects demonstration
      console.log('\n' + '='.repeat(60));
      runActiveEffectsExample();

      // Run interaction system demonstration
      console.log('\n' + '='.repeat(60));
      runInteractionExample();

      // Run gear passive effects demonstration
      console.log('\n' + '='.repeat(60));
      runGearPassiveEffectsExample();
    }

/**
 * Set up event listeners to demonstrate the event system
 */
function setupEventListeners(): void {
  console.log('🎧 Setting up event listeners...\n');
  
  eventSystem.on(EventType.EFFECT_ADDED, (event) => {
    console.log(`➕ Effect added: ${event.data.effect.name} to entity ${event.data.entityId}`);
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
  
  // Set up RNG-specific event listeners
  setupRNGEventListeners();
  
      // Set up active effects event listeners
      setupActiveEffectsEventListeners();

      // Set up interaction system event listeners
      setupInteractionEventListeners();

      // Set up gear passive effects event listeners
      setupGearPassiveEffectsEventListeners();
    }

export { runExample, setupEventListeners };
