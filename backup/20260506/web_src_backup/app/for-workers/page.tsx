// For Workers Landing Page
// Per 05_PRODUCT_SOLUTION.md - For workers page
// Per Step 3: Build web app

'use client';

import { useRouter } from 'next/navigation';

export default function ForWorkers() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Vifixa AI</h1>
          <button
            onClick={() => router.push('/login')}
            className="text-gray-600 hover:text-gray-900"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">Earn Money as a Service Professional</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join Vifixa AI as a verified worker. Get matched with customers using our AI technology.
        </p>
        <button
          onClick={() => router.push('/register?role=worker')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700"
        >
          Start Working Today
        </button>
      </section>

      {/* Benefits */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Why Work with Vifixa AI?</h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">AI-Powered Matching</h4>
              <p className="text-gray-600">Get matched with jobs that fit your skills and location.</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Transparent Pricing</h4>
              <p className="text-gray-600">Know your earnings upfront with AI-generated price estimates.</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Build Trust Score</h4>
              <p className="text-gray-600">Grow your reputation with our dynamic trust score system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">How to Join</h3>
          <div className="grid grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Register', desc: 'Create your worker account' },
              { step: 2, title: 'Verify', desc: 'Submit documents and get verified' },
              { step: 3, title: 'Set Profile', desc: 'Add skills and service areas' },
              { step: 4, title: 'Start Earning', desc: 'Accept jobs and get paid' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Ready to Start Earning?</h3>
          <button
            onClick={() => router.push('/register?role=worker')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg hover:bg-gray-100"
          >
            Register as Worker
          </button>
        </div>
      </section>
    </div>
  );
}
