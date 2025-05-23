import { createSupabaseServerClient } from '@/lib/supabaseClient'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = createSupabaseServerClient()
  // Goes straight to login page if the user isn't logged in or does not exist
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   redirect('/login')
  // }

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="p-6">
      <h1 className="text-4xl font-extrabold mb-6 text-gray-900">Startup Ideas</h1>
      <ul className="space-y-6">
        {ideas?.map(idea => (
          <li
            key={idea.id}
            className="p-6 border rounded bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.15)]"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-blue-600">{idea.title}</h2>
              <p><strong>Thesis:</strong> {idea.thesis}</p>
              <p><strong>Stack:</strong> {idea.tech_stack}</p>
              <p><strong>Monetization:</strong> {idea.monetization}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}