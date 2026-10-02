export class VoiceService {
  private static enabled: boolean = true;
  private static language: 'en' | 'hi' = 'en';

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public static setLanguage(lang: 'en' | 'hi') {
    this.language = lang;
  }

  public static getLanguage(): 'en' | 'hi' {
    return this.language;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static speak(textEn: string, textHi?: string) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // cancel ongoing speech

      const text = this.language === 'hi' && textHi ? textHi : textEn;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (this.language === 'hi') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-US';
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech ignored if blocked by browser policy
    }
  }

  public static notifyHazardDetected(hazardType: string, location: string) {
    this.speak(
      `Warning! Hazard detected on your active route. ${hazardType} ahead near ${location}.`,
      `चेतावनी! आपके सक्रिय मार्ग पर खतरा पाया गया है। ${location} के पास आगे संकट है।`
    );
  }

  public static notifyAlternativesDisplayed(count: number) {
    this.speak(
      `${count} alternative optimal routes are now displayed on your map. Choose your route by moving onto it.`,
      `मानचित्र पर ${count} वैकल्पिक मार्ग प्रदर्शित किए गए हैं। उस पर आगे बढ़कर मार्ग चुनें।`
    );
  }

  public static notifyNewRouteActive(routeName: string) {
    this.speak(
      `${routeName} is now active. Continuing navigation.`,
      `${routeName} अब सक्रिय है। यात्रा जारी है।`
    );
  }

  public static notifyOffRoute() {
    this.speak(
      'You are off route. Recalculating path to destination.',
      'आप मार्ग से भटक गए हैं। नए मार्ग की गणना हो रही है।'
    );
  }

  public static notifyArrived(destinationName: string) {
    this.speak(
      `You have arrived at your destination, ${destinationName}. Journey completed safely.`,
      `आप अपने गंतव्य, ${destinationName} पर पहुंच गए हैं। यात्रा सफलतापूर्वक समाप्त हुई।`
    );
  }
}
