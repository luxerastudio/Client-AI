export interface ServiceDefinition {
  factory: () => any;
  singleton?: boolean;
  dependencies?: string[];
}

export class DependencyContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, any> = new Map();

  register<T>(
    name: string, 
    factory: () => T, 
    options: { singleton?: boolean; dependencies?: string[] } = {}
  ): void {
    this.services.set(name, {
      factory,
      singleton: options.singleton !== false, // Default to singleton
      dependencies: options.dependencies
    });
  }

  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      singleton: true
    });
    this.instances.set(name, instance);
  }

  get<T>(name: string): T {
    // Check if instance already exists
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    // Get service definition
    const serviceDef = this.services.get(name);
    if (!serviceDef) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Check dependencies
    if (serviceDef.dependencies) {
      for (const dep of serviceDef.dependencies) {
        if (!this.instances.has(dep)) {
          this.get(dep); // Recursively resolve dependencies
        }
      }
    }

    // Create instance
    const instance = serviceDef.factory();

    // Store instance if singleton
    if (serviceDef.singleton) {
      this.instances.set(name, instance);
    }

    return instance as T;
  }

  has(name: string): boolean {
    return this.services.has(name) || this.instances.has(name);
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getActiveInstances(): string[] {
    return Array.from(this.instances.keys());
  }
}
