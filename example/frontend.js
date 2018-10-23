const converter = new showdown.Converter()
const source = document.getElementById('detailForm').innerHTML
const detailFormTemplate = Handlebars.compile(source)
const name = location.search.match(/n=(\w+)/) ? 'data.' + RegExp.$1 : 'data'
const network = new Network(name, '#root', {
  nameRequired: function() {
    return Promise.resolve(window.prompt('Name'))
  },
  newNode: function(name) {
    console.log('New node', name)
    return {name, shape: 'circle'}
  },
  nodeRemoved: function(node) {
    console.log('Node removed', node)
  },
  newLink: function(link) {
    console.log('New link', link)
  },
  showDetails: function(data, form, node) {
    return new Promise(resolve => {
      Object.keys(data.links).forEach(function (index) {
        data.links[index].linkTitle = Handlebars.compile(texts.linkTitle)(data.links[index])
      })
      data.mdDescription = converter.makeHtml(data.description || texts['defaultDescription'])
      form.innerHTML = detailFormTemplate(data)
      document.querySelectorAll('.command').forEach(el => {
        el.classList.toggle('active', !el.dataset.visible || !!eval(el.dataset.visible))
        el.addEventListener('click', event => {
          network[event.target.dataset.cmd](node, event.target.dataset.params)
          resolve()
        })
      })
      form.getElementsByClassName('close')[0].addEventListener('click', event => {
        event.preventDefault()
        resolve()
      })
    })
  }
}, texts)
