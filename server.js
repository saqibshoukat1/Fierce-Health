const { Hono } = require('hono')
const { serveStatic } = require('@hono/node-server/serve-static')

const app = new Hono()

// serve static files
app.use('/*', serveStatic({ root: './public' }))

// fallback route
app.get('*', (c) => {
  return c.html('index.html')
})

export default app