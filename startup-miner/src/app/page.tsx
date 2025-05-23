import { createSupabaseServerClient } from '@/lib/supabaseClient'

export default async function HomePage() {
  const supabase = createSupabaseServerClient()
  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Startup Ideas</h1>
      <ul className="space-y-4">
        {ideas?.map(idea => (
          <li key={idea.id} className="p-4 border rounded bg-white">
            <h2 className="text-lg font-semibold">{idea.title}</h2>
            <p><strong>Thesis:</strong> {idea.thesis}</p>
            <p><strong>Stack:</strong> {idea.tech_stack}</p>
            <p><strong>Monetization:</strong> {idea.monetization}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

