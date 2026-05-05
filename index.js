import { serve } from '@hono/node-server'
import app from './server.js'

const port = process.env.PORT || 3000

serve({
    fetch: app.fetch,
    port
})