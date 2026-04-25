'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface TestResult {
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
  details?: any;
  error?: string;
  errorCode?: string;
}

interface ApiStatus {
  backend: 'loading' | 'success' | 'error';
  system: 'loading' | 'success' | 'error';
  aiEngine: 'loading' | 'success' | 'error';
}

interface DebugLog {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'timing' | 'info';
  message: string;
  data?: any;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [testData, setTestData] = useState({ niche: '', location: '' });
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState('');
  const [inputErrors, setInputErrors] = useState({ niche: '', location: '' });
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    backend: 'loading',
    system: 'loading',
    aiEngine: 'loading'
  });
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [dbWriteStatus, setDbWriteStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [lastSavedRecord, setLastSavedRecord] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [responseView, setResponseView] = useState<'formatted' | 'raw'>('formatted');
  const [requestTiming, setRequestTiming] = useState<{ start: number; end: number; duration: number } | null>(null);
  
  // SAFE MODE: Cache last successful response for fallback
  const [lastSuccessfulResponse, setLastSuccessfulResponse] = useState<TestResult | null>(null);
  const [safeMode, setSafeMode] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
    checkApiStatus();
  }, []);

  const addDebugLog = (type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    setDebugLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const checkApiStatus = async () => {
    try {
      // Check backend health
      addDebugLog('request', 'Checking backend health...');
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      addDebugLog('response', 'Backend health response', healthData);
      setApiStatus(prev => ({ ...prev, backend: healthResponse.ok ? 'success' : 'error' }));

      // Check system status
      addDebugLog('request', 'Checking system status...');
      const systemResponse = await fetch('/api/v1/security/health');
      const systemData = await systemResponse.json();
      addDebugLog('response', 'System status response', systemData);
      setApiStatus(prev => ({ ...prev, system: systemResponse.ok ? 'success' : 'error' }));

      // Check AI engine status
      addDebugLog('request', 'Checking AI engine status...');
      const aiResponse = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', maxTokens: 1 })
      });
      const aiData = await aiResponse.json();
      addDebugLog('response', 'AI engine response', aiData);
      setApiStatus(prev => ({ ...prev, aiEngine: aiResponse.ok ? 'success' : 'error' }));
    } catch (error) {
      addDebugLog('error', 'API status check failed', error);
      setApiStatus({
        backend: 'error',
        system: 'error',
        aiEngine: 'error'
      });
    }
  };

  const validateInputs = () => {
    const errors = { niche: '', location: '' };
    const trimmedNiche = testData.niche.trim();
    const trimmedLocation = testData.location.trim();
    
    if (!trimmedNiche) {
      errors.niche = 'Target niche is required';
    } else if (trimmedNiche.length < 2) {
      errors.niche = 'Niche must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(trimmedNiche)) {
      errors.niche = 'Niche can only contain letters and spaces';
    }
    
    if (!trimmedLocation) {
      errors.location = 'Target location is required';
    } else if (trimmedLocation.length < 2) {
      errors.location = 'Location must be at least 2 characters';
    } else if (!/^[a-zA-Z\s,]+$/.test(trimmedLocation)) {
      errors.location = 'Location can only contain letters, spaces, and commas';
    }
    
    setInputErrors(errors);
    return !errors.niche && !errors.location;
  };

  const runTestAcquisition = async () => {
    if (!validateInputs()) {
      return;
    }

    const trimmedNiche = testData.niche.trim();
    const trimmedLocation = testData.location.trim();
    
    setTestLoading(true);
    setTestError('');
    setDbWriteStatus('idle');
    setTestResult(null);
    setRequestTiming(null);
    
    const startTime = Date.now();
    
    if (debugMode) {
      addDebugLog('request', 'Starting test acquisition', { 
        niche: trimmedNiche, 
        location: trimmedLocation,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test_user_' + Date.now()
        },
        body: JSON.stringify({
          niche: trimmedNiche.toLowerCase(),
          location: trimmedLocation
        })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      setRequestTiming({ start: startTime, end: endTime, duration });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (debugMode) {
        addDebugLog('response', 'Test acquisition response', data);
        addDebugLog('timing', 'Request completed', { duration: `${duration}ms` });
      }

  // Create comprehensive normalization function for acquisition response
  const normalizeAcquisitionResponse = (data: any) => {
    console.log("NORMALIZING RESPONSE:", data);
    
    // PRIMARY MAPPING: Prioritize output field (API response structure)
    const outputLeads = data?.output?.leadsGenerated ?? 0;
    const outputPersonalized = data?.output?.personalizedLeads ?? 0;
    const outputOutreach = data?.output?.outreachMessages ?? 0;
    const outputOffers = data?.output?.offersCreated ?? 0;
    const outputPipeline = data?.output?.pipelineEntries ?? 0;
    
    // FALLBACK: Use details arrays only if output fields are null/zero
    const detailsLeads = Array.isArray(data?.details?.leads) ? data.details.leads : [];
    const detailsPersonalized = Array.isArray(data?.details?.personalizedMessages) ? data.details.personalizedMessages : [];
    const detailsOutreach = Array.isArray(data?.details?.outreachMessages) ? data.details.outreachMessages : [];
    const detailsOffers = Array.isArray(data?.details?.offers) ? data.details.offers : 
                          (data?.details?.offer ? [data.details.offer] : []);
    const detailsPipeline = Array.isArray(data?.details?.pipeline) ? data.details.pipeline : [];
    
    // Use output fields if they have real data (> 0), otherwise fallback to details arrays
    const finalLeads = outputLeads > 0 ? Array(outputLeads).fill(null).map((_, i) => ({ id: `output_${i}` })) : detailsLeads;
    const finalPersonalized = outputPersonalized > 0 ? Array(outputPersonalized).fill(null).map((_, i) => ({ id: `output_${i}` })) : detailsPersonalized;
    const finalOutreach = outputOutreach > 0 ? Array(outputOutreach).fill(null).map((_, i) => ({ id: `output_${i}` })) : detailsOutreach;
    const finalOffers = outputOffers > 0 ? Array(outputOffers).fill(null).map((_, i) => ({ id: `output_${i}` })) : detailsOffers;
    const finalPipeline = outputPipeline > 0 ? Array(outputPipeline).fill(null).map((_, i) => ({ id: `output_${i}` })) : detailsPipeline;
    
    const normalizedOutput = {
      leadsGenerated: outputLeads > 0 ? outputLeads : finalLeads.length,
      personalizedLeads: outputPersonalized > 0 ? outputPersonalized : finalPersonalized.length,
      outreachMessages: outputOutreach > 0 ? outputOutreach : finalOutreach.length,
      offersCreated: outputOffers > 0 ? outputOffers : finalOffers.length,
      pipelineEntries: outputPipeline > 0 ? outputPipeline : finalPipeline.length,
      creditsUsed: data?.output?.creditsUsed || data?.details?.apiUsage?.totalCost || 0,
      executionTime: data?.output?.executionTime || data?.details?.executionTime || duration
    };
    
    console.log("NORMALIZED OUTPUT:", {
      ...normalizedOutput,
      source: outputLeads > 0 ? 'output_field' : 'details_arrays',
      rawOutput: { leadsGenerated: outputLeads, personalizedLeads: outputPersonalized, outreachMessages: outputOutreach, offersCreated: outputOffers, pipelineEntries: outputPipeline },
      rawDetails: { leads: detailsLeads.length, personalizedMessages: detailsPersonalized.length, outreachMessages: detailsOutreach.length, offers: detailsOffers.length, pipeline: detailsPipeline.length }
    });
    
    return {
      output: normalizedOutput,
      details: {
        leads: finalLeads,
        personalizedMessages: finalPersonalized,
        outreachMessages: finalOutreach,
        offers: finalOffers,
        pipeline: finalPipeline,
        ...data?.details
      }
    };
  };

      const normalized = normalizeAcquisitionResponse(data);
      const result: TestResult = {
        success: data?.success || false,
        input: data?.input || { niche: '', location: '' },
        output: normalized.output,
        details: normalized.details,
        error: data?.error,
        errorCode: data?.errorCode
      };

      // UI REAL-TIME SYNC: Only update state if we have complete, valid data
      if (result.success && normalized.output.leadsGenerated >= 0) {
        setTestResult(result);
        setDbWriteStatus('success');
        
        // SAFE MODE: Cache successful response for future fallbacks
        setLastSuccessfulResponse(result);
        setSafeMode(false);
      } else {
        // Prevent partial state overwrite - keep existing state if data is invalid
        if (debugMode) {
          addDebugLog('info', 'Prevented partial state overwrite', { 
            reason: 'Invalid or incomplete response data',
            response: result,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      setLastSavedRecord({
        timestamp: new Date().toISOString(),
        leads: normalized.output.leadsGenerated,
        creditsUsed: result.output?.creditsUsed || 0,
        executionTime: duration
      });
      
      if (debugMode) {
        addDebugLog('response', 'Database write status', { status: 'success', record: lastSavedRecord });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle error response properly - check if it's our new structured error
      if (errorMessage.includes('BACKEND_ERROR') || errorMessage.includes('Backend acquisition failed')) {
        // Backend failed - use SAFE MODE if available
        if (lastSuccessfulResponse) {
          setTestResult(lastSuccessfulResponse);
          setSafeMode(true);
          setTestError(`Backend Error: ${errorMessage}. Showing last successful data (SAFE MODE)`);
          setDbWriteStatus('success');
          
          if (debugMode) {
            addDebugLog('info', 'SAFE MODE activated - using cached response', { 
              error: errorMessage,
              cachedResponse: lastSuccessfulResponse,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          setTestError(`Backend Error: ${errorMessage}. No cached data available.`);
          setDbWriteStatus('failed');
          
          if (debugMode) {
            addDebugLog('error', 'Backend failed - no cached response', { 
              error: errorMessage,
              hasCachedResponse: !!lastSuccessfulResponse,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        // Other API errors
        setTestError(`API Error: ${errorMessage}`);
        setDbWriteStatus('failed');
        
        if (debugMode) {
          addDebugLog('error', 'API request failed', { 
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        }
      }
    } finally {
      setTestLoading(false);
    }
  };

  const handleRetry = () => {
    setTestError('');
    runTestAcquisition();
  };

  const handleFeatureClick = (featureName: string) => {
    if (debugMode) {
      addDebugLog('info', `Feature clicked: ${featureName}`, { 
        timestamp: new Date().toISOString() 
      });
    }
    alert(`${featureName} - Feature not connected yet. This is a testing dashboard placeholder.`);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="h-16 bg-gray-200 rounded animate-pulse mb-6 w-3/4 mx-auto"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4 w-1/2 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-8 w-2/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI Client Acquisition System
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Revolutionizing how agencies acquire clients with AI
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            One Input. One Click. Full Client Acquisition Pipeline.
            Generate leads, personalize outreach, create offers, and manage your pipeline automatically.
          </p>
          
          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/demo"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Try Live Demo
            </Link>
            <div className="text-sm text-gray-500">
              No credit card required · Full pipeline demonstration
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div 
            onClick={() => handleFeatureClick('Lead Generation')}
            className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-blue-50 group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Lead Generation</h3>
            <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">AI-powered lead identification and qualification</p>
            <div className="text-xs text-gray-400 mt-2 group-hover:text-blue-500 transition-colors">Click to test</div>
          </div>
          
          <div 
            onClick={() => handleFeatureClick('Personalization')}
            className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-green-50 group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <div className="w-6 h-6 bg-green-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Personalization</h3>
            <p className="text-sm text-gray-600 group-hover:text-green-600 transition-colors">Tailored messaging for each prospect</p>
            <div className="text-xs text-gray-400 mt-2 group-hover:text-green-500 transition-colors">Click to test</div>
          </div>
          
          <div 
            onClick={() => handleFeatureClick('Outreach Automation')}
            className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-purple-50 group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <div className="w-6 h-6 bg-purple-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">Outreach Automation</h3>
            <p className="text-sm text-gray-600 group-hover:text-purple-600 transition-colors">Automated campaign execution</p>
            <div className="text-xs text-gray-400 mt-2 group-hover:text-purple-500 transition-colors">Click to test</div>
          </div>
          
          <div 
            onClick={() => handleFeatureClick('Pipeline Management')}
            className="bg-white p-6 rounded-lg shadow-md text-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-orange-50 group"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
              <div className="w-6 h-6 bg-orange-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors">Pipeline Management</h3>
            <p className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">Complete client acquisition tracking</p>
            <div className="text-xs text-gray-400 mt-2 group-hover:text-orange-500 transition-colors">Click to test</div>
          </div>
        </div>

        {/* Test Dashboard Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              🧪 Test Dashboard
            </h2>
            <span className="text-sm text-gray-500 bg-yellow-100 px-3 py-1 rounded-full">
              Development Testing Only
            </span>
          </div>
          
          {/* API Status Check Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`p-4 rounded-lg border-2 ${
              apiStatus.backend === 'loading' ? 'border-gray-300 bg-gray-50' :
              apiStatus.backend === 'success' ? 'border-green-500 bg-green-50' :
              'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Backend</span>
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus.backend === 'loading' ? 'bg-gray-400 animate-pulse' :
                  apiStatus.backend === 'success' ? 'bg-green-500' :
                  'bg-red-500'
                }`}></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {apiStatus.backend === 'loading' ? 'Checking...' :
                 apiStatus.backend === 'success' ? 'Working' :
                 'Failed'}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              apiStatus.system === 'loading' ? 'border-gray-300 bg-gray-50' :
              apiStatus.system === 'success' ? 'border-green-500 bg-green-50' :
              'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">System</span>
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus.system === 'loading' ? 'bg-gray-400 animate-pulse' :
                  apiStatus.system === 'success' ? 'bg-green-500' :
                  'bg-red-500'
                }`}></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {apiStatus.system === 'loading' ? 'Checking...' :
                 apiStatus.system === 'success' ? 'Working' :
                 'Failed'}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              apiStatus.aiEngine === 'loading' ? 'border-gray-300 bg-gray-50' :
              apiStatus.aiEngine === 'success' ? 'border-green-500 bg-green-50' :
              'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">AI Engine</span>
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus.aiEngine === 'loading' ? 'bg-gray-400 animate-pulse' :
                  apiStatus.aiEngine === 'success' ? 'bg-green-500' :
                  'bg-red-500'
                }`}></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {apiStatus.aiEngine === 'loading' ? 'Checking...' :
                 apiStatus.aiEngine === 'success' ? 'Working' :
                 'Failed'}
              </div>
            </div>
          </div>

          {/* Generator Test Panel */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Generator Test Panel
              </h3>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  debugMode 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {debugMode ? 'Debug: ON' : 'Debug: OFF'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Niche <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={testData.niche}
                  onChange={(e) => {
                    setTestData({ ...testData, niche: e.target.value });
                    if (inputErrors.niche) {
                      setInputErrors({ ...inputErrors, niche: '' });
                    }
                  }}
                  placeholder="e.g., dentist, plumber, lawyer"
                  disabled={testLoading}
                  className={`w-full px-4 py-2 border rounded-lg text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    inputErrors.niche 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                />
                {inputErrors.niche && (
                  <p className="text-red-500 text-xs mt-1">{inputErrors.niche}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={testData.location}
                  onChange={(e) => {
                    setTestData({ ...testData, location: e.target.value });
                    if (inputErrors.location) {
                      setInputErrors({ ...inputErrors, location: '' });
                    }
                  }}
                  placeholder="e.g., USA, California, New York"
                  disabled={testLoading}
                  className={`w-full px-4 py-2 border rounded-lg text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    inputErrors.location 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                />
                {inputErrors.location && (
                  <p className="text-red-500 text-xs mt-1">{inputErrors.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={runTestAcquisition}
                disabled={testLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {testLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Run Client Acquisition'
                )}
              </button>
              
              {testError && (
                <button
                  onClick={handleRetry}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Database Test Indicator */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Database Test Indicator
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Last Saved Record:</div>
                <div className="text-xs text-gray-500">
                  {lastSavedRecord ? 
                    `${new Date(lastSavedRecord.timestamp).toLocaleTimeString()} - ${lastSavedRecord.leads} leads, ${lastSavedRecord.creditsUsed} credits` :
                    'No records saved yet'
                  }
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                dbWriteStatus === 'success' ? 'bg-green-100 text-green-800' :
                dbWriteStatus === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                DB Write: {dbWriteStatus === 'success' ? 'SUCCESS' : 
                         dbWriteStatus === 'failed' ? 'FAILED' : 'IDLE'}
              </div>
            </div>
          </div>

          {/* API Response Output Panel */}
          {testResult && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  API Response
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <button
                    onClick={() => setResponseView(responseView === 'formatted' ? 'raw' : 'formatted')}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    {responseView === 'formatted' ? 'Raw JSON' : 'Formatted'}
                  </button>
                </div>
              </div>
              
              {responseView === 'formatted' ? (
                <div className="bg-white p-4 rounded border border-gray-200">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {testResult.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Credits Used:</span>
                        <span className="ml-2 text-sm">{testResult.output?.creditsUsed || 0}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Leads Generated:</span>
                        <span className="ml-2 text-sm">{testResult.output?.leadsGenerated || 0}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Execution Time:</span>
                        <span className="ml-2 text-sm">{testResult.output?.executionTime || requestTiming?.duration || 'N/A'}ms</span>
                      </div>
                    </div>
                    
                    {requestTiming && debugMode && (
                      <div className="text-xs text-gray-500 border-t pt-2">
                        Request started: {new Date(requestTiming.start).toLocaleTimeString()} | 
                        Request ended: {new Date(requestTiming.end).toLocaleTimeString()} | 
                        Duration: {requestTiming.duration}ms
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 text-gray-100 p-4 rounded border border-gray-700">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* AI Response Test Viewer */}
          {testResult && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                AI Response Test Viewer
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Response Type:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    testResult.details?.result ? 'bg-green-100 text-green-800' :
                    testResult.output?.creditsUsed === 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {testResult.details?.result ? 'Real AI' :
                     testResult.output?.creditsUsed === 0 ? 'Mock Mode' :
                     'Error'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Credits Used:</span>
                    <span className="ml-2">{testResult.output?.creditsUsed || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Execution Time:</span>
                    <span className="ml-2">{testResult.output?.executionTime || requestTiming?.duration || 'N/A'}ms</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total Items:</span>
                    <span className="ml-2">
                      {(testResult.output?.leadsGenerated || 0) + 
                       (testResult.output?.personalizedLeads || 0) + 
                       (testResult.output?.outreachMessages || 0) + 
                       (testResult.output?.offersCreated || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {testError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">API Error</div>
                  <div className="text-sm mt-1">{testError}</div>
                </div>
                <button
                  onClick={handleRetry}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Debug Console Panel */}
          {debugMode && (
            <div className="bg-gray-900 text-white rounded-lg">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full px-4 py-3 text-left font-mono text-sm flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <span>🔧 Debug Console ({debugLogs.length} logs)</span>
                <span className="flex items-center gap-2">
                  {debugLogs.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebugLogs([]);
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <span>{showDebug ? '▼' : '▶'}</span>
                </span>
              </button>
              
              {showDebug && (
                <div className="max-h-96 overflow-y-auto p-4 border-t border-gray-700">
                  {debugLogs.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-4">No logs yet...</div>
                  ) : (
                    <div className="space-y-2">
                      {debugLogs.map((log, index) => (
                        <div key={index} className="font-mono text-xs border-l-2 border-gray-700 pl-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-gray-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`font-semibold whitespace-nowrap ${
                              log.type === 'request' ? 'text-blue-400' :
                              log.type === 'response' ? 'text-green-400' :
                              log.type === 'error' ? 'text-red-400' :
                              log.type === 'timing' ? 'text-yellow-400' :
                              log.type === 'info' ? 'text-purple-400' :
                              'text-gray-400'
                            }`}>
                              {log.type.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-gray-300 mt-1 break-words">{log.message}</div>
                          {log.data && (
                            <div className="text-gray-500 mt-2 bg-gray-800 p-2 rounded overflow-x-auto">
                              <pre className="whitespace-pre-wrap text-xs">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            See It In Action
          </h2>
          <p className="text-gray-600 mb-6">
            Experience the complete client acquisition pipeline in real-time
          </p>
          <Link 
            href="/demo"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            Start Demo Now
          </Link>
        </div>
      </div>
    </main>
  )
}
