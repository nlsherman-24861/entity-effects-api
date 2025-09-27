import { Event, EventType, EventHandler } from './types';

/**
 * Event-driven system for managing entity and effect lifecycle
 */
export class EventSystem {
  private readonly handlers: Map<EventType, Set<EventHandler>> = new Map();
  private readonly eventHistory: Event[] = [];
  private readonly maxHistorySize: number = 1000;
  
  constructor() {
    // Initialize handler sets for all event types
    Object.values(EventType).forEach(type => {
      this.handlers.set(type, new Set());
    });
  }
  
  /**
   * Subscribe to events of a specific type
   */
  on<T = any>(eventType: EventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.add(handler as EventHandler);
    }
  }
  
  /**
   * Unsubscribe from events
   */
  off<T = any>(eventType: EventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }
  
  /**
   * Emit an event to all subscribers
   */
  emit(event: Event): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
    
    // Add to history
    this.addToHistory(event);
  }
  
  /**
   * Emit an event with automatic timestamp
   */
  emitEvent<T = any>(type: EventType, data: T): void {
    this.emit({
      type,
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * Get event history
   */
  getHistory(eventType?: EventType): Event[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }
  
  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }
  
  /**
   * Get all subscribers for an event type
   */
  getSubscribers(eventType: EventType): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }
  
  /**
   * Add event to history with size management
   */
  private addToHistory(event: Event): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift(); // Remove oldest event
    }
  }
}

/**
 * Global event system instance
 */
export const eventSystem = new EventSystem();
