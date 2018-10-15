/* eslint-env node */
const express = require('express')
const app = express()
const path = require('path')
const DataCollector = require('./dataCollector')
const dataCollector = new DataCollector()

const PORT = process.env.PORT || 3000

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)   // eslint-disable-line no-console
    next()
})

function sendNodes(source, selector, res) {
  const calculateFields = node => {
    node.visible = !!selector.exec(node.type)
    if (node.type === 'topic') {
      node.fontSize = node.links ? Math.sqrt(node.links.reduce((s, e) => s + e.nodes.length, 0)) : 1
    }
    return node
  }

  dataCollector
    .get(source)
    .then(nodes => nodes.map(calculateFields))
    .then(nodes => res.json({nodes}))
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, '..', 'favicon.ico')))
app.use('/dist', express.static(path.join(__dirname, '..', 'dist')))
app.use('/data.yaml', (req, res) => sendNodes('data.yaml', /root|person/, res))
app.use('/data.json', (req, res) => sendNodes('data.json', /topic/, res))
app.use('/data', (req, res) => sendNodes('data', /root|person/, res))
app.use(express.static(__dirname))

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`) // eslint-disable-line no-console
})
