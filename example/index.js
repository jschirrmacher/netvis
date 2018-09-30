/* eslint-env node */
const express = require('express')
const app = express()
const path = require('path')

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)   // eslint-disable-line
    next()
})

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, '..', 'favicon.ico')))
app.use('/dist', express.static(path.join(__dirname, '..', 'dist')))
app.use(express.static(__dirname))

app.listen(3000, () => {
  console.log('Listening on http://localhost:3000') // eslint-disable-line
})
