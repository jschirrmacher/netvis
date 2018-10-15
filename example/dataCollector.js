/* eslint-env node */
const YAML = require('yamljs')
const fs = require('fs')
const path = require('path')

class DataCollector {
  constructor() {
    this.store = {}
  }

  readDir(source) {
    return new Promise((resolve, reject) => {
      fs.readdir(source, null, (err, result) => err ? reject(err) : resolve(result.map(file => path.join(source, file))))
    })
  }

  readFile(file) {
    const fileReader = {
      yml: fileName => YAML.load(fileName),
      yaml: fileName => YAML.load(fileName),
      json: fileName => JSON.parse(fs.readFileSync(fileName))
    }

    const data = fileReader[file.replace(/.*\.(json|yaml|yml)$/, '$1')](file)
    return data.nodes || data
  }

  async readData(source) {
    source = path.join(__dirname, source)
    const stats = fs.lstatSync(source)
    const list = stats.isDirectory() ? await this.readDir(source) : stats.isFile() ? [source] : []
    return list.map(file => this.readFile(file)).reduce((a, b) => a.concat(b), [])
  }

  async get(source) {
    return this.store[source] || (this.store[source] = await this.readData(source))
  }
}

module.exports = DataCollector
