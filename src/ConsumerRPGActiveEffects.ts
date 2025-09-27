import { Entity } from './Entity';
import { AdditiveEffect } from './effects';
import { 
  BaseActiveEffect,
  GenericGear,
  BaseStatValueProvider,
  ActiveEffectUtils
} from './ActiveEffects';
import { 
  rngManager,
  SeededRNG,
  WeightedRNG,
  WeightedChoice
} from './RNG';
import {
  RandomEffect,
  ChanceBasedEffect,
  WeightedRandomEffect,
  RNGEffectsUtils
} from './RNGEffects';
import { eventSystem } from './EventSystem';
import { EventType } from './types';

/**
 * Consumer Example: Implementing RPG Concepts with Generic Active Effects and Gear System
 * 
 * This demonstrates how consumers can implement RPG-specific concepts
 * like weapons, armor, tools, and damage/healing/movement/defense effects
 * using the generic active effects and gear system.
 */

/**
 * RPG-specific stat types that a consumer might define
 */
interface RPGStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
  mana: number;
  healing: number;
  criticalHitChance: number;
  criticalHitMultiplier: number;
  luck: number;
}

/**
 * Consumer implementation of damage provider effect
 */
export class DamageProviderEffect extends BaseActiveEffect {
  constructor(
    id: string,
    name: string,
    private readonly attackStatType: string,
    private readonly damageMultiplier: number = 1.0,
    priority: number = 0
  ) {
    super(
      id,
      name,
      priority,
      [attackStatType],
      [{ statType: attackStatType, stackable: true }],
      ['damage', 'attack_damage']
    );
  }

  apply(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  reverse(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  provideValue(purpose: string, context: any): number | undefined {
    if (!this.supportedPurposes.includes(purpose)) {
      return undefined;
    }

    const attackValue = context.currentStats.get(this.attackStatType) || 0;
    return attackValue * this.damageMultiplier;
  }
}

/**
 * Consumer implementation of healing provider effect
 */
export class HealingProviderEffect extends BaseActiveEffect {
  constructor(
    id: string,
    name: string,
    private readonly healingStatType: string,
    private readonly healingMultiplier: number = 1.0,
    priority: number = 0
  ) {
    super(
      id,
      name,
      priority,
      [healingStatType],
      [{ statType: healingStatType, stackable: true }],
      ['healing', 'restoration']
    );
  }

  apply(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  reverse(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  provideValue(purpose: string, context: any): number | undefined {
    if (!this.supportedPurposes.includes(purpose)) {
      return undefined;
    }

    const healingValue = context.currentStats.get(this.healingStatType) || 0;
    return healingValue * this.healingMultiplier;
  }
}

/**
 * Consumer implementation of movement provider effect
 */
export class MovementProviderEffect extends BaseActiveEffect {
  constructor(
    id: string,
    name: string,
    private readonly speedStatType: string,
    private readonly movementMultiplier: number = 1.0,
    priority: number = 0
  ) {
    super(
      id,
      name,
      priority,
      [speedStatType],
      [{ statType: speedStatType, stackable: true }],
      ['movement', 'speed', 'travel']
    );
  }

  apply(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  reverse(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  provideValue(purpose: string, context: any): number | undefined {
    if (!this.supportedPurposes.includes(purpose)) {
      return undefined;
    }

    const speedValue = context.currentStats.get(this.speedStatType) || 0;
    return speedValue * this.movementMultiplier;
  }
}

/**
 * Consumer implementation of defense provider effect
 */
export class DefenseProviderEffect extends BaseActiveEffect {
  constructor(
    id: string,
    name: string,
    private readonly defenseStatType: string,
    private readonly defenseMultiplier: number = 1.0,
    priority: number = 0
  ) {
    super(
      id,
      name,
      priority,
      [defenseStatType],
      [{ statType: defenseStatType, stackable: true }],
      ['defense', 'protection', 'armor']
    );
  }

  apply(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  reverse(context: any, stats: Map<string, number>): void {
    // This effect doesn't modify stats passively
  }

  provideValue(purpose: string, context: any): number | undefined {
    if (!this.supportedPurposes.includes(purpose)) {
      return undefined;
    }

    const defenseValue = context.currentStats.get(this.defenseStatType) || 0;
    return defenseValue * this.defenseMultiplier;
  }
}

/**
 * Consumer implementation of weapon gear
 */
export class WeaponGear extends GenericGear {
  constructor(
    id: string,
    name: string,
    private readonly baseDamage: number,
    private readonly damageStatType: string,
    private readonly damageMultiplier: number = 1.0,
    slot: string = 'weapon'
  ) {
    super(
      id,
      name,
      'weapon',
      10, // High priority for weapons
      ['damage', 'attack_damage'],
      (purpose, context) => {
        if (purpose === 'damage' || purpose === 'attack_damage') {
          const statValue = context.currentStats.get(damageStatType) || 0;
          return baseDamage + (statValue * damageMultiplier);
        }
        return undefined;
      },
      [], // No passive effects for this example
      slot
    );
  }
}

/**
 * Consumer implementation of armor gear
 */
export class ArmorGear extends GenericGear {
  constructor(
    id: string,
    name: string,
    private readonly baseDefense: number,
    private readonly defenseStatType: string,
    private readonly defenseMultiplier: number = 1.0,
    slot: string = 'armor'
  ) {
    super(
      id,
      name,
      'armor',
      8, // High priority for armor
      ['defense', 'protection', 'armor'],
      (purpose, context) => {
        if (purpose === 'defense' || purpose === 'protection' || purpose === 'armor') {
          const statValue = context.currentStats.get(defenseStatType) || 0;
          return baseDefense + (statValue * defenseMultiplier);
        }
        return undefined;
      },
      [], // No passive effects for this example
      slot
    );
  }
}

/**
 * Consumer implementation of tool gear
 */
export class ToolGear extends GenericGear {
  constructor(
    id: string,
    name: string,
    private readonly baseValue: number,
    private readonly statType: string,
    private readonly multiplier: number = 1.0,
    supportedPurposes: string[],
    slot: string = 'tool'
  ) {
    super(
      id,
      name,
      'tool',
      5, // Medium priority for tools
      supportedPurposes,
      (purpose, context) => {
        if (supportedPurposes.includes(purpose)) {
          const statValue = context.currentStats.get(statType) || 0;
          return baseValue + (statValue * multiplier);
        }
        return undefined;
      },
      [], // No passive effects for this example
      slot
    );
  }
}

/**
 * Consumer implementation of accessory gear
 */
export class AccessoryGear extends GenericGear {
  constructor(
    id: string,
    name: string,
    private readonly baseValue: number,
    private readonly statType: string,
    private readonly multiplier: number = 1.0,
    supportedPurposes: string[],
    slot: string = 'accessory'
  ) {
    super(
      id,
      name,
      'accessory',
      3, // Lower priority for accessories
      supportedPurposes,
      (purpose, context) => {
        if (supportedPurposes.includes(purpose)) {
          const statValue = context.currentStats.get(statType) || 0;
          return baseValue + (statValue * multiplier);
        }
        return undefined;
      },
      [], // No passive effects for this example
      slot
    );
  }
}

/**
 * Consumer implementation of critical hit system
 */
export class CriticalHitSystem {
  constructor(private readonly rng: SeededRNG = rngManager.createSeededGenerator(12345)) {}
  
  /**
   * Check if a critical hit occurs based on entity's critical hit chance stat
   */
  isCriticalHit(entity: Entity): boolean {
    const criticalChance = entity.getStat('criticalHitChance') as number;
    return this.rng.chance(criticalChance);
  }
  
  /**
   * Calculate damage with potential critical hit
   */
  calculateDamage(entity: Entity, baseDamage: number): number {
    if (this.isCriticalHit(entity)) {
      const criticalMultiplier = entity.getStat('criticalHitMultiplier') as number;
      return baseDamage * criticalMultiplier;
    }
    return baseDamage;
  }
  
  /**
   * Create a critical hit effect that modifies damage values
   */
  createCriticalHitEffect(entity: Entity): ChanceBasedEffect {
    const criticalChance = entity.getStat('criticalHitChance') as number;
    const criticalMultiplier = entity.getStat('criticalHitMultiplier') as number;
    
    return RNGEffectsUtils.createChanceBasedEffect(
      'critical-hit',
      'Critical Hit',
      'attack',
      criticalChance,
      (baseValue) => baseValue * criticalMultiplier,
      this.rng
    );
  }
}

/**
 * Consumer implementation of loot system
 */
export class LootSystem {
  constructor(private readonly rng: WeightedRNG = rngManager.createWeightedGenerator()) {}
  
  /**
   * Define loot table with weighted choices
   */
  private readonly lootTable: WeightedChoice<AdditiveEffect>[] = [
    { 
      value: new AdditiveEffect('common-sword', 'Common Sword', 'attack', 5, true, 1), 
      weight: 50 
    },
    { 
      value: new AdditiveEffect('rare-sword', 'Rare Sword', 'attack', 15, true, 2), 
      weight: 25 
    },
    { 
      value: new AdditiveEffect('epic-sword', 'Epic Sword', 'attack', 30, true, 3), 
      weight: 15 
    },
    { 
      value: new AdditiveEffect('legendary-sword', 'Legendary Sword', 'attack', 50, true, 4), 
      weight: 8 
    },
    { 
      value: new AdditiveEffect('mythic-sword', 'Mythic Sword', 'attack', 100, true, 5), 
      weight: 2 
    }
  ];
  
  /**
   * Generate random loot drop
   */
  generateLoot(): AdditiveEffect | undefined {
    return this.rng.weightedChoice(this.lootTable);
  }
  
  /**
   * Generate multiple loot drops
   */
  generateMultipleLoot(count: number): AdditiveEffect[] {
    const loot: AdditiveEffect[] = [];
    
    for (let i = 0; i < count; i++) {
      const item = this.generateLoot();
      if (item) {
        loot.push(item);
      }
    }
    
    return loot;
  }
}

/**
 * Example usage of consumer RPG systems
 */
export function demonstrateConsumerRPGActiveEffects(): void {
  console.log('🎮 Consumer RPG Active Effects and Gear Demonstration\n');
  
  // Create entity with RPG-specific stats
  const player = new Entity('player-1', {
    health: 100,
    attack: 20,
    defense: 12,
    speed: 15,
    mana: 50,
    healing: 8,
    criticalHitChance: 0.15,
    criticalHitMultiplier: 2.0,
    luck: 5
  });
  
  console.log('📊 Player Stats:');
  console.log('Attack:', player.getStat('attack'), 'Defense:', player.getStat('defense'), 'Healing:', player.getStat('healing'));
  
  // Demonstrate passive effects (existing system)
  console.log('\n🔄 Passive Effects (Existing System):');
  const passivePowerBoost = new AdditiveEffect('passive-power', 'Passive Power Boost', 'attack', 10, true, 1);
  player.addEffect(passivePowerBoost);
  
  console.log('Added passive power boost (+10)');
  console.log('Player attack after passive effect:', player.getStat('attack'));
  
  // Demonstrate active effects using consumer implementations
  console.log('\n⚡ Active Effects (Consumer Implementation):');
  
  // Create active effects using consumer classes
  const damageProvider = new DamageProviderEffect(
    'damage-provider',
    'Damage Provider',
    'attack',
    1.5, // 1.5x damage multiplier
    5 // priority
  );
  
  const healingProvider = new HealingProviderEffect(
    'healing-provider',
    'Healing Provider',
    'healing',
    2.0, // 2x healing multiplier
    3 // priority
  );
  
  const movementProvider = new MovementProviderEffect(
    'movement-provider',
    'Movement Provider',
    'speed',
    1.2, // 1.2x movement multiplier
    2 // priority
  );
  
  const defenseProvider = new DefenseProviderEffect(
    'defense-provider',
    'Defense Provider',
    'defense',
    1.3, // 1.3x defense multiplier
    4 // priority
  );
  
  // Add active effects to player
  player.addEffect(damageProvider);
  player.addEffect(healingProvider);
  player.addEffect(movementProvider);
  player.addEffect(defenseProvider);
  
  console.log('Added active effects:');
  console.log('- Damage Provider (1.5x attack for damage)');
  console.log('- Healing Provider (2x healing for restoration)');
  console.log('- Movement Provider (1.2x speed for movement)');
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
  
  // Demonstrate gear system using consumer implementations
  console.log('\n🛡️ Gear System (Consumer Implementation):');
  
  // Create gear using consumer classes
  const sword = new WeaponGear(
    'iron-sword',
    'Iron Sword',
    25, // base damage
    'attack',
    0.5, // 0.5x attack scaling
    'weapon'
  );
  
  const shield = new ArmorGear(
    'iron-shield',
    'Iron Shield',
    15, // base defense
    'defense',
    0.3, // 0.3x defense scaling
    'shield'
  );
  
  const healingStaff = new ToolGear(
    'healing-staff',
    'Healing Staff',
    20, // base healing
    'healing',
    0.8, // 0.8x healing scaling
    ['healing', 'restoration'],
    'staff'
  );
  
  const speedBoots = new AccessoryGear(
    'speed-boots',
    'Speed Boots',
    5, // base speed
    'speed',
    0.4, // 0.4x speed scaling
    ['movement', 'speed'],
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
  
  // Create a high-priority damage provider
  const highPriorityDamage = new DamageProviderEffect(
    'high-priority-damage',
    'High Priority Damage',
    'attack',
    3.0, // 3x damage multiplier
    15 // higher priority than gear
  );
  
  player.addEffect(highPriorityDamage);
  
  const damageWithPriority = player.requestValue('damage');
  if (damageWithPriority) {
    console.log(`Damage with high priority effect: ${damageWithPriority.value} (provided by ${damageWithPriority.provider})`);
  }
  
  // Demonstrate critical hit system
  console.log('\n⚔️ Critical Hit System:');
  const criticalHitSystem = new CriticalHitSystem();
  
  console.log('Testing critical hits (10 attempts):');
  for (let i = 0; i < 10; i++) {
    const isCritical = criticalHitSystem.isCriticalHit(player);
    const baseDamage = 20;
    const finalDamage = criticalHitSystem.calculateDamage(player, baseDamage);
    console.log(`  Attempt ${i + 1}: ${isCritical ? 'CRITICAL' : 'normal'} - ${finalDamage} damage`);
  }
  
  // Demonstrate loot system
  console.log('\n🎁 Loot System:');
  const lootSystem = new LootSystem();
  
  console.log('Generating loot drops:');
  for (let i = 0; i < 5; i++) {
    const loot = lootSystem.generateLoot();
    if (loot) {
      console.log(`  Drop ${i + 1}: ${loot.name} (+${loot['value']} attack)`);
    }
  }
  
  // Demonstrate gear swapping
  console.log('\n🔄 Gear Swapping:');
  
  // Create a better weapon
  const betterSword = new WeaponGear(
    'steel-sword',
    'Steel Sword',
    40, // higher base damage
    'attack',
    0.7, // better attack scaling
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
  
  // Demonstrate entity state summary
  console.log('\n📋 Entity State Summary:');
  console.log('Player effects:', player.getEffects().map(e => e.name));
  console.log('Player equipped gear:', Array.from(player.getAllEquippedGear().values()).map(g => g.name));
  
  console.log('\n✅ Consumer RPG Active Effects and Gear Demonstration completed!');
  console.log('\n💡 Key Points:');
  console.log('- Damage/Healing/Movement/Defense effects are consumer implementations');
  console.log('- Weapons/Armor/Tools/Accessories are consumer gear implementations');
  console.log('- All RPG concepts are built on top of the generic active effects and gear system');
  console.log('- No RPG-specific concepts are built into the core API');
  console.log('- Generic BaseActiveEffect and GenericGear provide the foundation');
  console.log('- Consumers can implement any domain-specific concepts using these generic tools');
}
