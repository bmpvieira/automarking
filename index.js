var fs = require('fs')
var through = require('through2')
var dat = require('dat')
var jade = require('jade')
var path = require('path')

var correctorPath = path.normalize(process.argv.slice(2)[0])
var corrector = require('./' + correctorPath)
var dirname = './' + path.dirname(correctorPath)

var correct = corrector()

// At the end, print distribution of correct answers
process.on('exit', function() {
  Object.keys(correct.stats).forEach(function(key) {
    console.log(key + ' ' + correct.stats[key])
  })
})

// Initialize Dat repo
var datRepo = dat(dirname, ready)

// Starts pipeline after Dat repo is ready
function ready() {
  var datStream = datRepo.createReadStream()
  datStream.pipe(correct).pipe(render())
}

// Stream that renders the report using a Jade template and the correction object
function render() {
  return through.obj(transform)
  function transform(obj, enc, next) {
    var fn = jade.compileFile('template.jade')
    var html = fn(obj)
    var resultPath = path.join(dirname, 'results/', obj.id+'.html')
    fs.writeFileSync(resultPath, html)
    next()
  }
}
