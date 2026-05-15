import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
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

interface Job {
  id: string;
  category: string;
  description: string;
  status: string;
  estimated_price: number;
  location_lat: number;
  location_lng: number;
  created_at: string;
}

interface Props {
  onJobPress?: (jobId: string) => void;
}

export default function WorkerMap({ onJobPress }: Props) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch jobs from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Unauthorized');
          return;
        }

        const { data: jobsData, error: jobsError } = await supabase
          .from('orders')
          .select('id, category, description, status, estimated_price, location_lat, location_lng, created_at')
          .in('status', ['pending', 'matched', 'in_progress'])
          .order('created_at', { ascending: false });

        if (jobsError) {
          throw jobsError;
        }

        // Filter jobs within 20km radius
        const filteredJobs = (jobsData || []).filter(job => {
          if (!job.location_lat || !job.location_lng) return false;
          const distance = haversineDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            job.location_lat,
            job.location_lng
          );
          return distance <= 20; // 20km radius
        });

        setJobs(filteredJobs);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading map...</Text>
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
        {jobs.map(job => (
          <Marker
            key={job.id}
            coordinate={{ latitude: job.location_lat, longitude: job.location_lng }}
            title={job.category}
            description={job.description}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{job.category}</Text>
                <Text style={styles.calloutDescription}>{job.description}</Text>
                <Text style={styles.calloutPrice}>Est. ${job.estimated_price}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
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
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  calloutPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});