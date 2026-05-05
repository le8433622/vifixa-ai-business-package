// Landing Page
// Per 05_PRODUCT_SOLUTION.md - Public landing page
// Per Step 3: Build web app

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get user role
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUser({ ...session.user, role: data?.role });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Vifixa AI</h1>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                {user.role === 'customer' && (
                  <button onClick={() => router.push('/customer')} className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </button>
                )}
                {user.role === 'worker' && (
                  <button onClick={() => router.push('/worker')} className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </button>
                )}
                {user.role === 'admin' && (
                  <button onClick={() => router.push('/admin')} className="text-gray-600 hover:text-gray-900">
                    Admin
                  </button>
                )}
                <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/login')} className="text-gray-600 hover:text-gray-900">
                  Login
                </button>
                <button onClick={() => router.push('/register')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">AI-Powered Home Services</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get instant AI diagnosis, transparent pricing, and trusted professionals for all your home service needs.
        </p>
        {user ? (
          <button
            onClick={() => {
              if (user.role === 'customer') router.push('/customer/service-request');
              else if (user.role === 'worker') router.push('/worker');
              else router.push('/admin');
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700"
          >
            {user.role === 'customer' ? 'Create Service Request' :
             user.role === 'worker' ? 'View Jobs' : 'Admin Dashboard'}
          </button>
        ) : (
          <div className="flex gap-4 justify-center">
            <button onClick={() => router.push('/register?role=customer')} className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700">
              Get Started
            </button>
            <button onClick={() => router.push('/for-workers')} className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg text-lg hover:bg-gray-300">
              Become a Worker
            </button>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Describe Your Problem</h4>
              <p className="text-gray-600">Tell us what's wrong or upload photos for AI diagnosis.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Get AI Diagnosis</h4>
              <p className="text-gray-600">Our AI analyzes your issue and provides instant diagnosis and pricing.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Book a Professional</h4>
              <p className="text-gray-600">Get matched with verified workers and track your service in real-time.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
