/**
 * Outreach Engine Core Module
 * Handles email sending, scheduling, and campaign management
 */

export interface OutreachCampaign {
  id: string;
  name: string;
  leads: string[];
  template: string;
  schedule: {
    startDate: Date;
    endDate: Date;
    frequency: 'daily' | 'weekly' | 'monthly';
    timeSlots: string[];
  };
  status: 'draft' | 'active' | 'paused' | 'completed';
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OutreachMessage {
  id: string;
  campaignId: string;
  leadId: string;
  subject: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  repliedAt?: Date;
  metadata: Record<string, any>;
}

export interface OutreachConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun';
  fromEmail: string;
  fromName: string;
  replyTo: string;
  trackingEnabled: boolean;
  throttleRate: number; // emails per minute
}

export class OutreachEngine {
  private campaigns: Map<string, OutreachCampaign> = new Map();
  private messages: Map<string, OutreachMessage> = new Map();
  private config: OutreachConfig;

  constructor(config: OutreachConfig) {
    this.config = config;
  }

  async createCampaign(
    name: string,
    leads: string[],
    template: string,
    schedule: OutreachCampaign['schedule']
  ): Promise<OutreachCampaign> {
    const campaign: OutreachCampaign = {
      id: `campaign_${Date.now()}`,
      name,
      leads,
      template,
      schedule,
      status: 'draft',
      metrics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async launchCampaign(campaignId: string): Promise<OutreachCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    campaign.status = 'active';
    campaign.updatedAt = new Date();

    // Generate messages for all leads in campaign
    for (const leadId of campaign.leads) {
      await this.generateMessage(campaignId, leadId);
    }

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  async generateMessage(campaignId: string, leadId: string): Promise<OutreachMessage> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const message: OutreachMessage = {
      id: `msg_${Date.now()}_${leadId}`,
      campaignId,
      leadId,
      subject: '', // Will be populated by personalization engine
      body: campaign.template,
      status: 'draft',
      metadata: {}
    };

    this.messages.set(message.id, message);
    return message;
  }

  async sendMessage(messageId: string): Promise<OutreachMessage | null> {
    const message = this.messages.get(messageId);
    if (!message) return null;

    try {
      // Throttle sending based on config
      await this.throttleSending();

      // Send email via provider
      await this.sendEmail(message);

      // Update message status
      message.status = 'sent';
      message.sentAt = new Date();

      // Update campaign metrics
      const campaign = this.campaigns.get(message.campaignId);
      if (campaign) {
        campaign.metrics.sent++;
        campaign.updatedAt = new Date();
        this.campaigns.set(campaign.id, campaign);
      }

      this.messages.set(messageId, message);
      return message;

    } catch (error) {
      message.status = 'bounced';
      this.messages.set(messageId, message);
      throw error;
    }
  }

  async scheduleMessage(
    messageId: string,
    scheduledAt: Date
  ): Promise<OutreachMessage | null> {
    const message = this.messages.get(messageId);
    if (!message) return null;

    message.status = 'scheduled';
    message.scheduledAt = scheduledAt;
    this.messages.set(messageId, message);

    return message;
  }

  async trackDelivery(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    message.status = 'delivered';
    message.deliveredAt = new Date();
    this.messages.set(messageId, message);
  }

  async trackOpen(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    message.status = 'opened';
    message.openedAt = new Date();

    // Update campaign metrics
    const campaign = this.campaigns.get(message.campaignId);
    if (campaign) {
      campaign.metrics.opened++;
      campaign.updatedAt = new Date();
      this.campaigns.set(campaign.id, campaign);
    }

    this.messages.set(messageId, message);
  }

  async trackReply(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    message.status = 'replied';
    message.repliedAt = new Date();

    // Update campaign metrics
    const campaign = this.campaigns.get(message.campaignId);
    if (campaign) {
      campaign.metrics.replied++;
      campaign.updatedAt = new Date();
      this.campaigns.set(campaign.id, campaign);
    }

    this.messages.set(messageId, message);
  }

  async getCampaign(campaignId: string): Promise<OutreachCampaign | null> {
    return this.campaigns.get(campaignId) || null;
  }

  async getMessage(messageId: string): Promise<OutreachMessage | null> {
    return this.messages.get(messageId) || null;
  }

  async getCampaigns(): Promise<OutreachCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getMessagesByCampaign(campaignId: string): Promise<OutreachMessage[]> {
    return Array.from(this.messages.values()).filter(
      message => message.campaignId === campaignId
    );
  }

  private async sendEmail(message: OutreachMessage): Promise<void> {
    // Integration with email provider would go here
    // For now, simulate sending
    console.log(`Sending email to ${message.leadId}: ${message.subject}`);
  }

  private async throttleSending(): Promise<void> {
    // Implement rate limiting based on throttleRate
    const delay = 60000 / this.config.throttleRate; // milliseconds between emails
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const outreachEngine = new OutreachEngine({
  provider: 'sendgrid',
  fromEmail: 'noreply@clientacquisition.ai',
  fromName: 'AI Client Acquisition',
  replyTo: 'support@clientacquisition.ai',
  trackingEnabled: true,
  throttleRate: 10 // 10 emails per minute
});
