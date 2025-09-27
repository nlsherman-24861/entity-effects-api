import { Entity } from './Entity';
import { AdditiveEffect } from './effects';
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
  RNGEffectsUtils,
  WeightedSelectionGenerator
} from './RNGEffects';

/**
 * Consumer Example: Implementing RPG Concepts with Generic RNG System
 * 
 * This demonstrates how consumers can implement RPG-specific concepts
 * like critical hits, loot tables, and damage variance using the generic
 * RNG system without those concepts being built into the core API.
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
  criticalHitChance: number;  // Consumer-defined stat type
  criticalHitMultiplier: number;
  luck: number;
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
   * Create a critical hit effect that modifies attack stat
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
    const generator = new WeightedSelectionGenerator(this.lootTable, this.rng);
    return generator.select();
  }
  
  /**
   * Generate multiple loot drops
   */
  generateMultipleLoot(count: number): AdditiveEffect[] {
    const generator = new WeightedSelectionGenerator(this.lootTable, this.rng);
    return generator.selectMultiple(count);
  }
  
  /**
   * Generate loot with minimum rarity (higher weight threshold)
   */
  generateRareLoot(minimumWeight: number = 15): AdditiveEffect | undefined {
    const generator = new WeightedSelectionGenerator(this.lootTable, this.rng);
    return generator.selectWithMinimumWeight(minimumWeight);
  }
}

/**
 * Consumer implementation of damage variance system
 */
export class DamageVarianceSystem {
  constructor(private readonly rng: SeededRNG = rngManager.createSeededGenerator(12345)) {}
  
  /**
   * Create damage variance effect with Gaussian distribution
   */
  createDamageVarianceEffect(baseDamage: number, variancePercent: number = 0.2): RandomEffect {
    const variance = baseDamage * variancePercent;
    const minDamage = baseDamage - variance;
    const maxDamage = baseDamage + variance;
    
    return RNGEffectsUtils.createUniformRandomEffect(
      'damage-variance',
      'Damage Variance',
      'attack',
      minDamage,
      maxDamage,
      this.rng
    );
  }
  
  /**
   * Create Gaussian damage distribution effect
   */
  createGaussianDamageEffect(baseDamage: number, standardDeviation: number = 5): RandomEffect {
    return RNGEffectsUtils.createGaussianRandomEffect(
      'gaussian-damage',
      'Gaussian Damage',
      'attack',
      { min: 0, max: baseDamage * 2 }, // Clamp range
      baseDamage, // mean
      standardDeviation,
      this.rng
    );
  }
}

/**
 * Consumer implementation of status effect system
 */
export class StatusEffectSystem {
  constructor(private readonly rng: WeightedRNG = rngManager.createWeightedGenerator()) {}
  
  /**
   * Define status effect table
   */
  private readonly statusEffects: WeightedChoice<{ effect: AdditiveEffect; duration: number }>[] = [
    { 
      value: { 
        effect: new AdditiveEffect('poison', 'Poison', 'health', -2, true, 1), 
        duration: 5000 
      }, 
      weight: 30 
    },
    { 
      value: { 
        effect: new AdditiveEffect('burn', 'Burn', 'health', -3, true, 2), 
        duration: 3000 
      }, 
      weight: 20 
    },
    { 
      value: { 
        effect: new AdditiveEffect('freeze', 'Freeze', 'speed', -5, true, 3), 
        duration: 4000 
      }, 
      weight: 15 
    },
    { 
      value: { 
        effect: new AdditiveEffect('blessing', 'Blessing', 'attack', 10, true, 4), 
        duration: 10000 
      }, 
      weight: 10 
    }
  ];
  
  /**
   * Apply random status effect to entity
   */
  applyRandomStatusEffect(entity: Entity): { effect: AdditiveEffect; duration: number } | undefined {
    const generator = new WeightedSelectionGenerator(this.statusEffects, this.rng);
    const statusEffect = generator.select();
    
    if (statusEffect) {
      entity.addEffect(statusEffect.effect, statusEffect.duration);
      return statusEffect;
    }
    
    return undefined;
  }
}

/**
 * Consumer implementation of luck-based system
 */
export class LuckSystem {
  constructor(private readonly rng: SeededRNG = rngManager.createSeededGenerator(12345)) {}
  
  /**
   * Check if luck-based event occurs
   */
  checkLuckEvent(entity: Entity, baseProbability: number): boolean {
    const luck = entity.getStat('luck') as number;
    const luckModifier = luck * 0.01; // 1 luck = 1% bonus
    const finalProbability = Math.min(1, baseProbability + luckModifier);
    
    return this.rng.chance(finalProbability);
  }
  
  /**
   * Create luck-based effect
   */
  createLuckBasedEffect(
    entity: Entity, 
    baseProbability: number, 
    statType: string, 
    modifier: (baseValue: number) => number
  ): ChanceBasedEffect {
    const luck = entity.getStat('luck') as number;
    const luckModifier = luck * 0.01;
    const finalProbability = Math.min(1, baseProbability + luckModifier);
    
    return RNGEffectsUtils.createChanceBasedEffect(
      'luck-effect',
      'Luck-Based Effect',
      statType,
      finalProbability,
      modifier,
      this.rng
    );
  }
}

/**
 * Example usage of consumer RPG systems
 */
export function demonstrateConsumerRPGSystems(): void {
  console.log('🎮 Consumer RPG Systems Demonstration\n');
  
  // Create entity with RPG-specific stats
  const player = new Entity('player-1', {
    health: 100,
    attack: 20,
    defense: 10,
    speed: 15,
    mana: 50,
    criticalHitChance: 0.15, // 15% crit chance
    criticalHitMultiplier: 2.0,
    luck: 5
  });
  
  console.log('📊 Player Stats:');
  console.log('Health:', player.getStat('health'));
  console.log('Attack:', player.getStat('attack'));
  console.log('Critical Hit Chance:', player.getStat('criticalHitChance'));
  console.log('Luck:', player.getStat('luck'));
  
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
  
  console.log('\nGenerating rare loot (weight >= 15):');
  const rareLoot = lootSystem.generateRareLoot(15);
  if (rareLoot) {
    console.log(`  Rare drop: ${rareLoot.name} (+${rareLoot['value']} attack)`);
  }
  
  // Demonstrate damage variance
  console.log('\n📊 Damage Variance System:');
  const damageVarianceSystem = new DamageVarianceSystem();
  
  const varianceEffect = damageVarianceSystem.createDamageVarianceEffect(20, 0.3);
  player.addEffect(varianceEffect);
  
  console.log('Damage variance effect applied. Testing damage calculations:');
  for (let i = 0; i < 5; i++) {
    const stats = player.getCurrentStats();
    console.log(`  Calculation ${i + 1}: Attack = ${stats.get('attack')?.toFixed(2)}`);
  }
  
  // Demonstrate status effects
  console.log('\n✨ Status Effect System:');
  const statusEffectSystem = new StatusEffectSystem();
  
  console.log('Applying random status effects:');
  for (let i = 0; i < 3; i++) {
    const statusEffect = statusEffectSystem.applyRandomStatusEffect(player);
    if (statusEffect) {
      console.log(`  Applied: ${statusEffect.effect.name} (duration: ${statusEffect.duration}ms)`);
    }
  }
  
  console.log('Player effects after status effects:', player.getEffects().map(e => e.name));
  
  // Demonstrate luck system
  console.log('\n🍀 Luck System:');
  const luckSystem = new LuckSystem();
  
  console.log('Testing luck-based events (base probability 20%):');
  for (let i = 0; i < 10; i++) {
    const luckEvent = luckSystem.checkLuckEvent(player, 0.2);
    console.log(`  Attempt ${i + 1}: ${luckEvent ? 'LUCKY' : 'unlucky'}`);
  }
  
  console.log('\n✅ Consumer RPG Systems Demonstration completed!');
  console.log('\n💡 Key Points:');
  console.log('- Critical hits are implemented using generic chance-based effects');
  console.log('- Loot tables use generic weighted selection');
  console.log('- Damage variance uses generic random effects');
  console.log('- All RPG concepts are built on top of the generic RNG system');
  console.log('- No RPG-specific concepts are built into the core API');
}
