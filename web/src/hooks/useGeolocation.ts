import { useEffect, useState } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      })
      return
    }

    let isMounted = true

    const setLoadingState = () => {
      if (isMounted) {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
      }
    }

    const success = (pos: GeolocationPosition) => {
      if (isMounted) {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          error: null,
          isLoading: false,
        })
      }
    }

    const error = (err: GeolocationPositionError) => {
      if (isMounted) {
        setState({
          latitude: null,
          longitude: null,
          error: err.message,
          isLoading: false,
        })
      }
    }

    setLoadingState()
    const id = navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })

    return () => {
      isMounted = false
      // Note: There's no way to cancel getCurrentPosition, but we can ignore the result if unmounted
    }
  }, [])

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    error: state.error,
    isLoading: state.isLoading,
  }
}