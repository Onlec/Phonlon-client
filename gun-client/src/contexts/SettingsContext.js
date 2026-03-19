import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { log } from '../utils/debug';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';
import { DEFAULT_LUNA_CUSTOM_THEME, normalizeCustomLunaTheme } from '../utils/lunaCustomTheme';

const SettingsContext = createContext();

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

// Default settings
export const DEFAULT_SETTINGS = {
  // Uiterlijk
  fontSize: 'normaal',
  colorScheme: 'blauw',
  customLunaTheme: DEFAULT_LUNA_CUSTOM_THEME,
  
  // Geluid
  systemSounds: true,
  toastNotifications: true,
  nudgeSound: true,
  typingSound: true,
  
  // Netwerk
  autoReconnect: true,
  superpeerEnabled: false,
  
  // Chat
  saveHistory: false, // MSN-authentic: geen history
  showTyping: true,
  emoticons: true,
  
  // Geavanceerd
  debugMode: false,
};

export function normalizeSettings(nextSettings) {
  const normalizedSettings =
    nextSettings && typeof nextSettings === 'object' ? nextSettings : {};

  return {
    ...DEFAULT_SETTINGS,
    ...normalizedSettings,
    customLunaTheme: normalizeCustomLunaTheme(normalizedSettings.customLunaTheme),
  };
}

export function SettingsProvider({ children }) {
  const [storageUserKey, setStorageUserKey] = useState('guest');
  const hydratingRef = useRef(false);
  const loadedKeyRef = useRef('guest');
  const [settings, setSettings] = useState(() => normalizeSettings(DEFAULT_SETTINGS));

  useEffect(() => {
    let cancelled = false;
    hydratingRef.current = true;
    loadedKeyRef.current = storageUserKey || 'guest';
    (async () => {
      try {
        const loaded = await readUserPrefOnce(storageUserKey, PREF_KEYS.SETTINGS, DEFAULT_SETTINGS);
        if (cancelled) return;
        setSettings(normalizeSettings(loaded));
      } catch (e) {
        log('[Settings] Error loading user prefs settings:', e);
        if (!cancelled) {
          setSettings(normalizeSettings(DEFAULT_SETTINGS));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageUserKey]);

  // Save to Gun USER_PREFS whenever settings change
  useEffect(() => {
    const resolvedKey = storageUserKey || 'guest';
    if (hydratingRef.current) {
      if (loadedKeyRef.current === resolvedKey) {
        hydratingRef.current = false;
      }
      return;
    }
    writeUserPref(storageUserKey, PREF_KEYS.SETTINGS, settings)
      .then(() => {
        log('[Settings] Saved settings:', settings);
      })
      .catch((e) => {
        log('[Settings] Error saving settings:', e);
      });
  }, [settings, storageUserKey]);

  // Update single setting
  const updateSetting = (key, value) => {
    console.log('[SettingsContext] Updating:', key, value);
    setSettings(prev => {
        const newSettings = normalizeSettings({ ...prev, [key]: value });
        console.log('[SettingsContext] New settings:', newSettings);
        return newSettings;
    });
  };

  // Update multiple settings at once
  const updateSettings = (updates) => {
    setSettings(prev => normalizeSettings({
      ...prev,
      ...updates
    }));
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(normalizeSettings(DEFAULT_SETTINGS));
    log('[Settings] Reset to defaults');
  };

  // Get single setting
  const getSetting = (key) => {
    return settings[key];
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        updateSetting, 
        updateSettings,
        resetSettings,
        getSetting,
        setStorageUserKey
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContext;
