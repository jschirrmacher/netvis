const express = require('express')
const app = express()
const path = require('path')

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
})

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')))
app.use('/dist', express.static(__dirname + '/../dist'))
app.use(express.static(__dirname))

app.listen(3000, () => console.log('Listening on http://localhost:3000'))

