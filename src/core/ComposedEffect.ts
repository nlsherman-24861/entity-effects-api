import {
  Effect,
  EffectId,
  EffectContext,
  StatType,
  StatValue,
  StatMap,
  StatStackability,
  EffectApplicability,
  EffectImpact,
  EffectTarget,
  EffectApplication
} from './types';

/**
 * Composed effect that uses composition to separate concerns
 * 
 * This effect combines:
 * - Applicability: When should the effect apply?
 * - Impact: How much should it change?
 * - Target: What should it change?
 * - Application: How should the change be applied?
 */
export class ComposedEffect implements Effect {
  constructor(
    public readonly id: EffectId,
    public readonly name: string,
    public readonly priority: number = 0,
    public readonly statTypes: StatType[],
    public readonly stackabilityRules: StatStackability[],
    private readonly applicability: EffectApplicability,
    private readonly impact: EffectImpact,
    private readonly target: EffectTarget,
    private readonly application: EffectApplication
  ) {}

  /**
   * Apply this effect to modify stats
   */
  apply(context: EffectContext, stats: StatMap): void {
    // Check if effect is applicable
    if (!this.applicability.isApplicable(context)) {
      return;
    }

    // Get target stat types
    const targets = this.target.getTargets(context);
    
    // Apply impact to each target
    for (const statType of targets) {
      const impactAmount = this.impact.calculateImpact(context, statType);
      this.application.applyImpact(context, stats, statType, impactAmount);
    }
  }

  /**
   * Reverse this effect from stats
   */
  reverse(context: EffectContext, stats: StatMap): void {
    // Check if effect is applicable (for consistency)
    if (!this.applicability.isApplicable(context)) {
      return;
    }

    // Get target stat types
    const targets = this.target.getTargets(context);
    
    // Reverse impact from each target
    for (const statType of targets) {
      const impactAmount = this.impact.calculateImpact(context, statType);
      this.application.reverseImpact(context, stats, statType, impactAmount);
    }
  }

  /**
   * Check if this effect should be active given the current context
   */
  isActive(context: EffectContext): boolean {
    return this.applicability.isApplicable(context);
  }

  /**
   * Check if this effect can stack with another effect for a specific stat type
   */
  canStackWith(otherEffect: Effect, statType: StatType): boolean {
    const myRule = this.stackabilityRules.find(rule => rule.statType === statType);
    const otherRule = otherEffect.stackabilityRules.find(rule => rule.statType === statType);
    
    if (!myRule || !otherRule) return true; // Default to stackable if no rules
    
    return myRule.stackable && otherRule.stackable;
  }
}

/**
 * Builder for creating composed effects
 */
export class ComposedEffectBuilder {
  private _id: EffectId;
  private _name: string;
  private _priority: number = 0;
  private _statTypes: StatType[] = [];
  private _stackabilityRules: StatStackability[] = [];
  private _applicability?: EffectApplicability;
  private _impact?: EffectImpact;
  private _target?: EffectTarget;
  private _application?: EffectApplication;

  constructor(id: EffectId, name: string) {
    this._id = id;
    this._name = name;
  }

  withPriority(priority: number): this {
    this._priority = priority;
    return this;
  }

  withStatTypes(statTypes: StatType[]): this {
    this._statTypes = statTypes;
    return this;
  }

  withStackabilityRules(rules: StatStackability[]): this {
    this._stackabilityRules = rules;
    return this;
  }

  withApplicability(applicability: EffectApplicability): this {
    this._applicability = applicability;
    return this;
  }

  withImpact(impact: EffectImpact): this {
    this._impact = impact;
    return this;
  }

  withTarget(target: EffectTarget): this {
    this._target = target;
    return this;
  }

  withApplication(application: EffectApplication): this {
    this._application = application;
    return this;
  }

  build(): ComposedEffect {
    if (!this._applicability) {
      throw new Error('Applicability is required');
    }
    if (!this._impact) {
      throw new Error('Impact is required');
    }
    if (!this._target) {
      throw new Error('Target is required');
    }
    if (!this._application) {
      throw new Error('Application is required');
    }

    return new ComposedEffect(
      this._id,
      this._name,
      this._priority,
      this._statTypes,
      this._stackabilityRules,
      this._applicability,
      this._impact,
      this._target,
      this._application
    );
  }
}
