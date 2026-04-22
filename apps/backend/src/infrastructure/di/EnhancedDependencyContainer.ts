export interface ServiceDefinition<T = any> {
  factory: () => T;
  singleton?: boolean;
  dependencies?: string[];
  lifecycle?: 'singleton' | 'transient' | 'scoped';
  initialized?: boolean;
}

export interface ServiceRegistration {
  name: string;
  instance?: any;
  dependencies?: string[];
  lifecycle: 'singleton' | 'transient' | 'scoped';
}

export class EnhancedDependencyContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, any> = new Map();
  private scopedInstances: Map<string, Map<string, any>> = new Map();
  private initializationOrder: string[] = [];
  private dependencyGraph: Map<string, Set<string>> = new Map();

  register<T>(
    name: string, 
    factory: () => T, 
    options: { 
      singleton?: boolean; 
      dependencies?: string[]; 
      lifecycle?: 'singleton' | 'transient' | 'scoped';
    } = {}
  ): void {
    const lifecycle = options.lifecycle || (options.singleton !== false ? 'singleton' : 'transient');
    
    this.services.set(name, {
      factory,
      singleton: lifecycle === 'singleton',
      dependencies: options.dependencies,
      lifecycle,
      initialized: false
    });

    // Build dependency graph
    if (options.dependencies) {
      const deps = new Set(options.dependencies);
      this.dependencyGraph.set(name, deps);
    }
  }

  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      singleton: true,
      lifecycle: 'singleton',
      initialized: true
    });
    this.instances.set(name, instance);
  }

  get<T>(name: string, scopeId?: string): T {
    // Check for scoped instances first
    if (scopeId && this.scopedInstances.has(scopeId)) {
      const scopedMap = this.scopedInstances.get(scopeId)!;
      if (scopedMap.has(name)) {
        return scopedMap.get(name) as T;
      }
    }

    // Check for singleton instances
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    // Get service definition
    const serviceDef = this.services.get(name);
    if (!serviceDef) {
      throw new Error(`Service '${name}' not registered. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }

    // Resolve dependencies first
    const resolvedDeps: string[] = [];
    if (serviceDef.dependencies) {
      for (const dep of serviceDef.dependencies) {
        if (!this.instances.has(dep) && !this.services.has(dep)) {
          throw new Error(`Dependency '${dep}' for service '${name}' is not registered`);
        }
        this.get(dep, scopeId); // Recursively resolve dependencies
        resolvedDeps.push(dep);
      }
    }

    // Create instance
    const instance = serviceDef.factory();

    // Handle lifecycle
    switch (serviceDef.lifecycle) {
      case 'singleton':
        this.instances.set(name, instance);
        break;
      case 'scoped':
        if (!scopeId) {
          throw new Error(`Scoped service '${name}' requires a scope ID`);
        }
        if (!this.scopedInstances.has(scopeId)) {
          this.scopedInstances.set(scopeId, new Map());
        }
        this.scopedInstances.get(scopeId)!.set(name, instance);
        break;
      case 'transient':
        // Don't store transient instances
        break;
    }

    // Mark as initialized and track order
    serviceDef.initialized = true;
    if (!this.initializationOrder.includes(name)) {
      this.initializationOrder.push(name);
    }

    return instance as T;
  }

  // Create a new scope for scoped services
  createScope(): string {
    const scopeId = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.scopedInstances.set(scopeId, new Map());
    return scopeId;
  }

  // Destroy a scope and clean up scoped instances
  destroyScope(scopeId: string): void {
    const scopedMap = this.scopedInstances.get(scopeId);
    if (scopedMap) {
      // Call cleanup methods if they exist
      for (const [name, instance] of scopedMap) {
        if (instance && typeof instance.dispose === 'function') {
          instance.dispose();
        }
      }
      this.scopedInstances.delete(scopeId);
    }
  }

  has(name: string): boolean {
    return this.services.has(name) || this.instances.has(name);
  }

  clear(): void {
    // Dispose all instances
    for (const instance of this.instances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }
    
    // Clear all scopes
    for (const scopeId of this.scopedInstances.keys()) {
      this.destroyScope(scopeId);
    }

    this.services.clear();
    this.instances.clear();
    this.scopedInstances.clear();
    this.initializationOrder = [];
    this.dependencyGraph.clear();
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getActiveInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  // Validate dependency graph for circular dependencies
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDependency = (serviceName: string): boolean => {
      if (recursionStack.has(serviceName)) {
        return true; // Circular dependency detected
      }
      if (visited.has(serviceName)) {
        return false; // Already processed
      }

      visited.add(serviceName);
      recursionStack.add(serviceName);

      const deps = this.dependencyGraph.get(serviceName);
      if (deps) {
        for (const dep of deps) {
          if (hasCircularDependency(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(serviceName);
      return false;
    };

    for (const serviceName of this.services.keys()) {
      if (hasCircularDependency(serviceName)) {
        errors.push(`Circular dependency detected involving service: ${serviceName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get dependency tree for debugging
  getDependencyTree(): { [key: string]: string[] } {
    const tree: { [key: string]: string[] } = {};
    for (const [name, deps] of this.dependencyGraph) {
      tree[name] = Array.from(deps);
    }
    return tree;
  }

  // Get service health information
  getHealthInfo(): {
    totalServices: number;
    initializedServices: number;
    singletonInstances: number;
    activeScopes: number;
    servicesByLifecycle: {
      singleton: number;
      transient: number;
      scoped: number;
    };
  } {
    const servicesByLifecycle = { singleton: 0, transient: 0, scoped: 0 };
    
    for (const serviceDef of this.services.values()) {
      servicesByLifecycle[serviceDef.lifecycle || 'singleton']++;
    }

    return {
      totalServices: this.services.size,
      initializedServices: Array.from(this.services.values()).filter(s => s.initialized).length,
      singletonInstances: this.instances.size,
      activeScopes: this.scopedInstances.size,
      servicesByLifecycle
    };
  }

  // Warm up singleton services
  async warmup(): Promise<void> {
    const validation = this.validateDependencies();
    if (!validation.valid) {
      throw new Error(`Dependency validation failed: ${validation.errors.join(', ')}`);
    }

    // Initialize all singleton services
    for (const [name, serviceDef] of this.services) {
      if (serviceDef.lifecycle === 'singleton' && !serviceDef.initialized) {
        this.get(name);
      }
    }
  }
}
