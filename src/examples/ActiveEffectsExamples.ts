import { Entity } from '../core/Entity';
import { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect
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
  RandomEffect,
  ChanceBasedEffect,
  WeightedRandomEffect,
  RandomEventApplicator,
  WeightedSelectionGenerator,
  RNGEffectsUtils
} from '../core/RNGEffects';
import {
  BaseActiveEffect,
  GenericGear,
  BaseStatValueProvider,
  ActiveEffectUtils
} from '../core/ActiveEffects';
import { eventSystem } from '../core/EventSystem';
import { EventType, FrameConfig } from '../core/types';
import { demonstrateConsumerRPGActiveEffects } from './ConsumerRPGActiveEffects';

/**
 * Comprehensive Active Effects and Gear System Demonstration
 */
function runActiveEffectsExample(): void {
  console.log('⚡ Active Effects and Gear System Demonstration\n');
  
  // Create entities with generic stat types
  const player = new Entity('player-1', {
    vitality: 100,
    power: 20,
    resilience: 10,
    agility: 15,
    energy: 50,
    luck: 5,
    healing: 8,
    defense: 12
  });
  
  const enemy = new Entity('enemy-1', {
    vitality: 80,
    power: 15,
    resilience: 8,
    agility: 12,
    energy: 30,
    luck: 3,
    healing: 5,
    defense: 10
  });
  
  console.log('📊 Initial Stats:');
  console.log('Player - Power:', player.getStat('power'), 'Defense:', player.getStat('defense'), 'Healing:', player.getStat('healing'));
  console.log('Enemy - Power:', enemy.getStat('power'), 'Defense:', enemy.getStat('defense'), 'Healing:', enemy.getStat('healing'));
  
  // Demonstrate passive effects (existing system)
  console.log('\n🔄 Passive Effects (Existing System):');
  const passivePowerBoost = new AdditiveEffect('passive-power', 'Passive Power Boost', 'power', 10, true, 1);
  player.addEffect(passivePowerBoost);
  
  console.log('Added passive power boost (+10)');
  console.log('Player power after passive effect:', player.getStat('power'));
  
  // Demonstrate active effects using generic system
  console.log('\n⚡ Active Effects (Generic System):');
  
  // Create active effects using generic utility
  const damageProvider = ActiveEffectUtils.createActiveEffect(
    'damage-provider',
    'Damage Provider',
    ['power'],
    ['damage', 'attack_damage'],
    (purpose, context) => {
      const powerValue = context.currentStats.get('power') || 0;
      return powerValue * 1.5; // 1.5x damage multiplier
    },
    5 // priority
  );
  
  const healingProvider = ActiveEffectUtils.createActiveEffect(
    'healing-provider',
    'Healing Provider',
    ['healing'],
    ['healing', 'restoration'],
    (purpose, context) => {
      const healingValue = context.currentStats.get('healing') || 0;
      return healingValue * 2.0; // 2x healing multiplier
    },
    3 // priority
  );
  
  const movementProvider = ActiveEffectUtils.createActiveEffect(
    'movement-provider',
    'Movement Provider',
    ['agility'],
    ['movement', 'speed', 'travel'],
    (purpose, context) => {
      const agilityValue = context.currentStats.get('agility') || 0;
      return agilityValue * 1.2; // 1.2x movement multiplier
    },
    2 // priority
  );
  
  const defenseProvider = ActiveEffectUtils.createActiveEffect(
    'defense-provider',
    'Defense Provider',
    ['resilience'],
    ['defense', 'protection', 'armor'],
    (purpose, context) => {
      const resilienceValue = context.currentStats.get('resilience') || 0;
      return resilienceValue * 1.3; // 1.3x defense multiplier
    },
    4 // priority
  );
  
  // Add active effects to player
  player.addEffect(damageProvider);
  player.addEffect(healingProvider);
  player.addEffect(movementProvider);
  player.addEffect(defenseProvider);
  
  console.log('Added active effects:');
  console.log('- Damage Provider (1.5x power for damage)');
  console.log('- Healing Provider (2x healing for restoration)');
  console.log('- Movement Provider (1.2x agility for movement)');
  console.log('- Defense Provider (1.3x defense for protection)');
  
  // Demonstrate value requests
  console.log('\n🎯 Value Requests:');
  
  // Request damage value
  const damageResult = player.requestValue('damage');
  if (damageResult) {
    console.log(`Damage request: ${damageResult.value} (provided by ${damageResult.provider})`);
  }
  
  // Request healing value
  const healingResult = player.requestValue('healing');
  if (healingResult) {
    console.log(`Healing request: ${healingResult.value} (provided by ${healingResult.provider})`);
  }
  
  // Request movement value
  const movementResult = player.requestValue('movement');
  if (movementResult) {
    console.log(`Movement request: ${movementResult.value} (provided by ${movementResult.provider})`);
  }
  
  // Request defense value
  const defenseResult = player.requestValue('defense');
  if (defenseResult) {
    console.log(`Defense request: ${defenseResult.value} (provided by ${defenseResult.provider})`);
  }
  
  // Request unsupported purpose
  const unsupportedResult = player.requestValue('unsupported_purpose');
  console.log(`Unsupported purpose request: ${unsupportedResult ? 'handled' : 'not handled'}`);
  
  // Demonstrate gear system using generic system
  console.log('\n🛡️ Gear System (Generic System):');
  
  // Create gear using generic utility
  const sword = ActiveEffectUtils.createGear(
    'iron-sword',
    'Iron Sword',
    'weapon',
    10, // High priority for weapons
    ['damage', 'attack_damage'],
    (purpose, context) => {
      if (purpose === 'damage' || purpose === 'attack_damage') {
        const powerValue = context.currentStats.get('power') || 0;
        return 25 + (powerValue * 0.5); // base damage + power scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'weapon'
  );
  
  const shield = ActiveEffectUtils.createGear(
    'iron-shield',
    'Iron Shield',
    'armor',
    8, // High priority for armor
    ['defense', 'protection', 'armor'],
    (purpose, context) => {
      if (purpose === 'defense' || purpose === 'protection' || purpose === 'armor') {
        const resilienceValue = context.currentStats.get('resilience') || 0;
        return 15 + (resilienceValue * 0.3); // base defense + resilience scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'shield'
  );
  
  const healingStaff = ActiveEffectUtils.createGear(
    'healing-staff',
    'Healing Staff',
    'tool',
    5, // Medium priority for tools
    ['healing', 'restoration'],
    (purpose, context) => {
      if (purpose === 'healing' || purpose === 'restoration') {
        const healingValue = context.currentStats.get('healing') || 0;
        return 20 + (healingValue * 0.8); // base healing + healing scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'staff'
  );
  
  const speedBoots = ActiveEffectUtils.createGear(
    'speed-boots',
    'Speed Boots',
    'accessory',
    3, // Lower priority for accessories
    ['movement', 'speed'],
    (purpose, context) => {
      if (purpose === 'movement' || purpose === 'speed') {
        const agilityValue = context.currentStats.get('agility') || 0;
        return 5 + (agilityValue * 0.4); // base speed + agility scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'boots'
  );
  
  // Equip gear
  player.equipGear(sword, 'weapon');
  player.equipGear(shield, 'shield');
  player.equipGear(healingStaff, 'staff');
  player.equipGear(speedBoots, 'boots');
  
  console.log('Equipped gear:');
  console.log('- Iron Sword (weapon slot)');
  console.log('- Iron Shield (shield slot)');
  console.log('- Healing Staff (staff slot)');
  console.log('- Speed Boots (boots slot)');
  
  // Demonstrate value requests with gear
  console.log('\n🎯 Value Requests with Gear:');
  
  const damageWithGear = player.requestValue('damage');
  if (damageWithGear) {
    console.log(`Damage with gear: ${damageWithGear.value} (provided by ${damageWithGear.provider})`);
  }
  
  const healingWithGear = player.requestValue('healing');
  if (healingWithGear) {
    console.log(`Healing with gear: ${healingWithGear.value} (provided by ${healingWithGear.provider})`);
  }
  
  const movementWithGear = player.requestValue('movement');
  if (movementWithGear) {
    console.log(`Movement with gear: ${movementWithGear.value} (provided by ${movementWithGear.provider})`);
  }
  
  const defenseWithGear = player.requestValue('defense');
  if (defenseWithGear) {
    console.log(`Defense with gear: ${defenseWithGear.value} (provided by ${defenseWithGear.provider})`);
  }
  
  // Demonstrate priority system
  console.log('\n🏆 Priority System:');
  
  // Create a high-priority damage provider using generic system
  const highPriorityDamage = ActiveEffectUtils.createActiveEffect(
    'high-priority-damage',
    'High Priority Damage',
    ['power'],
    ['damage', 'attack_damage'],
    (purpose, context) => {
      const powerValue = context.currentStats.get('power') || 0;
      return powerValue * 3.0; // 3x damage multiplier
    },
    15 // higher priority than gear
  );
  
  player.addEffect(highPriorityDamage);
  
  const damageWithPriority = player.requestValue('damage');
  if (damageWithPriority) {
    console.log(`Damage with high priority effect: ${damageWithPriority.value} (provided by ${damageWithPriority.provider})`);
  }
  
  // Demonstrate value providers
  console.log('\n🔧 Value Providers:');
  
  // Create a base stat value provider as fallback
  const baseStatProvider = ActiveEffectUtils.createBaseStatProvider(
    'base-stat-provider',
    'Base Stat Provider',
    1, // low priority (fallback)
    ['damage', 'healing', 'movement', 'defense'],
    'power',
    0.5 // 0.5x base power scaling
  );
  
  player.registerValueProvider(baseStatProvider);
  
  // Request a value that only the base stat provider can handle
  const fallbackResult = player.requestValue('damage', { useFallback: true });
  if (fallbackResult) {
    console.log(`Fallback damage: ${fallbackResult.value} (provided by ${fallbackResult.provider})`);
  }
  
  // Demonstrate gear swapping
  console.log('\n🔄 Gear Swapping:');
  
  // Create a better weapon using generic system
  const betterSword = ActiveEffectUtils.createGear(
    'steel-sword',
    'Steel Sword',
    'weapon',
    10, // Same priority as original sword
    ['damage', 'attack_damage'],
    (purpose, context) => {
      if (purpose === 'damage' || purpose === 'attack_damage') {
        const powerValue = context.currentStats.get('power') || 0;
        return 40 + (powerValue * 0.7); // higher base damage + better scaling
      }
      return undefined;
    },
    [], // No passive effects for this example
    'weapon'
  );
  
  // Unequip old weapon and equip new one
  const oldWeapon = player.unequipGear('weapon');
  if (oldWeapon) {
    console.log(`Unequipped: ${oldWeapon.name}`);
  }
  
  player.equipGear(betterSword, 'weapon');
  console.log(`Equipped: ${betterSword.name}`);
  
  const damageWithBetterWeapon = player.requestValue('damage');
  if (damageWithBetterWeapon) {
    console.log(`Damage with better weapon: ${damageWithBetterWeapon.value} (provided by ${damageWithBetterWeapon.provider})`);
  }
  
  // Demonstrate complex value requests with parameters
  console.log('\n📊 Complex Value Requests:');
  
  const complexDamageResult = player.requestValue('damage', {
    targetType: 'enemy',
    distance: 5,
    criticalHit: true,
    element: 'fire'
  });
  
  if (complexDamageResult) {
    console.log(`Complex damage request: ${complexDamageResult.value} (provided by ${complexDamageResult.provider})`);
    console.log('Request parameters:', complexDamageResult.context.parameters);
  }
  
  // Demonstrate frame generation with active effects
  console.log('\n📸 Frame Generation with Active Effects:');
  
  const frameManager = new FrameManager({
    trackStats: 'all',
    trackEffects: true,
    trackContext: false,
    maxCacheSize: 50,
    enableLazyEvaluation: true
  }, 3);
  
  const frame = frameManager.createFrame([player, enemy], undefined, {
    phase: 'active_effects_demo',
    activeEffectsCount: player.getEffects().length,
    equippedGearCount: player.getAllEquippedGear().size
  });
  
  console.log('Frame created with active effects and gear metadata');
  
  // Demonstrate entity state summary
  console.log('\n📋 Entity State Summary:');
  console.log('Player effects:', player.getEffects().map(e => e.name));
  console.log('Player equipped gear:', Array.from(player.getAllEquippedGear().values()).map(g => g.name));
  console.log('Player value providers:', Array.from(player.getAllValueProviders().values()).map(p => p.name));
  
  console.log('\n✅ Active Effects and Gear System Demonstration completed successfully!');
  console.log('\n💡 Key Points:');
  console.log('- Passive effects modify stats during frame generation');
  console.log('- Active effects respond to on-demand value requests');
  console.log('- Gear provides values for specific purposes');
  console.log('- Value providers offer fallback calculations');
  console.log('- Priority system determines which provider handles requests');
  console.log('- Entities can request values for any purpose with arbitrary parameters');
  console.log('- All implementations use generic BaseActiveEffect and GenericGear');
  
  // Demonstrate consumer RPG systems
  console.log('\n' + '='.repeat(60));
  demonstrateConsumerRPGActiveEffects();
}

/**
 * Set up event listeners for active effects system
 */
function setupActiveEffectsEventListeners(): void {
  eventSystem.on(EventType.CUSTOM_EVENT, (event) => {
    if (event.data?.type === 'value_provider_registered') {
      console.log(`🔧 Value provider registered: ${event.data.providerName} for entity ${event.data.entityId}`);
    }
    
    if (event.data?.type === 'gear_equipped') {
      console.log(`🛡️ Gear equipped: ${event.data.gearName} in slot ${event.data.slot} for entity ${event.data.entityId}`);
    }
    
    if (event.data?.type === 'gear_unequipped') {
      console.log(`➖ Gear unequipped: ${event.data.gearName} from slot ${event.data.slot} for entity ${event.data.entityId}`);
    }
  });
}

export { runActiveEffectsExample, setupActiveEffectsEventListeners };
