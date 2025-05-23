import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'openai';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

Deno.serve(async _req => {
    // 1. pull up to N unprocessed rows
    const { data: queueRows, error } = await supabase
        .from('ingestion_queue')
        .select('*')
        .eq('processed', false)
        .limit(20)

    if (error) throw error
    if (!queueRows.length) return new Response('nothing to do')

    for (const row of queueRows) {
        let log = { queue_id: row.id, success: false } as any
        try {
            // 2. Quick heuristic or cheap model to discard non-complaints
            const maybeComplaint = /i wish|why isn'?t there|someone needs/i.test(row.body)
            if (!maybeComplaint) {
                await supabase.update({ processed: true }).in('ingestion_queue', { id: row.id })
                continue
            }

            // 3. Ask GPT-4o to craft the idea
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You generate concise, actionable startup ideas.' },
                    { role: 'user', content: `Complaint:\n${row.body}\n\nWrite 1. a startup thesis, 2. MVP tech stack, 3. monetization (<120 words).` }
                ]
            })

            const answer = completion.choices[0].message.content ?? ''
            const [title, thesis, tech_stack, monetization] =
                answer.split(/\n+/).map(s => s.replace(/^\d+\.\s*/, ''))

            // 4. Embed the thesis for later similarity search
            const embed = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: thesis
            })

            // 5. Persist the idea
            const { data: idea } = await supabase
                .from('ideas')
                .insert({
                    title,
                    thesis,
                    tech_stack,
                    monetization,
                    embedding: embed.data[0].embedding
                })
                .select()
                .single()

            // 6. Mark queue row processed & link
            await supabase
                .from('ingestion_queue')
                .update({ processed: true, idea_id: idea.id })
                .eq('id', row.id)

            log = {
                ...log,
                success: true,
                prompt_tokens: completion.usage.prompt_tokens,
                completion_tokens: completion.usage.completion_tokens,
                cost_usd:
                    ((completion.usage.prompt_tokens + completion.usage.completion_tokens) / 1_000) *
                    0.005 /* ← example price */,
            }
        } catch (err) {
            log.error_message = (err as Error).message
        } finally {
            await supabase.from('idea_generation_log').insert(log)
        }
    }

    return new Response('ok')
})
