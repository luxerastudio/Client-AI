// Simple UserMemoryService for boot success
export class UserMemoryServiceSimple {
  async initialize(config?: any): Promise<void> {
    console.log('UserMemoryService initialized with config:', config);
  }

  async storePrompt(userId: string, prompt: string, options?: any): Promise<void> {
    console.log(`Storing prompt for user ${userId}:`, prompt);
  }

  async storeResponse(userId: string, response: string, options?: any): Promise<void> {
    console.log(`Storing response for user ${userId}:`, response);
  }

  // Add other methods as needed for interface compliance
  async getUserPreferences(userId: string): Promise<any> {
    return { userId, preferences: {} };
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    console.log(`Updating preferences for user ${userId}:`, preferences);
  }
}
