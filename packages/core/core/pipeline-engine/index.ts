/**
 * Pipeline Engine Core Module
 * Handles client acquisition pipeline stages and workflow management
 */

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  order: number;
  automated: boolean;
  conditions: {
    minLeadScore?: number;
    requiredActions?: string[];
    timeInStage?: number; // hours
  };
  actions: {
    sendEmail?: boolean;
    createOffer?: boolean;
    assignToAgent?: boolean;
    notifyManager?: boolean;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  stages: string[]; // stage IDs
  defaultPipeline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadPipelineEntry {
  id: string;
  leadId: string;
  pipelineId: string;
  currentStage: string;
  stageHistory: {
    stageId: string;
    enteredAt: Date;
    exitedAt?: Date;
    notes?: string;
  }[];
  status: 'new' | 'contacted' | 'responded' | 'converted' | 'lost' | 'paused';
  probability: number; // 0-100% conversion probability
  lastActivityAt: Date;
  assignedTo?: string;
  nextAction?: string;
  nextActionDue?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineMetrics {
  totalLeads: number;
  leadsByStage: Record<string, number>;
  conversionRate: number;
  averageTimeInPipeline: number;
  dropOffRate: number;
  stageMetrics: Record<string, {
    leads: number;
    conversions: number;
    averageTime: number;
    dropOffRate: number;
  }>;
}

export class PipelineEngine {
  private pipelines: Map<string, Pipeline> = new Map();
  private stages: Map<string, PipelineStage> = new Map();
  private leadEntries: Map<string, LeadPipelineEntry> = new Map();

  constructor() {
    this.initializeDefaultPipeline();
  }

  private initializeDefaultPipeline(): void {
    // Create default stages
    const defaultStages: PipelineStage[] = [
      {
        id: 'new_lead',
        name: 'New Lead',
        description: 'Lead initially generated and entered the system',
        order: 1,
        automated: true,
        conditions: {
          minLeadScore: 0
        },
        actions: {
          sendEmail: true,
          assignToAgent: false
        }
      },
      {
        id: 'qualification',
        name: 'Qualification',
        description: 'Lead qualification and scoring assessment',
        order: 2,
        automated: true,
        conditions: {
          minLeadScore: 30,
          timeInStage: 24
        },
        actions: {
          sendEmail: false,
          createOffer: false,
          assignToAgent: true
        }
      },
      {
        id: 'engagement',
        name: 'Engagement',
        description: 'Personalized outreach and response tracking',
        order: 3,
        automated: true,
        conditions: {
          minLeadScore: 50,
          timeInStage: 48
        },
        actions: {
          sendEmail: true,
          createOffer: false
        }
      },
      {
        id: 'offer_sent',
        name: 'Offer Sent',
        description: 'Personalized offer has been sent to the lead',
        order: 4,
        automated: true,
        conditions: {
          minLeadScore: 70,
          timeInStage: 24
        },
        actions: {
          sendEmail: true,
          createOffer: true,
          notifyManager: true
        }
      },
      {
        id: 'negotiation',
        name: 'Negotiation',
        description: 'Offer discussion and terms negotiation',
        order: 5,
        automated: false,
        conditions: {
          timeInStage: 72
        },
        actions: {
          assignToAgent: true,
          notifyManager: true
        }
      },
      {
        id: 'closed_won',
        name: 'Closed Won',
        description: 'Lead converted to paying customer',
        order: 6,
        automated: true,
        conditions: {},
        actions: {
          notifyManager: true
        }
      },
      {
        id: 'closed_lost',
        name: 'Closed Lost',
        description: 'Lead declined or lost to competition',
        order: 7,
        automated: true,
        conditions: {},
        actions: {
          notifyManager: true
        }
      }
    ];

    defaultStages.forEach(stage => {
      this.stages.set(stage.id, stage);
    });

    // Create default pipeline
    const defaultPipeline: Pipeline = {
      id: 'default_pipeline',
      name: 'Default Client Acquisition Pipeline',
      description: 'Standard pipeline for client acquisition process',
      stages: defaultStages.map(s => s.id),
      defaultPipeline: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pipelines.set(defaultPipeline.id, defaultPipeline);
  }

  async addLeadToPipeline(
    leadId: string,
    pipelineId: string = 'default_pipeline'
  ): Promise<LeadPipelineEntry> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');

    const firstStage = pipeline.stages[0];
    
    const entry: LeadPipelineEntry = {
      id: `entry_${leadId}_${Date.now()}`,
      leadId,
      pipelineId,
      currentStage: firstStage,
      stageHistory: [
        {
          stageId: firstStage,
          enteredAt: new Date()
        }
      ],
      status: 'new',
      probability: Math.floor(Math.random() * 30) + 20, // 20-50% for new leads
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.leadEntries.set(entry.id, entry);
    return entry;
  }

  async advanceStage(
    entryId: string,
    notes?: string
  ): Promise<LeadPipelineEntry | null> {
    const entry = this.leadEntries.get(entryId);
    if (!entry) return null;

    const pipeline = this.pipelines.get(entry.pipelineId);
    if (!pipeline) return null;

    const currentStageIndex = pipeline.stages.indexOf(entry.currentStage);
    if (currentStageIndex === -1) return null;

    // Exit current stage
    const currentStageHistory = entry.stageHistory.find(
      h => h.stageId === entry.currentStage
    );
    if (currentStageHistory) {
      currentStageHistory.exitedAt = new Date();
      currentStageHistory.notes = notes;
    }

    // Move to next stage
    if (currentStageIndex < pipeline.stages.length - 1) {
      const nextStage = pipeline.stages[currentStageIndex + 1];
      
      entry.currentStage = nextStage;
      entry.stageHistory.push({
        stageId: nextStage,
        enteredAt: new Date()
      });

      // Update status and probability based on stage
      this.updateEntryStatus(entry, nextStage);
    }

    entry.lastActivityAt = new Date();
    entry.updatedAt = new Date();
    this.leadEntries.set(entryId, entry);
    return entry;
  }

  private updateEntryStatus(entry: LeadPipelineEntry, stageId: string): void {
    // Map stages to statuses and probabilities
    const stageStatusMap: Record<string, { status: LeadPipelineEntry['status']; probability: number }> = {
      'new_lead': { status: 'new', probability: Math.floor(Math.random() * 20) + 20 }, // 20-40%
      'qualification': { status: 'contacted', probability: Math.floor(Math.random() * 25) + 30 }, // 30-55%
      'engagement': { status: 'contacted', probability: Math.floor(Math.random() * 30) + 40 }, // 40-70%
      'offer_sent': { status: 'responded', probability: Math.floor(Math.random() * 25) + 50 }, // 50-75%
      'negotiation': { status: 'responded', probability: Math.floor(Math.random() * 20) + 60 }, // 60-80%
      'closed_won': { status: 'converted', probability: 100 },
      'closed_lost': { status: 'lost', probability: 0 }
    };

    const mapping = stageStatusMap[stageId];
    if (mapping) {
      entry.status = mapping.status;
      entry.probability = mapping.probability;
    }
  }

  async moveToStage(
    entryId: string,
    targetStageId: string,
    notes?: string
  ): Promise<LeadPipelineEntry | null> {
    const entry = this.leadEntries.get(entryId);
    if (!entry) return null;

    const pipeline = this.pipelines.get(entry.pipelineId);
    if (!pipeline || !pipeline.stages.includes(targetStageId)) {
      throw new Error('Invalid target stage');
    }

    // Exit current stage
    const currentStageHistory = entry.stageHistory.find(
      h => h.stageId === entry.currentStage
    );
    if (currentStageHistory) {
      currentStageHistory.exitedAt = new Date();
      currentStageHistory.notes = notes;
    }

    // Move to target stage
    entry.currentStage = targetStageId;
    entry.stageHistory.push({
      stageId: targetStageId,
      enteredAt: new Date()
    });

    // Update status and probability based on stage
    this.updateEntryStatus(entry, targetStageId);

    entry.lastActivityAt = new Date();
    entry.updatedAt = new Date();
    this.leadEntries.set(entryId, entry);
    return entry;
  }

  async getLeadEntry(leadId: string): Promise<LeadPipelineEntry | null> {
    for (const entry of this.leadEntries.values()) {
      if (entry.leadId === leadId) {
        return entry;
      }
    }
    return null;
  }

  async getEntriesByStage(stageId: string): Promise<LeadPipelineEntry[]> {
    return Array.from(this.leadEntries.values()).filter(
      entry => entry.currentStage === stageId && entry.status !== 'lost' && entry.status !== 'converted'
    );
  }

  async getPipelineMetrics(pipelineId: string): Promise<PipelineMetrics> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');

    const entries = Array.from(this.leadEntries.values())
      .filter(entry => entry.pipelineId === pipelineId);

    const totalLeads = entries.length;
    const convertedLeads = entries.filter(e => e.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const leadsByStage: Record<string, number> = {};
    const stageMetrics: Record<string, any> = {};

    // Calculate metrics for each stage
    for (const stageId of pipeline.stages) {
      const stageEntries = entries.filter(e => e.currentStage === stageId);
      leadsByStage[stageId] = stageEntries.length;

      // Calculate average time in stage
      const stageHistories = entries.flatMap(e => 
        e.stageHistory.filter(h => h.stageId === stageId)
      );
      
      const totalTime = stageHistories.reduce((sum, h) => {
        const time = h.exitedAt ? h.exitedAt.getTime() - h.enteredAt.getTime() : 0;
        return sum + time;
      }, 0);

      const averageTime = stageHistories.length > 0 ? totalTime / stageHistories.length : 0;

      stageMetrics[stageId] = {
        leads: stageEntries.length,
        conversions: 0, // Would be calculated based on stage transitions
        averageTime: averageTime / (1000 * 60 * 60), // Convert to hours
        dropOffRate: 0 // Would be calculated based on exits
      };
    }

    return {
      totalLeads,
      leadsByStage,
      conversionRate,
      averageTimeInPipeline: 0, // Would be calculated from entry data
      dropOffRate: 0, // Would be calculated from lost leads
      stageMetrics
    };
  }

  async getStagesInPipeline(pipelineId: string): Promise<PipelineStage[]> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return [];

    return pipeline.stages
      .map(stageId => this.stages.get(stageId))
      .filter((stage): stage is PipelineStage => stage !== undefined)
      .sort((a, b) => a.order - b.order);
  }

  async createCustomPipeline(
    name: string,
    description: string,
    stageIds: string[]
  ): Promise<Pipeline> {
    const pipeline: Pipeline = {
      id: `pipeline_${Date.now()}`,
      name,
      description,
      stages: stageIds,
      defaultPipeline: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  async addStage(stage: PipelineStage): Promise<void> {
    this.stages.set(stage.id, stage);
  }

  async getPipeline(pipelineId: string): Promise<Pipeline | null> {
    return this.pipelines.get(pipelineId) || null;
  }

  async getPipelines(): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values());
  }
}

export const pipelineEngine = new PipelineEngine();
