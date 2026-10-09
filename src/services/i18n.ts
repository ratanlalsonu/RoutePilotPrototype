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
  viewMapBtn: string;
  switchModeDriver: string;
  switchModeAdmin: string;

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
  viewDetails: string;
  activeDriverTelemetry: string;
  onRouteStatus: string;
  divertedStatus: string;
  arrivedStatus: string;
  standbyStatus: string;
  fromLabel: string;
  toLabel: string;
  distanceLabel: string;
  etaLabel: string;
  currentSpeedLabel: string;
  viewAllLink: string;
  noActiveHardwareNodes: string;
  allCorridorsOpen: string;
  recentRouteEventsTitle: string;
  noRouteEventsLogged: string;
  quickScenarioTitle: string;
  liveScenarioSubtitle: string;
  testCivilLinesBtn: string;
  testSecondaryDiversionBtn: string;
  testOffRouteHazardBtn: string;
  resetTripBaselineBtn: string;

  // Admin Live Map Bar
  fullScreenMapTitle: string;
  realRoadGeometryText: string;
  createHazardAnywhereBtn: string;
  clickMapPointText: string;
  hazardOnRouteBtn: string;
  hazardAwayBtn: string;
  secondHazardAheadBtn: string;
  resetDemoBtn: string;
  resetAdminActivityBtn: string;
  resetAdminActivityTooltip: string;
  resetDriverActivityBtn: string;
  resetDriverActivityTooltip: string;

  // Driver Cockpit Steps & Inputs
  interactiveLiveMap: string;
  viewRoadsGps: string;
  destinationSearchLabel: string;
  googlePlacesLive: string;
  searchPlaceholderInput: string;
  searchMapPlaceholder: string;
  searchingLocationsLive: string;
  realPlaceBadge: string;
  selectPlaceBtn: string;
  noExactPlaceFoundText: string;
  trySearchingHints: string;
  step1Header: string;
  step1Sub: string;
  originLabel: string;
  destinationPoint: string;
  step2Header: string;
  step2Sub: string;
  vehicleCar: string;
  vehicleBike: string;
  vehicleVan: string;
  vehicleBus: string;
  vehicleTruck: string;
  findOptimalRoutesBtn: string;
  step3Header: string;
  step3Sub: string;
  recommendedTag: string;
  followRouteText: string;
  activeCorridorTitle: string;
  awaitingDestinationText: string;
  viewTurnDetailsLink: string;
  tripReadyTitle: string;
  compareOtherRoutesLink: string;
  otherRoutesHiddenText: string;
  startNavigationBtn: string;
  pauseNavigationBtn: string;
  resumeNavigationBtn: string;
  stopTripBtn: string;
  stepForwardBtn: string;
  vehicleSpeedControlTitle: string;
  slowerBtn: string;
  fasterBtn: string;
  tripSummaryTitle: string;
  journeyProgressLabel: string;
  distanceLeftLabel: string;
  estTimeLabel: string;
  reportHazard: string;
  emergencySosBtn: string;
  intelligentDiversionBanner: string;

  // Driver Map HUD & Alerts
  inMetersLabel: string;
  repeatVoiceBtn: string;
  hazardDetectedAheadTitle: string;
  aheadOnRouteNotice: string;
  severityLabel: string;
  estimatedDelayLabel: string;
  immediateActionLabel: string;
  switchToSafeRouteBtn: string;
  locatedNearText: string;
  reroutingSuggestedText: string;
  okFindAlternatesBtn: string;
  availableAlternatesTitle: string;
  pathsLabel: string;
  followBtn: string;

  // Map Controls & Legend
  satelliteActiveBadge: string;
  satelliteModeTitle: string;
  zoomInBtn: string;
  zoomOutBtn: string;
  centerVehicleBtn: string;
  mapLegendTitle: string;
  legendVehicle: string;
  legendDestination: string;
  legendActiveRoute: string;
  legendAlternative: string;
  legendHazard: string;
  legendSensorNode: string;
  poweredByGoogleMaps: string;

  // Driver Tabs
  navHome: string;
  navMap: string;
  navRoute: string;
  navAlerts: string;
  navMore: string;

  // Route Tab
  activeNavigationRouteTitle: string;
  noActiveRouteSelected: string;
  totalDistanceLabel: string;
  turnByTurnDrivingDirections: string;
  stepsCountLabel: string;
  currentStepBadge: string;
  noStepsAvailableText: string;
  alternativeRouteComparisonTitle: string;
  compareBypassPathsText: string;
  recalculateBtn: string;
  viaRoadLabel: string;
  durationLabel: string;
  followThisRouteBtn: string;

  // Alerts Tab
  roadBridgeHazardCenterTitle: string;
  hazardCenterSubtitle: string;
  testAudioWarningBtn: string;
  urgentHazardBlockingRoute: string;
  noActiveRouteHazards: string;
  allCorridorsClearNotice: string;
  activeInfrastructureHazardsTitle: string;
  severityCritical: string;
  severityWarning: string;
  severityCaution: string;
  voiceNavigationGuidanceTitle: string;
  spokenHazardWarningsText: string;
  voiceEnabledText: string;
  voiceMutedText: string;
  speechLanguageLabel: string;
  audioOutputTestLabel: string;
  testVoiceGuidanceBtn: string;

  // Journey Completed Dialog
  journeyCompletedTitle: string;
  safelyReachedText: string;
  distanceTravelledLabel: string;
  journeyDurationLabel: string;
  hazardsEncounteredLabel: string;
  routeDiversionsLabel: string;
  continueReturnHomeBtn: string;

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
  googleMapsApiKeyLabel: string;
  placesApiKeyLabel: string;
  testPlaceSearchTitle: string;
  testSearchBtn: string;

  // Report Hazard Modal
  reportHazardModalTitle: string;
  reportHazardModalSub: string;
  selectHazardTypeLabel: string;
  selectSeverityLabel: string;
  hazardLocationNameLabel: string;
  optionalNotesLabel: string;
  submitReportBtn: string;

  // Emergency SOS Modal
  emergencySosTitle: string;
  emergencySosSub: string;
  policeEmergency: string;
  ambulanceMedical: string;
  disasterRelief: string;
  nhaiEmergencyHelpline: string;
  broadcastLocationBtn: string;
  locationBroadcastedNotice: string;
  callNowBtn: string;
  closeBtn: string;

  // Map & HUD Clarity Controls
  cleanMapToggle: string;
  showHudToggle: string;
  mapClearNotice: string;

  // General Tables, Panels & Labels
  tableType: string;
  tableLocation: string;
  tableSeverity: string;
  tableStatus: string;
  tableTime: string;
  recentHazardsTitle: string;
  systemStatusTitle: string;
  liveTrackingLink: string;
  viewNodesLink: string;
  viewRoadsLink: string;
  step1SearchSelect: string;
  step1Desc: string;
  step2SelectVehicle: string;
  step2Desc: string;
  step3ChooseOptimal: string;
  step3PathsCalculated: string;
  step3OtherHidden: string;
  changeDestinationBtn: string;
  fastestBadge: string;
  selectRouteBtn: string;
  driverRatingLabel: string;
  safetyScoreLabel: string;
  hardwareTelemetryTitle: string;
  allSystemsNormalNotice: string;
  esp32BridgeLabel: string;
  connectedStatus: string;
  simulationModeStatus: string;
  routingEngineLabel: string;
  mapTilesLabel: string;
  configureApiKeysBtn: string;
  resetTripDataBtn: string;
  emergencySosInitiated: string;
  emergencySosCounting: string;
  driverCallSign: string;
  liveGps: string;
  cancelSosBtn: string;
  dispatchingNow: string;
  dispatchingSub: string;
  emergencyResolved: string;

  // Admin Modules
  hazardIncidentManagementTitle: string;
  hazardIncidentManagementSub: string;
  allSeverityFilter: string;
  allStatusFilter: string;
  searchHazardPlaceholder: string;
  noHazardsFoundNotice: string;
  resolveHazardBtn: string;
  resolvedStatus: string;
  sensorNodeManagementTitle: string;
  sensorNodeManagementSub: string;
  activeDriversTitle: string;
  activeDriversSub: string;
  roadStatusTitle: string;
  roadStatusSub: string;
  aStarTitle: string;
  aStarSub: string;
  routeEventsTitle: string;
  routeEventsSub: string;
  systemLogsTitle: string;
  systemLogsSub: string;
  analyticsTitle: string;
  analyticsSub: string;
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
    viewMapBtn: 'View Map →',
    switchModeDriver: 'Switch to Driver Nav',
    switchModeAdmin: 'Switch to Admin Command',

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
    viewDetails: 'View Details',
    activeDriverTelemetry: 'Active Driver Telemetry',
    onRouteStatus: 'On Route',
    divertedStatus: 'Diverted',
    arrivedStatus: 'Arrived',
    standbyStatus: 'Standby',
    fromLabel: 'From:',
    toLabel: 'To:',
    distanceLabel: 'Distance:',
    etaLabel: 'ETA:',
    currentSpeedLabel: 'Current Speed:',
    viewAllLink: 'View All',
    noActiveHardwareNodes: 'No active hardware nodes',
    allCorridorsOpen: 'All corridors open & normal',
    recentRouteEventsTitle: 'Recent Route Events',
    noRouteEventsLogged: 'No route diversion events logged yet.',
    quickScenarioTitle: 'Quick Scenario Triggers & Live Tests',
    liveScenarioSubtitle: 'Inject real-time hazards to observe instant autonomous diversion',
    testCivilLinesBtn: 'Civil Lines Bridge Closure',
    testSecondaryDiversionBtn: 'Secondary Diversion on Route B',
    testOffRouteHazardBtn: 'Off-Route Highway Hazard',
    resetTripBaselineBtn: 'Reset Trip & Hazard State',

    fullScreenMapTitle: 'Full-Screen Interactive Map & Road Routing',
    realRoadGeometryText: '• Real Road Geometry',
    createHazardAnywhereBtn: 'Create Hazard Anywhere',
    clickMapPointText: 'Click ANYWHERE on Google Maps to place hazard',
    hazardOnRouteBtn: '⚠ Hazard on Driver Route',
    hazardAwayBtn: 'Hazard Away (No Alert)',
    secondHazardAheadBtn: '⚠ 2nd Hazard Ahead',
    resetDemoBtn: 'Reset',
    resetAdminActivityBtn: 'Reset Admin',
    resetAdminActivityTooltip: 'Reset Admin Activity Only (Hazards & Sensors)',
    resetDriverActivityBtn: 'Reset Trip',
    resetDriverActivityTooltip: 'Reset Driver Trip Only (Destination & Navigation)',

    interactiveLiveMap: 'Interactive Live Map',
    viewRoadsGps: 'View roads & GPS',
    destinationSearchLabel: 'Destination Search',
    googlePlacesLive: 'Google Places Live',
    searchPlaceholderInput: 'Search any city, landmark, station, or address...',
    searchMapPlaceholder: 'Search any destination on map...',
    searchingLocationsLive: 'Searching Google Places in real time...',
    realPlaceBadge: 'Real Place',
    selectPlaceBtn: 'Select →',
    noExactPlaceFoundText: 'No exact place found',
    trySearchingHints: 'Try searching landmark names like "Taj Mahal", "Delhi", "Agra", "Kanpur", or "Jhansi Fort".',
    step1Header: 'Step 1: Your Live Route Planning',
    step1Sub: 'Select destination to calculate real-world roads',
    originLabel: 'Origin (Current GPS)',
    destinationPoint: 'Destination',
    step2Header: 'Step 2: Select Vehicle Type',
    step2Sub: 'Calculates real transit speeds & optimal paths',
    vehicleCar: 'Car',
    vehicleBike: 'Bike',
    vehicleVan: 'Van',
    vehicleBus: 'Bus',
    vehicleTruck: 'Truck',
    findOptimalRoutesBtn: 'Find Optimal Routes for',
    step3Header: 'Step 3: Choose an Optimal Route',
    step3Sub: 'Select a safe corridor from the calculated alternatives',
    recommendedTag: 'Recommended',
    followRouteText: 'Follow Route',
    activeCorridorTitle: 'Active Corridor',
    awaitingDestinationText: 'Standby / Awaiting Destination',
    viewTurnDetailsLink: 'View Turn Details ›',
    tripReadyTitle: 'Trip Ready to Start',
    compareOtherRoutesLink: '⇄ Compare Other Routes',
    otherRoutesHiddenText: 'Other routes hidden',
    startNavigationBtn: 'Start Navigation',
    pauseNavigationBtn: 'Pause Navigation',
    resumeNavigationBtn: 'Resume Navigation',
    stopTripBtn: '✕ Stop',
    stepForwardBtn: 'Step →',
    vehicleSpeedControlTitle: 'Vehicle Speed Control',
    slowerBtn: '− Slower',
    fasterBtn: '+ Faster',
    tripSummaryTitle: 'Trip Summary',
    journeyProgressLabel: 'Journey Progress',
    distanceLeftLabel: 'Distance Left',
    estTimeLabel: 'Est. Time',
    reportHazard: 'Report Hazard',
    emergencySosBtn: 'Emergency SOS',
    intelligentDiversionBanner: 'Intelligent Multi-Route Dynamic Diversion Active',

    inMetersLabel: 'In',
    repeatVoiceBtn: 'Repeat Voice Announcement',
    hazardDetectedAheadTitle: 'HAZARD DETECTED AHEAD',
    aheadOnRouteNotice: 'ahead on your route',
    severityLabel: 'Severity',
    estimatedDelayLabel: 'Estimated Delay',
    immediateActionLabel: 'Immediate Action',
    switchToSafeRouteBtn: 'Switch to Safe Recommended Route',
    locatedNearText: 'Located near',
    reroutingSuggestedText: 'Rerouting suggested.',
    okFindAlternatesBtn: 'OK – Find Alternates',
    availableAlternatesTitle: 'Available Alternates',
    pathsLabel: 'paths',
    followBtn: 'Follow',

    satelliteActiveBadge: 'Satellite: Active',
    satelliteModeTitle: 'Satellite Mode',
    zoomInBtn: 'Zoom In',
    zoomOutBtn: 'Zoom Out',
    centerVehicleBtn: 'Center on Vehicle',
    mapLegendTitle: 'Map Legend',
    legendVehicle: 'Vehicle',
    legendDestination: 'Destination',
    legendActiveRoute: 'Active Route',
    legendAlternative: 'Alternative',
    legendHazard: 'Hazard',
    legendSensorNode: 'Sensor Node',
    poweredByGoogleMaps: 'Google Maps',

    navHome: 'Home',
    navMap: 'Map',
    navRoute: 'Route',
    navAlerts: 'Alerts',
    navMore: 'Settings',

    activeNavigationRouteTitle: 'Active Navigation Route',
    noActiveRouteSelected: 'No Active Route Selected',
    totalDistanceLabel: 'Total Distance',
    turnByTurnDrivingDirections: 'Turn-by-Turn Driving Directions',
    stepsCountLabel: 'steps',
    currentStepBadge: 'Current',
    noStepsAvailableText: 'Select a destination on the Cockpit or Map tab to generate turn-by-turn maneuvers.',
    alternativeRouteComparisonTitle: 'Alternative Route Comparison',
    compareBypassPathsText: 'Compare bypass paths avoiding road hazards',
    recalculateBtn: 'Recalculate',
    viaRoadLabel: 'Via',
    durationLabel: 'Duration',
    followThisRouteBtn: 'Follow This Route',

    roadBridgeHazardCenterTitle: 'Road & Bridge Hazard Center',
    hazardCenterSubtitle: 'Live detection, structural sensor alerts, and driver crowd-sourced reports',
    testAudioWarningBtn: '🔊 Test Audio Warning',
    urgentHazardBlockingRoute: 'URGENT HAZARD BLOCKING YOUR ROUTE',
    noActiveRouteHazards: 'No Active Hazards on Your Immediate Path',
    allCorridorsClearNotice: 'The road ahead is verified clear by bridge sensors and city surveillance.',
    activeInfrastructureHazardsTitle: 'All Active Infrastructure Hazards',
    severityCritical: 'CRITICAL',
    severityWarning: 'WARNING',
    severityCaution: 'CAUTION',
    voiceNavigationGuidanceTitle: 'Voice Navigation Guidance',
    spokenHazardWarningsText: 'Spoken hazard warnings and turn maneuvers',
    voiceEnabledText: 'Voice: Enabled',
    voiceMutedText: 'Voice: Muted',
    speechLanguageLabel: 'Speech Language',
    audioOutputTestLabel: 'Audio Output Test',
    testVoiceGuidanceBtn: 'Test Voice Guidance',

    journeyCompletedTitle: 'JOURNEY COMPLETED',
    safelyReachedText: 'Safely reached',
    distanceTravelledLabel: 'Distance Travelled',
    journeyDurationLabel: 'Journey Duration',
    hazardsEncounteredLabel: 'Hazards Encountered',
    routeDiversionsLabel: 'Route Diversions',
    continueReturnHomeBtn: 'Continue & Return Home',

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
    googleMapsApiKeyLabel: 'Google Maps API Key',
    placesApiKeyLabel: 'Google Places API Key',
    testPlaceSearchTitle: 'Live Places API Validation',
    testSearchBtn: 'Test Places Search',

    reportHazardModalTitle: 'Report Road or Bridge Hazard',
    reportHazardModalSub: 'Instantly alerts nearby drivers and municipal authority',
    selectHazardTypeLabel: 'Hazard Type',
    selectSeverityLabel: 'Severity Level',
    hazardLocationNameLabel: 'Location / Landmark',
    optionalNotesLabel: 'Additional Description',
    submitReportBtn: 'Submit Hazard Report',

    emergencySosTitle: 'Emergency Roadside Assistance',
    emergencySosSub: 'Direct broadcast of GPS coordinates and emergency contacts',
    policeEmergency: 'Police Emergency',
    ambulanceMedical: 'Ambulance & Trauma Medical',
    disasterRelief: 'State Disaster Management',
    nhaiEmergencyHelpline: 'NHAI Highway Patrol & Towing',
    broadcastLocationBtn: 'Broadcast Location to Police & Ambulances',
    locationBroadcastedNotice: '✓ Emergency Alert Broadcasted to Local Authorities',
    callNowBtn: 'Call',
    closeBtn: 'Close',

    cleanMapToggle: 'Clean Map',
    showHudToggle: 'Show HUD',
    mapClearNotice: 'HUD minimized for crystal clear map view. Tap anywhere to restore.',

    tableType: 'Type',
    tableLocation: 'Location',
    tableSeverity: 'Severity',
    tableStatus: 'Status',
    tableTime: 'Time',
    recentHazardsTitle: 'Recent Hazards',
    systemStatusTitle: 'System Status',
    liveTrackingLink: 'Live Tracking',
    viewNodesLink: 'View Nodes',
    viewRoadsLink: 'View Roads',
    step1SearchSelect: 'Step 1: Search & Select Destination',
    step1Desc: 'Search your destination in the box above. Vehicle type and optimal routes will be calculated once destination is chosen.',
    step2SelectVehicle: 'Step 2: Select Vehicle Type',
    step2Desc: 'Calculates real transit speeds & optimal paths',
    step3ChooseOptimal: 'Step 3: Choose an Optimal Route',
    step3PathsCalculated: 'optimal paths calculated',
    step3OtherHidden: 'Other optimal routes will disappear once selected.',
    changeDestinationBtn: 'Change',
    fastestBadge: 'Fastest',
    selectRouteBtn: 'Select Route →',
    driverRatingLabel: 'Driver Rating',
    safetyScoreLabel: 'Safety Score',
    hardwareTelemetryTitle: 'System Hardware & Telemetry',
    allSystemsNormalNotice: 'All Systems Normal',
    esp32BridgeLabel: 'ESP32 Bridge',
    connectedStatus: 'Connected',
    simulationModeStatus: 'Simulation Mode',
    routingEngineLabel: 'Routing Engine',
    mapTilesLabel: 'Map Tiles',
    configureApiKeysBtn: 'Configure API Keys',
    resetTripDataBtn: 'Reset Trip Data',
    emergencySosInitiated: 'EMERGENCY SOS INITIATED',
    emergencySosCounting: 'Dispatching highway emergency response & location coordinates in',
    driverCallSign: 'Driver Call Sign',
    liveGps: 'Live GPS',
    cancelSosBtn: 'Cancel SOS',
    dispatchingNow: 'DISPATCHING EMERGENCY UNITS',
    dispatchingSub: 'Your exact GPS coordinates have been broadcast to Highway Patrol & Ambulance',
    emergencyResolved: 'Emergency Resolved / Close',

    hazardIncidentManagementTitle: 'Hazard Incident Management',
    hazardIncidentManagementSub: 'Monitor, create, or resolve real-time road and bridge obstacles affecting transportation corridors.',
    allSeverityFilter: 'All Severities',
    allStatusFilter: 'All Statuses',
    searchHazardPlaceholder: 'Search hazards by type, road, or location...',
    noHazardsFoundNotice: 'No hazards matching the selected criteria.',
    resolveHazardBtn: '✓ Resolve Hazard',
    resolvedStatus: 'Resolved',
    sensorNodeManagementTitle: 'IoT Structural Sensor Nodes',
    sensorNodeManagementSub: 'Live telemetry from bridge and road monitoring hardware nodes.',
    activeDriversTitle: 'Active Driver Fleet Tracking',
    activeDriversSub: 'Real-time GPS telemetry, diversion status, and transit speed.',
    roadStatusTitle: 'Corridor & Bridge Operational Status',
    roadStatusSub: 'Live corridor closures, restrictions, and traffic passability.',
    aStarTitle: 'A* Multi-Criteria Pathfinding Engine',
    aStarSub: 'Real-time heuristic evaluation combining distance, safety hazard weights, and bridge health.',
    routeEventsTitle: 'Route Events & Dynamic Diversion Audit Log',
    routeEventsSub: 'Chronological telemetry log of all automated route diversions and incident triggers.',
    systemLogsTitle: 'System Diagnostic Logs & Health',
    systemLogsSub: 'Audit trail of system events, sensor pings, and failover routing.',
    analyticsTitle: 'Transportation & Route Analytics',
    analyticsSub: 'Corridor efficiency, hazard mitigation metrics, and response times.',
  },

  hi: {
    appTitle: 'RoutePilot', // Kept as RoutePilot as explicitly instructed
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
    viewMapBtn: 'मैप देखें →',
    switchModeDriver: 'ड्राइवर मोड पर जाएं',
    switchModeAdmin: 'एडमिन कमांड पर जाएं',

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
    viewDetails: 'विवरण देखें',
    activeDriverTelemetry: 'सक्रिय ड्राइवर टेलीमेट्री',
    onRouteStatus: 'मार्ग पर',
    divertedStatus: 'डायवर्टेड',
    arrivedStatus: 'पहुंच गए',
    standbyStatus: 'स्टैंडबाय',
    fromLabel: 'प्रस्थान:',
    toLabel: 'गंतव्य:',
    distanceLabel: 'दूरी:',
    etaLabel: 'अनुमानित समय:',
    currentSpeedLabel: 'वर्तमान गति:',
    viewAllLink: 'सभी देखें',
    noActiveHardwareNodes: 'कोई सक्रिय हार्डवेयर नोड नहीं है',
    allCorridorsOpen: 'सभी गलियारे सामान्य और खुले हैं',
    recentRouteEventsTitle: 'हालिया मार्ग घटनाक्रम',
    noRouteEventsLogged: 'अभी तक कोई डायवर्जन घटना दर्ज नहीं है।',
    quickScenarioTitle: 'त्वरित परिदृश्य परीक्षण व लाइव परीक्षण',
    liveScenarioSubtitle: 'तत्काल स्वचालित डायवर्जन देखने के लिए लाइव खतरा उत्पन्न करें',
    testCivilLinesBtn: 'सिविल लाइन्स ब्रिज बंद करें',
    testSecondaryDiversionBtn: 'मार्ग B पर दूसरा डायवर्जन',
    testOffRouteHazardBtn: 'राजमार्ग पर दूरस्थ खतरा',
    resetTripBaselineBtn: 'यात्रा व खतरा स्थिति रीसेट करें',

    fullScreenMapTitle: 'फुल-स्क्रीन इंटरैक्टिव मैप और मार्ग नेविगेशन',
    realRoadGeometryText: '• वास्तविक सड़क ज्यामिति',
    createHazardAnywhereBtn: 'मैप पर कहीं भी खतरा दर्ज करें',
    clickMapPointText: 'खतरा रखने के लिए गूगल मैप्स पर कहीं भी क्लिक करें',
    hazardOnRouteBtn: '⚠ ड्राइवर मार्ग पर खतरा',
    hazardAwayBtn: 'मार्ग से दूर खतरा (कोई अलर्ट नहीं)',
    secondHazardAheadBtn: '⚠ आगे दूसरा खतरा',
    resetDemoBtn: 'Reset (रीसेट)',
    resetAdminActivityBtn: 'एडमिन रीसेट',
    resetAdminActivityTooltip: 'केवल एडमिन गतिविधि रीसेट करें (खतरे और सेंसर)',
    resetDriverActivityBtn: 'ट्रिप रीसेट',
    resetDriverActivityTooltip: 'केवल ड्राइवर यात्रा रीसेट करें (गंतव्य और नेविगेशन)',

    interactiveLiveMap: 'इंटरैक्टिव लाइव मैप',
    viewRoadsGps: 'सड़कें और जीपीएस देखें',
    destinationSearchLabel: 'गंतव्य खोजें',
    googlePlacesLive: 'गूगल प्लेसेस लाइव',
    searchPlaceholderInput: 'कोई भी शहर, स्टेशन, लैंडमार्क या पता खोजें...',
    searchMapPlaceholder: 'मैप पर गंतव्य खोजें...',
    searchingLocationsLive: 'गूगल प्लेसेस पर लाइव खोज जारी है...',
    realPlaceBadge: 'वास्तविक स्थान',
    selectPlaceBtn: 'चुनें →',
    noExactPlaceFoundText: 'कोई सटीक स्थान नहीं मिला',
    trySearchingHints: 'ताजमहल, दिल्ली, आगरा, कानपुर, मुंबई या झांसी किला जैसे स्थानों के नाम खोजें।',
    step1Header: 'चरण 1: आपकी लाइव मार्ग योजना',
    step1Sub: 'वास्तविक सड़क मार्ग खोजने के लिए गंतव्य चुनें',
    originLabel: 'प्रारंभिक बिंदु (वर्तमान GPS)',
    destinationPoint: 'गंतव्य स्थान',
    step2Header: 'चरण 2: वाहन का प्रकार चुनें',
    step2Sub: 'वास्तविक यात्रा गति और सर्वश्रेष्ठ मार्ग की गणना करता है',
    vehicleCar: 'कार',
    vehicleBike: 'बाइक',
    vehicleVan: 'वैन',
    vehicleBus: 'बस',
    vehicleTruck: 'ट्रक',
    findOptimalRoutesBtn: 'के लिए सर्वश्रेष्ठ मार्ग खोजें',
    step3Header: 'चरण 3: सर्वश्रेष्ठ मार्ग चुनें',
    step3Sub: 'तैयार किए गए विकल्पों में से सुरक्षित मार्ग चुनें',
    recommendedTag: 'अनुशंसित',
    followRouteText: 'यह मार्ग चुनें',
    activeCorridorTitle: 'सक्रिय गलियारा',
    awaitingDestinationText: 'स्टैंडबाय / गंतव्य की प्रतीक्षा',
    viewTurnDetailsLink: 'मोड़ का विवरण देखें ›',
    tripReadyTitle: 'यात्रा शुरू करने के लिए तैयार',
    compareOtherRoutesLink: '⇄ अन्य मार्ग देखें',
    otherRoutesHiddenText: 'अन्य मार्ग छिपे हुए हैं',
    startNavigationBtn: 'नेविगेशन शुरू करें',
    pauseNavigationBtn: 'नेविगेशन रोकें',
    resumeNavigationBtn: 'नेविगेशन जारी रखें',
    stopTripBtn: '✕ समाप्त',
    stepForwardBtn: 'आगे बढ़ें →',
    vehicleSpeedControlTitle: 'वाहन गति नियंत्रण',
    slowerBtn: '− धीमा',
    fasterBtn: '+ तेज़',
    tripSummaryTitle: 'यात्रा सारांश',
    journeyProgressLabel: 'यात्रा प्रगति',
    distanceLeftLabel: 'शेष दूरी',
    estTimeLabel: 'अनुमानित समय',
    reportHazard: 'खतरे की रिपोर्ट करें',
    emergencySosBtn: 'आपातकालीन SOS',
    intelligentDiversionBanner: 'इंटेलिजेंट मल्टी-रूट डायनेमिक डायवर्जन सक्रिय',

    inMetersLabel: 'में',
    repeatVoiceBtn: 'ध्वनि उद्घोषणा दोहराएं',
    hazardDetectedAheadTitle: 'सावधान! आगे मार्ग पर खतरा है',
    aheadOnRouteNotice: 'आगे आपके मार्ग पर है',
    severityLabel: 'गंभीरता',
    estimatedDelayLabel: 'अनुमानित देरी',
    immediateActionLabel: 'तत्काल कार्रवाई',
    switchToSafeRouteBtn: 'सुरक्षित अनुशंसित मार्ग पर जाएं',
    locatedNearText: 'के निकट स्थित',
    reroutingSuggestedText: 'वैकल्पिक मार्ग का सुझाव दिया गया है।',
    okFindAlternatesBtn: 'ठीक है – वैकल्पिक मार्ग खोजें',
    availableAlternatesTitle: 'उपलब्ध वैकल्पिक मार्ग',
    pathsLabel: 'मार्ग',
    followBtn: 'चुनें',

    satelliteActiveBadge: 'सैटेलाइट: सक्रिय',
    satelliteModeTitle: 'सैटेलाइट मोड',
    zoomInBtn: 'ज़ूम इन',
    zoomOutBtn: 'ज़ूम आउट',
    centerVehicleBtn: 'वाहन पर केंद्रित करें',
    mapLegendTitle: 'मैप संकेतिका',
    legendVehicle: 'वाहन',
    legendDestination: 'गंतव्य',
    legendActiveRoute: 'सक्रिय मार्ग',
    legendAlternative: 'वैकल्पिक मार्ग',
    legendHazard: 'खतरा',
    legendSensorNode: 'सेंसर नोड',
    poweredByGoogleMaps: 'Google Maps',

    navHome: 'होम',
    navMap: 'मैप',
    navRoute: 'मार्ग',
    navAlerts: 'अलर्ट्स',
    navMore: 'सेटिंग्स',

    activeNavigationRouteTitle: 'सक्रिय नेविगेशन मार्ग',
    noActiveRouteSelected: 'कोई सक्रिय मार्ग चयनित नहीं है',
    totalDistanceLabel: 'कुल दूरी',
    turnByTurnDrivingDirections: 'प्रत्येक मोड़ के ड्राइविंग निर्देश',
    stepsCountLabel: 'चरण',
    currentStepBadge: 'वर्तमान',
    noStepsAvailableText: 'कॉकपिट या मैप टैब पर गंतव्य चुनकर ड्राइविंग निर्देश बनाएं।',
    alternativeRouteComparisonTitle: 'वैकल्पिक मार्गों की तुलना',
    compareBypassPathsText: 'सड़क अवरोधों से बचने वाले वैकल्पिक मार्गों की तुलना करें',
    recalculateBtn: 'पुनर्गणना करें',
    viaRoadLabel: 'वाया',
    durationLabel: 'समय',
    followThisRouteBtn: 'यह मार्ग चुनें',

    roadBridgeHazardCenterTitle: 'सड़क एवं पुल खतरा नियंत्रण केंद्र',
    hazardCenterSubtitle: 'लाइव डिटेक्शन, संरचनात्मक सेंसर अलर्ट और नागरिक रिपोर्ट',
    testAudioWarningBtn: '🔊 ध्वनि चेतावनी का परीक्षण करें',
    urgentHazardBlockingRoute: 'तत्काल खतरा: आपके मार्ग पर अवरोध',
    noActiveRouteHazards: 'आपके तत्काल मार्ग पर कोई खतरा नहीं है',
    allCorridorsClearNotice: 'सेंसर और सर्विलांस द्वारा आगे का मार्ग पूरी तरह सुरक्षित पाया गया है।',
    activeInfrastructureHazardsTitle: 'सभी सक्रिय संरचनात्मक खतरे',
    severityCritical: 'अत्यधिक गंभीर',
    severityWarning: 'चेतावनी',
    severityCaution: 'सावधानी',
    voiceNavigationGuidanceTitle: 'ध्वनि नेविगेशन मार्गदर्शन',
    spokenHazardWarningsText: 'बोलकर दी जाने वाली चेतावनी और मोड़ निर्देश',
    voiceEnabledText: 'ध्वनि: चालू',
    voiceMutedText: 'ध्वनि: म्यूट',
    speechLanguageLabel: 'बोलने की भाषा',
    audioOutputTestLabel: 'ऑडियो आउटपुट परीक्षण',
    testVoiceGuidanceBtn: 'ध्वनि मार्गदर्शन का परीक्षण करें',

    journeyCompletedTitle: 'यात्रा सफलतापूर्वक संपन्न',
    safelyReachedText: 'सफलतापूर्वक पहुंच गए',
    distanceTravelledLabel: 'तय की गई दूरी',
    journeyDurationLabel: 'यात्रा का समय',
    hazardsEncounteredLabel: 'सामने आए खतरे',
    routeDiversionsLabel: 'मार्ग डायवर्जन',
    continueReturnHomeBtn: 'जारी रखें और होम पर जाएं',

    settingsTitle: 'RoutePilot कॉन्फ़िगरेशन',
    settingsSubtitle: 'सिस्टम सेटिंग्स, भाषा, ध्वनि व सेंसर सेटिंग्स',
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
    googleMapsApiKeyLabel: 'Google Maps API Key',
    placesApiKeyLabel: 'Google Places API Key',
    testPlaceSearchTitle: 'लाइव Places API सत्यापन',
    testSearchBtn: 'स्थान खोज का परीक्षण करें',

    reportHazardModalTitle: 'सड़क या पुल के खतरे की रिपोर्ट करें',
    reportHazardModalSub: 'आसपास के चालकों और स्थानीय प्रशासन को तुरंत अलर्ट भेजा जाएगा',
    selectHazardTypeLabel: 'खतरे का प्रकार',
    selectSeverityLabel: 'गंभीरता स्तर',
    hazardLocationNameLabel: 'स्थान / लैंडमार्क',
    optionalNotesLabel: 'अतिरिक्त विवरण',
    submitReportBtn: 'खतरे की रिपोर्ट सबमिट करें',

    emergencySosTitle: 'आपातकालीन सहायता (SOS)',
    emergencySosSub: 'जीपीएस स्थान और आपातकालीन नंबरों पर तत्काल प्रसारण',
    policeEmergency: 'पुलिस आपातकालीन सेवा',
    ambulanceMedical: 'एम्बुलेंस एवं ट्रॉमा चिकित्सा',
    disasterRelief: 'राज्य आपदा प्रबंधन प्राधिकरण',
    nhaiEmergencyHelpline: 'NHAI राजमार्ग गश्ती व टोइंग',
    broadcastLocationBtn: 'पुलिस व एम्बुलेंस को लाइव जीपीएस प्रसारित करें',
    locationBroadcastedNotice: '✓ स्थानीय अधिकारियों को आपातकालीन अलर्ट भेज दिया गया है',
    callNowBtn: 'कॉल करें',
    closeBtn: 'बंद करें',

    cleanMapToggle: 'साफ़ मैप',
    showHudToggle: 'HUD दिखाएं',
    mapClearNotice: 'मैप को स्पष्ट देखने के लिए ओवरले न्यूनतम किए गए हैं। वापस लाने के लिए कहीं भी टैप करें।',

    tableType: 'प्रकार',
    tableLocation: 'स्थान',
    tableSeverity: 'गंभीरता',
    tableStatus: 'स्थिति',
    tableTime: 'समय',
    recentHazardsTitle: 'हालिया खतरे',
    systemStatusTitle: 'सिस्टम स्थिति',
    liveTrackingLink: 'लाइव ट्रैकिंग',
    viewNodesLink: 'नोड्स देखें',
    viewRoadsLink: 'सड़कें देखें',
    step1SearchSelect: 'चरण 1: गंतव्य खोजें और चुनें',
    step1Desc: 'ऊपर दिए गए खोज बॉक्स में अपना गंतव्य खोजें। गंतव्य चुनने के बाद वाहन प्रकार और इष्टतम मार्गों की गणना होगी।',
    step2SelectVehicle: 'चरण 2: वाहन का प्रकार चुनें',
    step2Desc: 'वास्तविक यात्रा गति और सर्वोत्तम मार्गों की गणना करता है',
    step3ChooseOptimal: 'चरण 3: एक सर्वोत्तम मार्ग चुनें',
    step3PathsCalculated: 'इष्टतम मार्गों की गणना की गई',
    step3OtherHidden: 'एक मार्ग चुनने के बाद अन्य मार्ग छिप जाएंगे।',
    changeDestinationBtn: 'बदलें',
    fastestBadge: 'सबसे तेज़',
    selectRouteBtn: 'मार्ग चुनें →',
    driverRatingLabel: 'ड्राइवर रेटिंग',
    safetyScoreLabel: 'सुरक्षा स्कोर',
    hardwareTelemetryTitle: 'सिस्टम हार्डवेयर व टेलीमेट्री',
    allSystemsNormalNotice: 'सभी प्रणालियां सामान्य हैं',
    esp32BridgeLabel: 'ESP32 ब्रिज',
    connectedStatus: 'कनेक्टेड',
    simulationModeStatus: 'सिमुलेशन मोड',
    routingEngineLabel: 'रूटिंग इंजन',
    mapTilesLabel: 'मैप टाइल्स',
    configureApiKeysBtn: 'API कीज़ कॉन्फ़िगर करें',
    resetTripDataBtn: 'यात्रा डेटा रीसेट करें',
    emergencySosInitiated: 'आपातकालीन SOS शुरू किया गया',
    emergencySosCounting: 'राजमार्ग आपातकालीन प्रतिक्रिया व निर्देशांक भेजे जा रहे हैं:',
    driverCallSign: 'ड्राइवर कॉल साइन',
    liveGps: 'लाइव जीपीएस',
    cancelSosBtn: 'SOS रद्द करें',
    dispatchingNow: 'आपातकालीन दल रवाना किया जा रहा है',
    dispatchingSub: 'आपके सटीक जीपीएस निर्देशांक हाईवे पेट्रोल और एम्बुलेंस को भेज दिए गए हैं',
    emergencyResolved: 'आपातकाल समाप्त / बंद करें',

    hazardIncidentManagementTitle: 'सड़क व पुल खतरा प्रबंधन',
    hazardIncidentManagementSub: 'यातायात गलियारों को प्रभावित करने वाले वास्तविक समय सड़क व पुल अवरोधों की निगरानी, निर्माण और समाधान करें।',
    allSeverityFilter: 'सभी गंभीरता',
    allStatusFilter: 'सभी स्थिति',
    searchHazardPlaceholder: 'प्रकार, सड़क या स्थान द्वारा खतरे खोजें...',
    noHazardsFoundNotice: 'चुने गए मापदंड के अनुसार कोई खतरा नहीं मिला।',
    resolveHazardBtn: '✓ खतरा हल करें',
    resolvedStatus: 'हल किया गया',
    sensorNodeManagementTitle: 'IoT संरचनात्मक सेंसर नोड्स',
    sensorNodeManagementSub: 'पुल और सड़क निगरानी हार्डवेयर नोड्स से वास्तविक समय टेलीमेट्री।',
    activeDriversTitle: 'सक्रिय चालक बेड़े की लाइव ट्रैकिंग',
    activeDriversSub: 'वास्तविक समय जीपीएस टेलीमेट्री, डायवर्जन स्थिति और यात्रा गति।',
    roadStatusTitle: 'गलियारा व पुल संचालन स्थिति',
    roadStatusSub: 'लाइव सड़क बंदी, प्रतिबंध और यातायात सुगमता।',
    aStarTitle: 'A* बहु-मानदंड पथ-खोज इंजन',
    aStarSub: 'दूरी, सुरक्षा खतरे और पुल संरचना स्वास्थ्य का वास्तविक समय विश्लेषण।',
    routeEventsTitle: 'मार्ग घटनाक्रम व डायवर्जन ऑडिट लॉग',
    routeEventsSub: 'स्वचालित मार्ग डायवर्जन और घटना ट्रिगर्स का कालानुक्रमिक लॉग।',
    systemLogsTitle: 'सिस्टम डायग्नोस्टिक लॉग्स व स्वास्थ्य',
    systemLogsSub: 'सिस्टम इवेंट्स, सेंसर पिंग्स और फेलओवर रूटिंग का ऑडिट रिकॉर्ड।',
    analyticsTitle: 'परिवहन व मार्ग एनालिटिक्स',
    analyticsSub: 'गलियारा दक्षता, खतरा शमन मेट्रिक्स और प्रतिक्रिया समय।',
  },
};

export function getTranslation(lang: SupportedLanguage = 'en'): Translations {
  return translations[lang] || translations.en;
}

/**
 * Universal text and dictionary translator
 * Automatically translates common statuses, severities, vehicles, and descriptions to Hindi
 * when language is 'hi', while ALWAYS preserving project name 'RoutePilot'.
 */
const HINDI_DICTIONARY: Record<string, string> = {
  // Brand name exception rule
  'RoutePilot': 'RoutePilot',

  // Vehicle types
  'car': 'कार',
  'bike': 'बाइक',
  'van': 'वैन',
  'bus': 'बस',
  'truck': 'ट्रक',
  'Car': 'कार',
  'Bike': 'बाइक',
  'Van': 'वैन',
  'Bus': 'बस',
  'Truck': 'ट्रक',

  // Journey & Driver Statuses
  'ON_ROUTE': 'मार्ग पर',
  'DIVERTED': 'डायवर्टेड',
  'ARRIVED': 'पहुंच गए',
  'IDLE': 'स्टैंडबाय',
  'STANDBY': 'स्टैंडबाय',
  'On Route': 'मार्ग पर',
  'Diverted': 'डायवर्टेड',
  'Arrived': 'पहुंच गए',
  'Standby': 'स्टैंडबाय',
  'Awaiting Selection': 'गंतव्य प्रतीक्षित',
  'Not set': 'निर्धारित नहीं',
  'Online': 'ऑनलाइन',
  'Offline': 'ऑफलाइन',

  // Hazard severities
  'CRITICAL': 'अत्यधिक गंभीर',
  'BLOCKED': 'अवरुद्ध',
  'WARNING': 'चेतावनी',
  'CAUTION': 'सावधानी',
  'NORMAL': 'सामान्य',
  'Critical': 'अत्यधिक गंभीर',
  'Blocked': 'अवरुद्ध',
  'Warning': 'चेतावनी',
  'Caution': 'सावधानी',
  'Normal': 'सामान्य',
  'Restricted': 'प्रतिबंधित',

  // Hazard Types
  'Bridge Damage': 'पुल क्षति',
  'Road Blockage': 'सड़क अवरोध',
  'High Water Level': 'जलभराव / बाढ़',
  'Accident': 'सड़क दुर्घटना',
  'Road Construction': 'सड़क निर्माण कार्य',
  'Structural Vibration': 'पुल कंपन / गड्ढे',
  'Other': 'अन्य खतरा',

  // Hazard Status
  'ACTIVE': 'सक्रिय',
  'RESOLVED': 'समाधान हो गया',
  'Active': 'सक्रिय',
  'Resolved': 'समाधान हो गया',

  // Route Event statuses
  'Success': 'सफल',
  'Triggered': 'सक्रिय हुआ',
  'In Progress': 'प्रगति पर',

  // Common UI words
  'Distance': 'दूरी',
  'Duration': 'समय',
  'Speed': 'गति',
  'Total Distance': 'कुल दूरी',
  'Remaining': 'शेष',
  'Fastest': 'सबसे तेज़',
  'Recommended': 'अनुशंसित',
  'Current': 'वर्तमान',
  'View All': 'सभी देखें',
  'Details': 'विवरण',
  'Cancel': 'रद्द करें',
  'Save': 'सहेजें',
  'Submit': 'जमा करें',
  'Close': 'बंद करें',
  'Call': 'कॉल करें',
  'Test': 'परीक्षण',
  'Testing...': 'परीक्षण जारी...',
  'Recalculate': 'पुनर्गणना',
  'Follow This Route': 'यह मार्ग चुनें',
  'Select Route →': 'मार्ग चुनें →',
  'All Clear': 'सब सुरक्षित',
  'Simulation Mode': 'सिमुलेशन मोड',
  'Google Maps Active': 'गूगल मैप्स सक्रिय',
  'Dedicated Key': 'समर्पित की',
  'Uses Maps Key': 'मैप्स की का उपयोग',

  // Route Categories & Names
  'Optimal Route': 'इष्टतम मार्ग',
  'Average Route': 'औसत मार्ग',
  'Worst Route': 'धीमा मार्ग',
  'Optimal': 'इष्टतम',
  'Average': 'औसत',
  'Worst': 'धीमा / खराब',
  'Fastest & Safest': 'सबसे तेज़ और सुरक्षित',
  'Moderate Alternative': 'मध्यम विकल्प',
  'Slowest / Long Alternative': 'धीमा / लंबा विकल्प',
  'Optimal Routes Available': 'उपलब्ध इष्टतम मार्ग',
};

export function translateText(text: string | undefined | null, lang: SupportedLanguage = 'en'): string {
  if (!text) return '';
  if (lang === 'en') return text;
  
  // Exact match in dictionary
  if (HINDI_DICTIONARY[text]) {
    return HINDI_DICTIONARY[text];
  }

  // Preserve RoutePilot
  if (text.trim() === 'RoutePilot') {
    return 'RoutePilot';
  }

  // Smart partial replacement for route descriptions like "Optimal Route — via NH 30"
  let translated = text;
  if (translated.includes('Optimal Route')) {
    translated = translated.replace('Optimal Route', 'इष्टतम मार्ग');
  }
  if (translated.includes('Average Route')) {
    translated = translated.replace('Average Route', 'औसत मार्ग');
  }
  if (translated.includes('Worst Route')) {
    translated = translated.replace('Worst Route', 'धीमा मार्ग');
  }
  if (translated.includes('via')) {
    translated = translated.replace('via', 'के रास्ते');
  }
  if (translated.includes('Fastest & Safest')) {
    translated = translated.replace('Fastest & Safest', 'सबसे तेज़ और सुरक्षित');
  }
  if (translated.includes('Moderate Alternative')) {
    translated = translated.replace('Moderate Alternative', 'मध्यम विकल्प');
  }
  if (translated.includes('Slowest / Long Alternative')) {
    translated = translated.replace('Slowest / Long Alternative', 'धीमा / लंबा विकल्प');
  }

  return translated;
}
