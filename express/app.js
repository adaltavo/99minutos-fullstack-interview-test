const express = require('express');
const main = express();
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
// read the .env file and cast it to an object.
const envFile = fs.existsSync(path.join(__dirname + '/../.env')) ? 
    Object.assign.apply({}, fs.readFileSync(path.join(__dirname + '/../.env'), 'utf8').split("\n").map(i => {
        let keyValue = i.split('=');
        let newObject = {};
        newObject[keyValue[0]] = keyValue[1];
        return newObject;
    })) : {};

// Serve the assets.
main.use('/js', express.static(path.join(__dirname + '/../js')));
main.use('/css', express.static(path.join(__dirname + '/../css')));
// Serve the main html.
main.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/../index.html'));
});
// Gets the branches on the repo.
main.get('/api/branches', (req,res) => {
    exec('git branch').then(v => res.json({
        branches: [
            ...v.stdout.split("\n")
                .map(item => item.trim())
                .filter(item => item !== "")
        ]
    }));
})
// Get branch details.
main.get('/api/branches/:branch', (req,res) => {
    exec('git log --pretty=">>|commit-delimiter|<<%n%h||%s||%at||%ai||%aN||%aE||" --name-only ' + req.params.branch).then(v => res.json({
        commits: [
            ...v.stdout.split(">>|commit-delimiter|<<\n")
                .filter(item => item !== "")
                .map(item => {
                    item = item.trim();
                    let columns = item.split('||');
                    return {
                        "commit hash": columns[0],
                        "commit message": columns[1],
                        "date": columns[3],
                        "author name": columns[4]
                    }
                })
        ]
    }));
})
// Get commit details.
main.get('/api/commit/:commit', (req,res) => {
    exec('git log --pretty=">>|commit-delimiter|<<%n%H||%s||%at||%ai||%ct||%ci||%aN||%aE||" --name-only ' + req.params.commit + ' -1' ).then(v => res.json({
        ...v.stdout.split(">>|commit-delimiter|<<\n")
            .filter(item => item !== "")
            .map(item => {
                item = item.trim();
                let columns = item.split('||');
                return {
                    "commit hash": columns[0],
                    "commit message": columns[1],
                    "author timestamp": columns[2],
                    "author date": columns[3],
                    "committer timestamp": columns[4],
                    "committer date": columns[5],
                    "author name": columns[6],
                    "author email": columns[7],
                    "files changed": columns[8].trim(),
                    "number of files changed": columns[8].trim().split("\n").length
                }
            })[0]
    }));
})
// Get the comparison details.
main.get('/api/compare', (req,res) => {
    exec('git diff ' + req.query.branchTo + '...' + req.query.branchFrom)
    .then(v => res.json({
        raw: v.stdout
    }));
})
// Get the project inits.
main.get('/api/project/init', (req,res) => {
    exec("basename -s .git `git config --get remote.origin.url`")
    .then(v => res.json({
        project: v.stdout.trim(),
        "github username": envFile["GITHUB_USER"] || 'octocat',
    }));
})
// Start web server.
main.listen(envFile["HTTP_PORT"] || 8083, () => {
    console.info('Git tool running on http://127.0.0.1:' + envFile["HTTP_PORT"] || 8083 + '...');
})
