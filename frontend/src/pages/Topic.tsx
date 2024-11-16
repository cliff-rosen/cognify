import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/apiService'

export default function Topic() {
  const { topicId } = useParams()
  
  const { data: topic } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const { data } = await api.get(`/topics/${topicId}`)
      return data
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{topic?.title}</h1>
      <p className="text-gray-600">{topic?.description}</p>
      {/* Add entries list here */}
    </div>
  )
} 