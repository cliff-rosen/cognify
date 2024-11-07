import { create } from 'zustand';
import { Topic, Entry } from '../types';

interface AppState {
    currentTopic: Topic | null;
    setCurrentTopic: (topic: Topic | null) => void;
    entries: Entry[];
    setEntries: (entries: Entry[]) => void;
}

export const useStore = create<AppState>((set) => ({
    currentTopic: null,
    setCurrentTopic: (topic) => set({ currentTopic: topic }),
    entries: [],
    setEntries: (entries) => set({ entries }),
})); 