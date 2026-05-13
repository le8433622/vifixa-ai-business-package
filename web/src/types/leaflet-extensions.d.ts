import 'leaflet'

declare module 'leaflet' {
  interface DrawOptions {
    edit?: { featureGroup: L.FeatureGroup }
    draw?: {
      polygon?: Record<string, unknown>
      polyline?: false
      rectangle?: false
      circle?: false
      circlemarker?: false
      marker?: false
    }
  }

  namespace Control {
    class Draw extends Control {
      constructor(options?: DrawOptions)
    }
  }

  namespace Draw {
    namespace Event {
      const CREATED: string
      const EDITED: string
      const DELETED: string
    }
  }

  interface MarkerClusterGroup extends L.LayerGroup {
    addLayers(layers: L.Layer[]): void
  }

  function markerClusterGroup(options?: Record<string, unknown>): MarkerClusterGroup
}

declare module 'leaflet-draw' {}
declare module 'leaflet.markercluster' {}
