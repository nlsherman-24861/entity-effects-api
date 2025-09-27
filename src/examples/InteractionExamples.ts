import {
  EntityId,
  StatType,
  StatValue,
  InteractionPhase,
  InteractionContext,
  InteractionModifier,
  StateAdjuster,
  InteractionNotifier,
  InteractionDefinition
} from '../core/types';
import { Entity } from '../core/Entity';
import { 
  BaseInteractionModifier, 
  BaseStateAdjuster, 
  BaseInteractionNotifier,
  InteractionManager,
  interactionManager
} from '../core/InteractionSystem';

/**
 * Example interaction modifier that reduces damage based on defense
 */
export class DefenseModifier extends BaseInteractionModifier {
  constructor(
    private readonly defenseStatType: StatType,
    private readonly reductionFactor: number = 0.1
  ) {
    super(
      'defense-modifier',
      'Defense Modifier',
      10, // High priority
      ['damage', 'attack'], // Supported interaction types
      [InteractionPhase.VALUE_MODIFICATION] // Supported phases
    );
  }

  modifyValue(context: InteractionContext, value: StatValue): StatValue | undefined {
    if (!this.canModify(context.interactionType, context.phase)) {
      return undefined;
    }

    // Get target entity's defense stat
    const targetEntity = this.getEntityById(context.targetId);
    if (!targetEntity) {
      return undefined;
    }

    const defense = targetEntity.getStat(this.defenseStatType) || 0;
    const reduction = defense * this.reductionFactor;
    const modifiedValue = Math.max(0, value - reduction);

    return modifiedValue;
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return entityId === context.targetId;
  }

  private getEntityById(entityId: EntityId): Entity | undefined {
    // This would need to be implemented with a proper entity registry
    // For now, we'll return undefined
    return undefined;
  }
}

/**
 * Example interaction modifier that increases damage based on critical hit chance
 */
export class CriticalHitModifier extends BaseInteractionModifier {
  constructor(
    private readonly criticalChanceStatType: StatType,
    private readonly criticalMultiplierStatType: StatType,
    private readonly rng: () => number = Math.random
  ) {
    super(
      'critical-hit-modifier',
      'Critical Hit Modifier',
      15, // Higher priority than defense
      ['damage', 'attack'],
      [InteractionPhase.VALUE_MODIFICATION]
    );
  }

  modifyValue(context: InteractionContext, value: StatValue): StatValue | undefined {
    if (!this.canModify(context.interactionType, context.phase)) {
      return undefined;
    }

    const initiatorEntity = this.getEntityById(context.initiatorId);
    if (!initiatorEntity) {
      return undefined;
    }

    const criticalChance = initiatorEntity.getStat(this.criticalChanceStatType) || 0;
    const criticalMultiplier = initiatorEntity.getStat(this.criticalMultiplierStatType) || 2.0;

    if (this.rng() < criticalChance) {
      const criticalValue = value * criticalMultiplier;
      context.metadata.criticalHit = true;
      context.metadata.criticalMultiplier = criticalMultiplier;
      return criticalValue;
    }

    return undefined;
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return entityId === context.initiatorId;
  }

  private getEntityById(entityId: EntityId): Entity | undefined {
    // This would need to be implemented with a proper entity registry
    return undefined;
  }
}

/**
 * Example state adjuster that reduces health based on damage
 */
export class HealthDamageAdjuster extends BaseStateAdjuster {
  constructor(
    private readonly healthStatType: StatType
  ) {
    super(
      'health-damage-adjuster',
      'Health Damage Adjuster',
      10,
      ['damage', 'attack']
    );
  }

  adjustState(context: InteractionContext, entityId: EntityId): Map<StatType, StatValue> {
    if (!this.canAdjust(context.interactionType)) {
      return new Map();
    }

    const changes = new Map<StatType, StatValue>();

    if (entityId === context.targetId && context.finalValue !== undefined) {
      const targetEntity = this.getEntityById(entityId);
      if (targetEntity) {
        const currentHealth = targetEntity.getStat(this.healthStatType) || 0;
        const damage = context.finalValue;
        const newHealth = Math.max(0, currentHealth - damage);
        
        changes.set(this.healthStatType, newHealth);
        
        context.metadata.damageDealt = damage;
        context.metadata.healthRemaining = newHealth;
      }
    }

    return changes;
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return entityId === context.targetId;
  }

  private getEntityById(entityId: EntityId): Entity | undefined {
    // This would need to be implemented with a proper entity registry
    return undefined;
  }
}

/**
 * Example state adjuster that restores health based on healing
 */
export class HealthHealingAdjuster extends BaseStateAdjuster {
  constructor(
    private readonly healthStatType: StatType,
    private readonly maxHealthStatType: StatType
  ) {
    super(
      'health-healing-adjuster',
      'Health Healing Adjuster',
      10,
      ['healing', 'restoration']
    );
  }

  adjustState(context: InteractionContext, entityId: EntityId): Map<StatType, StatValue> {
    if (!this.canAdjust(context.interactionType)) {
      return new Map();
    }

    const changes = new Map<StatType, StatValue>();

    if (entityId === context.targetId && context.finalValue !== undefined) {
      const targetEntity = this.getEntityById(entityId);
      if (targetEntity) {
        const currentHealth = targetEntity.getStat(this.healthStatType) || 0;
        const maxHealth = targetEntity.getStat(this.maxHealthStatType) || 100;
        const healing = context.finalValue;
        const newHealth = Math.min(maxHealth, currentHealth + healing);
        
        changes.set(this.healthStatType, newHealth);
        
        context.metadata.healingDone = healing;
        context.metadata.healthRestored = newHealth - currentHealth;
      }
    }

    return changes;
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return entityId === context.targetId;
  }

  private getEntityById(entityId: EntityId): Entity | undefined {
    // This would need to be implemented with a proper entity registry
    return undefined;
  }
}

/**
 * Example interaction notifier that logs interaction outcomes
 */
export class InteractionLogger extends BaseInteractionNotifier {
  constructor() {
    super(
      'interaction-logger',
      'Interaction Logger',
      ['damage', 'attack', 'healing', 'restoration']
    );
  }

  notify(context: InteractionContext, entityId: EntityId): void {
    if (!this.canNotify(context.interactionType)) {
      return;
    }

    const role = entityId === context.initiatorId ? 'Initiator' : 'Target';
    const interactionType = context.interactionType;
    const finalValue = context.finalValue || 0;

    console.log(`📢 ${role} ${entityId} notified about ${interactionType}:`);
    console.log(`   Original Value: ${context.originalValue || 0}`);
    console.log(`   Final Value: ${finalValue}`);
    
    if (context.metadata.criticalHit) {
      console.log(`   🎯 Critical Hit! (${context.metadata.criticalMultiplier}x)`);
    }
    
    if (context.metadata.damageDealt) {
      console.log(`   💔 Damage Dealt: ${context.metadata.damageDealt}`);
    }
    
    if (context.metadata.healingDone) {
      console.log(`   💚 Healing Done: ${context.metadata.healingDone}`);
    }
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return true; // Always active for logging
  }
}

/**
 * Example interaction notifier that triggers effects based on outcomes
 */
export class EffectTriggerNotifier extends BaseInteractionNotifier {
  constructor(
    private readonly triggerThreshold: StatValue = 10
  ) {
    super(
      'effect-trigger-notifier',
      'Effect Trigger Notifier',
      ['damage', 'attack']
    );
  }

  notify(context: InteractionContext, entityId: EntityId): void {
    if (!this.canNotify(context.interactionType)) {
      return;
    }

    if (entityId === context.targetId && context.finalValue && context.finalValue >= this.triggerThreshold) {
      console.log(`⚡ High damage detected! Triggering defensive effects for ${entityId}`);
      
      // This would trigger defensive effects on the target
      // In a real implementation, this would add effects to the entity
    }
  }

  isActive(entityId: EntityId, context: InteractionContext): boolean {
    return entityId === context.targetId;
  }
}

/**
 * Utility class for creating common interaction definitions
 */
export class InteractionUtils {
  /**
   * Create a damage interaction definition
   */
  static createDamageInteraction(
    id: string,
    name: string,
    modifiers: InteractionModifier[] = [],
    stateAdjusters: StateAdjuster[] = [],
    notifiers: InteractionNotifier[] = []
  ): InteractionDefinition {
    return {
      id,
      name,
      interactionType: 'damage',
      valuePurpose: 'damage',
      valueParameters: {
        targetType: 'enemy',
        element: 'physical'
      },
      phases: [
        InteractionPhase.VALUE_REQUEST,
        InteractionPhase.VALUE_MODIFICATION,
        InteractionPhase.STATE_ADJUSTMENT,
        InteractionPhase.NOTIFICATION,
        InteractionPhase.COMPLETION
      ],
      modifiers,
      stateAdjusters,
      notifiers
    };
  }

  /**
   * Create a healing interaction definition
   */
  static createHealingInteraction(
    id: string,
    name: string,
    modifiers: InteractionModifier[] = [],
    stateAdjusters: StateAdjuster[] = [],
    notifiers: InteractionNotifier[] = []
  ): InteractionDefinition {
    return {
      id,
      name,
      interactionType: 'healing',
      valuePurpose: 'healing',
      valueParameters: {
        targetType: 'ally',
        element: 'magical'
      },
      phases: [
        InteractionPhase.VALUE_REQUEST,
        InteractionPhase.VALUE_MODIFICATION,
        InteractionPhase.STATE_ADJUSTMENT,
        InteractionPhase.NOTIFICATION,
        InteractionPhase.COMPLETION
      ],
      modifiers,
      stateAdjusters,
      notifiers
    };
  }

  /**
   * Create a generic interaction definition
   */
  static createGenericInteraction(
    id: string,
    name: string,
    interactionType: string,
    valuePurpose: string,
    valueParameters?: Record<string, any>,
    modifiers: InteractionModifier[] = [],
    stateAdjusters: StateAdjuster[] = [],
    notifiers: InteractionNotifier[] = []
  ): InteractionDefinition {
    return {
      id,
      name,
      interactionType,
      valuePurpose,
      valueParameters,
      phases: [
        InteractionPhase.VALUE_REQUEST,
        InteractionPhase.VALUE_MODIFICATION,
        InteractionPhase.STATE_ADJUSTMENT,
        InteractionPhase.NOTIFICATION,
        InteractionPhase.COMPLETION
      ],
      modifiers,
      stateAdjusters,
      notifiers
    };
  }
}

/**
 * Set up example interaction system
 */
export function setupExampleInteractionSystem(): void {
  // Create example modifiers
  const defenseModifier = new DefenseModifier('defense', 0.1);
  const criticalHitModifier = new CriticalHitModifier('criticalHitChance', 'criticalHitMultiplier');

  // Create example state adjusters
  const healthDamageAdjuster = new HealthDamageAdjuster('health');
  const healthHealingAdjuster = new HealthHealingAdjuster('health', 'maxHealth');

  // Create example notifiers
  const interactionLogger = new InteractionLogger();
  const effectTriggerNotifier = new EffectTriggerNotifier(15);

  // Register components with the interaction manager
  interactionManager.registerModifier(defenseModifier);
  interactionManager.registerModifier(criticalHitModifier);
  interactionManager.registerStateAdjuster(healthDamageAdjuster);
  interactionManager.registerStateAdjuster(healthHealingAdjuster);
  interactionManager.registerNotifier(interactionLogger);
  interactionManager.registerNotifier(effectTriggerNotifier);

  // Create example interaction definitions
  const damageInteraction = InteractionUtils.createDamageInteraction(
    'basic-damage',
    'Basic Damage Interaction',
    [defenseModifier, criticalHitModifier],
    [healthDamageAdjuster],
    [interactionLogger, effectTriggerNotifier]
  );

  const healingInteraction = InteractionUtils.createHealingInteraction(
    'basic-healing',
    'Basic Healing Interaction',
    [],
    [healthHealingAdjuster],
    [interactionLogger]
  );

  // Register interaction definitions
  interactionManager.registerInteractionDefinition(damageInteraction);
  interactionManager.registerInteractionDefinition(healingInteraction);

  console.log('🎯 Example Interaction System Setup Complete');
  console.log(`   Registered ${interactionManager.getAllModifiers().size} modifiers`);
  console.log(`   Registered ${interactionManager.getAllStateAdjusters().size} state adjusters`);
  console.log(`   Registered ${interactionManager.getAllNotifiers().size} notifiers`);
  console.log(`   Registered ${interactionManager.getInteractionDefinition('damage') ? 1 : 0} damage interaction`);
  console.log(`   Registered ${interactionManager.getInteractionDefinition('healing') ? 1 : 0} healing interaction`);
}
