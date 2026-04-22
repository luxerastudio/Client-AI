/**
 * Personalization Engine Core Module
 * Handles content personalization and messaging customization
 */

export interface PersonalizationProfile {
  id: string;
  leadId: string;
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'technical';
    interests: string[];
    painPoints: string[];
    industry: string;
  };
  behavior: {
    emailOpenRate: number;
    responseRate: number;
    lastContact: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalizationConfig {
  tone: 'professional' | 'friendly' | 'urgent';
  length: 'short' | 'medium' | 'long';
  includeCaseStudies: boolean;
  customFields: string[];
}

export interface PersonalizedContent {
  subject: string;
  body: string;
  personalizationTokens: Record<string, string>;
  confidence: number;
}

export class PersonalizationEngine {
  private profiles: Map<string, PersonalizationProfile> = new Map();

  async createProfile(leadId: string): Promise<PersonalizationProfile> {
    const profile: PersonalizationProfile = {
      id: `profile_${leadId}`,
      leadId,
      preferences: {
        communicationStyle: 'formal',
        interests: [],
        painPoints: [],
        industry: ''
      },
      behavior: {
        emailOpenRate: 0,
        responseRate: 0,
        lastContact: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  async personalizeContent(
    content: string,
    profile: PersonalizationProfile,
    config: PersonalizationConfig
  ): Promise<PersonalizedContent> {
    // Generate human-written, industry-specific outreach content
    const industry = profile.preferences.industry || 'Healthcare';
    const outreachContent = this.generateIndustrySpecificOutreach(industry, profile);
    
    const tokens: Record<string, string> = {
      company_name: 'Business Name',
      industry: industry,
      location: 'Location',
      pain_point: 'Business Challenge',
      contact_person: 'Contact Name',
      company_size: 'Company Size'
    };

    return {
      subject: this.generateProfessionalSubject(industry, profile),
      body: outreachContent,
      personalizationTokens: tokens,
      confidence: this.calculateConfidence(profile, config)
    };
  }

  private generateIndustrySpecificOutreach(industry: string, profile: PersonalizationProfile): string {
    const templates: Record<string, string[]> = {
      'Healthcare': [
        `I hope this message finds you well. I've been following the dental industry in your area and noticed the exceptional work practices at local clinics. Many practice owners I speak with are finding it increasingly challenging to attract new patients consistently while managing their busy schedules.

Our client acquisition system has helped dental practices similar to yours increase their patient base by 40% on average through targeted outreach and strategic marketing. We handle the entire lead generation process so you can focus on providing excellent care to your patients.

What makes our approach different is that we exclusively target patients who are actively seeking dental services in your specific area. This means higher conversion rates and better ROI for your practice.

Would you be open to a brief 15-minute call next week to discuss how we could help grow your practice?`,
        
        `I came across your practice while researching successful dental businesses in your area. Your reputation for quality care is evident, and I imagine you're always looking for ways to help more patients discover your services.

Many dental practices we work with struggle with the business side of patient acquisition - it's not something they teach in dental school! We specialize in bringing in qualified leads who are actively seeking dental services, using proven marketing strategies that respect your time and budget.

One of our clients in a similar market saw 27 new patient appointments in their first month, with an average patient value of $1,200. The best part? They didn't have to lift a finger on the marketing side.

I'd love to share some case studies from practices similar to yours. Are you available for a quick conversation next week?`,
        
        `I'm reaching out because I noticed your practice's excellent online presence, and it's clear you prioritize patient care. However, I also know that even the best practices can struggle with consistent patient flow.

We work exclusively with dental practices to implement automated patient acquisition systems that bring in 15-25 qualified new patients monthly. Our approach focuses on quality over quantity - we target patients who match your ideal patient profile and are ready to schedule appointments.

The practices we work with typically see a 3-5x return on investment within the first 90 days, with most new patients coming from areas you want to serve.

Would you be interested in learning how we could help you achieve similar results?`
      ],
      'Legal': [
        `I hope this email finds you well. As someone who works with law firms across the country, I've noticed that even the most successful practices often face challenges with consistent client acquisition and business development.

Our client acquisition system has helped law firms increase their qualified leads by 35% while reducing marketing overhead. We handle the entire lead generation and nurturing process, allowing your team to focus on what they do best - practicing law.

What sets us apart is our understanding of legal marketing ethics and our ability to attract clients who match your practice areas and fee structures. We don't just generate leads - we generate qualified client opportunities.

I'd appreciate the opportunity to share how we've helped firms similar to yours achieve sustainable growth. Would you be available for a brief call next week?`,
        
        `I've been following the legal landscape in your area and your firm's reputation for excellence is well-known. However, I've found that many successful attorneys still struggle with the business development side of running a practice.

Our system specializes in bringing in qualified clients who are actively seeking legal services, using targeted strategies that align with professional ethics and your firm's values. We've helped attorneys increase their client base significantly while maintaining quality control.

One of our clients saw a 47% increase in qualified consultations within the first 60 days, with an average client value of $8,500. They were able to hire two additional associates as a result.

Would you be open to discussing how we could support your firm's growth goals?`,
        
        `I'm reaching out because I've been impressed by your firm's case work and community involvement. It's clear you're committed to excellence, but I also know that business development can be time-consuming for busy attorneys.

We specialize in client acquisition for law firms, focusing on bringing in qualified leads for your specific practice areas. Our approach is designed to complement your existing marketing efforts while respecting professional ethics and your time.

The attorneys we work with typically see 8-12 qualified consultations monthly, with conversion rates that exceed industry averages. We handle all the marketing heavy lifting so you can focus on billable work.

Would you be interested in learning more about our approach?`
      ],
      'Plumbing': [
        `I hope this message finds you well. I've worked with many plumbing businesses across the region, and I understand that finding quality residential and commercial clients consistently can be challenging, especially when you're busy serving existing customers.

Our client acquisition system has helped plumbing companies increase their job bookings by 45% while reducing their marketing costs. We specialize in bringing in qualified leads for both emergency services and scheduled projects, so you can focus on what you do best.

What makes our system effective is that we target customers in your service area who actually need plumbing services now - not just tire kickers. This means higher conversion rates and more profitable jobs.

I'd love to share how we've helped plumbing businesses similar to yours achieve consistent growth. Are you available for a brief conversation next week?`,
        
        `I came across your business while researching successful plumbing companies in your area. Your reputation for quality service is evident, but I imagine that finding new clients consistently while managing your team and existing jobs can be challenging.

Our system specializes in generating qualified leads for both residential and commercial plumbing services. We handle the entire marketing and lead nurturing process, so you receive only the most promising opportunities that match your expertise and availability.

One of our clients increased their monthly job bookings from 45 to 82 within the first 90 days, with an average job value of $450. They were able to add two additional trucks to their fleet.

Would you be interested in learning how we could help grow your business?`,
        
        `I'm reaching out because I've heard great things about your work in the community. Quality plumbing services are always in demand, but I know that marketing and lead generation can take you away from what you do best.

We help plumbing companies like yours generate a steady stream of qualified leads - both emergency calls and scheduled projects. Our system targets homeowners and businesses in your specific service areas who need plumbing services now.

The plumbing companies we work with typically see a 60-80% increase in qualified leads within the first month, with most new jobs coming from areas you want to serve. We handle all the marketing so you can focus on running your business.

Would you be open to discussing how we could help you grow your business?`
      ],
      'dentist': [
        `I hope this message finds you well. I've been following the dental industry in your area and noticed the exceptional work practices at local clinics. Many practice owners I speak with are finding it increasingly challenging to attract new patients consistently while managing their busy schedules.

Our client acquisition system has helped dental practices similar to yours increase their patient base by 40% on average through targeted outreach and strategic marketing. We handle the entire lead generation process so you can focus on providing excellent care to your patients.

What makes our approach different is that we exclusively target patients who are actively seeking dental services in your specific area. This means higher conversion rates and better ROI for your practice.

Would you be open to a brief 15-minute call next week to discuss how we could help grow your practice?`,
        
        `I came across your practice while researching successful dental businesses in your area. Your reputation for quality care is evident, and I imagine you're always looking for ways to help more patients discover your services.

Many dental practices we work with struggle with the business side of patient acquisition - it's not something they teach in dental school! We specialize in bringing in qualified leads who are actively seeking dental services, using proven marketing strategies that respect your time and budget.

One of our clients in a similar market saw 27 new patient appointments in their first month, with an average patient value of $1,200. The best part? They didn't have to lift a finger on the marketing side.

I'd love to share some case studies from practices similar to yours. Are you available for a quick conversation next week?`,
        
        `I'm reaching out because I noticed your practice's excellent online presence, and it's clear you prioritize patient care. However, I also know that even the best practices can struggle with consistent patient flow.

We work exclusively with dental practices to implement automated patient acquisition systems that bring in 15-25 qualified new patients monthly. Our approach focuses on quality over quantity - we target patients who match your ideal patient profile and are ready to schedule appointments.

The practices we work with typically see a 3-5x return on investment within the first 90 days, with most new patients coming from areas you want to serve.

Would you be interested in learning how we could help you achieve similar results?`
      ]
    };

    const industryTemplates = templates[industry] || templates['Healthcare'];
    return industryTemplates[Math.floor(Math.random() * industryTemplates.length)];
  }

  private generateProfessionalSubject(industry: string, profile: PersonalizationProfile): string {
    const subjects: Record<string, string[]> = {
      'Healthcare': [
        'Growing your dental practice',
        'Patient acquisition strategies',
        'Helping practices like yours thrive',
        'Partnership opportunity for your practice',
        'New patient acquisition system',
        'Practice growth consultation',
        'Dental practice marketing solution'
      ],
      'Legal': [
        'Growing your legal practice',
        'Client acquisition for law firms',
        'Strategic partnership discussion',
        'Business development for attorneys',
        'Law firm growth strategies',
        'Client acquisition system',
        'Legal practice consultation'
      ],
      'Plumbing': [
        'Growing your plumbing business',
        'Client acquisition strategies',
        'Partnership opportunity',
        'Business growth for plumbing companies',
        'Plumbing lead generation',
        'Business development solutions',
        'Plumbing company growth'
      ],
      'dentist': [
        'Growing your dental practice',
        'Patient acquisition strategies',
        'Helping practices like yours thrive',
        'Partnership opportunity for your practice',
        'New patient acquisition system',
        'Practice growth consultation',
        'Dental practice marketing solution'
      ]
    };

    const industrySubjects = subjects[industry] || subjects['Healthcare'];
    return industrySubjects[Math.floor(Math.random() * industrySubjects.length)];
  }

  async updateProfile(
    profileId: string,
    updates: Partial<PersonalizationProfile>
  ): Promise<PersonalizationProfile | null> {
    const existingProfile = this.profiles.get(profileId);
    if (!existingProfile) return null;

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date()
    };

    this.profiles.set(profileId, updatedProfile);
    return updatedProfile;
  }

  async getProfileByLeadId(leadId: string): Promise<PersonalizationProfile | null> {
    const profiles = Array.from(this.profiles.values());
    for (const profile of profiles) {
      if (profile.leadId === leadId) {
        return profile;
      }
    }
    return null;
  }

  private replaceTokens(
    content: string,
    profile: PersonalizationProfile,
    tokens: Record<string, string>
  ): string {
    let result = content;

    // Industry-specific tokens
    if (profile.preferences.industry) {
      result = result.replace(/\[industry\]/g, profile.preferences.industry);
      tokens.industry = profile.preferences.industry;
    }

    // Pain point tokens
    if (profile.preferences.painPoints.length > 0) {
      const painPoint = profile.preferences.painPoints[0];
      result = result.replace(/\[pain_point\]/g, painPoint);
      tokens.pain_point = painPoint;
    }

    return result;
  }

  private adjustTone(content: string, tone: 'professional' | 'friendly' | 'urgent'): string {
    // Tone adjustment logic
    switch (tone) {
      case 'professional':
        return content.replace(/hey/gi, 'Dear').replace(/awesome/gi, 'excellent');
      case 'friendly':
        return content.replace(/Dear/gi, 'Hi').replace(/sincerely/gi, 'Best');
      case 'urgent':
        return content + '\n\nTime-sensitive opportunity - act now!';
      default:
        return content;
    }
  }

  private adjustLength(content: string, length: 'short' | 'medium' | 'long'): string {
    const sentences = content.split('. ');
    
    switch (length) {
      case 'short':
        return sentences.slice(0, 2).join('. ') + '.';
      case 'medium':
        return sentences.slice(0, 4).join('. ') + '.';
      case 'long':
        return content;
      default:
        return content;
    }
  }

  private generateSubject(
    profile: PersonalizationProfile,
    config: PersonalizationConfig
  ): string {
    const baseSubjects = {
      professional: [
        'Professional Opportunity Discussion',
        'Strategic Partnership Proposal'
      ],
      friendly: [
        'Quick question about your business',
        'Thought you might find this interesting'
      ],
      urgent: [
        'Limited Time Opportunity',
        'Urgent: Business Growth Discussion'
      ]
    };

    const subjects = baseSubjects[config.tone];
    return subjects[Math.floor(Math.random() * subjects.length)];
  }

  private calculateConfidence(
    profile: PersonalizationProfile,
    config: PersonalizationConfig
  ): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on profile completeness
    if (profile.preferences.industry) confidence += 15;
    if (profile.preferences.painPoints.length > 0) confidence += 15;
    if (profile.behavior.emailOpenRate > 0) confidence += 10;
    if (profile.behavior.responseRate > 0) confidence += 10;

    return Math.min(confidence, 100);
  }
}

export const personalizationEngine = new PersonalizationEngine();
