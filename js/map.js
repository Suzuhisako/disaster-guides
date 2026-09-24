/* ==========================================================================
   Evacuation Map Application Logic (Canvas Mode)
   ========================================================================== */
if (typeof window.EvacuationMap === 'undefined') {
  class EvacuationMap {
    constructor() {
      this.map = null;
      this.shelterLayer = null;
      this.userLocationLayer = null;
      this.shelterData = null;
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

      if (window.i18n && window.i18n.shelterData) {
        this.setShelterData(window.i18n.shelterData);
      }
    }

    setShelterData(data) {
      this.shelterData = data;
      if (this.map) {
        this.renderShelters();
      }
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
            shelterName = props.name[currentLang] || props.name['en'] || props.jp_name || props.name['jp'];
          } else {
            shelterName = props.jp_name || props.name || '避難所';
          }

          // --- 2. Multilingual Address Resolution ---
          let shelterAddress = '';
          if (props.address && typeof props.address === 'object') {
            shelterAddress = props.address[currentLang] || props.address['en'] || props.address['jp'] || '';
          } else {
            shelterAddress = props.address || '';
          }

          // --- 3. Facility Type Label Resolution ---
          let shelterType = '';
          if (props.type && typeof props.type === 'object') {
            shelterType = props.type[currentLang] || props.type['en'] || props.type['jp'] || '';
          } else if (typeof props.type === 'string') {
            shelterType = props.type;
          }

          // Multilingual Default Label
          if (!shelterType) {
            if (currentLang === 'zh') {
              shelterType = '指定紧急避难场所 (即刻避难)';
            } else if (currentLang === 'en') {
              shelterType = 'Emergency Evacuation Site (Immediate)';
            } else {
              shelterType = '指定緊急避難場所';
            }
          }

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 180px;">
              <h4 style="margin: 0 0 6px 0; color: #d9534f; font-size: 0.95rem; font-weight: bold;">📍 ${shelterName}</h4>
              ${shelterAddress ? `<p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #555; line-height: 1.3;">${shelterAddress}</p>` : ''}
              <span style="display: inline-block; background: #eef2f5; color: #475569; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${shelterType}</span>
            </div>
          `;

          layer.bindPopup(popupContent);
        }
      }).addTo(this.map);
    }

    refreshMapSize() {
      if (this.map) {
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      }
    }
  }

  window.EvacuationMap = EvacuationMap;
  window.evacuationMap = new EvacuationMap();
}