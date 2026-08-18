// Server-side broadcast from an edge function. Edge functions are
// stateless/short-lived, so subscribing to a realtime channel just to
// send one message and tear it down is wasted overhead — Supabase's REST
// broadcast endpoint sends a message without ever opening a websocket.

export async function broadcastToRoom(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `room:${sessionId}`,
          event,
          payload,
        },
      ],
    }),
  })

  if (!res.ok) {
    console.error(
      'broadcastToRoom failed',
      res.status,
      await res.text().catch(() => ''),
    )
  }
}
