var fs = require('fs')
var path = require('path')
var through = require('through2')
var dat = require('dat')
var jade = require('jade')
var cat = require('concat-stream')

var correctorPath = path.normalize(process.argv.slice(2)[0])
var corrector = require('./' + correctorPath)
var dirname = './' + path.dirname(correctorPath)

var correct = corrector()

// At the end, print distribution of correct answers
var stats = { failed: 0 }
function printStats() {
  Object.keys(stats).forEach(function(key) {
    console.log(key + ' ' + stats[key])
  })
}

// Initialize Dat repo
var datRepo = dat(dirname, ready)

// Starts pipeline after Dat repo is ready
function ready() {
  var datStream = datRepo.createReadStream()
  datStream.pipe(correct)
  .pipe(setQuestionsValues())
  .pipe(renderReports())
  .on('end', printStats)
  .pipe(cat(renderOverviews))
}

// Stream that sets the value of questions
function setQuestionsValues() {
  return through.obj(transform)
  function transform(obj, enc, next) {
    var values = {
      1: 1,
      2: 1,
      3: 0.5,
      4: 0.5,
      5: 1,
      6: 1,
      7: 1,
      8: 1,
      9: 1,
      10: 1,
      11: 1,
      12: 1,
      13: 1,
      14: 1,
      15: 1,
      16: 1,
      17: 0,
      18: 1
    }
    var total = 0
    Object.keys(values).forEach(function(k) { total += values[k] })

    obj.ptotal = total
    obj.pscore = 0

    Object.keys(obj.questions).forEach(calcScore)
    function calcScore(key) {
      obj.questions[key].ptotal = values[key]
      obj.questions[key].pscore = obj.questions[key].score * values[key]
      obj.pscore += obj.questions[key].pscore
    }
    var ppercent = (obj.pscore*100)/obj.ptotal
    var roundPpercent = Math.round(ppercent)
    obj.ppercent = roundPpercent

    if (typeof stats[obj.ppercent] === 'undefined') {
      stats[obj.ppercent] = 0
    }
    stats[obj.ppercent]++

    if (obj.ppercent < 44) { stats.failed++ }

    this.push(obj)
    next()
  }
}

// Stream that renders the report using a Jade template and the correction object
function renderReports() {
  return through.obj(transform)
  function transform(obj, enc, next) {
    var fn = jade.compileFile('template.jade')
    var html = fn(obj)
    var resultPath = path.join(dirname, 'results/', obj.id+'.html')
    fs.writeFileSync(resultPath, html)
    this.push(obj)
    next()
  }
}

// Stream that renders a Questions Overview Report
function renderOverviews(data) {
  var result = {}
  var worstQuestions = {}
  var grades = []

  data.forEach(processStudent)
  function processStudent(student) {
    // Save student info in table
    grades.push({
      id: student.id,
      name: student.name,
      email: student.email,
      score: student.score,
      percent: student.percent,
      pscore: student.pscore,
      ppercent: student.ppercent
    })

    // Reformat to have data sorted by Questions
    Object.keys(student.questions).forEach(processQuestion)
    function processQuestion(key) {
      if (!result[key]) { result[key] = {} }
      var question = student.questions[key]
      if (!result[key][question.solutions.toString()]) {
        result[key][question.solutions.toString()] = {}
      }
      if (!result[key][question.solutions.toString()][question.answer]) {
        result[key][question.solutions.toString()][question.answer] = {
          freq: 0,
          studentsIDs: [],
          score: question.score
        }
      }
      result[key][question.solutions.toString()][question.answer].freq++
      result[key][question.solutions.toString()][question.answer].studentsIDs.push(student.id)
      if (question.score === 0) {
        if (!worstQuestions[key]) { worstQuestions[key] = 0 }
        worstQuestions[key]++
      }
      if (result[key][question.solutions.toString()][question.answer].score !== question.score) {
        console.log("Something is messed up")
      }
    }
  }
  var obj = {
    data: result,
    worstQuestions: worstQuestions,
    grades: grades
  }
  var overviewJade = jade.compileFile('overview.jade')
  var overviewHTML = overviewJade(obj)
  var overviewPath = path.join(dirname, 'results/overview.html')
  fs.writeFileSync(overviewPath, overviewHTML)

  var gradesJade = jade.compileFile('grades.jade')
  var gradesHTML = gradesJade(obj)
  var gradesPath = path.join(dirname, 'results/grades.html')
  fs.writeFileSync(gradesPath, gradesHTML)

  // Also write a CSV
  var csvPath = path.join(dirname, 'results/grades.csv')
  var csv = fs.createWriteStream(csvPath)
  grades.forEach(writeRow)
  function writeRow(student) {
    var row = [
      student.id,
      student.name,
      student.email,
      student.score,
      student.pscore,
      student.percent,
      student.ppercent
    ].join(',') + '\n'
    csv.write(row)
  }
  csv.end()
}
