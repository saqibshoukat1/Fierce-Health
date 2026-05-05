import { Hono } from 'hono'
import { serveStatic } from 'hono/node-server'

const app = new Hono()

// serve static files
app.use('/*', serveStatic({ root: './public' }))

// fallback route
app.get('*', (c) => {
  return c.html('index.html')
})

export default app