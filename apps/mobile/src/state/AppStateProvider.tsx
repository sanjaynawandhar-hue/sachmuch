import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Button, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { learn, type BilingualMobileFact, type FactSignal } from '@sachmuch/core';
import { createAppStore, type AppStore, type AppSnapshot, type Preferences } from './storage';
interface Value {
 state: AppSnapshot;
 setPreferences(patch: Partial<Preferences>): Promise<void>;
 toggleSaved(fact: BilingualMobileFact): Promise<void>;
 recordSignal(signal: FactSignal): Promise<void>;
}
const Context = createContext<Value | null>(null);
const defaultStore = createAppStore(AsyncStorage);
export function AppStateProvider({ children, store = defaultStore }: { children: ReactNode; store?: AppStore }) {
 const [state, setState] = useState<AppSnapshot | null>(null);
 const [error, setError] = useState(false);
 const [attempt, setAttempt] = useState(0);
 const mounted = useRef(true);
 useEffect(() => {
  mounted.current = true; let active = true; setError(false);
  store.load().then(s => { if (active) setState(s); }).catch(() => { if (active) setError(true); });
  return () => { active = false; mounted.current = false; };
 }, [store, attempt]);
 const update = useCallback(async (change: (s: AppSnapshot) => AppSnapshot) => { const next = await store.update(change); if (mounted.current) setState(next); }, [store]);
 const setPreferences = useCallback((patch: Partial<Preferences>) => update(s => ({ ...s, preferences: { ...s.preferences, ...patch } })), [update]);
 const toggleSaved = useCallback((fact: BilingualMobileFact) => update(s => ({ ...s, saved: s.saved.some(e => e.fact.en.id === fact.en.id) ? s.saved.filter(e => e.fact.en.id !== fact.en.id) : [{ fact, savedAt: new Date().toISOString() }, ...s.saved] })), [update]);
 const recordSignal = useCallback((signal: FactSignal) => update(s => ({ ...s, affinity: learn(s.affinity, signal) })), [update]);
 if (!state) return <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F7F5FB' }}>{error ? <><Text style={{ fontSize: 18, margin: 20 }}>Could not read saved data. Your data has been preserved. / सहेजा डेटा पढ़ा नहीं जा सका।</Text><Button title="Retry / फिर कोशिश करें" onPress={() => setAttempt(v => v + 1)} /></> : <ActivityIndicator accessibilityLabel="Loading preferences / सेटिंग लोड हो रही हैं" color="#7652CC" />}</View>;
 return <Context.Provider value={{ state, setPreferences, toggleSaved, recordSignal }}>{children}</Context.Provider>;
}
export function useAppState(): Value { const context = useContext(Context); if (!context) throw Error('AppStateProvider is required'); return context; }
