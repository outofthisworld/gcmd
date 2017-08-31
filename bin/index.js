#!/usr/bin/env node

const fs = require('fs'),
    path = require('path'),
    inquirer = require('inquirer');

inquirer.registerPrompt('selectLine', require('inquirer-select-line'));
let prompt = {
    type: 'selectLine',
    name: 'file',
    choices: null,
    files: null
}
prompt.message = function() {
    return process.cwd();
}
prompt.placeholder = function(indx) {
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
        })
    })
}

function updatePrompt(fArr) {
    fArr = fArr.filter(function(f) { return f && f.filename && f.filepath })
    console.dir(fArr)
    prompt.choices = fArr.map(function(f) {
        return f.filename;
    });
    console.log(prompt.choices)
    prompt.choices.push('back ../');
    prompt.files = fArr;
    prompt.files.push({
        filename: path.basename(path.dirname(process.cwd())),
        filepath: path.dirname(process.cwd())
    });

    inquirer.prompt([prompt]).then(function(answers) {
        const selectedFile = prompt.files[answers.file]
        if (selectedFile.directory) {
            navigateDir(prompt.files[answers.file].filepath);
        } else {
            fs.createReadStream(selectedFile.filepath).pipe(process.stdout);
        }
    });

    process.stdout.write('\r\n');
}


function navigateDir(dir) {
    process.stdout.write('\r\n\x1B[2J\x1B[0f');
    process.stdout.write('\r\n\033c');
    process.chdir(dir);
    readdirWithStats(dir, updatePrompt)
}

(function() {
    process.stdin.setRawMode(true);
    process.stdin.on('data', function(key) {

        if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x43) {
            console.log('>')
        } else if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x44) {
            console.log('<')
        } else if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x41) {
            console.log('up')
        } else if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x42) {
            console.log('down')
        } else if (key[0] === 0x03) {
            process.exit(1);
        } else {

        }
    })
    navigateDir(process.cwd());
})();