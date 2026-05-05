// Web Worker Profile
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Profile management
// Per Step 6: Web Flows with TanStack Query

'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import QueryProvider from '@/components/QueryProvider';

const SKILLS = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance Repair',
  'Carpentry', 'Painting', 'Cleaning', 'Lock Smith',
];

const SERVICE_AREAS = [
  'District 1', 'District 2', 'District 3', 'District 4', 'District 5',
  'District 6', 'District 7', 'District 8', 'District 9', 'District 10',
  'District 11', 'District 12', 'Binh Thanh', 'Phu Nhuan', 'Go Vap',
];

export default function WebWorkerProfile() {
  return (
    <QueryProvider>
      <WorkerProfileContent />
    </QueryProvider>
  );
}

function WorkerProfileContent() {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['web-worker-profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return null;
      }

      const response = await fetch('/api/ai/worker-jobs?action=profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      return data.profile;
    },
  });

  // Initialize form when profile loads
  if (profile && skills.length === 0) {
    setSkills(profile.skills || []);
    setServiceAreas(profile.service_areas || []);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('workers')
        .update({ skills, service_areas: serviceAreas })
        .eq('user_id', session.user.id);

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button 
          onClick={() => router.push('/worker')}
          className="text-white mb-2 hover:underline"
        >
          ← Quay lại Dashboard
        </button>
        <h1 className="text-3xl font-bold">Hồ sơ thợ</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Kỹ năng</h2>
            <div className="grid grid-cols-4 gap-3">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => {
                    if (skills.includes(skill)) {
                      setSkills(skills.filter(s => s !== skill));
                    } else {
                      setSkills([...skills, skill]);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 text-sm ${
                    skills.includes(skill)
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Khu vực phục vụ</h2>
            <div className="grid grid-cols-3 gap-3">
              {SERVICE_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => {
                    if (serviceAreas.includes(area)) {
                      setServiceAreas(serviceAreas.filter(a => a !== area));
                    } else {
                      setServiceAreas([...serviceAreas, area]);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 text-sm ${
                    serviceAreas.includes(area)
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
