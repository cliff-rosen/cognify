import React, { useState } from 'react';
import { Topic, ProposedEntry, AutoCategorizeResponse, isUncategorizedTopic } from '../../lib/api/topicsApi';
import { topicsApi } from '../../lib/api/topicsApi';

interface AutoCategorizeWizardProps {
    topics: Topic[];
    onClose: () => void;
    onComplete: () => void;
}

interface TopicWithSelection extends Topic {
    isSelected: boolean;
}

interface EmptyTopic extends Topic {
    isSelectedForDeletion: boolean;
}

const AutoCategorizeWizard: React.FC<AutoCategorizeWizardProps> = ({ topics, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [selectedTopics, setSelectedTopics] = useState<TopicWithSelection[]>(
        topics
            .filter(topic => !isUncategorizedTopic(topic))
            .map(topic => ({ ...topic, isSelected: false }))
    );
    const [instructions, setInstructions] = useState('');
    const [proposedChanges, setProposedChanges] = useState<AutoCategorizeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emptyTopics, setEmptyTopics] = useState<EmptyTopic[]>([]);

    console.log('topics', topics);

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
            const request = {
                topics_to_keep: selectedTopics
                    .filter(t => t.isSelected)
                    .map(t => t.topic_id),
                instructions: instructions || undefined,
            };
            const data = await topicsApi.analyzeCategorization(request);
            setProposedChanges(data);
            setStep(2);
        } catch (error) {
            console.error('Error analyzing categorization:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!proposedChanges) return;

        setIsSubmitting(true);
        try {
            // First apply the categorization changes
            await topicsApi.applyCategorization({
                proposed_topics: proposedChanges.proposed_topics,
                uncategorized_entries: proposedChanges.uncategorized_entries
            });

            // Wait a moment for the changes to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Then check for empty topics
            const allTopics = await topicsApi.getTopics();

            console.log('All topics before filtering:', allTopics.map(t => ({
                name: t.topic_name,
                count: t.entry_count,
                isUncategorized: isUncategorizedTopic(t)
            })));

            const emptyOnes = allTopics
                .filter(topic => {
                    // Strictly check for entry_count === 0, not undefined
                    const isEmpty = !isUncategorizedTopic(topic) && topic.entry_count === 0;
                    if (isEmpty) {
                        console.log('Found empty topic:', {
                            name: topic.topic_name,
                            count: topic.entry_count,
                            isUncategorized: isUncategorizedTopic(topic)
                        });
                    }
                    return isEmpty;
                })
                .map(topic => ({
                    ...topic,
                    isSelectedForDeletion: false
                })) as EmptyTopic[];

            console.log('Final empty topics:', emptyOnes);

            // If there are empty topics, show the deletion step
            if (emptyOnes.length > 0) {
                setEmptyTopics(emptyOnes);
                setStep(4);
            } else {
                // If no empty topics, complete the wizard
                onComplete();
            }
        } catch (error: any) {
            console.error('Error applying categorization:', error);
            if (error?.response) {
                console.error('Error response:', {
                    status: error.response?.status,
                    data: error.response?.data
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // const handleEmptyTopicsCheck = async () => {
    //     try {
    //         // Get the latest topic data after categorization
    //         const allTopics = await topicsApi.getTopics();

    //         console.log('All topics with counts:', allTopics.map(t => ({
    //             name: t.topic_name,
    //             count: t.entry_count
    //         })));

    //         const emptyOnes = allTopics
    //             .filter(topic => {
    //                 // Filter out uncategorized and check entry_count
    //                 const isEmpty = !isUncategorizedTopic(topic) && 
    //                               (topic.entry_count === 0 || topic.entry_count === undefined);

    //                 if (isEmpty) {
    //                     console.log('Found empty topic:', topic.topic_name, topic.entry_count);
    //                 }
    //                 return isEmpty;
    //             })
    //             .map(topic => ({ 
    //                 ...topic, 
    //                 isSelectedForDeletion: false 
    //             })) as EmptyTopic[];

    //         console.log('Empty topics found:', emptyOnes);
    //         setEmptyTopics(emptyOnes);
    //         setStep(4);
    //     } catch (error) {
    //         console.error('Error fetching empty topics:', error);
    //     }
    // };

    const handleDeleteEmptyTopics = async () => {
        setIsSubmitting(true);
        try {
            const topicsToDelete = emptyTopics
                .filter(topic => topic.isSelectedForDeletion)
                .map(topic => topic.topic_id);

            await Promise.all(topicsToDelete.map(id => topicsApi.deleteTopic(id)));
            onComplete();
        } catch (error) {
            console.error('Error deleting topics:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTopicForDeletion = (topicId: number) => {
        setEmptyTopics(prev =>
            prev.map(topic =>
                topic.topic_id === topicId
                    ? { ...topic, isSelectedForDeletion: !topic.isSelectedForDeletion }
                    : topic
            )
        );
    };

    const getTopicName = (topicId: number | null) => {
        if (!topicId) return 'Uncategorized';
        const topic = topics.find(t => t.topic_id === topicId);
        return topic ? topic.topic_name : 'Unknown Topic';
    };

    const getChangeDescription = (entry: ProposedEntry) => {
        const fromTopic = getTopicName(entry.current_topic_id);
        const toTopic = getTopicName(entry.proposed_topic_id);

        if (fromTopic === toTopic && fromTopic !== 'Uncategorized') {
            return 'No change';
        }

        return (
            <span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">From: </span>
                <span className="text-gray-600 dark:text-gray-300">{fromTopic}</span>
            </span>
        );
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
                                            <div className="text-gray-500 dark:text-gray-400">
                                                {getChangeDescription(entry)}
                                            </div>
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
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Are you sure you want to apply these changes? This will:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Create {proposedChanges?.proposed_topics.filter(t => t.is_new).length} new topics</li>
                    <li>Move {proposedChanges?.proposed_topics.reduce((sum, topic) => sum + topic.entries.length, 0)} entries</li>
                </ul>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                    Back
                </button>
                <div className="space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Applying...' : 'Apply Changes'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4 dark:text-gray-200">
                Step 4: Clean Up Empty Topics
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Select empty topics you'd like to delete:
                </p>

                {emptyTopics.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-300 italic">
                        No empty topics found.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {emptyTopics.map(topic => (
                            <div
                                key={topic.topic_id}
                                className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={topic.isSelectedForDeletion}
                                        onChange={() => toggleTopicForDeletion(topic.topic_id)}
                                        className="h-4 w-4 text-blue-600"
                                    />
                                    <span className="dark:text-gray-200">{topic.topic_name}</span>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {topic.entry_count || 0} entries
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                    Back
                </button>
                <div className="space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleDeleteEmptyTopics}
                        disabled={isSubmitting || !emptyTopics.some(t => t.isSelectedForDeletion)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Deleting...' : `Delete Selected Topics (${emptyTopics.filter(t => t.isSelectedForDeletion).length})`}
                    </button>
                </div>
            </div>
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
                        {[1, 2, 3, 4].map((stepNum) => (
                            <div
                                key={stepNum}
                                className={`flex items-center ${stepNum < 4 ? 'flex-1' : ''}`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= stepNum
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                        }`}
                                >
                                    {stepNum}
                                </div>
                                {stepNum < 4 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
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
                {step === 4 && renderStep4()}
            </div>
        </div>
    );
};

export default AutoCategorizeWizard; 