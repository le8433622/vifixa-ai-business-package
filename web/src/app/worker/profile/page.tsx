// Worker Profile
// Per 05_PRODUCT_SOLUTION.md - Worker flow: Profile management with ID upload
// Per Step 7: Trust & Quality - Verification flow

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const SKILLS = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance Repair',
  'Carpentry', 'Painting', 'Cleaning', 'Lock Smith',
];

const SERVICE_AREAS = [
  'District 1', 'District 2', 'District 3', 'District 4', 'District 5',
  'District 6', 'District 7', 'District 8', 'District 9', 'District 10',
  'District 11', 'District 12', 'Binh Thanh', 'Phu Nhuan', 'Go Vap',
];

interface WorkerProfile {
  user_id: string;
  skills: string[];
  service_areas: string[];
  is_verified: boolean;
  trust_score: number;
  avg_earnings: number;
  profiles?: { email: string; phone?: string };
}

export default function WebWorkerProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      return data.profile as WorkerProfile;
    },
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update local state when profile loads
  useState(() => {
    if (profile) {
      setSkills(profile.skills || []);
      setServiceAreas(profile.service_areas || []);
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['web-worker-profile'] });
      alert('Profile updated successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadIDDocument() {
    setUploading(true);
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = `id-${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('worker-documents')
          .upload(fileName, file);

        if (error) throw error;
        alert('ID document uploaded! Admin will review for verification.');
      };
      input.click();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleArea = (area: string) => {
    setServiceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => router.push('/worker')}
          className="text-blue-600 hover:underline mb-6"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-6">Worker Profile</h1>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold">{profile?.profiles?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-semibold">{profile?.profiles?.phone || 'No phone'}</p>
            </div>
          </div>

          {/* Verification Status */}
          <div className="mt-6 p-4 rounded bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Verification Status</p>
                <p className="text-sm text-gray-600 mt-1">
                  Upload your ID document for verification
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                profile?.is_verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {profile?.is_verified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
            <button
              onClick={uploadIDDocument}
              disabled={uploading}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Upload ID Document'}
            </button>
          </div>
        </div>

        {/* Trust Score */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trust Score</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600">
              {profile?.trust_score || 50}
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${profile?.trust_score ?? 50}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {profile?.trust_score && profile.trust_score >= 80 ? 'Excellent! High trust.' :
                 profile?.trust_score && profile.trust_score >= 60 ? 'Good standing.' :
                 'Improve by completing more jobs and getting positive reviews.'}
              </p>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Skills</h2>
          <div className="grid grid-cols-4 gap-2">
            {SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-2 rounded border ${
                  skills.includes(skill)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Service Areas</h2>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className={`px-3 py-2 rounded border text-sm ${
                  serviceAreas.includes(area)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Average Earnings</p>
              <p className="text-2xl font-bold text-green-600">${profile?.avg_earnings || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trust Score</p>
              <p className="text-2xl font-bold text-blue-600">{profile?.trust_score || 50}</p>
            </div>
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
