import { Entity } from '../core/Entity';
import { AdditiveEffect } from '../core/effects';
import { 
  ActiveEffectUtils,
  BaseStatValueProvider
} from '../core/ActiveEffects';
import {
  InteractionManager,
  interactionManager
} from '../core/InteractionSystem';
import { eventSystem } from '../core/EventSystem';
import { EventType } from '../core/types';

/**
 * Comprehensive Interaction System Demonstration
 */
export function runInteractionExample(): void {
  console.log('🤝 Interaction System Demonstration');


  // Create entities with interaction-relevant stats
  const player = new Entity('player-interaction', {
    health: 100,
    maxHealth: 100,
    attack: 25,
    defense: 15,
    healing: 20,
    criticalHitChance: 0.2,
    criticalHitMultiplier: 2.0
  });

  const enemy = new Entity('enemy-interaction', {
    health: 80,
    maxHealth: 80,
    attack: 20,
    defense: 12,
    healing: 10,
    criticalHitChance: 0.15,
    criticalHitMultiplier: 1.8
  });

  console.log('\n📊 Initial Entity Stats:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'));
  console.log('Enemy - Health:', enemy.getStat('health'), 'Attack:', enemy.getStat('attack'), 'Defense:', enemy.getStat('defense'));

  // Add passive effects to entities
  console.log('\n🔄 Adding Passive Effects:');
  const playerPowerBoost = new AdditiveEffect('player-power', 'Player Power Boost', 'attack', 10, true, 1);
  const enemyDefenseBoost = new AdditiveEffect('enemy-defense', 'Enemy Defense Boost', 'defense', 5, true, 1);
  
  player.addEffect(playerPowerBoost);
  enemy.addEffect(enemyDefenseBoost);
  
  console.log('Added power boost to player (+10 attack)');
  console.log('Added defense boost to enemy (+5 defense)');

  // Add active effects for value requests
  console.log('\n⚡ Adding Active Effects:');
  const playerDamageProvider = ActiveEffectUtils.createActiveEffect(
    'player-damage',
    'Player Damage Provider',
    ['attack'],
    ['damage'],
    (purpose, context) => {
      const attackValue = context.currentStats.get('attack') || 0;
      return attackValue * 1.2; // 1.2x damage multiplier
    },
    5
  );

  const enemyDamageProvider = ActiveEffectUtils.createActiveEffect(
    'enemy-damage',
    'Enemy Damage Provider',
    ['attack'],
    ['damage'],
    (purpose, context) => {
      const attackValue = context.currentStats.get('attack') || 0;
      return attackValue * 1.0; // 1.0x damage multiplier
    },
    5
  );

  const playerHealingProvider = ActiveEffectUtils.createActiveEffect(
    'player-healing',
    'Player Healing Provider',
    ['healing'],
    ['healing'],
    (purpose, context) => {
      const healingValue = context.currentStats.get('healing') || 0;
      return healingValue * 1.5; // 1.5x healing multiplier
    },
    5
  );

  player.addEffect(playerDamageProvider);
  enemy.addEffect(enemyDamageProvider);
  player.addEffect(playerHealingProvider);

  console.log('Added damage providers to both entities');
  console.log('Added healing provider to player');

  // Add gear to entities
  console.log('\n🛡️ Adding Gear:');
  const playerSword = ActiveEffectUtils.createGear(
    'player-sword',
    'Player Sword',
    'weapon',
    10,
    ['damage'],
    (purpose, context) => {
      if (purpose === 'damage') {
        const attackValue = context.currentStats.get('attack') || 0;
        return 15 + (attackValue * 0.3); // base damage + attack scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'weapon'
  );

  const enemyShield = ActiveEffectUtils.createGear(
    'enemy-shield',
    'Enemy Shield',
    'armor',
    8,
    ['defense'],
    (purpose, context) => {
      if (purpose === 'defense') {
        const defenseValue = context.currentStats.get('defense') || 0;
        return 8 + (defenseValue * 0.2); // base defense + defense scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'shield'
  );

  player.equipGear(playerSword, 'weapon');
  enemy.equipGear(enemyShield, 'shield');

  console.log('Equipped sword on player');
  console.log('Equipped shield on enemy');

  // Demonstrate value requests before interactions
  console.log('\n🎯 Value Requests (Pre-Interaction):');
  const playerDamageRequest = player.requestValue('damage');
  const enemyDamageRequest = enemy.requestValue('damage');
  const playerHealingRequest = player.requestValue('healing');

  console.log(`Player damage: ${playerDamageRequest?.value} (provided by ${playerDamageRequest?.provider})`);
  console.log(`Enemy damage: ${enemyDamageRequest?.value} (provided by ${enemyDamageRequest?.provider})`);
  console.log(`Player healing: ${playerHealingRequest?.value} (provided by ${playerHealingRequest?.provider})`);

  // Demonstrate damage interaction
  console.log('\n⚔️ Damage Interaction (Player → Enemy):');
  const damageResult = interactionManager.executeInteraction(
    player,
    enemy,
    'damage',
    {
      targetType: 'enemy',
      distance: 2,
      element: 'physical'
    }
  );

  if (damageResult) {
    console.log('Damage Interaction Result:');
    console.log(`  Success: ${damageResult.success}`);
    console.log(`  Original Value: ${damageResult.originalValue}`);
    console.log(`  Final Value: ${damageResult.finalValue}`);
    console.log(`  Duration: ${damageResult.duration}ms`);
    
    if (damageResult.stateChanges.has(enemy.id)) {
      const enemyChanges = damageResult.stateChanges.get(enemy.id)!;
      console.log(`  Enemy State Changes:`);
      for (const [statType, value] of enemyChanges) {
        console.log(`    ${statType}: ${value}`);
      }
    }
  }

  // Show entity stats after damage
  console.log('\n📊 Entity Stats After Damage:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'));
  console.log('Enemy - Health:', enemy.getStat('health'), 'Attack:', enemy.getStat('attack'));

  // Demonstrate healing interaction
  console.log('\n💚 Healing Interaction (Player → Enemy):');
  const healingResult = interactionManager.executeInteraction(
    player,
    enemy,
    'healing',
    {
      targetType: 'ally',
      distance: 1,
      element: 'magical'
    }
  );

  if (healingResult) {
    console.log('Healing Interaction Result:');
    console.log(`  Success: ${healingResult.success}`);
    console.log(`  Original Value: ${healingResult.originalValue}`);
    console.log(`  Final Value: ${healingResult.finalValue}`);
    console.log(`  Duration: ${healingResult.duration}ms`);
    
    if (healingResult.stateChanges.has(enemy.id)) {
      const enemyChanges = healingResult.stateChanges.get(enemy.id)!;
      console.log(`  Enemy State Changes:`);
      for (const [statType, value] of enemyChanges) {
        console.log(`    ${statType}: ${value}`);
      }
    }
  }

  // Show entity stats after healing
  console.log('\n📊 Entity Stats After Healing:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'));
  console.log('Enemy - Health:', enemy.getStat('health'), 'Attack:', enemy.getStat('attack'));

  // Demonstrate reverse interaction (Enemy → Player)
  console.log('\n⚔️ Damage Interaction (Enemy → Player):');
  const reverseDamageResult = interactionManager.executeInteraction(
    enemy,
    player,
    'damage',
    {
      targetType: 'enemy',
      distance: 1,
      element: 'physical'
    }
  );

  if (reverseDamageResult) {
    console.log('Reverse Damage Interaction Result:');
    console.log(`  Success: ${reverseDamageResult.success}`);
    console.log(`  Original Value: ${reverseDamageResult.originalValue}`);
    console.log(`  Final Value: ${reverseDamageResult.finalValue}`);
    console.log(`  Duration: ${reverseDamageResult.duration}ms`);
  }

  // Show final entity stats
  console.log('\n📊 Final Entity Stats:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'));
  console.log('Enemy - Health:', enemy.getStat('health'), 'Attack:', enemy.getStat('attack'));

  // Demonstrate interaction system statistics
  console.log('\n📈 Interaction System Statistics:');
  console.log(`Active Interactions: ${interactionManager.getActiveInteractions().size}`);
  console.log(`Registered Modifiers: ${interactionManager.getAllModifiers().size}`);
  console.log(`Registered State Adjusters: ${interactionManager.getAllStateAdjusters().size}`);
  console.log(`Registered Notifiers: ${interactionManager.getAllNotifiers().size}`);

  // Demonstrate custom interaction definition
  console.log('\n🔧 Custom Interaction Definition:');
  const customInteraction = {
    id: 'custom-interaction',
    name: 'Custom Interaction',
    interactionType: 'custom',
    valuePurpose: 'custom_value',
    valueParameters: {
      customParameter: 'test',
      multiplier: 1.5
    },
    phases: ['initiation', 'value_request', 'value_modification', 'state_adjustment', 'notification', 'completion'] as any,
    modifiers: [],
    stateAdjusters: [],
    notifiers: []
  };

  interactionManager.registerInteractionDefinition(customInteraction);
  console.log('Registered custom interaction definition');

  // Demonstrate entity interaction capabilities
  console.log('\n🎮 Entity Interaction Capabilities:');
  console.log('Player interaction modifiers:', player.getAllInteractionModifiers().size);
  console.log('Player state adjusters:', player.getAllStateAdjusters().size);
  console.log('Player interaction notifiers:', player.getAllInteractionNotifiers().size);
  console.log('Enemy interaction modifiers:', enemy.getAllInteractionModifiers().size);
  console.log('Enemy state adjusters:', enemy.getAllStateAdjusters().size);
  console.log('Enemy interaction notifiers:', enemy.getAllInteractionNotifiers().size);

  console.log('\n✅ Interaction System Demonstration completed successfully!');
  console.log('\n💡 Key Points:');
  console.log('- Interactions follow a structured 5-phase flow');
  console.log('- Entities can modify values during interactions');
  console.log('- State adjustments happen based on interaction outcomes');
  console.log('- Notifications inform entities about interaction results');
  console.log('- The system supports complex multi-entity interactions');
  console.log('- All interaction components are generic and extensible');
}

/**
 * Set up event listeners for interaction system
 */
export function setupInteractionEventListeners(): void {
  // Listen for specific interaction events
  eventSystem.on(EventType.INTERACTION_VALUE_REQUESTED, (event) => {
    console.log(`🤝 Interaction Event: value_requested in ${event.data.interactionType} (${event.data.phase})`);
  });

  eventSystem.on(EventType.INTERACTION_VALUE_MODIFIED, (event) => {
    console.log(`🤝 Interaction Event: value_modified in ${event.data.interactionType} (${event.data.phase})`);
  });

  eventSystem.on(EventType.INTERACTION_STATE_ADJUSTED, (event) => {
    console.log(`🤝 Interaction Event: state_adjusted in ${event.data.interactionType} (${event.data.phase})`);
  });

  eventSystem.on(EventType.INTERACTION_NOTIFICATIONS_SENT, (event) => {
    console.log(`🤝 Interaction Event: notifications_sent in ${event.data.interactionType} (${event.data.phase})`);
  });

  eventSystem.on(EventType.INTERACTION_COMPLETED, (event) => {
    console.log(`🤝 Interaction Event: interaction_completed in ${event.data.interactionType} (${event.data.phase})`);
  });

  // Keep CUSTOM_EVENT for other interaction-related events
  eventSystem.on(EventType.CUSTOM_EVENT, (event) => {
    if (event.data?.type === 'interaction_modifier_registered') {
      console.log(`🔧 Interaction modifier registered: ${event.data.modifierName} for entity ${event.data.entityId}`);
    } else if (event.data?.type === 'state_adjuster_registered') {
      console.log(`⚙️ State adjuster registered: ${event.data.adjusterName} for entity ${event.data.entityId}`);
    } else if (event.data?.type === 'interaction_notifier_registered') {
      console.log(`📢 Interaction notifier registered: ${event.data.notifierName} for entity ${event.data.entityId}`);
    }
  });
}
