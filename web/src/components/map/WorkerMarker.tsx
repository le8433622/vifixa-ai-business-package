import { Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

interface WorkerMarkerProps {
  worker: {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    rating: number;
    avatar?: string;
  };
  onClick?: (workerId: string) => void;
  isSelected?: boolean;
}

export default function WorkerMarker({ worker, onClick, isSelected = false }: WorkerMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (!worker.location) return;

    const marker = new L.Marker([worker.location.lat, worker.location.lng], {
      icon: isSelected
        ? new L.Icon({
            iconUrl: '/worker-marker-selected.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: '/worker-marker-shadow.png',
            shadowSize: [41, 41]
          })
        : new L.Icon({
            iconUrl: '/worker-marker.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: '/worker-marker-shadow.png',
            shadowSize: [41, 41]
          })
    });

    marker.bindPopup(
      `<div className="worker-popup">
         <img src="${worker.avatar || '/default-avatar.png'}" alt="${worker.name}" className="worker-avatar" />
         <div className="worker-info">
           <h3>${worker.name}</h3>
           <p>Rating: ${worker.rating}/5</p>
           <button onClick={() => onClick?.(worker.id)}>Xem profile</button>
         </div>
       </div>`
    ).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [worker, onClick, isSelected]);

  return null;
}