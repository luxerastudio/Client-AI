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
    if (serviceDef.singleton) {
      this.instances.set(name, instance);
    }

    return instance as T;
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getHealthInfo(): any {
    return {
      registeredServices: this.getRegisteredServices(),
      instanceCount: this.instances.size
    };
  }

  has(name: string): boolean {
    return this.services.has(name) || this.instances.has(name);
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }

  getActiveInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [name, serviceDef] of this.services) {
      if (serviceDef.dependencies) {
        for (const dep of serviceDef.dependencies) {
          if (!this.services.has(dep)) {
            errors.push(`Service '${name}' depends on missing service '${dep}'`);
          }
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  async warmup(): Promise<void> {
    // Warm up all singleton services by accessing them
    for (const name of this.services.keys()) {
      try {
        this.get(name);
      } catch (error) {
        console.warn(`Failed to warm up service '${name}':`, error);
      }
    }
  }

  getInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving '${name}'`);
      }

      visiting.add(name);
      const serviceDef = this.services.get(name);
      if (serviceDef?.dependencies) {
        for (const dep of serviceDef.dependencies) {
          visit(dep);
        }
      }
      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return order;
  }
}
