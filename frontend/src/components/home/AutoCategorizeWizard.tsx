import React, { useState } from 'react';
import { Topic, ProposedTopic, ProposedEntry, AutoCategorizeResponse } from '../../lib/api/topicsApi';
import { topicsApi } from '../../lib/api/topicsApi';

interface AutoCategorizeWizardProps {
    topics: Topic[];
    onClose: () => void;
    onComplete: () => void;
}

interface TopicWithSelection extends Topic {
    isSelected: boolean;
}

const AutoCategorizeWizard: React.FC<AutoCategorizeWizardProps> = ({ topics, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [selectedTopics, setSelectedTopics] = useState<TopicWithSelection[]>(
        topics.map(topic => ({ ...topic, isSelected: false }))
    );
    const [instructions, setInstructions] = useState('');
    const [proposedChanges, setProposedChanges] = useState<AutoCategorizeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleTopicToggle = (topicId: number) => {
        setSelectedTopics(prev => 
            prev.map(topic => 
                topic.topic_id === topicId 
                    ? { ...topic, isSelected: !topic.isSelected }
                    : topic
            )
        );
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            const data = await topicsApi.analyzeCategorization({
                topics_to_keep: selectedTopics
                    .filter(t => t.isSelected)
                    .map(t => t.topic_id),
                instructions: instructions || undefined,
            });
            
            setProposedChanges(data);
            setStep(2);
        } catch (error) {
            console.error('Error analyzing categorization:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTopicName = (topicId: number | null) => {
        if (!topicId) return 'Uncategorized';
        const topic = topics.find(t => t.topic_id === topicId);
        return topic ? topic.topic_name : 'Unknown Topic';
    };

    const getChangeDescription = (entry: ProposedEntry) => {
        const fromTopic = getTopicName(entry.current_topic_id);
        const toTopic = getTopicName(entry.proposed_topic_id);
        
        if (fromTopic === toTopic) return 'No change';
        return `${fromTopic} → ${toTopic}`;
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium mb-4 dark:text-gray-200">
                    Step 1: Select Topics to Keep
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Select topics you want to keep unchanged. Unselected topics may be modified or merged.
                </p>
                <div className="space-y-2">
                    {selectedTopics.map(topic => (
                        <div 
                            key={topic.topic_id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            <input
                                type="checkbox"
                                checked={topic.isSelected}
                                onChange={() => handleTopicToggle(topic.topic_id)}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span className="dark:text-gray-200">{topic.topic_name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">
                    Special Instructions (Optional)
                </label>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="E.g., 'Prefer broader categories' or 'Keep work and personal topics separate'"
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                    rows={3}
                />
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Analyzing...' : 'Analyze'}
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => {
        if (!proposedChanges) return null;

        return (
            <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4 dark:text-gray-200">
                    Step 2: Review Proposed Changes
                </h3>
                
                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 dark:text-gray-200">Summary of Changes</h4>
                    <ul className="space-y-1 text-sm dark:text-gray-300">
                        <li>New topics to be created: {proposedChanges.proposed_topics.filter(t => t.is_new).length}</li>
                        <li>Entries to be recategorized: {proposedChanges.proposed_topics.reduce((sum, topic) => sum + topic.entries.length, 0)}</li>
                    </ul>
                </div>

                {/* Topics and their entries */}
                <div className="space-y-6">
                    {proposedChanges.proposed_topics.map((topic) => (
                        <div 
                            key={topic.topic_id || topic.topic_name}
                            className="border dark:border-gray-700 rounded-lg overflow-hidden"
                        >
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-medium dark:text-gray-200">
                                        {topic.topic_name}
                                        {topic.is_new && (
                                            <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                                New Topic
                                            </span>
                                        )}
                                    </h4>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {topic.entries.length} entries • {Math.round(topic.confidence_score * 100)}% confidence
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y dark:divide-gray-700">
                                {topic.entries.map((entry) => (
                                    <div 
                                        key={entry.entry_id}
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <div className="text-sm mb-2 dark:text-gray-200">{entry.content}</div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {getChangeDescription(entry)}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {Math.round(entry.confidence_score * 100)}% confidence
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                    <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => setStep(3)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4 dark:text-gray-200">
                Step 3: Confirm Changes
            </h3>
            {/* We'll implement this in the next iteration */}
            <div className="text-center">Coming soon...</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold dark:text-gray-200">Auto-Categorize Entries</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                    <div className="flex items-center justify-between mb-8">
                        {[1, 2, 3].map((stepNum) => (
                            <div
                                key={stepNum}
                                className={`flex items-center ${
                                    stepNum < 3 ? 'flex-1' : ''
                                }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        step >= stepNum
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {stepNum}
                                </div>
                                {stepNum < 3 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 ${
                                            step > stepNum
                                                ? 'bg-blue-600'
                                                : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    );
};

export default AutoCategorizeWizard; 