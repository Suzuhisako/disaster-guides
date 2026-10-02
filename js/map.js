/* ==========================================================================
   Evacuation Map Application Logic (Canvas Mode with Disaster Filtering)
   ========================================================================== */
if (typeof window.EvacuationMap === 'undefined') {
   const HAZARD_TRANSLATIONS = {
    zh: {
      quake: '地震',
      earthquake: '地震',
      tsunami: '海啸',
      landslide: '滑坡/泥石流',
      flood: '洪水',
      inland_flood: '内水泛滥',
      fire: '火灾',
      surge: '高潮',
      volcano: '火山噴发',
      hazard_label: '适用灾害'
    },    
    en: {
      quake: 'Earthquake',
      earthquake: 'Earthquake',
      tsunami: 'Tsunami',
      landslide: 'Landslide',
      flood: 'Flood',
      inland_flood: 'Inland Flood',
      fire: 'Fire',
      volcano: 'Volcano',
      hazard_label: 'Hazards'
    }
  };
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
      }).setView([35.6812, 139.7671], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

      // Load initial Tokyo data
      this.loadShelterData('tokyo');

      const selectEl = document.getElementById('prefectureSelect');
      if (selectEl) {
        selectEl.addEventListener('change', (e) => {
          const selectedPref = e.target.value;
          
          // Clear active user location pin when user manually switches prefecture
          if (this.userLocationLayer) {
            this.map.removeLayer(this.userLocationLayer);
            this.userLocationLayer = null;
          }

          this.loadShelterData(selectedPref);
        });
      }
    }

    /**
     * Dynamically fetches regional JSON data (e.g. kanagawa.json)
     */
     async loadShelterData(prefecture = 'tokyo') {
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

        // Auto-fit map boundaries to selected prefecture features
        if (this.shelterLayer && typeof this.shelterLayer.getBounds === 'function') {
          const bounds = this.shelterLayer.getBounds();
          if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [30, 30] });
          }
        }
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

          // --- 1. Japanese Name Ground Truth ---
         let shelterName = '';
         if (props.name && typeof props.name === 'object') {
           // Always prefer Japanese for name so it matches local signs and physical maps
           shelterName = props.jp_name || props.name['ja'] || props.name['jp'] || props.name['zh'] || props.name['en'];
         } else {
           shelterName = props.jp_name || props.name || '避難所';
         }
         
         // --- 2. Japanese Address Ground Truth ---
         let shelterAddress = '';
         if (props.address && typeof props.address === 'object') {
           // Always prefer Japanese address for navigation/asking locals
           shelterAddress = props.address['ja'] || props.address['jp'] || props.address['zh'] || props.address['en'] || '';
         } else {
           shelterAddress = props.address || '';
         }
         
         // --- 3. Localized Disaster Category Badges ---
         const HAZARD_MAP = {
           zh: {
             quake: '地震', earthquake: '地震', tsunami: '海啸',
             landslide: '滑坡/泥石流', flood: '洪水', inundation: '内水淹没',
             fire: '火灾', volcano: '火山噴发'
           },        
           en: {
             quake: 'Earthquake', earthquake: 'Earthquake', tsunami: 'Tsunami',
             landslide: 'Landslide', flood: 'Flood', inundation: 'Inundation',
             fire: 'Fire', volcano: 'Volcano'
           }
         };
         
         const activeLangMap = HAZARD_MAP[currentLang] || HAZARD_MAP['zh'];
         const disasters = props.disasters || [];
         
         const disasterBadges = disasters.map(d => {
           const cleanKey = String(d).toLowerCase().trim();
           const localizedLabel = activeLangMap[cleanKey] || d; // Translate key or fallback to raw string
           
           return `<span style="display:inline-block; background:#ffebee; color:#c62828; font-size:0.7rem; padding:2px 6px; border-radius:3px; margin-right:3px; margin-top:3px; font-weight:600;">${this.escapeHtml(localizedLabel)}</span>`;
         }).join('');
         
         const popupContent = `
           <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 180px;">
             <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 0.95rem; font-weight: bold;">📍 ${this.escapeHtml(shelterName)}</h4>
             ${shelterAddress ? `<p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #64748b; line-height: 1.3;">${this.escapeHtml(shelterAddress)}</p>` : ''}
             ${disasterBadges ? `<div style="margin-top: 4px;">${disasterBadges}</div>` : ''}
           </div>
         `;
         
         layer.bindPopup(popupContent);
        }
      }).addTo(this.map);
    }

    /**
     * Determines prefecture key based on latitude/longitude boundaries
     */
    getPrefectureFromCoords(lat, lng) {
      // Kanto Region
      if (lat >= 35.1 && lat <= 35.7 && lng >= 138.9 && lng <= 139.8) return 'kanagawa';
      if (lat >= 35.5 && lat <= 35.9 && lng >= 138.9 && lng <= 139.9) return 'tokyo';
      if (lat >= 34.8 && lat <= 36.1 && lng >= 139.7 && lng <= 140.9) return 'chiba';
      if (lat >= 35.7 && lat <= 36.3 && lng >= 138.9 && lng <= 139.9) return 'saitama';
      if (lat >= 35.8 && lat <= 36.9 && lng >= 139.8 && lng <= 140.8) return 'ibaraki';
      if (lat >= 36.2 && lat <= 37.2 && lng >= 139.3 && lng <= 140.2) return 'tochigi';
      if (lat >= 36.0 && lat <= 37.1 && lng >= 138.4 && lng <= 139.5) return 'gunma';

      // Kansai Region
      if (lat >= 34.2 && lat <= 35.1 && lng >= 135.1 && lng <= 135.8) return 'osaka';
      if (lat >= 34.7 && lat <= 35.8 && lng >= 134.8 && lng <= 136.0) return 'kyoto';
      if (lat >= 34.1 && lat <= 35.7 && lng >= 134.3 && lng <= 135.5) return 'hyogo';

      // Chubu Region
      if (lat >= 34.6 && lat <= 35.4 && lng >= 138.7 && lng <= 139.2) return 'shizuoka';
      if (lat >= 34.5 && lat <= 35.4 && lng >= 136.7 && lng <= 137.5) return 'aichi';

      return 'tokyo';
    }

    /**
     * Centers map on user device geolocation and updates shelter data
     */
    locateUser() {
     if (!this.map || !navigator.geolocation) return;
   
     navigator.geolocation.getCurrentPosition(
       async (position) => {
         const { latitude, longitude } = position.coords;
         const latlng = [latitude, longitude];
   
         // 1. Identify Prefecture
         const detectedPref = this.getPrefectureFromCoords(latitude, longitude);
   
         const selectEl = document.getElementById('prefectureSelect');
         if (selectEl && selectEl.value !== detectedPref) {
           selectEl.value = detectedPref;
         }
   
         // 2. Fetch data first
         await this.loadShelterData(detectedPref, false);
   
         // 3. Render / Update User Marker
         if (this.userLocationLayer) {
           this.map.removeLayer(this.userLocationLayer);
         }
   
         this.userLocationLayer = L.circleMarker(latlng, {
           radius: 9,
           fillColor: '#007bff',
           color: '#ffffff',
           weight: 3,
           opacity: 1,
           fillOpacity: 0.9,
           zIndexOffset: 2000,
           className: 'pulse-location-marker'
         }).addTo(this.map);
   
         // 4. Force map camera lock
         // Stop any pending view animations or pan sequences
         this.map.stop();
         
         // Force immediate view jump first, then smooth zoom
         this.map.setView(latlng, 16, { animate: false });
         this.map.invalidateSize();
   
         // Open popup after map camera has settled
         // Open popup after map camera has settled
         setTimeout(() => {
           if (this.userLocationLayer) {
             // 1. Determine current active language
             const lang = window.currentLang || (window.i18n ? window.i18n.currentLang : 'zh');
         
             // 2. Select localized popup text based on language
             const popupText = {
               'zh': '你在这里',              
               'en': 'You are here'
             }[lang] || '你在这里'; // Default fallback
         
             // 3. Bind popup with localized string
             this.userLocationLayer.bindPopup(popupText, {
               autoPan: true,
               autoPanPadding: [50, 50]
             }).openPopup();
           }
         }, 300);
       },
       (error) => {
         console.warn('Geolocation error:', error);
       },
       { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
