'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

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
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Lead Generation</h3>
            <p className="text-sm text-gray-600">AI-powered lead identification and qualification</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 bg-green-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Personalization</h3>
            <p className="text-sm text-gray-600">Tailored messaging for each prospect</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 bg-purple-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Outreach Automation</h3>
            <p className="text-sm text-gray-600">Automated campaign execution</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 bg-orange-600 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Pipeline Management</h3>
            <p className="text-sm text-gray-600">Complete client acquisition tracking</p>
          </div>
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
