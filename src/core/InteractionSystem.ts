import {
  EntityId,
  StatType,
  StatValue,
  InteractionPhase,
  InteractionContext,
  InteractionModifier,
  StateAdjuster,
  InteractionNotifier,
  InteractionResult,
  InteractionDefinition,
  EventType,
  Event
} from './types';
import { Entity } from './Entity';
import { eventSystem } from './EventSystem';

/**
 * Base class for interaction modifiers
 */
export abstract class BaseInteractionModifier implements InteractionModifier {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly priority: number,
    public readonly supportedInteractionTypes: string[],
    public readonly supportedPhases: InteractionPhase[]
  ) {}

  canModify(interactionType: string, phase: InteractionPhase): boolean {
    return this.supportedInteractionTypes.includes(interactionType) &&
           this.supportedPhases.includes(phase);
  }

  abstract modifyValue(context: InteractionContext, value: StatValue): StatValue | undefined;
  abstract isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * Base class for state adjusters
 */
export abstract class BaseStateAdjuster implements StateAdjuster {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly priority: number,
    public readonly supportedInteractionTypes: string[]
  ) {}

  canAdjust(interactionType: string): boolean {
    return this.supportedInteractionTypes.includes(interactionType);
  }

  abstract adjustState(context: InteractionContext, entityId: EntityId): Map<StatType, StatValue>;
  abstract isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * Base class for interaction notifiers
 */
export abstract class BaseInteractionNotifier implements InteractionNotifier {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly supportedInteractionTypes: string[]
  ) {}

  canNotify(interactionType: string): boolean {
    return this.supportedInteractionTypes.includes(interactionType);
  }

  abstract notify(context: InteractionContext, entityId: EntityId): void;
  abstract isActive(entityId: EntityId, context: InteractionContext): boolean;
}

/**
 * Interaction manager that handles the execution of interactions between entities
 */
export class InteractionManager {
  private readonly _interactionDefinitions: Map<string, InteractionDefinition> = new Map();
  private readonly _modifiers: Map<string, InteractionModifier> = new Map();
  private readonly _stateAdjusters: Map<string, StateAdjuster> = new Map();
  private readonly _notifiers: Map<string, InteractionNotifier> = new Map();
  private readonly _activeInteractions: Map<string, InteractionContext> = new Map();

  /**
   * Register an interaction definition
   */
  registerInteractionDefinition(definition: InteractionDefinition): void {
    this._interactionDefinitions.set(definition.id, definition);
    
    // Register components from the definition
    for (const modifier of definition.modifiers) {
      this._modifiers.set(modifier.id, modifier);
    }
    
    for (const adjuster of definition.stateAdjusters) {
      this._stateAdjusters.set(adjuster.id, adjuster);
    }
    
    for (const notifier of definition.notifiers) {
      this._notifiers.set(notifier.id, notifier);
    }
  }

  /**
   * Register an interaction modifier
   */
  registerModifier(modifier: InteractionModifier): void {
    this._modifiers.set(modifier.id, modifier);
  }

  /**
   * Register a state adjuster
   */
  registerStateAdjuster(adjuster: StateAdjuster): void {
    this._stateAdjusters.set(adjuster.id, adjuster);
  }

  /**
   * Register an interaction notifier
   */
  registerNotifier(notifier: InteractionNotifier): void {
    this._notifiers.set(notifier.id, notifier);
  }

  /**
   * Execute an interaction between two entities
   */
  executeInteraction(
    initiator: Entity,
    target: Entity,
    interactionType: string,
    parameters?: Record<string, any>
  ): InteractionResult | undefined {
    const interactionId = `${interactionType}-${initiator.id}-${target.id}-${Date.now()}`;
    const startTime = Date.now();

    // Find interaction definition
    const definition = Array.from(this._interactionDefinitions.values())
      .find(def => def.interactionType === interactionType);
    
    if (!definition) {
      console.warn(`No interaction definition found for type: ${interactionType}`);
      return undefined;
    }

    // Create interaction context
    const context: InteractionContext = {
      interactionId,
      initiatorId: initiator.id,
      targetId: target.id,
      interactionType,
      phase: InteractionPhase.INITIATION,
      timestamp: startTime,
      parameters: parameters || {},
      stateChanges: new Map(),
      metadata: {}
    };

    this._activeInteractions.set(interactionId, context);

    try {
      // Execute interaction phases
      const result = this.executeInteractionPhases(initiator, target, context, definition);
      
      // Clean up
      this._activeInteractions.delete(interactionId);
      
      return result;
    } catch (error) {
      console.error(`Error executing interaction ${interactionId}:`, error);
      this._activeInteractions.delete(interactionId);
      return undefined;
    }
  }

  /**
   * Execute the phases of an interaction
   */
  private executeInteractionPhases(
    initiator: Entity,
    target: Entity,
    context: InteractionContext,
    definition: InteractionDefinition
  ): InteractionResult {
    const startTime = Date.now();
    let currentValue: StatValue = 0;
    let originalValue: StatValue = 0;

    // Phase 1: Value Request
    if (definition.phases.includes(InteractionPhase.VALUE_REQUEST)) {
      context.phase = InteractionPhase.VALUE_REQUEST;
      
      const valueResult = initiator.requestValue(
        definition.valuePurpose,
        definition.valueParameters
      );
      
      if (!valueResult) {
        throw new Error(`Failed to get value for purpose: ${definition.valuePurpose}`);
      }
      
      originalValue = valueResult.value;
      currentValue = valueResult.value;
      context.originalValue = originalValue;
      
      this.emitInteractionEvent(context, 'value_requested', {
        value: originalValue,
        provider: valueResult.provider
      });
    }

    // Phase 2: Value Modification
    if (definition.phases.includes(InteractionPhase.VALUE_MODIFICATION)) {
      context.phase = InteractionPhase.VALUE_MODIFICATION;
      
      // Apply modifiers from target entity
      currentValue = this.applyModifiers(target, context, currentValue);
      
      // Apply global modifiers
      currentValue = this.applyGlobalModifiers(context, currentValue);
      
      context.modifiedValue = currentValue;
      
      this.emitInteractionEvent(context, 'value_modified', {
        originalValue,
        modifiedValue: currentValue
      });
    }

    // Phase 3: State Adjustment
    if (definition.phases.includes(InteractionPhase.STATE_ADJUSTMENT)) {
      context.phase = InteractionPhase.STATE_ADJUSTMENT;
      
      // Apply state adjustments to target
      this.applyStateAdjustments(target, context);
      
      // Apply state adjustments to initiator
      this.applyStateAdjustments(initiator, context);
      
      this.emitInteractionEvent(context, 'state_adjusted', {
        stateChanges: context.stateChanges
      });
    }

    // Phase 4: Notification
    if (definition.phases.includes(InteractionPhase.NOTIFICATION)) {
      context.phase = InteractionPhase.NOTIFICATION;
      
      // Notify initiator
      this.sendNotifications(initiator, context);
      
      // Notify target
      this.sendNotifications(target, context);
      
      this.emitInteractionEvent(context, 'notifications_sent', {
        initiatorNotified: true,
        targetNotified: true
      });
    }

    // Phase 5: Completion
    context.phase = InteractionPhase.COMPLETION;
    context.finalValue = currentValue;

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.emitInteractionEvent(context, 'interaction_completed', {
      duration,
      success: true
    });

    return {
      interactionId: context.interactionId,
      initiatorId: context.initiatorId,
      targetId: context.targetId,
      interactionType: context.interactionType,
      success: true,
      originalValue,
      finalValue: currentValue,
      stateChanges: new Map(context.stateChanges),
      timestamp: startTime,
      duration,
      metadata: { ...context.metadata }
    };
  }

  /**
   * Apply modifiers from an entity
   */
  private applyModifiers(entity: Entity, context: InteractionContext, value: StatValue): StatValue {
    let modifiedValue = value;

    // Get modifiers from entity's gear and effects
    const modifiers = this.getEntityModifiers(entity, context);
    
    // Sort by priority (highest first)
    modifiers.sort((a, b) => b.priority - a.priority);

    // Apply modifiers
    for (const modifier of modifiers) {
      if (modifier.isActive(entity.id, context)) {
        const newValue = modifier.modifyValue(context, modifiedValue);
        if (newValue !== undefined) {
          modifiedValue = newValue;
        }
      }
    }

    return modifiedValue;
  }

  /**
   * Apply global modifiers
   */
  private applyGlobalModifiers(context: InteractionContext, value: StatValue): StatValue {
    let modifiedValue = value;

    // Get global modifiers
    const globalModifiers = Array.from(this._modifiers.values())
      .filter(modifier => modifier.canModify(context.interactionType, context.phase))
      .sort((a, b) => b.priority - a.priority);

    // Apply global modifiers
    for (const modifier of globalModifiers) {
      if (modifier.isActive(context.targetId, context) || modifier.isActive(context.initiatorId, context)) {
        const newValue = modifier.modifyValue(context, modifiedValue);
        if (newValue !== undefined) {
          modifiedValue = newValue;
        }
      }
    }

    return modifiedValue;
  }

  /**
   * Get modifiers from an entity's gear and effects
   */
  private getEntityModifiers(entity: Entity, context: InteractionContext): InteractionModifier[] {
    const modifiers: InteractionModifier[] = [];

    // This would need to be implemented based on how entities store modifiers
    // For now, we'll return an empty array
    // In a full implementation, entities would have methods to get their modifiers

    return modifiers;
  }

  /**
   * Apply state adjustments to an entity
   */
  private applyStateAdjustments(entity: Entity, context: InteractionContext): void {
    const adjusters = Array.from(this._stateAdjusters.values())
      .filter(adjuster => adjuster.canAdjust(context.interactionType))
      .sort((a, b) => b.priority - a.priority);

    for (const adjuster of adjusters) {
      if (adjuster.isActive(entity.id, context)) {
        const changes = adjuster.adjustState(context, entity.id);
        
        if (changes.size > 0) {
          // Apply changes to entity
          for (const [statType, value] of changes) {
            entity.setStat(statType, value);
          }
          
          // Track changes in context
          if (!context.stateChanges.has(entity.id)) {
            context.stateChanges.set(entity.id, new Map());
          }
          const entityChanges = context.stateChanges.get(entity.id)!;
          for (const [statType, value] of changes) {
            entityChanges.set(statType, value);
          }
        }
      }
    }
  }

  /**
   * Send notifications to an entity
   */
  private sendNotifications(entity: Entity, context: InteractionContext): void {
    const notifiers = Array.from(this._notifiers.values())
      .filter(notifier => notifier.canNotify(context.interactionType));

    for (const notifier of notifiers) {
      if (notifier.isActive(entity.id, context)) {
        notifier.notify(context, entity.id);
      }
    }
  }

  /**
   * Emit an interaction event
   */
  private emitInteractionEvent(context: InteractionContext, eventType: string, data: any): void {
    // Map interaction event types to EventType enum values
    const eventTypeMap: Record<string, EventType> = {
      'value_requested': EventType.INTERACTION_VALUE_REQUESTED,
      'value_modified': EventType.INTERACTION_VALUE_MODIFIED,
      'state_adjusted': EventType.INTERACTION_STATE_ADJUSTED,
      'notifications_sent': EventType.INTERACTION_NOTIFICATIONS_SENT,
      'interaction_completed': EventType.INTERACTION_COMPLETED
    };

    const mappedEventType = eventTypeMap[eventType] || EventType.CUSTOM_EVENT;
    
    eventSystem.emitEvent(mappedEventType, {
      interactionId: context.interactionId,
      interactionType: context.interactionType,
      phase: context.phase,
      timestamp: Date.now(),
      ...data
    });
  }

  /**
   * Get active interactions
   */
  getActiveInteractions(): Map<string, InteractionContext> {
    return new Map(this._activeInteractions);
  }

  /**
   * Get interaction definition by type
   */
  getInteractionDefinition(interactionType: string): InteractionDefinition | undefined {
    return Array.from(this._interactionDefinitions.values())
      .find(def => def.interactionType === interactionType);
  }

  /**
   * Get all registered modifiers
   */
  getAllModifiers(): Map<string, InteractionModifier> {
    return new Map(this._modifiers);
  }

  /**
   * Get all registered state adjusters
   */
  getAllStateAdjusters(): Map<string, StateAdjuster> {
    return new Map(this._stateAdjusters);
  }

  /**
   * Get all registered notifiers
   */
  getAllNotifiers(): Map<string, InteractionNotifier> {
    return new Map(this._notifiers);
  }
}

/**
 * Global interaction manager instance
 */
export const interactionManager = new InteractionManager();
