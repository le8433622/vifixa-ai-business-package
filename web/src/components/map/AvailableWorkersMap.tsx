'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DynamicMapView from './DynamicMapView'

// Haversine formula to calculate distance between two points in kilometers
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Worker {
  id: string;
  full_name: string;
  phone: string;
  skills: string[];
  rating: number;
  completed_jobs: number;
  location_lat: number;
  location_lng: number;
  is_verified: boolean;
}

interface Props {
  onWorkerSelect?: (workerId: string) => void;
  requiredSkills?: string[]; // Filter workers by these skills
  className?: string;
}

export default function AvailableWorkersMap({ 
  onWorkerSelect, 
  requiredSkills = [], 
  className = '' 
}: Props) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Get user's location using Geolocation API
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by your browser');
          return;
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        // Fetch verified workers from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Unauthorized');
          return;
        }

        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('id, profiles(full_name, phone), skills, rating, completed_jobs, location_lat, location_lng, is_verified')
          .eq('is_verified', true);

        if (workersError) {
          throw workersError;
        }

        // Process worker data
        const processedWorkers = (workersData || []).map(worker => ({
          id: worker.id,
          full_name: (worker.profiles?.[0] as any)?.full_name || `Worker ${worker.id}`,
          phone: (worker.profiles?.[0] as any)?.phone || '',
          skills: worker.skills || [],
          rating: worker.rating || 0,
          completed_jobs: worker.completed_jobs || 0,
          location_lat: worker.location_lat || 0,
          location_lng: worker.location_lng || 0,
          is_verified: worker.is_verified || false,
        }));

        // Filter workers by required skills if provided
        let filteredWorkers = processedWorkers;
        if (requiredSkills && requiredSkills.length > 0) {
          filteredWorkers = processedWorkers.filter(worker => 
            requiredSkills.some(skill => 
              worker.skills.some(workerSkill => 
                workerSkill.toLowerCase().includes(skill.toLowerCase())
              )
            )
          );
        }

        // Filter workers within 20km radius
        const radiusFilteredWorkers = filteredWorkers.filter(worker => {
          if (!worker.location_lat || !worker.location_lng) return false;
          const distance = haversineDistance(
            position.coords.latitude,
            position.coords.longitude,
            worker.location_lat,
            worker.location_lng
          );
          return distance <= 20; // 20km radius
        });

        setWorkers(radiusFilteredWorkers);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
        console.error('AvailableWorkersMap error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [requiredSkills]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-500">Đang tải danh sách thợ verfügable...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="flex flex-col items-center">
          <div className="text-red-500 mb-4">Lỗi: {error}</div>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="flex flex-col items-center">
          <p className="text-gray-500">Đang lấy vị trí của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map */}
      <DynamicMapView
        center={[location.latitude, location.longitude]}
        zoom={13}
        markers={workers.map(worker => ({
          position: [worker.location_lat, worker.location_lng],
          title: worker.full_name,
          onClick: () => {
            setSelectedWorkerId(worker.id);
            if (onWorkerSelect) {
              onWorkerSelect(worker.id);
            }
          }
        }))}
        style={{ height: '100%', width: '100%' }}
      />
      
      {/* Worker info panel */}
        {selectedWorkerId && workers.find(w => w.id === selectedWorkerId) && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg max-w-[300px] p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{workers.find(w => w.id === selectedWorkerId)?.full_name}</h3>
                <p className="text-sm text-gray-500">
                  {workers.find(w => w.id === selectedWorkerId)?.rating}/5 • 
                  {workers.find(w => w.id === selectedWorkerId)?.completed_jobs} jobs
                </p>
              </div>
              <button 
                onClick={() => setSelectedWorkerId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Số điện thoại:</span>
                <span className="font-medium">{workers.find(w => w.id === selectedWorkerId)?.phone}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Kỹ năng:</span>
                <div className="flex flex-wrap gap-1">
                  {workers.find(w => w.id === selectedWorkerId)?.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded">
                      #{skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Khoảng cách:</span>
                {workers.find(w => w.id === selectedWorkerId) && (
                  <span className="font-medium text-emerald-600">
                    {haversineDistance(
                      location.latitude,
                      location.longitude,
                      workers.find(w => w.id === selectedWorkerId)?.location_lat || 0,
                      workers.find(w => w.id === selectedWorkerId)?.location_lng || 0
                    ).toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t">
              <button 
                onClick={async () => {
                  if (onWorkerSelect) {
                    // Call the selection callback first
                    onWorkerSelect(selectedWorkerId);
                    
                    // Then store the selected worker in companion memory
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session) {
                        // Store worker selection in memory
                        const worker = workers.find(w => w.id === selectedWorkerId);
                        if (worker) {
                          await fetch(`/api/companion/memory`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              user_id: session.user.id,
                              key: 'selected_worker',
                              value: JSON.stringify({
                                id: worker.id,
                                full_name: worker.full_name,
                                phone: worker.phone,
                                skills: worker.skills,
                                rating: worker.rating,
                                location_lat: worker.location_lat,
                                location_lng: worker.location_lng
                              }),
                              category: 'worker_selection',
                              importance: 5
                            })
                          });
                          
                          // Also store as a learned fact for immediate use in conversation
                          await fetch(`/api/companion/memory`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              user_id: session.user.id,
                              key: 'last_selected_worker',
                              value: worker.full_name,
                              category: 'ai_learned',
                              importance: 4
                            })
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Failed to store worker selection in memory:', error);
                    }
                  }
                  setSelectedWorkerId(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Xác nhận và lưu lựa chọn
              </button>
            </div>
          </div>
        )}
    </div>
  );
}