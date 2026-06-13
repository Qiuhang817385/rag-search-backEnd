const base = process.env.LANGGRAPH_URL ?? 'http://[::1]:8123'

async function json(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text.slice(0, 400)}`)
  }
  return text ? JSON.parse(text) : null
}

const assistants = await json('POST', '/assistants/search', {
  graph_id: 'interview_agent',
  limit: 1,
})
const assistantId = assistants[0]?.assistant_id
if (!assistantId) throw new Error('interview_agent assistant not found')

const thread = await json('POST', '/threads', {})
const threadId = thread.thread_id

const res = await fetch(`${base}/threads/${threadId}/runs/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assistant_id: assistantId,
    input: { messages: [{ role: 'user', content: '只说一个字：好' }] },
    stream_mode: ['messages-tuple'],
  }),
})
if (!res.ok) {
  throw new Error(`stream ${res.status}: ${(await res.text()).slice(0, 400)}`)
}

const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
}

console.log('OK assistant=%s thread=%s', assistantId, threadId)
console.log('stream head:', buffer.slice(0, 600))
