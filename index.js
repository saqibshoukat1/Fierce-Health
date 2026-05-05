const { serve } = require('@hono/node-server')
const app = require('./server.js')

const port = process.env.PORT || 3000

serve({
    fetch: app.fetch,
    port
})