const Home: React.FC = () => {
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const [topics, setTopics] = useState<Topic[]>([])
    const centerWorkspaceRef = useRef<CenterWorkspaceHandle>(null)

    return (
        <div className="flex h-screen">
            <LeftSidebar
                onSelectTopic={setSelectedTopicId}
                selectedTopicId={selectedTopicId}
                topics={topics}
                onTopicsChange={setTopics}
                onEntryMoved={() => {
                    centerWorkspaceRef.current?.refreshEntries()
                }}
            />
            <CenterWorkspace
                ref={centerWorkspaceRef}
                selectedTopicId={selectedTopicId}
            />
            {/* ... */}
        </div>
    )
} 