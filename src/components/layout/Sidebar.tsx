import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export function Sidebar() {
  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await api.get('/api/topics')
      return data
    },
  })

  return (
    <div className="w-64 border-r bg-background p-4">
      <h2 className="mb-4 text-lg font-semibold">Topics</h2>
      <nav className="space-y-2">
        {topics?.map((topic: any) => (
          <Link
            key={topic.id}
            to={`/topic/${topic.id}`}
            className="block rounded-lg px-3 py-2 hover:bg-accent"
          >
            {topic.title}
          </Link>
        ))}
      </nav>
    </div>
  )
} 