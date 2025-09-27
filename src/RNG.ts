/**
 * Core RNG (Random Number Generation) API for chance-oriented operations
 */

/**
 * Base interface for all RNG generators
 */
export interface RNGGenerator {
  /**
   * Generate a random number between 0 and 1 (exclusive)
   */
  random(): number;
  
  /**
   * Generate a random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number;
  
  /**
   * Generate a random floating point number between min and max
   */
  randomFloat(min: number, max: number): number;
  
  /**
   * Check if a random event occurs with given probability (0-1)
   */
  chance(probability: number): boolean;
  
  /**
   * Select a random element from an array
   */
  choice<T>(array: T[]): T | undefined;
  
  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[];
  
  /**
   * Get the current seed (if applicable)
   */
  getSeed?(): number | undefined;
  
  /**
   * Set a new seed (if applicable)
   */
  setSeed?(seed: number): void;
}

/**
 * Weighted choice configuration
 */
export interface WeightedChoice<T> {
  readonly value: T;
  readonly weight: number;
}

/**
 * Distribution configuration for weighted random selection
 */
export interface WeightedDistribution<T> {
  readonly choices: WeightedChoice<T>[];
  readonly totalWeight: number;
}

/**
 * Gaussian distribution parameters
 */
export interface GaussianParams {
  readonly mean: number;
  readonly standardDeviation: number;
}

/**
 * Range configuration for bounded random generation
 */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/**
 * Probability configuration for chance-based operations
 */
export interface ProbabilityConfig {
  readonly baseProbability: number;
  readonly modifiers?: Array<{
    readonly condition: string;
    readonly multiplier: number;
    readonly additive?: number;
  }>;
}

/**
 * RNG result with metadata
 */
export interface RNGResult<T> {
  readonly value: T;
  readonly seed?: number;
  readonly timestamp: number;
  readonly generator: string;
}

/**
 * Base RNG generator implementation
 */
export abstract class BaseRNGGenerator implements RNGGenerator {
  protected _seed?: number;
  
  constructor(seed?: number) {
    this._seed = seed;
  }
  
  abstract random(): number;
  
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
  
  chance(probability: number): boolean {
    return this.random() < probability;
  }
  
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = this.randomInt(0, array.length - 1);
    return array[index];
  }
  
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  getSeed?(): number | undefined {
    return this._seed;
  }
  
  setSeed?(seed: number): void {
    this._seed = seed;
  }
}

/**
 * Standard JavaScript Math.random() based generator
 */
export class StandardRNG extends BaseRNGGenerator {
  constructor(seed?: number) {
    super(seed);
  }
  
  random(): number {
    return Math.random();
  }
}

/**
 * Seeded Linear Congruential Generator (LCG) for reproducible results
 */
export class SeededRNG extends BaseRNGGenerator {
  private _currentSeed: number;
  
  constructor(seed: number = Date.now()) {
    super(seed);
    this._currentSeed = seed;
  }
  
  random(): number {
    // LCG formula: (a * seed + c) % m
    // Using constants from Numerical Recipes
    this._currentSeed = (this._currentSeed * 1664525 + 1013904223) % 4294967296;
    return this._currentSeed / 4294967296;
  }
  
  getSeed(): number {
    return this._seed!;
  }
  
  setSeed(seed: number): void {
    this._seed = seed;
    this._currentSeed = seed;
  }
}

/**
 * Weighted random generator for selecting items with different probabilities
 */
export class WeightedRNG extends BaseRNGGenerator {
  constructor(seed?: number) {
    super(seed);
  }
  
  random(): number {
    // Use Math.random() as base for weighted operations
    return Math.random();
  }
  
  /**
   * Select a random item based on weights
   */
  weightedChoice<T>(choices: WeightedChoice<T>[]): T | undefined {
    if (choices.length === 0) return undefined;
    
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    if (totalWeight <= 0) return undefined;
    
    let randomValue = this.random() * totalWeight;
    
    for (const choice of choices) {
      randomValue -= choice.weight;
      if (randomValue <= 0) {
        return choice.value;
      }
    }
    
    // Fallback to last choice (shouldn't happen with proper weights)
    return choices[choices.length - 1].value;
  }
  
  /**
   * Create a weighted distribution for efficient repeated selections
   */
  createWeightedDistribution<T>(choices: WeightedChoice<T>[]): WeightedDistribution<T> {
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    return {
      choices,
      totalWeight
    };
  }
  
  /**
   * Select from a pre-computed weighted distribution
   */
  selectFromDistribution<T>(distribution: WeightedDistribution<T>): T | undefined {
    if (distribution.choices.length === 0) return undefined;
    
    let randomValue = this.random() * distribution.totalWeight;
    
    for (const choice of distribution.choices) {
      randomValue -= choice.weight;
      if (randomValue <= 0) {
        return choice.value;
      }
    }
    
    return distribution.choices[distribution.choices.length - 1].value;
  }
}

/**
 * Gaussian (normal) distribution generator using Box-Muller transform
 */
export class GaussianRNG extends BaseRNGGenerator {
  private _hasNextGaussian: boolean = false;
  private _nextGaussian: number = 0;
  
  constructor(seed?: number) {
    super(seed);
  }
  
  random(): number {
    // Use Math.random() as base for Gaussian operations
    return Math.random();
  }
  
  /**
   * Generate a random number from Gaussian distribution
   */
  gaussian(mean: number = 0, standardDeviation: number = 1): number {
    if (this._hasNextGaussian) {
      this._hasNextGaussian = false;
      return this._nextGaussian * standardDeviation + mean;
    }
    
    // Box-Muller transform
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    this._hasNextGaussian = true;
    this._nextGaussian = z1;
    
    return z0 * standardDeviation + mean;
  }
  
  /**
   * Generate a random number within a range using Gaussian distribution
   */
  gaussianInRange(range: Range, params: GaussianParams): number {
    let value = this.gaussian(params.mean, params.standardDeviation);
    
    // Clamp to range
    value = Math.max(range.min, Math.min(range.max, value));
    
    return value;
  }
}

/**
 * Probability utility functions
 */
export class ProbabilityUtils {
  /**
   * Calculate compound probability (probability of at least one success)
   */
  static compoundProbability(probabilities: number[]): number {
    if (probabilities.length === 0) return 0;
    
    const failureProbability = probabilities.reduce((product, prob) => 
      product * (1 - prob), 1
    );
    
    return 1 - failureProbability;
  }
  
  /**
   * Calculate probability of exactly k successes in n trials
   */
  static binomialProbability(n: number, k: number, p: number): number {
    if (k > n || k < 0) return 0;
    if (p < 0 || p > 1) return 0;
    
    // Calculate binomial coefficient
    let coefficient = 1;
    for (let i = 0; i < k; i++) {
      coefficient = coefficient * (n - i) / (i + 1);
    }
    
    return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
  
  /**
   * Calculate expected value for weighted choices
   */
  static expectedValue<T>(choices: WeightedChoice<T>[], valueExtractor: (value: T) => number): number {
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    if (totalWeight <= 0) return 0;
    
    return choices.reduce((sum, choice) => {
      const probability = choice.weight / totalWeight;
      const value = valueExtractor(choice.value);
      return sum + (probability * value);
    }, 0);
  }
  
  /**
   * Apply probability modifiers
   */
  static applyModifiers(baseProbability: number, modifiers: Array<{
    condition: string;
    multiplier: number;
    additive?: number;
  }>, activeConditions: string[]): number {
    let probability = baseProbability;
    
    for (const modifier of modifiers) {
      if (activeConditions.includes(modifier.condition)) {
        probability *= modifier.multiplier;
        if (modifier.additive !== undefined) {
          probability += modifier.additive;
        }
      }
    }
    
    return Math.max(0, Math.min(1, probability));
  }
}

/**
 * Global RNG manager for consistent random generation across the application
 */
export class RNGManager {
  private static _instance: RNGManager;
  private _defaultGenerator: RNGGenerator;
  private _generators: Map<string, RNGGenerator> = new Map();
  
  private constructor() {
    this._defaultGenerator = new StandardRNG();
    this._generators.set('default', this._defaultGenerator);
  }
  
  static getInstance(): RNGManager {
    if (!RNGManager._instance) {
      RNGManager._instance = new RNGManager();
    }
    return RNGManager._instance;
  }
  
  /**
   * Get the default RNG generator
   */
  getDefaultGenerator(): RNGGenerator {
    return this._defaultGenerator;
  }
  
  /**
   * Set the default RNG generator
   */
  setDefaultGenerator(generator: RNGGenerator): void {
    this._defaultGenerator = generator;
    this._generators.set('default', generator);
  }
  
  /**
   * Register a named RNG generator
   */
  registerGenerator(name: string, generator: RNGGenerator): void {
    this._generators.set(name, generator);
  }
  
  /**
   * Get a named RNG generator
   */
  getGenerator(name: string): RNGGenerator | undefined {
    return this._generators.get(name);
  }
  
  /**
   * Create a seeded generator for reproducible results
   */
  createSeededGenerator(seed: number, name?: string): SeededRNG {
    const generator = new SeededRNG(seed);
    if (name) {
      this.registerGenerator(name, generator);
    }
    return generator;
  }
  
  /**
   * Create a weighted generator
   */
  createWeightedGenerator(seed?: number, name?: string): WeightedRNG {
    const generator = new WeightedRNG(seed);
    if (name) {
      this.registerGenerator(name, generator);
    }
    return generator;
  }
  
  /**
   * Create a Gaussian generator
   */
  createGaussianGenerator(seed?: number, name?: string): GaussianRNG {
    const generator = new GaussianRNG(seed);
    if (name) {
      this.registerGenerator(name, generator);
    }
    return generator;
  }
  
  /**
   * Convenience methods using the default generator
   */
  random(): number {
    return this._defaultGenerator.random();
  }
  
  randomInt(min: number, max: number): number {
    return this._defaultGenerator.randomInt(min, max);
  }
  
  randomFloat(min: number, max: number): number {
    return this._defaultGenerator.randomFloat(min, max);
  }
  
  chance(probability: number): boolean {
    return this._defaultGenerator.chance(probability);
  }
  
  choice<T>(array: T[]): T | undefined {
    return this._defaultGenerator.choice(array);
  }
  
  shuffle<T>(array: T[]): T[] {
    return this._defaultGenerator.shuffle(array);
  }
}

/**
 * Global RNG manager instance
 */
export const rngManager = RNGManager.getInstance();
