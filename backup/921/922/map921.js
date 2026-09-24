/**
 * EvacuationMap
 * Renders offline GeoJSON shelter data directly onto Leaflet canvas.
 */
if (typeof window.EvacuationMap === 'undefined') {
  class EvacuationMap {
    constructor() {
      this.map = null;
      this.geoJsonLayer = null;
      this.userMarker = null;
      this.geoJsonData = null;
      this.isInitialized = false;
    }

    /**
     * Initializes Leaflet map and loads bundled GeoJSON shelter data.
     */
    async initMap() {
      const mapContainer = document.getElementById('mapArea');
      if (!mapContainer || this.isInitialized) return;

      // Fallback if Leaflet script didn't load
      if (typeof L === 'undefined') {
        await this.loadGeoJsonData();
        this.renderOfflineListFallback();
        return;
      }

      try {
        // 1. Initialize map with canvas preference
        this.map = L.map('mapArea', {
          preferCanvas: true
        }).setView([35.3670, 139.3872], 13);

        // 2. OpenStreetMap Tiles with GSI Attribution
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Data: <a href="https://www.gsi.go.jp/" target="_blank">国土地理院 (GSI)</a>'
        }).addTo(this.map);

        // 3. Load shelter data through your centralized method
        await this.loadGeoJsonData();

        // 4. Render clustered shelters if data is available
        if (this.shelterData && this.shelterData.features && this.shelterData.features.length > 0) {
          const hasClusterPlugin = typeof L.markerClusterGroup === 'function';

          // Fallback to standard L.layerGroup if L.markerClusterGroup is missing
          const markers = hasClusterPlugin 
            ? L.markerClusterGroup({
                chunkedLoading: true,
                chunkInterval: 100,
                chunkDelay: 10
              })
            : L.layerGroup();

          if (!hasClusterPlugin) {
            console.warn('[Map Warning] L.markerClusterGroup script is missing or failed to load. Falling back to standard LayerGroup.');
          }

          const batchSize = 200;
          const features = this.shelterData.features;
          let index = 0;
          let hasFittedBounds = false;

          const processBatch = () => {
            const chunk = features.slice(index, index + batchSize);
            if (chunk.length === 0) return;

            const tempLayer = L.geoJSON({ type: 'FeatureCollection', features: chunk }, {
              onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const currentLang = window.currentLang || 'en';
                
                const name = props.name ? (props.name[currentLang] || props.jp_name) : props.jp_name;
                const type = props.type ? (props.type[currentLang] || props.type.en) : '';

                layer.bindPopup(`
                  <div style="font-family: sans-serif;">
                    <h4 style="margin: 0 0 6px 0; color: #d9534f;">📍 ${name}</h4>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><strong>Type:</strong> ${type}</p>
                    <p style="margin: 0; font-size: 0.8rem; color: #666;">${props.address || ''}</p>
                  </div>
                `);
              }
            });

            markers.addLayer(tempLayer);
            index += batchSize;

            // Auto-fit bounds on the first processed batch so shelters instantly become visible
            if (!hasFittedBounds) {
              const bounds = tempLayer.getBounds();
              if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
                hasFittedBounds = true;
              }
            }

            if (index < features.length) {
              setTimeout(processBatch, 10);
            }
          };

          this.map.addLayer(markers);
          processBatch();
        }

        this.isInitialized = true;
        this.locateUser();

      } catch (e) {
        console.warn('Map initialization issue, displaying list fallback:', e);
        await this.loadGeoJsonData();
        this.renderOfflineListFallback();
      }
    }

    /**
     * Fetches local offline GeoJSON data file from locators/content/
     */
      async loadGeoJsonData() {
        if (this.shelterData) return this.shelterData; // Return cached in memory
        try {
          const response = await fetch('./locators/content/shelters.json');
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          this.shelterData = await response.json();
          return this.shelterData;
        } catch (error) {
          console.error('[Data Error] Could not load shelter GeoJSON:', error);
          return null;
        }
      }

    /**
     * Renders GeoJSON vector features onto Leaflet map
     */
    renderGeoJsonShelters() {
      if (!this.map || !this.geoJsonData) return;

      const currentLang = window.i18n ? window.i18n.currentLang : 'en';

      // Clear previous vector layer if re-rendering language change
      if (this.geoJsonLayer) {
        this.map.removeLayer(this.geoJsonLayer);
      }

      this.geoJsonLayer = L.geoJSON(this.geoJsonData, {
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const name = (props.name && props.name[currentLang]) || props.name.en || props.jp_name;
          const type = (props.type && props.type[currentLang]) || props.type.en;

          const popupContent = `
            <div style="padding: 4px; min-width: 180px;">
              <strong style="font-size:0.95rem; color:#d9534f;">📍 ${name}</strong><br/>
              <span style="font-size:0.85rem; font-weight:600; color:#212529;">${props.jp_name}</span><br/>
              <small style="color:#6c757d;">${type}</small>
            </div>
          `;

          layer.bindPopup(popupContent);
        }
      }).addTo(this.map);
    }

    /**
     * Fallback renderer when map tiles or Leaflet libraries are unavailable
     */
    renderOfflineListFallback() {
      const mapContainer = document.getElementById('mapArea');
      if (!mapContainer || !this.geoJsonData) return;

      const currentLang = window.i18n ? window.i18n.currentLang : 'en';

      const listHTML = this.geoJsonData.features.map(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;
        const name = (props.name && props.name[currentLang]) || props.name.en;
        const type = (props.type && props.type[currentLang]) || props.type.en;

        return `
          <div style="background:#fff; border:1px solid #e9ecef; border-left:4px solid #d9534f; padding:12px; margin-bottom:10px; border-radius:6px;">
            <strong style="font-size:1rem; color:#212529;">📍 ${name}</strong><br/>
            <span style="font-size:0.85rem; color:#495057; font-weight:600;">${props.jp_name}</span>
            <p style="font-size:0.85rem; color:#6c757d; margin:4px 0 0 0;">${type}</p>
            <p style="font-size:0.8rem; color:#007bff; margin:4px 0 0 0;">GPS: ${coords[1]}, ${coords[0]}</p>
          </div>
        `;
      }).join('');

      mapContainer.innerHTML = `
        <div style="padding: 10px;">
          <p style="font-weight:bold; color:#d9534f; margin-bottom:10px;">
            ⚠️ Offline Mode: Showing local evacuation shelter vector data
          </p>
          ${listHTML}
        </div>
      `;
    }

    locateUser() {
      if (!navigator.geolocation || !this.map) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          if (this.userMarker) {
            this.userMarker.setLatLng([userLat, userLng]);
          } else {
            this.userMarker = L.circleMarker([userLat, userLng], {
              radius: 8,
              fillColor: '#007bff',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.9
            }).addTo(this.map);
          }

          this.map.setView([userLat, userLng], 14);
        },
        (err) => console.warn('Geolocation unavailable:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    refreshLanguage() {
      if (this.isInitialized) {
        this.renderGeoJsonShelters();
      } else {
        this.renderOfflineListFallback();
      }
    }

    invalidateSize() {
      if (this.map) {
        setTimeout(() => this.map.invalidateSize(), 150);
      }
    }
  }

  window.evacuationMap = new EvacuationMap();
}