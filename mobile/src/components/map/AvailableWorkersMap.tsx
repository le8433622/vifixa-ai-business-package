import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, PermissionsAndroid, Platform, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

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
}

export default function AvailableWorkersMap({ onWorkerSelect, requiredSkills = [] }: Props) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Request location permission
        let permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setError('Permission to access location was denied');
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
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
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading available workers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Waiting for location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={location}
        showsUserLocation={true}
        userLocationAnnotationTitle={"Your Location"}
      >
        {workers.map(worker => (
          <Marker
            key={worker.id}
            coordinate={{ latitude: worker.location_lat, longitude: worker.location_lng }}
            title={worker.full_name}
            description={`${worker.skills.join(', ')} • ${worker.rating}★ (${worker.completed_jobs} việc)`}
            markerSelected={selectedWorkerId === worker.id}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{worker.full_name}</Text>
                <Text style={styles.calloutSkills}>
                  {worker.skills.map((skill, idx) => (
                    <Text key={idx} style={styles.skillTag}>#{skill}</Text>
                  ))}
                </Text>
                <View style={styles.calloutStats}>
                  <Text style={styles.statItem}>
                    <Text style={styles.statLabel}>Đánh giá:</Text>
                    <Text style={styles.statValue}>{worker.rating}/5</Text>
                  </Text>
                  <Text style={styles.statItem}>
                    <Text style={styles.statLabel}>Việc:</Text>
                    <Text style={styles.statValue}>{worker.completed_jobs}</Text>
                  </Text>
                </View>
                  {!selectedWorkerId && (
                    <View style={styles.selectButton}>
                      <Text style={styles.selectButtonText} onPress={() => {
                        setSelectedWorkerId(worker.id);
                      }}>
                        Chọn thợ này
                      </Text>
                    </View>
                  )}
                  {selectedWorkerId === worker.id && (
                    <View style={styles.confirmButton}>
                      <Text style={styles.confirmButtonText} onPress={async () => {
                        if (onWorkerSelect) {
                          onWorkerSelect(worker.id);
                        }
                        
                        // Store the selected worker in companion memory
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session) {
                            // Store worker selection in memory
                            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                user_id: session.user.id,
                                key: 'selected_worker',
                                value: JSON.stringify(worker),
                                category: 'worker_selection',
                                importance: 5
                              })
                            });
                            
                            // Also store as a learned fact for immediate use in conversation
                            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
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
                        } catch (error) {
                          console.error('Failed to store worker selection in memory:', error);
                        }
                        
                        setSelectedWorkerId(null);
                      }}>
                        Xác nhận và lưu
                      </Text>
                    </View>
                  )}
                  {selectedWorkerId === worker.id && (
                    <View style={styles.confirmButton}>
                      <Text style={styles.confirmButtonText} onPress={async () => {
                        // Store the selected worker in companion memory before confirming
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session) {
                            // Store worker selection in memory
                            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                user_id: session.user.id,
                                key: 'selected_worker',
                                value: JSON.stringify(worker),
                                category: 'worker_selection',
                                importance: 5
                              })
                            });
                            
                            // Also store as a learned fact for immediate use in conversation
                            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
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
                        } catch (error) {
                          console.error('Failed to store worker selection in memory:', error);
                        }
                        
                        setSelectedWorkerId(null);
                      }}>
                        Xác nhận
                      </Text>
                    </View>
                  )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
       {/* Worker info panel at bottom */}
       {selectedWorkerId && workers.find(w => w.id === selectedWorkerId) && (
         <View style={styles.bottomPanel}>
           <View style={styles.panelHeader}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
               <Text style={styles.panelTitle}>Thợ được chọn</Text>
               <TouchableOpacity onPress={() => setSelectedWorkerId(null)}>
                 <Text style={styles.panelClose}>✕</Text>
               </TouchableOpacity>
             </View>
           </View>
           <View style={styles.panelBody}>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Họ và tên:</Text>
               <Text style={styles.infoValue}>{workers.find(w => w.id === selectedWorkerId)?.full_name}</Text>
             </View>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Số điện thoại:</Text>
               <Text style={styles.infoValue}>{workers.find(w => w.id === selectedWorkerId)?.phone}</Text>
             </View>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Kỹ năng:</Text>
               <View style={styles.skillsContainer}>
                 {workers.find(w => w.id === selectedWorkerId)?.skills.map((skill, index) => (
                   <Text key={index} style={styles.skillTag}>#{skill}</Text>
                 ))}
               </View>
             </View>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Điểm đánh giá:</Text>
               <Text style={styles.infoValue}>{workers.find(w => w.id === selectedWorkerId)?.rating}/5</Text>
             </View>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Số công việc hoàn thành:</Text>
               <Text style={styles.infoValue}>{workers.find(w => w.id === selectedWorkerId)?.completed_jobs}</Text>
             </View>
             <View style={styles.workerInfo}>
               <Text style={styles.infoLabel}>Khoảng cách:</Text>
               {workers.find(w => w.id === selectedWorkerId) && (
                 <Text style={styles.infoValue}>
                   {haversineDistance(
                     location.latitude,
                     location.longitude,
                     workers.find(w => w.id === selectedWorkerId)?.location_lat || 0,
                     workers.find(w => w.id === selectedWorkerId)?.location_lng || 0
                   ).toFixed(1)} km
                 </Text>
               )}
             </View>
           </View>
           <View style={styles.panelActions}>
             <TouchableOpacity
               onPress={async () => {
                 if (onWorkerSelect) {
                   onWorkerSelect(selectedWorkerId);
                 }
                 
                 // Store the selected worker in companion memory
                 try {
                   const { data: { session } } = await supabase.auth.getSession();
                   if (session) {
                     // Store worker selection in memory
                     const worker = workers.find(w => w.id === selectedWorkerId);
                     if (worker) {
                       await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                           user_id: session.user.id,
                           key: 'selected_worker',
                           value: JSON.stringify(worker),
                           category: 'worker_selection',
                           importance: 5
                         })
                       });
                       
                       // Also store as a learned fact for immediate use in conversation
                       await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/api/companion/memory`, {
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
                 
                 setSelectedWorkerId(null);
               }}
               style={styles.confirmButton}
             >
               <Text style={styles.confirmButtonText}>Xác nhận và lưu lựa chọn</Text>
             </TouchableOpacity>
           </View>
         </View>
       )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#6b7280',
  },
  errorText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#dc2626',
  },
  calloutContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  calloutSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
   skillTag: {
     backgroundColor: '#eff6ff',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 12,
     fontSize: 12,
     color: '#2563eb',
   },
   skillsContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 4,
   },
   calloutStats: {
     flexDirection: 'row',
     justifyContent: 'space-between',
   },
   statItem: {
     alignItems: 'center',
   },
   statLabel: {
     fontSize: 10,
     color: '#6b7280',
   },
   statValue: {
     fontSize: 12,
     fontWeight: '600',
     color: '#111827',
   },
   confirmButton: {
     backgroundColor: '#10b981',
     paddingVertical: 12,
     borderRadius: 8,
     alignItems: 'center',
   },
   confirmButtonText: {
     color: 'white',
     fontSize: 16,
     fontWeight: '600',
     textAlign: 'center',
   },
  selectButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    maxHeight: '50%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  panelClose: {
    fontSize: 20,
    color: '#9ca3af',
  },
  panelBody: {
    marginBottom: 16,
  },
  workerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  panelActions: {
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});