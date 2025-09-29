import { Entity } from '../core/Entity';
import { StatBoundCalculator } from '../core/StatBoundCalculator';
import { StatBoundConfig, BoundThresholdConfig, DEFAULT_BOUND_THRESHOLDS } from '../core/types';

/**
 * Comprehensive Stat Bound System Demonstration
 * 
 * This demonstrates how to use the stat bound system to model values
 * with min/max bounds and derive ratios, percentages, and other metrics.
 * 
 * Key concepts:
 * - Stat bounds define min/max values for any stat type
 * - Bounds can be fixed values or functions of other stats
 * - Ratios and percentages are naturally derived from bounds
 * - Distance from bounds provides additional context
 * - Domain-agnostic design works with any stat type
 */

/**
 * Example stats interface for bound demonstrations
 */
interface ExampleStatsWithBounds {
  // Basic stats
  current: number;
  maximum: number;
  resource: number;
  maxResource: number;
  energy: number;
  maxEnergy: number;
  progress: number;
  required: number;
  
  // Derived stats
  power: number;
  resistance: number;
  velocity: number;
  accuracy: number;
  
  // Base stats for calculations
  baseHealth: number;
  baseResource: number;
  baseEnergy: number;
}

/**
 * Demonstrate basic stat bound calculations
 */
function demonstrateBasicStatBounds(): void {
  console.log('\n📊 Basic Stat Bound Calculations:');
  
  const entity = new Entity('entity-1', {
    current: 75,
    maximum: 100,
    resource: 30,
    maxResource: 50,
    energy: 20,
    maxEnergy: 25,
    progress: 1500,
    required: 2000,
    power: 25,
    resistance: 15,
    velocity: 20,
    accuracy: 0.15,
    baseHealth: 100,
    baseResource: 50,
    baseEnergy: 25
  });
  
  // Simple bounds (fixed min/max)
  const currentBounds = entity.getStatBounds('current', 0, 100);
  console.log('Current Bounds:', StatBoundCalculator.formatBoundResult(currentBounds, true));
  console.log('Current Ratio:', StatBoundCalculator.calculateRatio(currentBounds).toFixed(3));
  console.log('Current Percentage:', StatBoundCalculator.calculatePercentage(currentBounds).toFixed(1) + '%');
  console.log('Distance from Min:', StatBoundCalculator.calculateDistanceFromMin(currentBounds));
  console.log('Distance from Max:', StatBoundCalculator.calculateDistanceFromMax(currentBounds));
  
  // Stat-based bounds (min/max from other stats)
  const resourceBounds = entity.getStatBasedBounds('resource', 'resource', 'maxResource');
  console.log('\nResource Bounds:', StatBoundCalculator.formatBoundResult(resourceBounds, true));
  console.log('Resource Ratio:', StatBoundCalculator.calculateRatio(resourceBounds).toFixed(3));
  console.log('Resource Percentage:', StatBoundCalculator.calculatePercentage(resourceBounds).toFixed(1) + '%');
  
  // Function-based bounds
  const functionBasedConfig: StatBoundConfig = StatBoundCalculator.createFunctionBasedBoundConfig(
    (stats) => stats.get('baseHealth')! * 0.1, // Min = 10% of base health
    (stats) => stats.get('baseHealth')! * 1.5  // Max = 150% of base health
  );
  
  const healthBounds = entity.calculateStatBounds('current', functionBasedConfig);
  console.log('\nHealth Bounds (function-based):', StatBoundCalculator.formatBoundResult(healthBounds, true));
  console.log('Health Ratio:', StatBoundCalculator.calculateRatio(healthBounds).toFixed(3));
  console.log('Health Percentage:', StatBoundCalculator.calculatePercentage(healthBounds).toFixed(1) + '%');
}

/**
 * Demonstrate bound-based state checking
 */
function demonstrateBoundStateChecking(): void {
  console.log('\n🎯 Bound-Based State Checking:');
  
  const entity = new Entity('entity-2', {
    current: 25,
    maximum: 100,
    resource: 45,
    maxResource: 50,
    energy: 5,
    maxEnergy: 25,
    progress: 1800,
    required: 2000,
    power: 30,
    resistance: 20,
    velocity: 15,
    accuracy: 0.2,
    baseHealth: 100,
    baseResource: 50,
    baseEnergy: 25
  });
  
  // Check various bound states
  const currentConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const resourceConfig = StatBoundCalculator.createStatBasedBoundConfig('resource', 'maxResource');
  
  console.log('Current State Checks:');
  console.log('  Is at min?', entity.isStatAtMin('current', currentConfig));
  console.log('  Is at max?', entity.isStatAtMax('current', currentConfig));
  console.log('  Is within bounds?', entity.isStatWithinBounds('current', currentConfig));
  console.log('  State:', StatBoundCalculator.getStateDescription(entity.calculateStatBounds('current', currentConfig)));
  
  console.log('\nResource State Checks:');
  console.log('  Is at min?', entity.isStatAtMin('resource', resourceConfig));
  console.log('  Is at max?', entity.isStatAtMax('resource', resourceConfig));
  console.log('  Is within bounds?', entity.isStatWithinBounds('resource', resourceConfig));
  console.log('  State:', StatBoundCalculator.getStateDescription(entity.calculateStatBounds('resource', resourceConfig)));
  
  // Demonstrate threshold-based state checking
  console.log('\n🎯 Threshold-Based State Checking:');
  
  const performanceThresholds: BoundThresholdConfig = {
    critical: 0.2,
    low: 0.4,
    high: 0.8,
    full: 1.0,
    empty: 0.0
  };
  
  const currentBounds = entity.calculateStatBounds('current', currentConfig);
  console.log('Current with performance thresholds:', 
    StatBoundCalculator.formatBoundResult(currentBounds, true, performanceThresholds));
  console.log('Current state:', 
    StatBoundCalculator.getStateDescription(currentBounds, performanceThresholds));
}

/**
 * Demonstrate multiple bound calculations
 */
function demonstrateMultipleBounds(): void {
  console.log('\n📈 Multiple Bound Calculations:');
  
  const entity = new Entity('entity-3', {
    current: 80,
    maximum: 100,
    resource: 35,
    maxResource: 50,
    energy: 22,
    maxEnergy: 25,
    progress: 1600,
    required: 2000,
    power: 35,
    resistance: 25,
    velocity: 18,
    accuracy: 0.25,
    baseHealth: 100,
    baseResource: 50,
    baseEnergy: 25
  });
  
  // Create multiple bound configurations
  const boundConfigs = new Map([
    ['current', StatBoundCalculator.createSimpleBoundConfig(0, 100)],
    ['resource', StatBoundCalculator.createStatBasedBoundConfig('resource', 'maxResource')],
    ['energy', StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy')],
    ['progress', StatBoundCalculator.createSimpleBoundConfig(0, 2000)]
  ]);
  
  const results = entity.calculateMultipleStatBounds(boundConfigs);
  
  console.log('Multiple Bound Results:');
  for (const [statType, result] of results) {
    const ratio = StatBoundCalculator.calculateRatio(result);
    const percentage = StatBoundCalculator.calculatePercentage(result);
    console.log(`  ${statType}: ${percentage.toFixed(1)}% (${result.currentValue}/${result.maxBound}) [${StatBoundCalculator.getStateDescription(result)}]`);
  }
}

/**
 * Demonstrate bound-based effects and interactions
 */
function demonstrateBoundBasedEffects(): void {
  console.log('\n⚡ Bound-Based Effects and Interactions:');
  
  const entity = new Entity('entity-4', {
    current: 60,
    maximum: 100,
    resource: 20,
    maxResource: 50,
    energy: 15,
    maxEnergy: 25,
    progress: 1200,
    required: 2000,
    power: 25,
    resistance: 15,
    velocity: 20,
    accuracy: 0.15,
    baseHealth: 100,
    baseResource: 50,
    baseEnergy: 25
  });
  
  // Create bound configurations for different contexts
  const healthConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100);
  const resourceConfig = StatBoundCalculator.createStatBasedBoundConfig('resource', 'maxResource');
  const energyConfig = StatBoundCalculator.createStatBasedBoundConfig('energy', 'maxEnergy');
  
  // Calculate ratios for effect triggers
  const healthRatio = entity.getStatRatioFromBounds('current', healthConfig);
  const resourceRatio = entity.getStatRatioFromBounds('resource', resourceConfig);
  const energyRatio = entity.getStatRatioFromBounds('energy', energyConfig);
  
  console.log('Bound-Based Ratios for Effects:');
  console.log(`  Health ratio: ${healthRatio.toFixed(3)} (${(healthRatio * 100).toFixed(1)}%)`);
  console.log(`  Resource ratio: ${resourceRatio.toFixed(3)} (${(resourceRatio * 100).toFixed(1)}%)`);
  console.log(`  Energy ratio: ${energyRatio.toFixed(3)} (${(energyRatio * 100).toFixed(1)}%)`);
  
  // Demonstrate effect conditions based on bounds
  console.log('\nEffect Conditions:');
  console.log(`  Low health effect (ratio < 0.3): ${healthRatio < 0.3 ? 'ACTIVE' : 'INACTIVE'}`);
  console.log(`  High resource effect (ratio > 0.8): ${resourceRatio > 0.8 ? 'ACTIVE' : 'INACTIVE'}`);
  console.log(`  Critical energy effect (ratio < 0.2): ${energyRatio < 0.2 ? 'ACTIVE' : 'INACTIVE'}`);
  
  // Demonstrate bound-based stat modifications
  console.log('\nBound-Based Stat Modifications:');
  const currentBounds = entity.calculateStatBounds('current', healthConfig);
  const distanceFromMax = StatBoundCalculator.calculateDistanceFromMax(currentBounds);
  console.log(`  Distance from max health: ${distanceFromMax}`);
  console.log(`  Healing potential: ${distanceFromMax > 0 ? 'Can heal' : 'At max health'}`);
}

/**
 * Demonstrate advanced bound configurations
 */
function demonstrateAdvancedBoundConfigurations(): void {
  console.log('\n🔧 Advanced Bound Configurations:');
  
  const entity = new Entity('entity-5', {
    current: 90,
    maximum: 100,
    resource: 40,
    maxResource: 50,
    energy: 20,
    maxEnergy: 25,
    progress: 1900,
    required: 2000,
    power: 40,
    resistance: 30,
    velocity: 25,
    accuracy: 0.3,
    baseHealth: 100,
    baseResource: 50,
    baseEnergy: 25
  });
  
  // Complex function-based bounds
  const complexConfig: StatBoundConfig = StatBoundCalculator.createFunctionBasedBoundConfig(
    (stats) => {
      // Min = 20% of base health, but never less than 10
      return Math.max(10, stats.get('baseHealth')! * 0.2);
    },
    (stats) => {
      // Max = base health + 50% of current power
      return stats.get('baseHealth')! + (stats.get('power')! * 0.5);
    }
  );
  
  const complexBounds = entity.calculateStatBounds('current', complexConfig);
  console.log('Complex Bounds:', StatBoundCalculator.formatBoundResult(complexBounds, true));
  console.log('Complex Ratio:', StatBoundCalculator.calculateRatio(complexBounds).toFixed(3));
  console.log('Complex Percentage:', StatBoundCalculator.calculatePercentage(complexBounds).toFixed(1) + '%');
  
  // Clamped bounds
  const clampedConfig = StatBoundCalculator.createSimpleBoundConfig(0, 100, true); // clampToBounds = true
  const clampedBounds = entity.calculateStatBounds('current', clampedConfig);
  console.log('\nClamped Bounds:', StatBoundCalculator.formatBoundResult(clampedBounds, true));
  console.log('Was clamped?', clampedBounds.isClamped);
  
  // Test with value outside bounds
  entity.setStat('current', 150); // Set above max
  const clampedBoundsAbove = entity.calculateStatBounds('current', clampedConfig);
  console.log('Clamped Bounds (above max):', StatBoundCalculator.formatBoundResult(clampedBoundsAbove, true));
  console.log('Was clamped?', clampedBoundsAbove.isClamped);
  
  entity.setStat('current', -10); // Set below min
  const clampedBoundsBelow = entity.calculateStatBounds('current', clampedConfig);
  console.log('Clamped Bounds (below min):', StatBoundCalculator.formatBoundResult(clampedBoundsBelow, true));
  console.log('Was clamped?', clampedBoundsBelow.isClamped);
}

/**
 * Run all stat bound examples
 */
export function runStatBoundExamples(): void {
  console.log('\n🎯 Stat Bound System Comprehensive Demonstration');
  console.log('=' .repeat(60));
  
  demonstrateBasicStatBounds();
  console.log('\n' + '=' .repeat(60));
  
  demonstrateBoundStateChecking();
  console.log('\n' + '=' .repeat(60));
  
  demonstrateMultipleBounds();
  console.log('\n' + '=' .repeat(60));
  
  demonstrateBoundBasedEffects();
  console.log('\n' + '=' .repeat(60));
  
  demonstrateAdvancedBoundConfigurations();
  console.log('\n' + '=' .repeat(60));
  
  console.log('\n✅ Stat Bound System Demonstration Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('• Flexible stat bounds (fixed values or functions)');
  console.log('• Natural ratio and percentage calculations');
  console.log('• Distance from bounds for additional context');
  console.log('• Bound-based state checking and thresholds');
  console.log('• Multiple bound calculations and configurations');
  console.log('• Advanced function-based and clamped bounds');
  console.log('• Domain-agnostic design for any stat type');
}
