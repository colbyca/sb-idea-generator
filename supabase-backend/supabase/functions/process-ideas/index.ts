// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "supabase-js"
import OpenAI from "openai"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

type Log = {
  queue_id: string
  success: boolean
  error_message: string
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
}
Deno.serve(async _req => {
  // 1. pull up to N unprocessed rows
  const { data: queueRows, error } = await supabase
    .from('ingestion_queue')
    .select('*')
    .eq('processed', false)
    .limit(100)


  if (error) {
    console.log(error)
    return new Response('error', { status: 500 })
  }
  if (!queueRows.length) return new Response('nothing to do')

  for (const row of queueRows) {
    let log: Log = {
      queue_id: row.id,
      success: false,
      error_message: '',
      prompt_tokens: 0,
      completion_tokens: 0,
      cost_usd: 0,
    }
    try {
      // 2. Quick heuristic or cheap model to discard non-complaints
      const maybeComplaint = /i wish|why isn'?t there|someone needs|i hate|this sucks|annoying|frustrated|can'?t find|should be|need a|want a|looking for|hard to|difficult to|wish there was|if only|would be great if|why can'?t|why do|why does/i.test(row.body.toLowerCase());
      if (!maybeComplaint) {
        console.log('Not a complaint: ', row.body, row.id)
        await supabase.from('ingestion_queue').update({ processed: true }).eq('id', row.id);
        continue;
      }
      console.log('Found complaint: ', row.body, row.id)

      // Check if the complaint could be solved with software
      const softwareCheck = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: 'You are a technical advisor. Respond with only YES or NO.' },
          { role: 'user', content: `Could this complaint be solved with software? Complaint: ${row.body}` }
        ]
      })

      const isSoftwareSolvable = softwareCheck.choices[0].message.content?.trim().toUpperCase().includes('YES')
      if (!isSoftwareSolvable) {
        console.log('Not software-solvable: ', row.body, row.id)
        await supabase.from('ingestion_queue').update({ processed: true }).eq('id', row.id);
        continue;
      }

      // 3. Ask GPT-4.1 to craft the idea
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You generate concise, actionable startup ideas. In less than 120 words' },
          { role: 'user', content: `Complaint:\n${row.body}\n\nFormat (JSON): {title:title, thesis:a startup thesis, tech_stack:MVP tech stack, monetization:monetization}` }
        ]
      })

      // 4. Parse the answer
      const answer = completion.choices[0].message.content ?? ''
      let answerJson
      try {
        answerJson = JSON.parse(answer)
      } catch (parseError) {
        console.log('Failed to parse answer JSON:', parseError)
        console.log('Raw answer:', answer)
        continue
      }

      // 5. Persist the idea
      const { data: idea } = await supabase
        .from('ideas')
        .upsert({
          title: answerJson.title,
          thesis: answerJson.thesis,
          tech_stack: answerJson.tech_stack,
          monetization: answerJson.monetization,
        })
        .select()
        .single()

      // 6. Mark queue row processed & link
      await supabase
        .from('ingestion_queue')
        .update({ processed: true, idea_id: idea.id })
        .eq('id', row.id)

      const promptTokens = completion.usage?.prompt_tokens ?? 0
      const completionTokens = completion.usage?.completion_tokens ?? 0
      log = {
        ...log,
        success: true,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: ((promptTokens + completionTokens) / 1_000_000) * 0.1,
      }
    } catch (err) {
      console.log(`Error processing row ${row.id}:`, err)
      log.error_message = (err as Error).message
    } finally {
      await supabase.from('idea_generation_log').insert(log)
    }
  }

  return new Response('ok')
})
