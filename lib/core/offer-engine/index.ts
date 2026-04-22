/**
 * Offer Engine Core Module
 * Handles offer generation, pricing, and proposal creation
 */

export interface OfferTemplate {
  id: string;
  name: string;
  type: 'service' | 'product' | 'consultation';
  basePrice: number;
  description: string;
  features: string[];
  duration?: string;
  validityPeriod: number; // days
}

export interface PersonalizedOffer {
  id: string;
  leadId: string;
  templateId: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  finalPrice: number;
  features: string[];
  customizations: string[];
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  conditions: {
    companySize?: string[];
    industry?: string[];
    leadScore?: { min: number; max: number };
  };
  adjustments: {
    discountPercentage?: number;
    priceMultiplier?: number;
    additionalFeatures?: string[];
  };
  priority: number;
}

export interface OfferConfig {
  currency: string;
  taxRate: number;
  defaultValidityPeriod: number;
  autoExpire: boolean;
}

export class OfferEngine {
  private templates: Map<string, OfferTemplate> = new Map();
  private offers: Map<string, PersonalizedOffer> = new Map();
  private pricingRules: Map<string, PricingRule> = new Map();
  private config: OfferConfig;

  constructor(config: OfferConfig) {
    this.config = config;
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: OfferTemplate[] = [
      {
        id: 'starter_package',
        name: 'Client Acquisition Starter',
        type: 'service',
        basePrice: 2499,
        description: 'Perfect for small businesses looking to establish a consistent client acquisition pipeline',
        features: [
          'Lead generation (50 qualified leads/month)',
          'Professional email outreach campaigns',
          'CRM integration setup',
          'Monthly performance analytics',
          'Email & phone support',
          'Lead qualification and scoring',
          'Basic reporting dashboard'
        ],
        duration: '1 month',
        validityPeriod: 30
      },
      {
        id: 'professional_package',
        name: 'Business Growth Accelerator',
        type: 'service',
        basePrice: 6999,
        description: 'Comprehensive client acquisition solution for growing businesses needing consistent lead flow',
        features: [
          'Lead generation (200 qualified leads/month)',
          'Multi-channel outreach (email, social, web)',
          'Advanced lead scoring and qualification',
          'Weekly performance reports and strategy calls',
          'Priority support with dedicated account manager',
          'Custom CRM integration and automation setup',
          'A/B testing for outreach campaigns',
          'Competitor analysis and market insights'
        ],
        duration: '3 months',
        validityPeriod: 45
      },
      {
        id: 'enterprise_package',
        name: 'Enterprise Client Acquisition System',
        type: 'service',
        basePrice: 14999,
        description: 'Complete client acquisition ecosystem for established businesses seeking market dominance',
        features: [
          'Unlimited qualified lead generation',
          'AI-powered personalization and predictive analytics',
          'Multi-channel outreach automation (email, social, web, direct mail)',
          'Real-time analytics dashboard with custom reporting',
          'Dedicated account manager and weekly strategy sessions',
          'Custom API access and white-label options',
          'On-premise deployment available',
          'Custom integrations and workflow automation',
          'Advanced attribution modeling',
          'Quarterly business reviews and optimization'
        ],
        duration: '12 months',
        validityPeriod: 60
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async personalizeOffer(
    offerId: string,
    personalizationData: Record<string, any>
  ): Promise<PersonalizedOffer> {
    const offer = this.offers.get(offerId);
    if (!offer) throw new Error('Offer not found');

    const template = this.templates.get(offer.templateId);
    if (!template) throw new Error('Template not found');

    // Calculate personalized pricing based on business size and industry
    const adjustedPrice = await this.applyPricingRules(template.basePrice, personalizationData.leadId || 'unknown');
    const finalPrice = adjustedPrice;

    // Generate realistic business proposal
    const personalizedDescription = this.generateBusinessProposal(template, personalizationData);

    // Calculate ROI projections
    const roiProjection = this.calculateROI(finalPrice, personalizationData);

    const personalizedOffer: PersonalizedOffer = {
      id: offer.id,
      leadId: offer.leadId,
      templateId: offer.templateId,
      title: template.name,
      description: personalizedDescription,
      price: template.basePrice,
      finalPrice,
      discount: template.basePrice - finalPrice,
      features: template.features,
      customizations: [],
      validUntil: new Date(Date.now() + template.validityPeriod * 24 * 60 * 60 * 1000),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.offers.set(offerId, personalizedOffer);
    return personalizedOffer;
  }

  private generateBusinessProposal(template: OfferTemplate, data: Record<string, any>): string {
    const industry = data.industry || 'business';
    const companySize = data.company || 'your organization';

    const proposals: Record<string, string> = {
      'starter_package': `Based on our analysis of ${companySize} in the ${industry} sector, we've designed a targeted client acquisition strategy that focuses on quality over quantity.

Our starter package delivers 50 qualified leads monthly through proven digital channels, with each lead pre-qualified based on your specific service offerings. We handle the entire outreach process, from initial contact to lead nurturing, ensuring you receive only the most promising opportunities.

**Expected Results:**
• 8-12 new clients per month
• Average client value: $3,000-$8,000
• 3-5x return on investment within 90 days
• Payback period: 30-45 days

**What's Included:**
• Custom lead qualification criteria
• Professional email campaign setup
• Basic CRM integration
• Monthly performance reporting
• Dedicated support team

**Risk-Free Guarantee:** If you don't see at least 8 qualified leads in your first month, we'll extend service until you do.`,

      'professional_package': `For ${companySize} in the competitive ${industry} landscape, consistent lead flow is crucial for sustainable growth. Our professional package is designed to establish your business as the go-to provider in your market.

We'll generate 200 qualified leads monthly across multiple channels, implementing advanced personalization strategies that increase conversion rates by 40% compared to standard outreach. Our team will work closely with you to refine messaging, optimize targeting, and ensure maximum ROI.

**Expected Results:**
• 25-35 new clients monthly
• Average client value: $5,000-$15,000
• 200-300% annual ROI
• Payback period: 45-60 days
• 40% higher conversion rates than industry average

**What's Included:**
• Multi-channel lead generation
• Advanced personalization algorithms
• Weekly strategy sessions with account manager
• Custom CRM integration and automation
• A/B testing and campaign optimization
• Competitor analysis and market insights
• Priority support

**Performance Guarantee:** We guarantee at least 25 qualified leads monthly or you receive a 20% credit on your next month's service.`,

      'enterprise_package': `As a leader in the ${industry} sector, ${companySize} requires a client acquisition system that scales with your ambitions. Our enterprise solution provides unlimited qualified leads with AI-driven optimization that continuously improves performance based on real-time data.

We'll implement a comprehensive multi-channel strategy including predictive analytics, automated nurturing sequences, and custom reporting that aligns with your specific business metrics. Your dedicated account manager will ensure the system evolves with your changing needs.

**Expected Results:**
• 50-100+ new clients monthly
• Enterprise-level client values ($15,000+)
• 400-600% annual ROI
• Market dominance in target segments
• Predictive lead scoring with 85%+ accuracy

**What's Included:**
• Unlimited lead generation across all channels
• AI-powered personalization and predictive analytics
• Custom API access and white-label options
• Dedicated account manager and weekly strategy sessions
• Advanced attribution modeling
• Custom integrations and workflow automation
• Quarterly business reviews
• On-premise deployment option
• 24/7 enterprise support

**Enterprise Guarantee:** We guarantee a minimum 400% ROI within the first 6 months or we'll provide additional services at no cost until achieved.`
    };

    return proposals[template.id] || proposals['starter_package'];
  }

  private calculateROI(finalPrice: number, data: Record<string, any>): {
    monthlyROI: number;
    annualROI: number;
    paybackPeriod: number;
    projectedMonthlyRevenue: number;
    projectedAnnualRevenue: number;
    clientAcquisitionCost: number;
  } {
    // Enhanced industry-specific average client values
    const clientValues: Record<string, number> = {
      'Healthcare': 5000,
      'Legal': 8000,
      'Plumbing': 3000,
      'Financial Services': 10000,
      'Technology': 12000,
      'Consulting': 7000,
      'Real Estate': 6000,
      'default': 4000
    };

    const avgClientValue = clientValues[data.industry] || clientValues['default'];
    
    // More realistic client acquisition cost (15-25% of client value)
    const acquisitionCostPercentage = 0.15 + (Math.random() * 0.1); // 15-25%
    const clientAcquisitionCost = avgClientValue * acquisitionCostPercentage;
    
    // Calculate expected monthly clients based on price point
    let monthlyClients;
    if (finalPrice <= 3000) {
      monthlyClients = Math.floor(finalPrice / clientAcquisitionCost);
    } else if (finalPrice <= 8000) {
      monthlyClients = Math.floor(finalPrice / clientAcquisitionCost * 1.2); // 20% bonus for mid-tier
    } else {
      monthlyClients = Math.floor(finalPrice / clientAcquisitionCost * 1.5); // 50% bonus for enterprise
    }
    
    // Ensure minimum client numbers for credibility
    monthlyClients = Math.max(monthlyClients, finalPrice <= 3000 ? 8 : finalPrice <= 8000 ? 25 : 50);
    
    const monthlyRevenue = monthlyClients * avgClientValue;
    const monthlyProfit = monthlyRevenue - finalPrice;
    const monthlyROI = (monthlyProfit / finalPrice) * 100;
    
    const projectedAnnualRevenue = monthlyRevenue * 12;
    const annualProfit = projectedAnnualRevenue - (finalPrice * 12);
    const annualROI = (annualProfit / (finalPrice * 12)) * 100;
    
    // Calculate payback period in days
    const dailyProfit = monthlyProfit / 30;
    const paybackPeriod = Math.ceil(finalPrice / dailyProfit);

    return {
      monthlyROI: Math.max(monthlyROI, 150), // Minimum 150% ROI
      annualROI: Math.max(annualROI, 300), // Minimum 300% annual ROI
      paybackPeriod: Math.min(paybackPeriod, 90), // Maximum 90 days payback
      projectedMonthlyRevenue: monthlyRevenue,
      projectedAnnualRevenue: projectedAnnualRevenue,
      clientAcquisitionCost: clientAcquisitionCost
    };
  }

  private calculateExpectedClients(template: OfferTemplate, data: Record<string, any>): number {
    const clientMultipliers: Record<string, number> = {
      'starter_package': 0.16, // 8 clients from 50 leads
      'professional_package': 0.125, // 25 clients from 200 leads
      'enterprise_package': 0.15 // 75+ clients from unlimited leads
    };

    const featureMatch = template.features[0]?.match(/\d+/);
    const featureNumber = featureMatch ? parseInt(featureMatch[0], 10) : 50;
    const baseClients = Math.ceil(featureNumber * (clientMultipliers[template.id] || 0.15));
    
    // Add industry-specific adjustments
    const industryMultipliers: Record<string, number> = {
      'Healthcare': 1.1,
      'Legal': 1.2,
      'Plumbing': 0.9,
      'Financial Services': 1.3,
      'Technology': 1.25,
      'default': 1.0
    };
    
    const industryMultiplier = industryMultipliers[data.industry] || 1.0;
    return Math.ceil(baseClients * industryMultiplier);
  }

  private calculatePaybackPeriod(finalPrice: number, data: Record<string, any>): number {
    const clientValues: Record<string, number> = {
      'Healthcare': 5000,
      'Legal': 8000,
      'Plumbing': 3000,
      'Financial Services': 10000,
      'Technology': 12000,
      'Consulting': 7000,
      'Real Estate': 6000,
      'default': 4000
    };

    const avgClientValue = clientValues[data.industry] || clientValues['default'];
    const monthlyClients = this.calculateExpectedClients(this.templates.get('professional_package')!, data);
    const monthlyRevenue = monthlyClients * avgClientValue * 0.7; // 70% profit margin

    return Math.ceil(finalPrice / monthlyRevenue);
  }

  async createOffer(
    leadId: string,
    templateId: string,
    customizations: string[] = []
  ): Promise<PersonalizedOffer> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    // Apply pricing rules
    const adjustedPrice = await this.applyPricingRules(template.basePrice, leadId);

    // Calculate final price
    const discount = template.basePrice - adjustedPrice;
    const finalPrice = adjustedPrice * (1 + this.config.taxRate / 100);

    const offer: PersonalizedOffer = {
      id: `offer_${Date.now()}_${leadId}`,
      leadId,
      templateId,
      title: `Personalized ${template.name}`,
      description: template.description,
      price: template.basePrice,
      discount,
      finalPrice,
      features: [...template.features],
      customizations,
      validUntil: new Date(Date.now() + template.validityPeriod * 24 * 60 * 60 * 1000),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.offers.set(offer.id, offer);
    return offer;
  }

  async customizeOffer(
    offerId: string,
    leadData: {
      industry?: string;
      painPoints?: string[];
      budget?: number;
    }
  ): Promise<PersonalizedOffer | null> {
    const offer = this.offers.get(offerId);
    if (!offer) return null;

    // Customize description based on lead data
    let description = offer.description;
    
    if (leadData.industry) {
      description = `Specialized for ${leadData.industry} - ${description}`;
    }

    if (leadData.painPoints && leadData.painPoints.length > 0) {
      description += `\n\nSpecifically addresses: ${leadData.painPoints.join(', ')}`;
    }

    // Adjust pricing based on budget if provided
    if (leadData.budget && leadData.budget < offer.finalPrice) {
      const maxDiscount = 0.2; // 20% max discount
      const discountAmount = Math.min(
        offer.finalPrice - leadData.budget,
        offer.price * maxDiscount
      );
      
      offer.discount += discountAmount;
      offer.finalPrice -= discountAmount;
    }

    offer.description = description;
    offer.updatedAt = new Date();

    this.offers.set(offerId, offer);
    return offer;
  }

  async sendOffer(offerId: string): Promise<PersonalizedOffer | null> {
    const offer = this.offers.get(offerId);
    if (!offer) return null;

    offer.status = 'sent';
    offer.updatedAt = new Date();

    this.offers.set(offerId, offer);
    return offer;
  }

  async acceptOffer(offerId: string): Promise<PersonalizedOffer | null> {
    const offer = this.offers.get(offerId);
    if (!offer) return null;

    if (offer.validUntil < new Date()) {
      offer.status = 'expired';
    } else {
      offer.status = 'accepted';
    }

    offer.updatedAt = new Date();
    this.offers.set(offerId, offer);
    return offer;
  }

  async rejectOffer(offerId: string): Promise<PersonalizedOffer | null> {
    const offer = this.offers.get(offerId);
    if (!offer) return null;

    offer.status = 'rejected';
    offer.updatedAt = new Date();

    this.offers.set(offerId, offer);
    return offer;
  }

  async getOffer(offerId: string): Promise<PersonalizedOffer | null> {
    return this.offers.get(offerId) || null;
  }

  async getOffersByLead(leadId: string): Promise<PersonalizedOffer[]> {
    return Array.from(this.offers.values()).filter(
      offer => offer.leadId === leadId
    );
  }

  async getTemplates(): Promise<OfferTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(templateId: string): Promise<OfferTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  private async applyPricingRules(basePrice: number, leadId: string): Promise<number> {
    let adjustedPrice = basePrice;

    // Sort pricing rules by priority
    const sortedRules = Array.from(this.pricingRules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      // In a real implementation, we'd check lead data against conditions
      // For now, just apply the rule if it exists
      if (rule.adjustments.discountPercentage) {
        adjustedPrice *= (1 - rule.adjustments.discountPercentage / 100);
      }
      
      if (rule.adjustments.priceMultiplier) {
        adjustedPrice *= rule.adjustments.priceMultiplier;
      }
    }

    return adjustedPrice;
  }

  async addPricingRule(rule: PricingRule): Promise<void> {
    this.pricingRules.set(rule.id, rule);
  }

  async checkExpiredOffers(): Promise<void> {
    const now = new Date();
    const offers = Array.from(this.offers.values());
    
    for (const offer of offers) {
      if (offer.status === 'sent' && offer.validUntil < now) {
        offer.status = 'expired';
        offer.updatedAt = now;
        this.offers.set(offer.id, offer);
      }
    }
  }
}

export const offerEngine = new OfferEngine({
  currency: 'USD',
  taxRate: 8.5,
  defaultValidityPeriod: 30,
  autoExpire: true
});
