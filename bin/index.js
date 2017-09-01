#!/usr/bin/env node



const fs = require('fs'),
  path = require('path'),
  inquirer = require('inquirer');

const Prompt = require('inquirer-select-line');
const orig = Prompt.prototype.onSubmit;
let selectedFile;
let buffer = "";

Prompt.prototype.onSubmit = function() {
  buffer = "";
  return orig.apply(this, arguments);
};

inquirer.registerPrompt('selectLine', Prompt);

const prompt = {
  type: 'selectLine',
  name: 'file',
  choices: null,
  files: null
}
prompt.message = function() {
  return process.cwd();
}
prompt.placeholder = function(indx) {
  selectedFile = prompt.files[indx];
  return 'navigate ' + (prompt.choices[indx] || (prompt.files[indx] && prompt.files[indx].filename)) || 'someplace';
}


function readdirWithStats(dir, cb) {
  fs.readdir(dir, function(err, files) {

    const _f = files.map(function(file) {
      return new Promise(function(resolve, reject) {
        fs.stat(path.join(dir, file), function(err, stats) {
          if (err) {
            return reject(err);
          }
          return resolve({
            filename: file,
            filepath: path.join(dir, file),
            directory: stats.isDirectory(),
            size: stats.size,
            ctime: stats.ctime,
            atime: stats.atime,
            mtime: stats.mtime
          });
        });
      })
    });

    Promise.all(_f).then(function(results) {
      return cb(results);
    }).catch(function(err) {
      console.log(err);
    })
  })
}


function updatePrompt(fArr) {
  fArr = fArr.filter(function(f) { return f && f.filename && f.filepath; });

  prompt.choices = fArr.map(function(f) {
    return f.filename;
  });

  prompt.choices.push('back ../');
  prompt.files = fArr;
  prompt.files.push({
    filename: path.basename(path.dirname(process.cwd())),
    filepath: path.dirname(process.cwd()),
    directory: true
  });

  inquirer.prompt([prompt]).then(function(answers) {
    if (selectedFile.directory) {
      navigateDir(prompt.files[answers.file].filepath);
    } else {
      fs.createReadStream(selectedFile.filepath).pipe(process.stdout);
      navigateDir(path.dirname(prompt.files[answers.file].filepath));
    }
  });

}


function navigateDir(dir) {
  process.chdir(dir);
  readdirWithStats(dir, updatePrompt);
}

(function() {


  process.stdin.on('data', function(key) {

    function bufferHasSpace() {
      return buffer.endsWith(' ');
    }

    process.stdout.clearLine();
    process.stdout.cursorTo(0);

    if (key.toString('base64') === 'CA==') {
      buffer = buffer.substring(0, buffer.length - 1);
    } else if (key.toString('base64') === 'G1syfg==') {
      buffer += bufferHasSpace() ? selectedFile.filepath : ' ' + selectedFile.filepath;
    } else if (key.toString('base64') === 'G1syfg==') {
      buffer += bufferHasSpace() ? process.cwd() : ' ' + process.cwd();
    } else {
      buffer += key;
    }
    process.stdout.write(buffer);
  });
  navigateDir(process.cwd());

})();