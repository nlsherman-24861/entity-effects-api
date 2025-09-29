import {
  StatType,
  StatValue,
  StatBound,
  StatBoundFunction,
  StatMap,
  StatBoundConfig,
  StatBoundResult,
  BoundThresholdConfig,
  DEFAULT_BOUND_THRESHOLDS,
  EntityId,
  Effect
} from './types';

/**
 * Utility class for calculating stat bounds and derived metrics
 * 
 * This class provides methods to calculate stat bounds (min/max values) and
 * derive various metrics from those bounds, such as ratios, percentages,
 * and distance from bounds.
 * 
 * Features:
 * - Flexible bound definitions (fixed values or functions of other stats)
 * - Automatic clamping of stat values to bounds
 * - Derived metrics: ratios, percentages, distances from bounds
 * - Domain-agnostic design that works with any stat type
 * 
 * Example usage:
 * - Health bounds: min=0, max=baseHealth
 * - Resource bounds: min=0, max=baseResource
 * - Progress bounds: min=0, max=requiredProgress
 * - Custom bounds: min=baseStat*0.5, max=baseStat*2.0
 */
export class StatBoundCalculator {
  /**
   * Calculate stat bounds based on the provided configuration
   * @param statType - The stat type to calculate bounds for
   * @param config - Configuration for the bound calculation
   * @param stats - Current entity stats
   * @returns The calculated bound result
   */
  static calculateBounds(
    statType: StatType,
    config: StatBoundConfig,
    stats: StatMap
  ): StatBoundResult {
    const currentValue = stats.get(statType) ?? 0;
    
    // Calculate min bound
    let minBound: StatBound;
    if (config.min === undefined) {
      minBound = 0; // Default minimum
    } else if (typeof config.min === 'function') {
      minBound = config.min(stats);
    } else {
      minBound = config.min;
    }
    
    // Calculate max bound
    let maxBound: StatBound;
    if (config.max === undefined) {
      maxBound = 100; // Default maximum
    } else if (typeof config.max === 'function') {
      maxBound = config.max(stats);
    } else {
      maxBound = config.max;
    }
    
    // Ensure min <= max
    if (minBound > maxBound) {
      [minBound, maxBound] = [maxBound, minBound];
    }
    
    // Clamp current value if requested
    let clampedValue = currentValue;
    let isClamped = false;
    
    if (config.clampToBounds) {
      const originalValue = clampedValue;
      clampedValue = Math.max(minBound, Math.min(maxBound, clampedValue));
      isClamped = clampedValue !== originalValue;
    }
    
    return {
      statType,
      currentValue: clampedValue,
      minBound,
      maxBound,
      isClamped,
      config
    };
  }
  
  /**
   * Calculate multiple stat bounds at once
   * @param configs - Map of stat type to bound configuration
   * @param stats - Current entity stats
   * @returns Map of stat type to bound result
   */
  static calculateMultipleBounds(
    configs: Map<StatType, StatBoundConfig>,
    stats: StatMap
  ): Map<StatType, StatBoundResult> {
    const results = new Map<StatType, StatBoundResult>();
    
    for (const [statType, config] of configs) {
      results.set(statType, this.calculateBounds(statType, config, stats));
    }
    
    return results;
  }
  
  /**
   * Create a simple bound configuration with fixed min/max
   * @param min - Minimum bound (default: 0)
   * @param max - Maximum bound (default: 100)
   * @param clampToBounds - Whether to clamp values to bounds (default: false)
   * @param defaultValue - Default value if bounds are invalid (default: 0)
   * @returns Simple bound configuration
   */
  static createSimpleBoundConfig(
    min: StatBound = 0,
    max: StatBound = 100,
    clampToBounds: boolean = false,
    defaultValue: StatValue = 0
  ): StatBoundConfig {
    return {
      min,
      max,
      clampToBounds,
      defaultValue
    };
  }
  
  /**
   * Create a bound configuration with stat-based bounds
   * @param minStat - Stat to use as minimum bound
   * @param maxStat - Stat to use as maximum bound
   * @param clampToBounds - Whether to clamp values to bounds (default: false)
   * @param defaultValue - Default value if bounds are invalid (default: 0)
   * @returns Stat-based bound configuration
   */
  static createStatBasedBoundConfig(
    minStat: StatType,
    maxStat: StatType,
    clampToBounds: boolean = false,
    defaultValue: StatValue = 0
  ): StatBoundConfig {
    return {
      min: (stats: StatMap) => stats.get(minStat) ?? 0,
      max: (stats: StatMap) => stats.get(maxStat) ?? 100,
      clampToBounds,
      defaultValue
    };
  }
  
  /**
   * Create a bound configuration with function-based bounds
   * @param minFunction - Function to calculate minimum bound
   * @param maxFunction - Function to calculate maximum bound
   * @param clampToBounds - Whether to clamp values to bounds (default: false)
   * @param defaultValue - Default value if bounds are invalid (default: 0)
   * @returns Function-based bound configuration
   */
  static createFunctionBasedBoundConfig(
    minFunction: StatBoundFunction,
    maxFunction: StatBoundFunction,
    clampToBounds: boolean = false,
    defaultValue: StatValue = 0
  ): StatBoundConfig {
    return {
      min: minFunction,
      max: maxFunction,
      clampToBounds,
      defaultValue
    };
  }
  
  /**
   * Calculate ratio of current value within bounds (0.0-1.0 range)
   * @param result - The bound result to calculate ratio for
   * @returns Ratio value (0.0-1.0)
   */
  static calculateRatio(result: StatBoundResult): number {
    const { currentValue, minBound, maxBound } = result;
    
    if (maxBound === minBound) {
      return 0.0; // Avoid division by zero
    }
    
    return (currentValue - minBound) / (maxBound - minBound);
  }
  
  /**
   * Calculate percentage of current value within bounds (0-100 range)
   * @param result - The bound result to calculate percentage for
   * @returns Percentage value (0-100)
   */
  static calculatePercentage(result: StatBoundResult): number {
    return this.calculateRatio(result) * 100;
  }
  
  /**
   * Calculate distance from minimum bound
   * @param result - The bound result to calculate distance for
   * @returns Distance from minimum bound
   */
  static calculateDistanceFromMin(result: StatBoundResult): StatValue {
    return result.currentValue - result.minBound;
  }
  
  /**
   * Calculate distance from maximum bound
   * @param result - The bound result to calculate distance for
   * @returns Distance from maximum bound
   */
  static calculateDistanceFromMax(result: StatBoundResult): StatValue {
    return result.maxBound - result.currentValue;
  }
  
  /**
   * Check if current value is at minimum bound
   * @param result - The bound result to check
   * @param tolerance - Tolerance for equality check (default: 0.001)
   * @returns true if current value is at minimum bound
   */
  static isAtMin(result: StatBoundResult, tolerance: number = 0.001): boolean {
    return Math.abs(result.currentValue - result.minBound) <= tolerance;
  }
  
  /**
   * Check if current value is at maximum bound
   * @param result - The bound result to check
   * @param tolerance - Tolerance for equality check (default: 0.001)
   * @returns true if current value is at maximum bound
   */
  static isAtMax(result: StatBoundResult, tolerance: number = 0.001): boolean {
    return Math.abs(result.currentValue - result.maxBound) <= tolerance;
  }
  
  /**
   * Check if current value is within bounds
   * @param result - The bound result to check
   * @param tolerance - Tolerance for bounds check (default: 0.001)
   * @returns true if current value is within bounds
   */
  static isWithinBounds(result: StatBoundResult, tolerance: number = 0.001): boolean {
    return result.currentValue >= (result.minBound - tolerance) && 
           result.currentValue <= (result.maxBound + tolerance);
  }
  
  /**
   * Check if current value is below minimum bound
   * @param result - The bound result to check
   * @param tolerance - Tolerance for bounds check (default: 0.001)
   * @returns true if current value is below minimum bound
   */
  static isBelowMin(result: StatBoundResult, tolerance: number = 0.001): boolean {
    return result.currentValue < (result.minBound - tolerance);
  }
  
  /**
   * Check if current value is above maximum bound
   * @param result - The bound result to check
   * @param tolerance - Tolerance for bounds check (default: 0.001)
   * @returns true if current value is above maximum bound
   */
  static isAboveMax(result: StatBoundResult, tolerance: number = 0.001): boolean {
    return result.currentValue > (result.maxBound + tolerance);
  }
  
  /**
   * Format a bound result as a human-readable string
   * @param result - The bound result to format
   * @param includeValues - Whether to include actual values (default: false)
   * @param thresholdConfig - Threshold configuration for state labels (uses defaults if not provided)
   * @returns Formatted string representation
   */
  static formatBoundResult(
    result: StatBoundResult, 
    includeValues: boolean = false, 
    thresholdConfig: BoundThresholdConfig = DEFAULT_BOUND_THRESHOLDS
  ): string {
    const ratio = this.calculateRatio(result);
    const percentage = this.calculatePercentage(result);
    let formatted = `${percentage.toFixed(1)}%`;
    
    if (includeValues) {
      formatted += ` (${result.currentValue}/${result.maxBound})`;
    }
    
    if (result.isClamped) {
      formatted += ' [CLAMPED]';
    }
    
    if (this.isAtMax(result)) {
      formatted += ' [MAX]';
    } else if (this.isAtMin(result)) {
      formatted += ' [MIN]';
    } else if (ratio <= (thresholdConfig.critical ?? 0.25)) {
      formatted += ' [CRITICAL]';
    } else if (ratio <= (thresholdConfig.low ?? 0.5)) {
      formatted += ' [LOW]';
    } else if (ratio >= (thresholdConfig.high ?? 0.75)) {
      formatted += ' [HIGH]';
    }
    
    return formatted;
  }
  
  /**
   * Get a descriptive state for a bound result
   * @param result - The bound result to describe
   * @param thresholdConfig - Threshold configuration for state determination (uses defaults if not provided)
   * @returns Descriptive state string
   */
  static getStateDescription(
    result: StatBoundResult, 
    thresholdConfig: BoundThresholdConfig = DEFAULT_BOUND_THRESHOLDS
  ): string {
    const ratio = this.calculateRatio(result);
    
    if (this.isAtMax(result)) return 'Maximum';
    if (this.isAtMin(result)) return 'Minimum';
    if (ratio <= (thresholdConfig.critical ?? 0.25)) return 'Critical';
    if (ratio <= (thresholdConfig.low ?? 0.5)) return 'Low';
    if (ratio >= (thresholdConfig.high ?? 0.75)) return 'High';
    return 'Normal';
  }
}
