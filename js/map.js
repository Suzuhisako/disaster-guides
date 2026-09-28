/* ==========================================================================
   Evacuation Map Application Logic (Canvas Mode with Disaster Filtering)
   ========================================================================== */
if (typeof window.EvacuationMap === 'undefined') {
  class EvacuationMap {
    constructor() {
      this.map = null;
      this.shelterLayer = null;
      this.userLocationLayer = null;
      this.shelterData = null;
      this.selectedCategory = 'all'; // Default: show all shelters
    }

    /**
     * Initializes the Leaflet map with preferCanvas enabled
     */
    initMap(containerId = 'mapArea') {
      const mapElement = document.getElementById(containerId);
      if (!mapElement) return;

      if (this.map) {
        this.map.invalidateSize();
        return;
      }

      this.map = L.map(containerId, {
        preferCanvas: true,
        zoomControl: true,
        renderer: L.canvas({ padding: 0.5, tolerance: 10 })
      }).setView([35.3670, 139.3872], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

       // Load local Kanagawa data (~0.87MB) for fast initial rendering
        this.loadShelterData('kanagawa');
      }
    },

    /**
     * Dynamically fetches regional JSON data (e.g. kanagawa.json)
     */
    async loadShelterData(prefecture = 'kanagawa') {
      try {
        const response = await fetch(`./locators/content/prefectures/${prefecture}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        this.setShelterData(data);
      } catch (error) {
        console.error(`Failed to load shelter data for ${prefecture}:`, error);
      }
    }

    setShelterData(data) {
      this.shelterData = data;
      if (this.map) {
        this.renderShelters();
      }
    }

    /**
     * Set active disaster category filter ('all', 'quake', 'tsunami', 'flood', etc.)
     */
    filterByDisaster(category) {
      this.selectedCategory = category || 'all';
      this.renderShelters();
    }

    renderShelters() {
      const data = this.shelterData || (window.i18n ? window.i18n.shelterData : null);
      if (!data || !this.map) return;

      if (this.shelterLayer) {
        this.map.removeLayer(this.shelterLayer);
      }

      const currentLang = window.currentLang || (window.i18n ? window.i18n.currentLang : 'en');
      const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 10 });

      this.shelterLayer = L.geoJSON(data, {
        renderer: canvasRenderer,

        // --- Filter features dynamically by disaster category ---
        filter: (feature) => {
          const props = feature.properties || {};

          if (this.selectedCategory !== 'all') {
            const disasters = props.disasters || [];
            return Array.isArray(disasters) && disasters.includes(this.selectedCategory);
          }

          return true;
        },

        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: '#d9534f',
            color: '#ffffff',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.85,
            interactive: true
          });
        },

        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};

          // --- 1. Multilingual Name Resolution ---
          let shelterName = '';
          if (props.name && typeof props.name === 'object') {
            shelterName = props.name[currentLang] || props.name['en'] || props.name['zh'] || props.jp_name || props.name['jp'];
          } else {
            shelterName = props.name || props.jp_name || '避難所';
          }

          // --- 2. Multilingual Address Resolution ---
          let shelterAddress = '';
          if (props.address && typeof props.address === 'object') {
            shelterAddress = props.address[currentLang] || props.address['en'] || props.address['zh'] || props.address['jp'] || '';
          } else {
            shelterAddress = props.address || '';
          }

          // --- 3. Format Disaster Category Badges ---
          const disasters = props.disasters || [];
          const disasterBadges = disasters.map(d => 
            `<span style="display:inline-block; background:#e2e8f0; color:#334155; font-size:0.68rem; padding:2px 5px; border-radius:3px; margin-right:3px; margin-top:3px; font-weight:600;">${this.escapeHtml(d)}</span>`
          ).join('');

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 180px;">
              <h4 style="margin: 0 0 6px 0; color: #d9534f; font-size: 0.95rem; font-weight: bold;">📍 ${this.escapeHtml(shelterName)}</h4>
              ${shelterAddress ? `<p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #555; line-height: 1.3;">${this.escapeHtml(shelterAddress)}</p>` : ''}
              ${disasterBadges ? `<div style="margin-top: 4px;">${disasterBadges}</div>` : ''}
            </div>
          `;

          layer.bindPopup(popupContent);
        }
      }).addTo(this.map);
    }

    /**
     * Centers map on user device geolocation
     */
    locateUser() {
      if (!this.map || !navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const latlng = [latitude, longitude];

          if (this.userLocationLayer) {
            this.map.removeLayer(this.userLocationLayer);
          }

          this.userLocationLayer = L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#007bff',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(this.map);

          this.map.setView(latlng, 14);
        },
        (error) => {
          console.warn('Geolocation failed or permission denied:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    refreshMapSize() {
      if (this.map) {
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  window.EvacuationMap = EvacuationMap;
  window.evacuationMap = new EvacuationMap();
}
