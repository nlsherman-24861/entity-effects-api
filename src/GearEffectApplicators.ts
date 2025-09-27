import {
  EntityId,
  StatType,
  StatValue,
  Effect,
  EffectId,
  EffectContext,
  EventType,
  Event,
  EffectApplicator,
  EffectCondition,
  Gear
} from './types';
import { BaseEffectApplicator } from './EffectApplicator';
import { Entity } from './Entity';
import { AdditiveEffect } from './effects';

/**
 * Gear-based effect applicator that manages effects based on gear equipped/removed events
 */
export class GearEffectApplicator extends BaseEffectApplicator {
  constructor(
    id: string,
    name: string,
    private readonly gearId: string,
    effectsToApply: Effect[],
    effectsToRemove: EffectId[] = []
  ) {
    super(id, name, [
      {
        eventType: EventType.GEAR_EQUIPPED,
        predicate: (event) => event.data?.gearId === gearId,
        description: `Gear equipped: ${gearId}`
      },
      {
        eventType: EventType.GEAR_UNEQUIPPED,
        predicate: (event) => event.data?.gearId === gearId,
        description: `Gear unequipped: ${gearId}`
      }
    ], effectsToApply, effectsToRemove);
  }

  handleEvent(event: Event, entityId: EntityId): boolean {
    if (!this.isInterestedIn(event.type)) {
      return false;
    }

    if (event.type === EventType.GEAR_EQUIPPED) {
      return this.handleGearEquipped(event, entityId);
    } else if (event.type === EventType.GEAR_UNEQUIPPED) {
      return this.handleGearUnequipped(event, entityId);
    }

    return false;
  }

  private handleGearEquipped(event: Event, entityId: EntityId): boolean {
    console.log(`🛡️ Gear Effect Applicator: ${this.name} handling gear equipped event`);
    
    let effectsApplied = 0;
    
    // Apply effects from the gear
    for (const effect of this.effectsToAdd) {
      // This would need to be implemented with a proper entity registry
      // For now, we'll just log the effect
      console.log(`   Would apply effect: ${effect.name} to entity ${entityId}`);
      effectsApplied++;
    }

    console.log(`   Applied ${effectsApplied} effects from gear ${this.gearId}`);
    return effectsApplied > 0;
  }

  private handleGearUnequipped(event: Event, entityId: EntityId): boolean {
    console.log(`🛡️ Gear Effect Applicator: ${this.name} handling gear unequipped event`);
    
    let effectsRemoved = 0;
    
    // Remove effects from the gear
    for (const effectId of this.effectsToRemove) {
      // This would need to be implemented with a proper entity registry
      // For now, we'll just log the effect removal
      console.log(`   Would remove effect: ${effectId} from entity ${entityId}`);
      effectsRemoved++;
    }

    console.log(`   Removed ${effectsRemoved} effects from gear ${this.gearId}`);
    return effectsRemoved > 0;
  }
}

/**
 * Utility class for creating gear-based effect applicators
 */
export class GearEffectApplicatorUtils {
  /**
   * Create a gear effect applicator that applies effects when gear is equipped
   */
  static createGearEquippedApplicator(
    gearId: string,
    gearName: string,
    effectsToApply: Effect[]
  ): GearEffectApplicator {
    return new GearEffectApplicator(
      `gear-equipped-${gearId}`,
      `${gearName} Equipped Applicator`,
      gearId,
      effectsToApply
    );
  }

  /**
   * Create a gear effect applicator that removes effects when gear is unequipped
   */
  static createGearUnequippedApplicator(
    gearId: string,
    gearName: string,
    effectsToRemove: EffectId[]
  ): GearEffectApplicator {
    return new GearEffectApplicator(
      `gear-unequipped-${gearId}`,
      `${gearName} Unequipped Applicator`,
      gearId,
      [],
      effectsToRemove
    );
  }

  /**
   * Create a gear effect applicator that manages both equipped and unequipped effects
   */
  static createGearManagementApplicator(
    gearId: string,
    gearName: string,
    effectsToApply: Effect[],
    effectsToRemove: EffectId[]
  ): GearEffectApplicator {
    return new GearEffectApplicator(
      `gear-management-${gearId}`,
      `${gearName} Management Applicator`,
      gearId,
      effectsToApply,
      effectsToRemove
    );
  }
}

/**
 * Example gear effect applicators for common gear types
 */
export class ExampleGearEffectApplicators {
  /**
   * Create a sword effect applicator that provides attack bonuses
   */
  static createSwordApplicator(
    gearId: string,
    gearName: string,
    attackBonus: StatValue
  ): GearEffectApplicator {
    const attackEffect = new AdditiveEffect(
      `${gearId}-attack-bonus`,
      `${gearName} Attack Bonus`,
      'attack',
      attackBonus,
      true,
      1
    );

    return GearEffectApplicatorUtils.createGearEquippedApplicator(
      gearId,
      gearName,
      [attackEffect]
    );
  }

  /**
   * Create an armor effect applicator that provides defense bonuses
   */
  static createArmorApplicator(
    gearId: string,
    gearName: string,
    defenseBonus: StatValue
  ): GearEffectApplicator {
    const defenseEffect = new AdditiveEffect(
      `${gearId}-defense-bonus`,
      `${gearName} Defense Bonus`,
      'defense',
      defenseBonus,
      true,
      1
    );

    return GearEffectApplicatorUtils.createGearEquippedApplicator(
      gearId,
      gearName,
      [defenseEffect]
    );
  }

  /**
   * Create a ring effect applicator that provides multiple stat bonuses
   */
  static createRingApplicator(
    gearId: string,
    gearName: string,
    statBonuses: Map<StatType, StatValue>
  ): GearEffectApplicator {
    const effects: Effect[] = [];

    for (const [statType, bonus] of statBonuses) {
      const effect = new AdditiveEffect(
        `${gearId}-${statType}-bonus`,
        `${gearName} ${statType} Bonus`,
        statType,
        bonus,
        true,
        1
      );

      effects.push(effect);
    }

    return GearEffectApplicatorUtils.createGearEquippedApplicator(
      gearId,
      gearName,
      effects
    );
  }
}
