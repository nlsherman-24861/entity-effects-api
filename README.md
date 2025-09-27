# Entity Effects API

A comprehensive TypeScript API for tracking and managing entities with generic stats, effects, interactions, gear systems, and event-driven architecture.

## 🎯 Features

- **Generic Stat System**: Define arbitrary collections of floating-point stats
- **Effect System**: Stackable and non-stackable effects with apply/reverse mechanisms
- **Smart Caching**: Multi-level caching for performance optimization
- **Event-Driven Architecture**: Reactive system for effect management
- **Frame Snapshots**: Capture entity state at specific points in time
- **Interaction System**: Multi-phase entity interactions with value modification and state adjustment
- **Gear System**: Equipment with passive effects and value providers
- **RNG System**: Comprehensive random number generation with various distributions
- **Active Effects**: On-demand value calculation for specific purposes
- **Effect Applicators**: Event-driven effect management and cooldown systems
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## 🏗️ Architecture

### Core Components

1. **Entity**: Manages stats, effects, gear, and interactions for a single entity
2. **Effects**: Modular stat modifications with various types (passive and active)
3. **Event System**: Handles lifecycle events and notifications
4. **Caching**: Optimizes performance with intelligent caching
5. **Frames**: Immutable snapshots of entity state
6. **Interactions**: Multi-phase entity-to-entity interactions with value modification
7. **Gear System**: Equipment with passive effects and value providers
8. **RNG System**: Random number generation with various distributions
9. **Effect Applicators**: Event-driven effect management and cooldown systems

### Effect Types

- **AdditiveEffect**: Adds flat values to stats
- **MultiplicativeEffect**: Multiplies stats by factors
- **PercentageEffect**: Applies percentage bonuses
- **ConditionalEffect**: Effects that activate based on conditions
- **ComplexEffect**: Custom effects with arbitrary logic
- **SetValueEffect**: Sets stats to specific values (non-stackable)

## 🚀 Quick Start

```typescript
import { Entity, AdditiveEffect, PercentageEffect } from './src';

// Create an entity with base stats
const player = new Entity('player-1', {
  health: 100,
  attack: 20,
  defense: 10,
  speed: 15
});

// Add effects
const swordBonus = new AdditiveEffect(
  'sword-bonus',
  'Sharp Sword',
  'attack',
  10,
  true, // stackable
  1 // priority
);

const speedBoost = new PercentageEffect(
  'speed-boost',
  'Speed Enhancement',
  'speed',
  0.25, // 25% bonus
  true,
  2
);

player.addEffect(swordBonus);
player.addEffect(speedBoost);

// Get current stats
console.log('Attack:', player.getStat('attack')); // 30
console.log('Speed:', player.getStat('speed'));   // 18.75

// Create a frame snapshot
const frame = player.createFrame({ 
  battlePhase: 'preparation' 
});
```

## 📊 Stat Calculation Flow

1. **Base Stats**: Start with entity's base stat values
2. **Effect Application**: Apply effects in priority order
3. **Caching**: Cache results for performance
4. **Event Emission**: Notify listeners of changes

### Effect Priority System

Effects are applied in priority order (lower numbers first):
- Priority 1: Base modifications (sword bonuses, etc.)
- Priority 2: Multiplicative effects (health potions, etc.)
- Priority 3: Percentage bonuses (speed enhancements, etc.)
- Priority 4: Conditional effects (berserker rage, etc.)
- Priority 5: Complex effects (magic auras, etc.)

## 🎭 Event System

The system emits events for all major operations:

```typescript
import { eventSystem, EventType } from './src';

eventSystem.on(EventType.EFFECT_ADDED, (event) => {
  console.log(`Effect added: ${event.data.effect.name}`);
});

eventSystem.on(EventType.STAT_CHANGED, (event) => {
  console.log(`Stat changed: ${event.data.statType} = ${event.data.value}`);
});
```

### Event Types

- `EFFECT_ADDED`: When an effect is added to an entity
- `EFFECT_REMOVED`: When an effect is removed from an entity
- `STAT_CHANGED`: When a base stat is modified
- `FRAME_CREATED`: When a frame snapshot is created
- `ENTITY_CREATED`: When a new entity is created
- `ENTITY_DESTROYED`: When an entity is destroyed

## 🧠 Caching System

The system implements intelligent caching at multiple levels:

### Stats Cache
- Caches calculated stats based on active effects
- Invalidated when effects are added/removed
- 1-second validity window for performance

### Effect Cache
- Caches effect activation status
- Reduces redundant `isActive()` calls
- Automatically invalidated on context changes

## 🔧 Advanced Usage

### Custom Effects

```typescript
import { ComplexEffect } from './src';

const customEffect = new ComplexEffect(
  'custom-effect',
  'Custom Effect',
  (context, stats) => {
    // Apply custom logic
    const health = stats.get('health') ?? 0;
    stats.set('health', health * 1.5);
    
    const attack = stats.get('attack') ?? 0;
    stats.set('attack', attack + 10);
  },
  (context, stats) => {
    // Reverse the effects
    const health = stats.get('health') ?? 0;
    stats.set('health', health / 1.5);
    
    const attack = stats.get('attack') ?? 0;
    stats.set('attack', attack - 10);
  },
  (context) => {
    // Optional condition
    return context.currentStats.get('mana') ?? 0 > 20;
  }
);
```

### Conditional Effects

```typescript
import { ConditionalEffect, AdditiveEffect } from './src';

const berserkerRage = new ConditionalEffect(
  'berserker-rage',
  'Berserker Rage',
  (context) => {
    const health = context.currentStats.get('health') ?? 0;
    const maxHealth = context.baseStats.health;
    return health > maxHealth * 0.5; // Only when health > 50%
  },
  new AdditiveEffect('rage-attack', 'Rage Attack', 'attack', 15),
  true,
  4
);
```

## 📈 Performance Considerations

- **Caching**: Reduces redundant calculations
- **Effect Priority**: Optimized application order
- **Event Batching**: Efficient event handling
- **Memory Management**: Automatic cache cleanup

## 🧪 Testing

Run the example to see the system in action:

```bash
npm start
```

This will demonstrate:
- Entity creation with base stats
- Effect application and stacking
- Stat calculation and caching
- Event emission and handling
- Frame snapshot creation
- Effect removal and stat updates
- RNG system with various distributions
- Active effects and gear systems
- Entity interactions with value modification
- Gear passive effects and swapping
- Consumer-level RPG implementations

## 📁 Project Structure

```
src/
├── types.ts                    # Core type definitions
├── Entity.ts                   # Entity class implementation
├── effects.ts                  # Effect system implementations
├── EventSystem.ts              # Event-driven architecture
├── FrameManager.ts             # Frame management and snapshots
├── OptimizedFrameSystem.ts     # Performance-optimized frame system
├── EffectApplicator.ts         # Event-driven effect management
├── RNG.ts                      # Random number generation system
├── RNGEffects.ts               # RNG-based effects and utilities
├── ActiveEffects.ts            # Active effects and gear system
├── InteractionSystem.ts        # Entity interaction system
├── GearEffectApplicators.ts    # Gear-based effect applicators
├── examples.ts                 # Comprehensive usage examples
├── RNGExamples.ts              # RNG system demonstrations
├── ActiveEffectsExamples.ts    # Active effects demonstrations
├── InteractionSystemExamples.ts # Interaction system demonstrations
├── GearPassiveEffectsExamples.ts # Gear passive effects demonstrations
├── ConsumerRPGExamples.ts      # Consumer-level RPG implementations
├── ConsumerRPGActiveEffects.ts # Consumer-level RPG active effects
└── index.ts                    # Main entry point and exports
```

## 🔮 Future Enhancements

- **Effect Dependencies**: Effects that depend on other effects
- **Temporal Effects**: Effects with duration and decay
- **Stat Validation**: Constraints and validation rules
- **Performance Metrics**: Built-in performance monitoring
- **Serialization**: Save/load entity states
- **Effect Templates**: Reusable effect configurations

## 📝 License

ISC License - see package.json for details.

## 🤝 Contributing

This is a demonstration project showcasing advanced TypeScript patterns for entity management systems. Feel free to extend and modify for your specific use cases!