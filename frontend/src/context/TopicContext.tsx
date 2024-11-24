import React, { createContext, useContext, useState } from 'react';

type TopicContextType = {
  selectedTopic: string | number | null; // null for ALL, 'uncategorized' for uncategorized, number for specific topic ID
  setSelectedTopic: (topic: string | number | null) => void;
};

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [selectedTopic, setSelectedTopic] = useState<string | number | null>(null);

  return (
    <TopicContext.Provider value={{ selectedTopic, setSelectedTopic }}>
      {children}
    </TopicContext.Provider>
  );
}

export function useTopicContext() {
  const context = useContext(TopicContext);
  if (context === undefined) {
    throw new Error('useTopicContext must be used within a TopicProvider');
  }
  return context;
} 