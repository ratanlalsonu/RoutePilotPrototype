export type SupportedLanguage = 'en' | 'hi';

export interface Translations {
  // Common & Navigation
  appTitle: string;
  adminMode: string;
  driverMode: string;
  commandCenter: string;
  driverNav: string;
  systemOnline: string;
  databaseConnected: string;
  gpsConnected: string;
  satelliteMode: string;
  standardMode: string;
  settings: string;
  notifications: string;
  emergencySos: string;
  languageName: string;
  toggleLanguage: string;

  // Notification center
  notificationsTitle: string;
  activeHazardsCount: string;
  markAllRead: string;
  noNotifications: string;
  allClearNotice: string;
  viewAllHazards: string;
  viewSystemLogs: string;
  criticalSeverity: string;
  warningSeverity: string;
  bridgeHazard: string;
  roadHazard: string;
  recentReroute: string;
  dismiss: string;

  // Admin Sidebar Tabs
  tabDashboard: string;
  tabLiveMap: string;
  tabHazards: string;
  tabSensors: string;
  tabDrivers: string;
  tabRoadStatus: string;
  tabAlgorithm: string;
  tabRouteEvents: string;
  tabSystemLogs: string;
  tabAnalytics: string;
  tabSettings: string;

  // Admin Dashboard Overview Cards & Actions
  activeHazards: string;
  sensorNodesOnline: string;
  roadsBlocked: string;
  rerouteSuccessRate: string;
  structuralBridgeHealth: string;
  addHazardButton: string;
  quickTestHazardOnRoute: string;
  quickTestHazardAway: string;
  quickTestSecondHazard: string;
  demoShortcuts: string;

  // Driver Cockpit
  driverCockpit: string;
  navigating: string;
  standby: string;
  searchPlaceholder: string;
  searchingLocations: string;
  startPoint: string;
  destinationPoint: string;
  vehicleProfile: string;
  speedSimulation: string;
  startNavigation: string;
  stopNavigation: string;
  pauseNavigation: string;
  resumeNavigation: string;
  recalculating: string;
  hazardDetectedAhead: string;
  switchRouteNotice: string;
  safeRouteRecommended: string;
  reportHazardButton: string;
  voiceAlerts: string;
  voiceEnabled: string;
  voiceMuted: string;
  eta: string;
  remainingDistance: string;
  currentSpeed: string;
  progress: string;

  // Driver Bottom Bar
  navHome: string;
  navMap: string;
  navRoute: string;
  navAlerts: string;
  navMore: string;

  // Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  languageSelectLabel: string;
  voiceAlertsLabel: string;
  voiceAlertsSub: string;
  sensorModeLabel: string;
  sensorModeVirtual: string;
  sensorModeHardware: string;
  purgeButton: string;
  purgeSuccess: string;
  saveButton: string;
  savedSuccess: string;
  cancelButton: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appTitle: 'RoutePilot',
    adminMode: 'Admin Mode',
    driverMode: 'Driver Mode',
    commandCenter: 'Command Center',
    driverNav: 'Driver Navigation',
    systemOnline: 'System Online',
    databaseConnected: 'Database Connected',
    gpsConnected: 'GPS Connected',
    satelliteMode: '🛰️ Satellite',
    standardMode: '🗺️ Standard',
    settings: 'Settings',
    notifications: 'Notifications',
    emergencySos: 'SOS',
    languageName: 'English',
    toggleLanguage: 'हिन्दी',

    notificationsTitle: 'Alerts & Notifications',
    activeHazardsCount: 'Active Hazards',
    markAllRead: 'Mark all as read',
    noNotifications: 'No active notifications',
    allClearNotice: 'All bridges and road corridors are operating safely.',
    viewAllHazards: 'View All Hazards',
    viewSystemLogs: 'View System Logs',
    criticalSeverity: 'CRITICAL',
    warningSeverity: 'WARNING',
    bridgeHazard: 'Bridge Hazard',
    roadHazard: 'Road Obstruction',
    recentReroute: 'Automated Route Diversion',
    dismiss: 'Dismiss',

    tabDashboard: 'Dashboard',
    tabLiveMap: 'Live Map',
    tabHazards: 'Hazards',
    tabSensors: 'Sensor Nodes',
    tabDrivers: 'Active Drivers',
    tabRoadStatus: 'Road Status',
    tabAlgorithm: 'A* Algorithm',
    tabRouteEvents: 'Route Events',
    tabSystemLogs: 'System Logs',
    tabAnalytics: 'Analytics',
    tabSettings: 'Settings',

    activeHazards: 'Active Hazards',
    sensorNodesOnline: 'Sensor Nodes',
    roadsBlocked: 'Roads Blocked',
    rerouteSuccessRate: 'Reroute Rate',
    structuralBridgeHealth: 'Bridge Health',
    addHazardButton: '+ Add New Hazard',
    quickTestHazardOnRoute: 'Trigger Hazard on Route (Civil Lines Bridge)',
    quickTestHazardAway: 'Trigger Hazard Away from Route',
    quickTestSecondHazard: 'Trigger 2nd Hazard Ahead (Repeated Reroute)',
    demoShortcuts: 'Quick Test Scenarios & Faculty Shortcuts',

    driverCockpit: 'Driver Cockpit',
    navigating: 'Navigating',
    standby: 'Standby',
    searchPlaceholder: 'Search any place in Jhansi, Delhi, Highway...',
    searchingLocations: 'Searching live locations...',
    startPoint: 'Current Location',
    destinationPoint: 'Destination',
    vehicleProfile: 'Vehicle Type',
    speedSimulation: 'Simulation Speed',
    startNavigation: 'Start Smart Navigation',
    stopNavigation: 'End Navigation',
    pauseNavigation: 'Pause Simulation',
    resumeNavigation: 'Resume Simulation',
    recalculating: 'Recalculating Safe Route...',
    hazardDetectedAhead: 'CRITICAL HAZARD DETECTED AHEAD',
    switchRouteNotice: 'Intelligent alternative routes generated. Follow green path.',
    safeRouteRecommended: 'Optimal Safe Detour',
    reportHazardButton: 'Report Hazard',
    voiceAlerts: 'Voice Guidance',
    voiceEnabled: 'Voice: Enabled',
    voiceMuted: 'Voice: Muted',
    eta: 'ETA',
    remainingDistance: 'Distance Remaining',
    currentSpeed: 'Current Speed',
    progress: 'Trip Progress',

    navHome: 'Home',
    navMap: 'Map',
    navRoute: 'Route',
    navAlerts: 'Alerts',
    navMore: 'Settings',

    settingsTitle: 'RoutePilot Configuration',
    settingsSubtitle: 'System settings, language, voice and sensors',
    languageSelectLabel: 'UI & Voice Navigation Language',
    voiceAlertsLabel: 'Text-to-Speech Spoken Alerts',
    voiceAlertsSub: 'Real-time voice warnings when hazards are detected',
    sensorModeLabel: 'Sensor Data Stream Mode',
    sensorModeVirtual: 'Virtual Simulation (Auto-fluctuating)',
    sensorModeHardware: 'Hardware IoT Nodes (ESP32 / MQTT / HTTP)',
    purgeButton: 'Purge Cache & Enforce Zero-Dummy State',
    purgeSuccess: '✓ Reset to Clean Baseline!',
    saveButton: 'Save Configuration',
    savedSuccess: '✓ Configuration Saved!',
    cancelButton: 'Cancel',
  },

  hi: {
    appTitle: 'रूटपायलट',
    adminMode: 'एडमिन मोड',
    driverMode: 'ड्राइवर मोड',
    commandCenter: 'कमांड सेंटर',
    driverNav: 'ड्राइवर नेविगेशन',
    systemOnline: 'सिस्टम ऑनलाइन',
    databaseConnected: 'डेटाबेस कनेक्टेड',
    gpsConnected: 'जीपीएस कनेक्टेड',
    satelliteMode: '🛰️ सैटेलाइट',
    standardMode: '🗺️ मानक मैप',
    settings: 'सेटिंग्स',
    notifications: 'सूचनाएं',
    emergencySos: 'आपातकालीन SOS',
    languageName: 'हिन्दी',
    toggleLanguage: 'English',

    notificationsTitle: 'अलर्ट और सूचनाएं',
    activeHazardsCount: 'सक्रिय खतरे',
    markAllRead: 'सभी पढ़े हुए करें',
    noNotifications: 'कोई सक्रिय सूचना नहीं है',
    allClearNotice: 'सभी पुल और सड़क गलियारे सामान्य रूप से सुरक्षित चल रहे हैं।',
    viewAllHazards: 'सभी खतरे देखें',
    viewSystemLogs: 'सिस्टम लॉग्स देखें',
    criticalSeverity: 'गंभीर',
    warningSeverity: 'चेतावनी',
    bridgeHazard: 'पुल पर खतरा / क्षति',
    roadHazard: 'सड़क अवरोध',
    recentReroute: 'स्वचालित मार्ग डायवर्जन',
    dismiss: 'हटाएं',

    tabDashboard: 'डैशबोर्ड',
    tabLiveMap: 'लाइव मैप',
    tabHazards: 'सड़क/पुल खतरे',
    tabSensors: 'सेंसर नोड्स',
    tabDrivers: 'सक्रिय ड्राइवर',
    tabRoadStatus: 'सड़क स्थिति',
    tabAlgorithm: 'A* एल्गोरिदम',
    tabRouteEvents: 'मार्ग घटनाक्रम',
    tabSystemLogs: 'सिस्टम लॉग्स',
    tabAnalytics: 'एनालिटिक्स',
    tabSettings: 'सेटिंग्स',

    activeHazards: 'सक्रिय खतरे',
    sensorNodesOnline: 'सेंसर नोड्स ऑनलाइन',
    roadsBlocked: 'अवरुद्ध सड़कें',
    rerouteSuccessRate: 'डायवर्जन सफलता दर',
    structuralBridgeHealth: 'पुल संरचनात्मक स्वास्थ्य',
    addHazardButton: '+ नया खतरा दर्ज करें',
    quickTestHazardOnRoute: 'मार्ग पर तुरंत खतरा बनाएं (सिविल लाइन्स ब्रिज)',
    quickTestHazardAway: 'मार्ग से दूर परीक्षण खतरा बनाएं',
    quickTestSecondHazard: 'आगे दूसरा खतरा बनाएं (पुनः डायवर्जन परीक्षण)',
    demoShortcuts: 'त्वरित परीक्षण परिदृश्य व शॉर्टकट्स',

    driverCockpit: 'ड्राइवर कॉकपिट',
    navigating: 'नेविगेशन चालू',
    standby: 'स्टैंडबाय',
    searchPlaceholder: 'झांसी, ग्वालियर, दिल्ली या कोई भी स्थान खोजें...',
    searchingLocations: 'स्थान की खोज जारी है...',
    startPoint: 'वर्तमान स्थान',
    destinationPoint: 'गंतव्य',
    vehicleProfile: 'वाहन का प्रकार',
    speedSimulation: 'सिमुलेशन गति',
    startNavigation: 'स्मार्ट नेविगेशन शुरू करें',
    stopNavigation: 'नेविगेशन समाप्त करें',
    pauseNavigation: 'सिमुलेशन रोकें',
    resumeNavigation: 'सिमुलेशन जारी रखें',
    recalculating: 'सुरक्षित वैकल्पिक मार्ग तैयार हो रहा है...',
    hazardDetectedAhead: 'सावधान! आगे मार्ग पर गंभीर खतरा पाया गया',
    switchRouteNotice: 'नया सुरक्षित मार्ग तैयार है। हरे रंग के मार्ग का पालन करें।',
    safeRouteRecommended: 'सर्वश्रेष्ठ सुरक्षित मार्ग',
    reportHazardButton: 'खतरे की रिपोर्ट करें',
    voiceAlerts: 'ध्वनि मार्गदर्शन',
    voiceEnabled: 'ध्वनि: चालू',
    voiceMuted: 'ध्वनि: म्यूट',
    eta: 'अनुमानित समय (ETA)',
    remainingDistance: 'शेष दूरी',
    currentSpeed: 'वर्तमान गति',
    progress: 'यात्रा प्रगति',

    navHome: 'होम',
    navMap: 'मैप',
    navRoute: 'मार्ग',
    navAlerts: 'अलर्ट्स',
    navMore: 'सेटिंग्स',

    settingsTitle: 'रूटपायलट सिस्टम सेटिंग्स',
    settingsSubtitle: 'सिस्टम कॉन्फ़िगरेशन, भाषा, ध्वनि व सेंसर सेटिंग्स',
    languageSelectLabel: 'इंटरफ़ेस और ध्वनि नेविगेशन भाषा',
    voiceAlertsLabel: 'टेक्स्ट-टू-स्पीच ध्वनि अलर्ट',
    voiceAlertsSub: 'मार्ग पर खतरे आने पर तुरंत बोलकर चेतावनी दी जाएगी',
    sensorModeLabel: 'सेंसर डेटा स्ट्रीम मोड',
    sensorModeVirtual: 'वर्चुअल सिमुलेशन (स्वचालित मान)',
    sensorModeHardware: 'हार्डवेयर IoT नोड्स (ESP32 / MQTT / HTTP)',
    purgeButton: 'कैश साफ़ करें और डिफ़ॉल्ट पर रीसेट करें',
    purgeSuccess: '✓ सुरक्षित बेसलाइन पर रीसेट हो गया!',
    saveButton: 'कॉन्फ़िगरेशन सहेजें',
    savedSuccess: '✓ सेटिंग्स सहेज ली गईं!',
    cancelButton: 'रद्द करें',
  },
};

export function getTranslation(lang: SupportedLanguage = 'en'): Translations {
  return translations[lang] || translations.en;
}
