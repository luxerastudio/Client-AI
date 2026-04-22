/**
 * AI Client Acquisition System - Core Engine
 * Business engine for automated lead generation, outreach, and client acquisition
 */

// Import all engines
import { leadEngine, LeadEngine } from './lead-engine';
import { personalizationEngine, PersonalizationEngine } from './personalization-engine';
import { outreachEngine, OutreachEngine } from './outreach-engine';
import { offerEngine, OfferEngine } from './offer-engine';
import { pipelineEngine, PipelineEngine } from './pipeline-engine';
import { creditsSystem, CreditsSystem } from './credits-system';
import { securityLayer, SecurityLayer } from './security-layer';
import { accessControl, AccessControl } from './access-control';
import { executionGuard, ExecutionGuard } from './execution-guard';

// Re-export for external use
export { leadEngine, LeadEngine } from './lead-engine';
export { personalizationEngine, PersonalizationEngine } from './personalization-engine';
export { outreachEngine, OutreachEngine } from './outreach-engine';
export { offerEngine, OfferEngine } from './offer-engine';
export { pipelineEngine, PipelineEngine } from './pipeline-engine';
export { creditsSystem, CreditsSystem } from './credits-system';
export { securityLayer, SecurityLayer } from './security-layer';
export { accessControl, AccessControl } from './access-control';
export { executionGuard, ExecutionGuard } from './execution-guard';

// Core types and interfaces
export type { Lead, LeadGenerationConfig } from './lead-engine';
export type { PersonalizationProfile, PersonalizationConfig, PersonalizedContent } from './personalization-engine';
export type { OutreachCampaign, OutreachMessage, OutreachConfig } from './outreach-engine';
export type { OfferTemplate, PersonalizedOffer, PricingRule, OfferConfig } from './offer-engine';
export type { PipelineStage, Pipeline, LeadPipelineEntry, PipelineMetrics } from './pipeline-engine';
export type { CreditPackage, CreditTransaction, CreditUsage, Subscription, CreditConfig } from './credits-system';
export type { User, AuthSession, SecurityConfig, AuditLog, Permission } from './security-layer';

/**
 * Client Acquisition Engine Manager
 * Coordinates lead generation, outreach, and conversion engines for business growth
 */
export class CoreSystem {
  constructor() {
    // Initialize all core engines
    // All engines are already instantiated as singletons
  }

  /**
   * Complete lead-to-client acquisition workflow
   * Converts prospects into paying clients through automated pipeline
   */
  async processLead(leadData: any, userId: string): Promise<any> {
    try {
      // Step 1: Generate and qualify lead
      const lead = await leadEngine.qualifyLead(leadData);
      
      // Step 2: Add to pipeline
      const pipelineEntry = await pipelineEngine.addLeadToPipeline(lead.id);
      
      // Step 3: Create personalization profile
      const profile = await personalizationEngine.createProfile(lead.id);
      
      // Step 4: Check credits and proceed if available
      const hasCredits = await creditsSystem.useCredits(userId, 'generate_lead', { leadId: lead.id });
      if (!hasCredits) {
        throw new Error('Insufficient credits');
      }
      
      return {
        lead,
        pipelineEntry,
        profile,
        status: 'processed'
      };
    } catch (error) {
      console.error('Error processing lead:', error);
      throw error;
    }
  }

  /**
   * Launch client acquisition outreach campaign
   * Automated multi-channel outreach for lead conversion
   */
  async launchCampaign(campaignData: any, userId: string): Promise<any> {
    try {
      // Step 1: Create campaign
      const campaign = await outreachEngine.createCampaign(
        campaignData.name,
        campaignData.leads,
        campaignData.template,
        campaignData.schedule
      );
      
      // Step 2: Launch campaign
      const launchedCampaign = await outreachEngine.launchCampaign(campaign.id);
      
      // Step 3: Process personalization for each lead
      for (const leadId of campaignData.leads) {
        const profile = await personalizationEngine.getProfileByLeadId(leadId);
        if (profile) {
          // Generate personalized content
          const personalizedContent = await personalizationEngine.personalizeContent(
            campaignData.template,
            profile,
            campaignData.personalizationConfig
          );
          
          // Use credits for personalization
          await creditsSystem.useCredits(userId, 'personalize_content', { leadId });
        }
      }
      
      return {
        campaign: launchedCampaign,
        status: 'launched'
      };
    } catch (error) {
      console.error('Error launching campaign:', error);
      throw error;
    }
  }

  /**
   * Generate and send client acquisition offer
   * Creates personalized proposals to convert leads to clients
   */
  async generateOffer(leadId: string, templateId: string, userId: string): Promise<any> {
    try {
      // Step 1: Check credits
      const hasCredits = await creditsSystem.useCredits(userId, 'create_offer', { leadId });
      if (!hasCredits) {
        throw new Error('Insufficient credits for offer creation');
      }
      
      // Step 2: Create offer
      const offer = await offerEngine.createOffer(leadId, templateId);
      
      // Step 3: Get lead data for personalization
      const lead = await leadEngine.getLeadById(leadId);
      if (lead) {
        const personalizedOffer = await offerEngine.personalizeOffer(offer.id, {
          company: lead.company,
          industry: lead.industry
        });
        
        // Step 4: Send offer
        await offerEngine.sendOffer(offer.id);
        
        // Step 5: Advance pipeline stage
        const pipelineEntry = await pipelineEngine.getLeadEntry(leadId);
        if (pipelineEntry) {
          await pipelineEngine.advanceStage(pipelineEntry.id, 'Offer sent');
        }
        
        return personalizedOffer;
      }
      
      return offer;
    } catch (error) {
      console.error('Error generating offer:', error);
      throw error;
    }
  }

  /**
   * Complete end-to-end client acquisition workflow
   * ONE BUTTON -> FULL CLIENT ACQUISITION PIPELINE
   * Revenue generation engine with hard credit enforcement
   */
  async runAcquisitionFlow(input: {
    action: string;
    config: any;
    userId: string;
  }): Promise<any> {
    const { config, userId } = input;
    
    // HARD LOCK: Check access before any execution
    const estimatedCredits = config.maxLeads * 33; // 10 + 5 + 3 + 15 per lead
    const accessRequest = {
      userId,
      action: 'run_acquisition_flow',
      estimatedCredits,
      metadata: { config }
    };

    return await executionGuard.executeWithGuard(accessRequest, async () => {
      console.log("CORE SYSTEM: Starting acquisition flow for user:", userId);
      console.log("CORE SYSTEM: Config received:", config);
      
      const results: any = {
        leads: [],
        personalizedLeads: [],
        outreachMessages: [],
        offers: [],
        pipelineStates: [],
        creditsUsed: 0,
        pipelineEntries: []
      };

      // Step 1: Lead Engine - Generate leads
      console.log("CORE SYSTEM: Step 1 - Generating leads...");
      const leads = await leadEngine.generateLeads(config);
      results.leads = leads;
      console.log("CORE SYSTEM: Leads generated:", leads.length);
      
      // Step 2: Process each lead through the complete pipeline
      for (const lead of leads) {
        // Step 3: Add to pipeline
        const pipelineEntry = await pipelineEngine.addLeadToPipeline(lead.id);
        results.pipelineEntries.push(pipelineEntry);

        // Step 4: Personalization Engine - Enrich lead
        console.log("CORE SYSTEM: Step 4 - Personalizing lead:", lead.company);
        const profile = await personalizationEngine.createProfile(lead.id);
        
        // Update profile with lead data
        await personalizationEngine.updateProfile(profile.id, {
          preferences: {
            communicationStyle: 'formal',
            interests: [],
            painPoints: [],
            industry: lead.industry || ''
          }
        });

        const personalizedContent = await personalizationEngine.personalizeContent(
          'Hello [industry] professional, I noticed your company and thought you might be interested in our AI-powered client acquisition solution.',
          profile,
          {
            tone: 'professional',
            length: 'medium',
            includeCaseStudies: true,
            customFields: []
          }
        );

        results.personalizedLeads.push({
          lead,
          profile,
          personalizedContent
        });

        // Step 5: Outreach Engine - Create campaign and generate message
        console.log("CORE SYSTEM: Step 5 - Creating outreach for lead:", lead.company);
        const campaign = await outreachEngine.createCampaign(
          'Acquisition Campaign',
          [lead.id],
          'Hello [industry] professional, I noticed your company...',
          {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            frequency: 'daily',
            timeSlots: ['09:00', '14:00']
          }
        );
        
        const outreachMessage = await outreachEngine.generateMessage(campaign.id, lead.id);
        await outreachEngine.sendMessage(outreachMessage.id);
        
        results.outreachMessages.push(outreachMessage);
        console.log("CORE SYSTEM: Outreach message created for lead:", lead.company);

        // Step 6: Offer Engine - Create offer (only for qualified leads)
        if (lead.qualified && lead.score >= 70) {
          console.log("CORE SYSTEM: Step 6 - Creating offer for qualified lead:", lead.company);
          const offer = await offerEngine.createOffer(lead.id, 'professional_package');
          const personalizedOffer = await offerEngine.personalizeOffer(offer.id, {
            company: lead.company,
            industry: lead.industry,
            painPoints: []
          });
          
          await offerEngine.sendOffer(offer.id);
          results.offers.push(personalizedOffer);

          // Step 7: Pipeline Engine - Update status
          await pipelineEngine.advanceStage(pipelineEntry.id, 'Offer sent');
        }

        // Get final pipeline state
        const updatedEntry = await pipelineEngine.getLeadEntry(lead.id);
        if (updatedEntry) {
          results.pipelineStates.push(updatedEntry);
        }
      }

      console.log("CORE SYSTEM: Pipeline execution complete");
      console.log("CORE SYSTEM: Final results summary:", {
        leadsGenerated: results.leads.length,
        personalizedLeads: results.personalizedLeads.length,
        outreachMessages: results.outreachMessages.length,
        offersCreated: results.offers.length,
        pipelineEntries: results.pipelineEntries.length,
        pipelineStates: results.pipelineStates.length
      });

      return results;
    });
  }

  /**
   * Get system metrics and analytics
   */
  async getSystemMetrics(userId: string): Promise<any> {
    try {
      // Get pipeline metrics
      const pipelineMetrics = await pipelineEngine.getPipelineMetrics('default_pipeline');
      
      // Get credit usage
      const creditStats = await creditsSystem.getUsageStats(userId);
      
      // Get audit logs
      const auditLogs = await securityLayer.getAuditLogs(userId, undefined, 50);
      
      return {
        pipeline: pipelineMetrics,
        credits: creditStats,
        recentActivity: auditLogs,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const coreSystem = new CoreSystem();
