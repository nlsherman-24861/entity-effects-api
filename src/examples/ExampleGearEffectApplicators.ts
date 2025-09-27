import { StatType, StatValue, Effect } from '../core/types';
import { AdditiveEffect } from '../core/effects';
import { GearEffectApplicator, GearEffectApplicatorUtils } from '../core/GearEffectApplicators';

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

