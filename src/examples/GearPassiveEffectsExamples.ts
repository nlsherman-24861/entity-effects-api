import { Entity } from '../core/Entity';
import { 
  AdditiveEffect, 
  MultiplicativeEffect, 
  PercentageEffect
} from '../core/effects';
import { 
  ActiveEffectUtils,
  GenericGear
} from '../core/ActiveEffects';
import {
  GearEffectApplicator,
  GearEffectApplicatorUtils
} from '../core/GearEffectApplicators';
import { 
  effectApplicatorManager
} from '../core/EffectApplicator';
import { eventSystem } from '../core/EventSystem';
import { EventType } from '../core/types';

/**
 * Comprehensive Gear Passive Effects Demonstration
 */
export function runGearPassiveEffectsExample(): void {
  console.log('🛡️ Gear Passive Effects Demonstration');

  // Create entities
  const player = new Entity('player-gear', {
    health: 100,
    attack: 20,
    defense: 15,
    speed: 10,
    magic: 8
  });

  const enemy = new Entity('enemy-gear', {
    health: 80,
    attack: 18,
    defense: 12,
    speed: 12,
    magic: 5
  });

  console.log('\n📊 Initial Entity Stats:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'));
  console.log('Enemy - Health:', enemy.getStat('health'), 'Attack:', enemy.getStat('attack'), 'Defense:', enemy.getStat('defense'));

  // Create gear with passive effects
  console.log('\n🛡️ Creating Gear with Passive Effects:');

  // Create a sword with attack bonus passive effect
  const swordAttackBonus = new AdditiveEffect(
    'sword-attack-bonus',
    'Sword Attack Bonus',
    'attack',
    15, // +15 attack
    true,
    1
  );

  const ironSword = ActiveEffectUtils.createGear(
    'iron-sword',
    'Iron Sword',
    'weapon',
    10,
    ['damage'],
    (purpose, context) => {
      if (purpose === 'damage') {
        const attackValue = context.currentStats.get('attack') || 0;
        return attackValue * 1.2; // 1.2x damage multiplier
      }
      return undefined;
    },
    [swordAttackBonus], // Passive effects
    'weapon'
  );

  // Create armor with defense bonus passive effect
  const armorDefenseBonus = new AdditiveEffect(
    'armor-defense-bonus',
    'Armor Defense Bonus',
    'defense',
    10, // +10 defense
    true,
    1
  );

  const ironArmor = ActiveEffectUtils.createGear(
    'iron-armor',
    'Iron Armor',
    'armor',
    8,
    ['defense'],
    (purpose, context) => {
      if (purpose === 'defense') {
        const defenseValue = context.currentStats.get('defense') || 0;
        return defenseValue * 1.1; // 1.1x defense multiplier
      }
      return undefined;
    },
    [armorDefenseBonus], // Passive effects
    'armor'
  );

  // Create a ring with multiple stat bonuses
  const ringSpeedBonus = new AdditiveEffect(
    'ring-speed-bonus',
    'Ring Speed Bonus',
    'speed',
    5, // +5 speed
    true,
    1
  );

  const ringMagicBonus = new AdditiveEffect(
    'ring-magic-bonus',
    'Ring Magic Bonus',
    'magic',
    3, // +3 magic
    true,
    1
  );

  const magicRing = ActiveEffectUtils.createGear(
    'magic-ring',
    'Magic Ring',
    'accessory',
    5,
    ['magic_power'],
    (purpose, context) => {
      if (purpose === 'magic_power') {
        const magicValue = context.currentStats.get('magic') || 0;
        return magicValue * 1.5; // 1.5x magic power multiplier
      }
      return undefined;
    },
    [ringSpeedBonus, ringMagicBonus], // Multiple passive effects
    'ring'
  );

  console.log('Created gear with passive effects:');
  console.log('- Iron Sword: +15 attack bonus');
  console.log('- Iron Armor: +10 defense bonus');
  console.log('- Magic Ring: +5 speed, +3 magic bonuses');

  // Set up gear effect applicators
  console.log('\n🎯 Setting up Gear Effect Applicators:');

  // Create gear effect applicators for additional effects using utility functions
  const swordApplicator = GearEffectApplicatorUtils.createGearEquippedApplicator(
    'iron-sword',
    'Iron Sword',
    [new AdditiveEffect('iron-sword-bonus', 'Iron Sword Bonus', 'attack', 5, true, 1)]
  );

  const armorApplicator = GearEffectApplicatorUtils.createGearEquippedApplicator(
    'iron-armor',
    'Iron Armor',
    [new AdditiveEffect('iron-armor-bonus', 'Iron Armor Bonus', 'defense', 3, true, 1)]
  );

  const ringApplicator = GearEffectApplicatorUtils.createGearEquippedApplicator(
    'magic-ring',
    'Magic Ring',
    [
      new AdditiveEffect('magic-ring-health', 'Magic Ring Health', 'health', 10, true, 1),
      new AdditiveEffect('magic-ring-magic', 'Magic Ring Magic', 'magic', 2, true, 1)
    ]
  );

  // Register gear effect applicators
  effectApplicatorManager.registerApplicator(swordApplicator);
  effectApplicatorManager.registerApplicator(armorApplicator);
  effectApplicatorManager.registerApplicator(ringApplicator);

  console.log('Registered gear effect applicators for additional effects');

  // Show initial stats before equipping gear
  console.log('\n📊 Stats Before Equipping Gear:');
  console.log('Player - Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Speed:', player.getStat('speed'), 'Magic:', player.getStat('magic'));

  // Equip gear (this will trigger passive effects)
  console.log('\n⚔️ Equipping Gear:');
  player.equipGear(ironSword, 'weapon');
  player.equipGear(ironArmor, 'armor');
  player.equipGear(magicRing, 'ring');

  // Show stats after equipping gear
  console.log('\n📊 Stats After Equipping Gear:');
  console.log('Player - Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Speed:', player.getStat('speed'), 'Magic:', player.getStat('magic'));

  // Show current effects
  console.log('\n✨ Current Effects:');
  const currentEffects = player.getEffects();
  console.log('Player effects:', currentEffects.map(e => `${e.name} (${e.id})`));

  // Demonstrate value requests with gear
  console.log('\n🎯 Value Requests with Gear:');
  const damageRequest = player.requestValue('damage');
  const defenseRequest = player.requestValue('defense');
  const magicPowerRequest = player.requestValue('magic_power');

  console.log(`Damage request: ${damageRequest?.value} (provided by ${damageRequest?.provider})`);
  console.log(`Defense request: ${defenseRequest?.value} (provided by ${defenseRequest?.provider})`);
  console.log(`Magic power request: ${magicPowerRequest?.value} (provided by ${magicPowerRequest?.provider})`);

  // Demonstrate gear swapping
  console.log('\n🔄 Gear Swapping:');
  
  // Create a better sword
  const steelSwordAttackBonus = new AdditiveEffect(
    'steel-sword-attack-bonus',
    'Steel Sword Attack Bonus',
    'attack',
    25, // +25 attack (better than iron sword)
    true,
    1
  );

  const steelSword = ActiveEffectUtils.createGear(
    'steel-sword',
    'Steel Sword',
    'weapon',
    10,
    ['damage'],
    (purpose, context) => {
      if (purpose === 'damage') {
        const attackValue = context.currentStats.get('attack') || 0;
        return attackValue * 1.4; // 1.4x damage multiplier (better than iron sword)
      }
      return undefined;
    },
    [steelSwordAttackBonus],
    'weapon'
  );

  // Unequip old sword and equip new one
  const oldSword = player.unequipGear('weapon');
  console.log(`Unequipped: ${oldSword?.name}`);
  
  player.equipGear(steelSword, 'weapon');
  console.log(`Equipped: ${steelSword.name}`);

  // Show stats after gear swap
  console.log('\n📊 Stats After Gear Swap:');
  console.log('Player - Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Speed:', player.getStat('speed'), 'Magic:', player.getStat('magic'));

  // Show updated effects
  console.log('\n✨ Updated Effects:');
  const updatedEffects = player.getEffects();
  console.log('Player effects:', updatedEffects.map(e => `${e.name} (${e.id})`));

  // Demonstrate removing all gear
  console.log('\n➖ Removing All Gear:');
  const removedSword = player.unequipGear('weapon');
  const removedArmor = player.unequipGear('armor');
  const removedRing = player.unequipGear('ring');

  console.log(`Removed: ${removedSword?.name}, ${removedArmor?.name}, ${removedRing?.name}`);

  // Show stats after removing all gear
  console.log('\n📊 Stats After Removing All Gear:');
  console.log('Player - Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Speed:', player.getStat('speed'), 'Magic:', player.getStat('magic'));

  // Show final effects
  console.log('\n✨ Final Effects:');
  const finalEffects = player.getEffects();
  console.log('Player effects:', finalEffects.map(e => `${e.name} (${e.id})`));

  // Demonstrate gear with complex passive effects
  console.log('\n🔮 Complex Gear with Multiple Passive Effects:');
  
  const complexRingEffects = [
    new AdditiveEffect('complex-ring-health', 'Complex Ring Health', 'health', 20, true, 1),
    new MultiplicativeEffect('complex-ring-attack', 'Complex Ring Attack', 'attack', 1.1, true, 1), // 10% increase
    new PercentageEffect('complex-ring-defense', 'Complex Ring Defense', 'defense', 0.15, true, 1) // 15% increase
  ];

  const complexRing = ActiveEffectUtils.createGear(
    'complex-ring',
    'Complex Ring',
    'accessory',
    15,
    ['magic_power', 'healing'],
    (purpose, context) => {
      if (purpose === 'magic_power') {
        const magicValue = context.currentStats.get('magic') || 0;
        return magicValue * 2.0; // 2x magic power
      } else if (purpose === 'healing') {
        const magicValue = context.currentStats.get('magic') || 0;
        return magicValue * 1.5; // 1.5x healing power
      }
      return undefined;
    },
    complexRingEffects,
    'ring'
  );

  player.equipGear(complexRing, 'ring');

  console.log('\n📊 Stats After Equipping Complex Ring:');
  console.log('Player - Health:', player.getStat('health'), 'Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Magic:', player.getStat('magic'));

  // Show complex effects
  console.log('\n✨ Complex Effects:');
  const complexEffects = player.getEffects();
  console.log('Player effects:', complexEffects.map(e => `${e.name} (${e.id})`));

  // Demonstrate value requests with complex gear
  console.log('\n🎯 Value Requests with Complex Gear:');
  const complexMagicRequest = player.requestValue('magic_power');
  const complexHealingRequest = player.requestValue('healing');

  console.log(`Magic power request: ${complexMagicRequest?.value} (provided by ${complexMagicRequest?.provider})`);
  console.log(`Healing request: ${complexHealingRequest?.value} (provided by ${complexHealingRequest?.provider})`);

  // Show gear system statistics
  console.log('\n📈 Gear System Statistics:');
  console.log(`Equipped gear slots: ${player.getAllEquippedGear().size}`);
  console.log(`Total passive effects: ${player.getEffects().length}`);
  console.log(`Gear with passive effects: ${Array.from(player.getAllEquippedGear().values()).filter(g => g.hasPassiveEffects()).length}`);

  console.log('\n✅ Gear Passive Effects Demonstration completed successfully!');
  console.log('\n💡 Key Points:');
  console.log('- Gear can have passive effects that are applied when equipped');
  console.log('- Passive effects are automatically removed when gear is unequipped');
  console.log('- Gear effect applicators can add additional effects beyond passive ones');
  console.log('- Multiple gear pieces can stack their passive effects');
  console.log('- Gear swapping properly manages effect addition and removal');
  console.log('- Complex gear can have multiple different types of passive effects');
  console.log('- The system integrates seamlessly with the existing effect system');
}

/**
 * Set up event listeners for gear passive effects
 */
export function setupGearPassiveEffectsEventListeners(): void {
  eventSystem.on(EventType.GEAR_EQUIPPED, (event) => {
    console.log(`🛡️ Gear equipped: ${event.data.gearName} in slot ${event.data.slot} for entity ${event.data.entityId}`);
    if (event.data.passiveEffectsApplied > 0) {
      console.log(`   Applied ${event.data.passiveEffectsApplied} passive effects`);
    }
  });

  eventSystem.on(EventType.GEAR_UNEQUIPPED, (event) => {
    console.log(`➖ Gear unequipped: ${event.data.gearName} from slot ${event.data.slot} for entity ${event.data.entityId}`);
    if (event.data.passiveEffectsRemoved > 0) {
      console.log(`   Removed ${event.data.passiveEffectsRemoved} passive effects`);
    }
  });

  eventSystem.on(EventType.EFFECT_ADDED, (event) => {
    if (event.data.effect.name.includes('Bonus') || event.data.effect.name.includes('Ring') || event.data.effect.name.includes('Sword') || event.data.effect.name.includes('Armor')) {
      console.log(`✨ Passive effect added: ${event.data.effect.name} to entity ${event.data.entityId}`);
    }
  });

  eventSystem.on(EventType.EFFECT_REMOVED, (event) => {
    if (event.data.effectId.includes('bonus') || event.data.effectId.includes('ring') || event.data.effectId.includes('sword') || event.data.effectId.includes('armor')) {
      console.log(`➖ Passive effect removed: ${event.data.effectId} from entity ${event.data.entityId}`);
    }
  });
}
