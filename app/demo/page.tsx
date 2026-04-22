'use client';

import { useState, useEffect } from 'react';

interface DemoData {
  niche: string;
  location: string;
}

interface ExecutionResult {
  success: boolean;
  input?: {
    niche?: string;
    location?: string;
  };
  output?: {
    leadsGenerated: number;
    personalizedLeads: number;
    outreachMessages: number;
    offersCreated: number;
    pipelineEntries: number;
    creditsUsed: number;
    executionTime?: number;
  };
  details?: {
    leads?: any[];
    personalizedLeads?: any[];
    outreachMessages?: any[];
    offers?: any[];
    pipelineEntries?: any[];
  };
  error?: string;
  errorCode?: string;
}

export default function DemoPage() {
  const [data, setData] = useState<DemoData>({ niche: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const stages = [
    { message: 'Initializing acquisition engine...', minDelay: 400, maxDelay: 700 },
    { message: 'Analyzing target market...', minDelay: 300, maxDelay: 600 },
    { message: 'Generating qualified leads...', minDelay: 500, maxDelay: 900 },
    { message: 'Creating personalized profiles...', minDelay: 400, maxDelay: 700 },
    { message: 'Crafting outreach messages...', minDelay: 350, maxDelay: 650 },
    { message: 'Generating business offers...', minDelay: 450, maxDelay: 800 },
    { message: 'Updating acquisition pipeline...', minDelay: 300, maxDelay: 600 },
    { message: 'Finalizing results...', minDelay: 250, maxDelay: 500 }
  ];

  const executeAcquisition = async () => {
    // Input validation
    const trimmedNiche = data.niche.trim();
    const trimmedLocation = data.location.trim();
    
    if (!trimmedNiche) {
      setError('Please enter a target niche (e.g., dentist, plumber, lawyer)');
      return;
    }
    
    if (!trimmedLocation) {
      setError('Please enter a target location (e.g., USA, California, New York)');
      return;
    }

    // Validate niche is not too short or contains only special characters
    if (trimmedNiche.length < 2 || !/^[a-zA-Z\s]+$/.test(trimmedNiche)) {
      setError('Please enter a valid niche (letters and spaces only, minimum 2 characters)');
      return;
    }

    // Validate location
    if (trimmedLocation.length < 2 || !/^[a-zA-Z\s,]+$/.test(trimmedLocation)) {
      setError('Please enter a valid location (e.g., USA, California, New York)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    // Simulate loading stages with realistic delays
    for (let i = 0; i < stages.length; i++) {
      setLoadingStage(stages[i].message);
      setProgress(Math.round(((i + 1) / stages.length) * 100));
      const delay = Math.floor(Math.random() * (stages[i].maxDelay - stages[i].minDelay)) + stages[i].minDelay;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      // API endpoint - ALWAYS use relative path for production compatibility
      const apiEndpoint = '/api/test';
      
      console.log("API CALL: Starting acquisition engine request");
      console.log("API ENDPOINT:", apiEndpoint);
      console.log("API DATA:", { niche: trimmedNiche.toLowerCase(), location: trimmedLocation });
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'demo_user_' + Date.now()
        },
        body: JSON.stringify({
          niche: trimmedNiche.toLowerCase(),
          location: trimmedLocation
        })
      });

      console.log("API RESPONSE STATUS:", response.status);
      
      const result: ExecutionResult = await response.json();
      console.log("API RESPONSE DATA:", result);
      setResult(result);
      
      if (!result.success) {
        // Handle specific error cases with user-friendly messages
        const errorMessages: Record<string, string> = {
          'INSUFFICIENT_CREDITS': 'Insufficient credits. Please upgrade your plan to continue.',
          'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
          'INVALID_REQUEST': 'Invalid request parameters. Please check your input and try again.',
          'EXECUTION_FAILED': 'Pipeline execution failed. Please try again or contact support.'
        };
        setError(result.error || errorMessages[result.errorCode || ''] || 'Execution failed');
      }
    } catch (err) {
      console.error("API ERROR:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`API Error: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
      setLoadingStage('');
      setProgress(0);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Client Acquisition System
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Business Engine for Automated Lead Generation & Client Acquisition
          </p>
          <p className="text-sm text-gray-500">
            One Input. One Click. Full Client Acquisition Pipeline.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Configure Your Acquisition Campaign
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Niche
              </label>
              <input
                type="text"
                value={data.niche}
                onChange={(e) => setData({ ...data, niche: e.target.value })}
                placeholder="e.g., dentist, plumber, lawyer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Location
              </label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value })}
                placeholder="e.g., USA, California, New York"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Execution Button */}
          <div className="text-center">
            <button
              onClick={executeAcquisition}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Run Client Acquisition'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg font-medium text-gray-800">{loadingStage}</p>
              <div className="mt-4 w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && result.success && result.output && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Acquisition Results
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.output.leadsGenerated}
                  </div>
                  <div className="text-sm text-gray-600">Leads Generated</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {result.output.personalizedLeads}
                  </div>
                  <div className="text-sm text-gray-600">Personalized</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.output.outreachMessages}
                  </div>
                  <div className="text-sm text-gray-600">Outreach Sent</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.output.offersCreated}
                  </div>
                  <div className="text-sm text-gray-600">Offers Created</div>
                </div>
                
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {result.output.pipelineEntries}
                  </div>
                  <div className="text-sm text-gray-600">Pipeline Entries</div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {result.output.creditsUsed}
                  </div>
                  <div className="text-sm text-gray-600">Credits Used</div>
                </div>
              </div>

              {result.output.executionTime && (
                <div className="text-center text-sm text-gray-500">
                  Execution time: {result.output.executionTime}ms
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {result.details && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads */}
                {result.details.leads && result.details.leads.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Generated Leads
                    </h3>
                    <div className="space-y-3">
                      {result.details.leads.slice(0, 3).map((lead: any, index: number) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="font-medium text-gray-900">{lead.company}</div>
                          <div className="text-sm text-gray-600">{lead.email}</div>
                          <div className="text-xs text-gray-500">
                            {lead.industry} - {lead.metadata?.location}
                          </div>
                          <div className="text-xs mt-1">
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              lead.qualified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {lead.qualified ? 'Qualified' : 'Review Needed'}
                            </span>
                            <span className="ml-2 text-gray-500">Score: {lead.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outreach Messages */}
                {result.details.outreachMessages && result.details.outreachMessages.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Outreach Messages
                    </h3>
                    <div className="space-y-3">
                      {result.details.outreachMessages.slice(0, 2).map((message: any, index: number) => (
                        <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                          <div className="text-sm text-gray-700 italic">
                            "Personalized outreach message crafted for {message.leadId}"
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {message.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offers */}
                {result.details.offers && result.details.offers.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Business Offers
                    </h3>
                    <div className="space-y-3">
                      {result.details.offers.slice(0, 2).map((offer: any, index: number) => (
                        <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                          <div className="font-medium text-gray-900">{offer.title}</div>
                          <div className="text-sm text-gray-600">{offer.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Price: ${offer.finalPrice} | Status: {offer.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pipeline Status */}
                {result.details.pipelineEntries && result.details.pipelineEntries.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Pipeline Status
                    </h3>
                    <div className="space-y-3">
                      {result.details.pipelineEntries.slice(0, 3).map((entry: any, index: number) => (
                        <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                          <div className="text-sm font-medium text-gray-900">
                            Lead: {entry.leadId}
                          </div>
                          <div className="text-sm text-gray-600">
                            Stage: {entry.currentStage}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              entry.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              entry.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              entry.status === 'responded' ? 'bg-green-100 text-green-800' :
                              entry.status === 'converted' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {entry.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.probability}% probability
                            </span>
                          </div>
                          {entry.lastActivityAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Last activity: {new Date(entry.lastActivityAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
