import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Translations ────────────────────────────────────────────────────────────

export const translations = {
  en: {
    appTitle: "JanAwaaj",
    homeTitle: "Public Grievances Near You",
    fileComplaintCTA: "📝  File a Complaint",
    feedTitle: "Live Public Complaints",
    support: "👍 Support",
    disagree: "👎 Disagree",
    comment: "💬 Comment",
    send: "Send",
    addComment: "Add a comment…",
    languageLabel: "Language",
    micLabel: "Speak your complaint",
    typeLabel: "Describe the issue…",
    categoryLabel: "Category",
    photoVideoLabel: "Upload Photo / Video",
    changePhoto: "Change Photo",
    pickPhoto: "Pick Photo",
    phoneLabel: "Phone number (optional)",
    locationLabel: "Location",
    locationCaptured: "Location captured",
    locationUnavailable: "Location not available",
    sharePublicLabel: "Share complaint publicly",
    submitComplaint: "Submit Complaint",
    submitting: "Submitting…",
    noPosts: "No public complaints near you yet.",
    loading: "Loading…",
    errorLoadingFeed: "Could not load feed",
    voiceMode: "Voice",
    textMode: "Text",
    recording: "Recording… tap to stop",
    voiceReady: "Voice recorded ✓",
    tapMic: "Tap to start speaking",
    category_PublicWorks: "Public Works",
    category_WaterSupply: "Water Supply",
    category_Electricity: "Electricity",
    category_Roads: "Roads & Transport",
    category_Health: "Health Services",
    category_Education: "Education",
    category_Sanitation: "Sanitation",
    category_Other: "Other",
  },
  hi: {
    appTitle: "जनआवाज़",
    homeTitle: "आपके आसपास की शिकायतें",
    fileComplaintCTA: "📝  शिकायत दर्ज करें",
    feedTitle: "लाइव सार्वजनिक शिकायतें",
    support: "👍 समर्थन",
    disagree: "👎 असहमति",
    comment: "💬 टिप्पणी",
    send: "भेजें",
    addComment: "टिप्पणी जोड़ें…",
    languageLabel: "भाषा",
    micLabel: "अपनी शिकायत बोलें",
    typeLabel: "समस्या का विवरण दें…",
    categoryLabel: "श्रेणी",
    photoVideoLabel: "फोटो या वीडियो जोड़ें",
    changePhoto: "फोटो बदलें",
    pickPhoto: "फोटो चुनें",
    phoneLabel: "फ़ोन नंबर (वैकल्पिक)",
    locationLabel: "स्थान",
    locationCaptured: "स्थान मिल गया",
    locationUnavailable: "स्थान उपलब्ध नहीं",
    sharePublicLabel: "शिकायत सार्वजनिक करें",
    submitComplaint: "शिकायत भेजें",
    submitting: "भेजा जा रहा है…",
    noPosts: "आसपास अभी कोई सार्वजनिक शिकायत नहीं।",
    loading: "लोड हो रहा है…",
    errorLoadingFeed: "फीड लोड नहीं हो पाई",
    voiceMode: "आवाज़",
    textMode: "टेक्स्ट",
    recording: "रिकॉर्ड हो रहा है… रोकने के लिए टैप करें",
    voiceReady: "आवाज़ रिकॉर्ड हो गई ✓",
    tapMic: "बोलने के लिए टैप करें",
    category_PublicWorks: "सार्वजनिक कार्य",
    category_WaterSupply: "जल आपूर्ति",
    category_Electricity: "बिजली",
    category_Roads: "सड़क एवं परिवहन",
    category_Health: "स्वास्थ्य सेवाएं",
    category_Education: "शिक्षा",
    category_Sanitation: "स्वच्छता",
    category_Other: "अन्य",
  },
  mr: {
    appTitle: "जनआवाज",
    homeTitle: "आपल्या आसपासच्या तक्रारी",
    fileComplaintCTA: "📝  तक्रार नोंदवा",
    feedTitle: "थेट सार्वजनिक तक्रारी",
    support: "👍 समर्थन",
    disagree: "👎 मतभेद",
    comment: "💬 प्रतिसाद",
    send: "पाठवा",
    addComment: "प्रतिसाद द्या…",
    languageLabel: "भाषा",
    micLabel: "आपली तक्रार बोला",
    typeLabel: "समस्या सांगा…",
    categoryLabel: "वर्ग",
    photoVideoLabel: "फोटो किंवा व्हिडिओ जोडा",
    changePhoto: "फोटो बदला",
    pickPhoto: "फोटो निवडा",
    phoneLabel: "फोन नंबर (पर्यायी)",
    locationLabel: "ठिकाण",
    locationCaptured: "ठिकाण मिळाले",
    locationUnavailable: "ठिकाण उपलब्ध नाही",
    sharePublicLabel: "तक्रार सार्वजनिक करा",
    submitComplaint: "तक्रार पाठवा",
    submitting: "पाठवत आहे…",
    noPosts: "आसपास अजून कोणतीही सार्वजनिक तक्रार नाही.",
    loading: "लोड होत आहे…",
    errorLoadingFeed: "फीड लोड होऊ शकली नाही",
    voiceMode: "आवाज",
    textMode: "मजकूर",
    recording: "रेकॉर्ड होत आहे… थांबवण्यासाठी टॅप करा",
    voiceReady: "आवाज रेकॉर्ड झाला ✓",
    tapMic: "बोलण्यासाठी टॅप करा",
    category_PublicWorks: "सार्वजनिक कामे",
    category_WaterSupply: "पाणी पुरवठा",
    category_Electricity: "वीज",
    category_Roads: "रस्ते व वाहतूक",
    category_Health: "आरोग्य सेवा",
    category_Education: "शिक्षण",
    category_Sanitation: "स्वच्छता",
    category_Other: "इतर",
  },
  kn: {
    appTitle: "ಜನಆವಾಜ್",
    homeTitle: "ನಿಮ್ಮ ಸುತ್ತಲಿನ ದೂರುಗಳು",
    fileComplaintCTA: "📝  ದೂರು ದಾಖಲಿಸಿ",
    feedTitle: "ಲೈವ್ ಸಾರ್ವಜನಿಕ ದೂರುಗಳು",
    support: "👍 ಬೆಂಬಲ",
    disagree: "👎 ಅಸಮ್ಮತಿ",
    comment: "💬 ಕಾಮೆಂಟ್",
    send: "ಕಳುಹಿಸಿ",
    addComment: "ಕಾಮೆಂಟ್ ಸೇರಿಸಿ…",
    languageLabel: "ಭಾಷೆ",
    micLabel: "ನಿಮ್ಮ ದೂರು ಮಾತನಾಡಿ",
    typeLabel: "ಸಮಸ್ಯೆ ವಿವರಿಸಿ…",
    categoryLabel: "ವರ್ಗ",
    photoVideoLabel: "ಫೋಟೋ ಅಥವಾ ವೀಡಿಯೋ ಅಪ್ಲೋಡ್ ಮಾಡಿ",
    changePhoto: "ಫೋಟೋ ಬದಲಿಸಿ",
    pickPhoto: "ಫೋಟೋ ಆರಿಸಿ",
    phoneLabel: "ಫೋನ್ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)",
    locationLabel: "ಸ್ಥಳ",
    locationCaptured: "ಸ್ಥಳ ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ",
    locationUnavailable: "ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ",
    sharePublicLabel: "ದೂರನ್ನು ಸಾರ್ವಜನಿಕವಾಗಿ ಹಂಚಿಕೊಳ್ಳಿ",
    submitComplaint: "ದೂರು ಕಳುಹಿಸಿ",
    submitting: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…",
    noPosts: "ಸಮೀಪದಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಸಾರ್ವಜನಿಕ ದೂರುಗಳಿಲ್ಲ.",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    errorLoadingFeed: "ಫೀಡ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ",
    voiceMode: "ಧ್ವನಿ",
    textMode: "ಪಠ್ಯ",
    recording: "ರೆಕಾರ್ಡ್ ಆಗುತ್ತಿದೆ… ನಿಲ್ಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    voiceReady: "ಧ್ವನಿ ರೆಕಾರ್ಡ್ ಆಗಿದೆ ✓",
    tapMic: "ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    category_PublicWorks: "ಸಾರ್ವಜನಿಕ ಕಾರ್ಯಗಳು",
    category_WaterSupply: "ನೀರು ಸರಬರಾಜು",
    category_Electricity: "ವಿದ್ಯುತ್",
    category_Roads: "ರಸ್ತೆ ಮತ್ತು ಸಾರಿಗೆ",
    category_Health: "ಆರೋಗ್ಯ ಸೇವೆಗಳು",
    category_Education: "ಶಿಕ್ಷಣ",
    category_Sanitation: "ನೈರ್ಮಲ್ಯ",
    category_Other: "ಇತರ",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const LANG_KEY = "appLanguage";
const SUPPORTED = ["en", "hi", "mr", "kn"];

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");

  // Load persisted language on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANG_KEY);
        if (stored && SUPPORTED.includes(stored)) {
          setLanguageState(stored);
        }
      } catch {
        // Fall back to English silently
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (!SUPPORTED.includes(lang)) return;
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore persistence errors
    }
  }, []);

  const t = useCallback(
    (key) =>
      translations[language]?.[key] ?? translations.en?.[key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage() {
  return useContext(LanguageContext);
}
