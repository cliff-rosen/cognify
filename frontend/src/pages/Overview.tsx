import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function Overview() {
  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await api.get('/api/topics')
      return data
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topics?.map((topic: any) => (
          <div key={topic.id} className="rounded-lg border p-4">
            <h2 className="text-xl font-semibold">{topic.title}</h2>
            <p className="mt-2 text-gray-600">{topic.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 