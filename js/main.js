"use strict";

// Initialize project values.
fetch('/api/project/init').then(res => res.json())
.then(initData => { 
    localStorage.setItem('project', initData["project"]);
    localStorage.setItem('github_username', initData["github username"]);
});
document.addEventListener('DOMContentLoaded', () => {
    // See branches action button.
    document.getElementById('see-branches').onclick = e => {
        showBranchesView();
    };
    // See branches action button.
    document.getElementById('create-pr').onclick = e => {
        showCreatePrView();
    };
    // See branches action button.
    document.getElementById('see-prs').onclick = e => {
        showPRsView();
    };
}, false);

/**
 * Function to create a table from a json array.
 * 
 * @param {array} jsonArray The array containing the objects array.
 *   The object properties will be used as the table headers, and the values
 *   as the table cells.
 * 
 * @param {function} itemClickEvent A function to trigger an action whenever
 *   the user click on a row. This keyword will be binded to the respective row object.
 * 
 * @param {array} operations An array ob objects, which contains the operations
 *   that will be allowed on the object. Each object within this array will be expected as:
 * 
 *   {
 *      **name**: the text displayed on the button,
 *      **title**: the title of the button,
 *      **action**: a function to trigger when the user clicks on the button. This keyword will be
 *          binded to the respective row object,
 *      **validate**: a function that will be used to determine if the button should be displayed or not.
 *          This keyword will be binded to the respective row object
 *   }
 * 
 * @return {HTMLTableElement} The table object.
 * 
 */
const createTable = (jsonArray, itemClickEvent = () => {}, operations = []) => {
    let thead = document.createElement('thead');
    // Process the table headers.
    for (let property in jsonArray[0]) {
        let th = document.createElement('th');
        th.innerText = property;
        thead.appendChild(th);
    }
    // Process the operations column header.
    if (operations.length !== 0) {
        let th = document.createElement('th');
        th.innerText = 'operations';
        thead.appendChild(th);
    }
    let tbody = document.createElement('tbody');
    // Process the table body.
    for (let json of jsonArray) {
        let tr = document.createElement('tr');
        let td = '';
        for (let property in json) {
            td = document.createElement('td');
            td.innerText = json[property];
            tr.appendChild(td);
        }
        tr.setAttribute('id', tr.firstChild.innerText);
        tr.onclick = itemClickEvent.bind(tr);
        // Process the operations column.
        if (operations.length !== 0) {
            td = document.createElement('td');
            for (let operation of operations) {
                if (operation.validate && !operation.validate.bind(json)()) {
                    continue;
                }
                let optButton = document.createElement('button');
                optButton.innerText = operation.name;
                optButton.setAttribute('type', 'button');
                optButton.setAttribute('title', operation.title);
                optButton.onclick = operation.action.bind(json);
                td.appendChild(optButton);
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    // Create actual table object.
    let table = document.createElement('table');
    // Append table contents.
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}
/**
 * Updates the page with the given content.
 * 
 * @param {HTMLElement} newContent The new content.
 */
const updateContent = (newContent) => {
    // The segment of the html that will be changing it's content, simulating a SPA.
    let content = document.getElementById('page--dynamic-content');
    // The old content.
    content.innerHTML = '';
    content.appendChild(newContent);
}
/**
 * Displays the Branches view.
 */
const showBranchesView = () => {
    // Fetch the branches from API.
    fetch('/api/branches', {
        cache: "no-store",
    })
    // Cast response to object.
    .then(r => r.json())
    // Process casted response.
    .then(data => {
        // Make each item element to display the branch commits.
        const itemClickEvent = function (e) {
           showCommitsView(this.id.replace(/[\* ]*/g,''));
        };
        // Return a new promise with the table.
        return Promise.resolve(
            // Grant each branch name a respective json object.
            createTable(data.branches.map(i => {
                return {"branch name": i}
            }), itemClickEvent)
        );
    })
    // Update the main content.
    .then(table => {
        // Add custom classes to table.
        table.classList.add('table--branch');
        // Create div wrapper.
        let div = document.createElement('div');
        // Create a title header.
        let title = document.createElement('h2');
        title.innerText = 'Available branches on the project';
        div.appendChild(title);
        div.appendChild(table);
        updateContent(div);
    })
    .catch(defaultErrorHandler);

}
/**
 * Displays the commits view belonging to the given branch.
 * 
 * @param {string} branch The git branch name
 */
const showCommitsView = branch => {
    fetch('/api/branches/' + branch,{
        cache: "no-store",
    })
        .then(r => r.json())
        .then(branchData => {
            // Make each item element to display the branch commits.
            const itemClickEvent = function (e) {
                showCommitDetailsView(this.id.replace(/[\* ]*/g,''), branch);
             };
            // The go back button.
            let goBackButton = document.createElement('button');
            goBackButton.setAttribute('type', 'button');
            goBackButton.innerText = 'Go back to branches';
            goBackButton.onclick = () => showBranchesView();
            // The branches table.
            let table = createTable(branchData.commits, itemClickEvent);
            table.classList.add('table--commits');
            // Create div wrapper.
            let div = document.createElement('div');
            // Create a title header.
            let title = document.createElement('h2');
            title.innerText = 'Commits for branch ' + branch;
            // Create a description paragraph.
            let description = document.createElement('p');
            description.innerText = 'Click on any item in order to see more details.';
            // Append the content to the main div.
            div.appendChild(goBackButton);
            div.appendChild(title);
            div.appendChild(description);
            div.appendChild(table);
            updateContent(div);
        })
        .catch(defaultErrorHandler);
}
/**
 * Displays the Pull Requests view.
 */
const showPRsView = () => {
    // Fetch the PRs from github.
    fetch('https://api.github.com/repos/' + localStorage.getItem('github_username') + '/' + localStorage.getItem('project') + '/pulls?' + new URLSearchParams({
        state: 'all'
    }), {
        method: 'GET',
        headers: {
            "Accept": "application/vnd.github.v3+json"
        },
        cache: "no-store",
    })
        .then(r => r.json())
        .then(prs => Promise.resolve(prs.map(i => {
            // Fetch only the needed files.
            return {
                "id": i.id,
                "number": i.number,
                "url": i.url,
                "state": i.merged_at ? 'merged' : i.state,
                "title": i.title,
                "body": i.body,
                "base": i.base.ref,
                "head": i.head.ref,
                "user name":i.user.login
            }
        })))
        .then(prs => {
            // The branches table.
            let table = createTable(prs, ()=>{}, [
                // Create the open PR operation.
                {
                    name: 'O',
                    title: 'Re-open PR',
                    validate: function() {return this.state === 'closed'},
                    action: function() {
                        Promise.resolve(window.prompt('Enter your github token to continue'))
                        .then(token => {
                            return fetch('https://api.github.com/repos/' + localStorage.getItem('github_username') + '/' + localStorage.getItem('project') + '/pulls/' + this.number, {
                                method: 'PATCH',
                                cache: "no-store",
                                headers: {
                                    "Accept": "application/vnd.github.v3+json",
                                    'Content-Type': 'application/json',
                                    'Host': 'api.github.com',
                                    'User-Agent': 'curl/7.64.1',
                                    'Authorization': 'token ' + token
                                },
                                body: JSON.stringify({
                                    "state": "open",
                                })
    
                            });
                        })
                        .then(res => res.json())
                        .then(handlePrResponse)
                        .catch(defaultErrorHandler);
                    }
                },
                // Create the close PR operation.
                {
                    name: 'X',
                    title: 'Close PR',
                    validate: function() {return this.state === 'open'},
                    action: function() {
                        Promise.resolve(window.prompt('Enter your github token to continue'))
                        .then(token => {
                            return fetch('https://api.github.com/repos/' + localStorage.getItem('github_username') + '/' + localStorage.getItem('project') + '/pulls/' + this.number, {
                                method: 'PATCH',
                                cache: "no-store",
                                headers: {
                                    "Accept": "application/vnd.github.v3+json",
                                    'Content-Type': 'application/json',
                                    'Host': 'api.github.com',
                                    'User-Agent': 'curl/7.64.1',
                                    'Authorization': 'token ' + token
                                },
                                body: JSON.stringify({
                                    "state": "close",
                                })
    
                            });
                        })
                        .then(res => res.json())
                        .then(handlePrResponse)
                        .catch(defaultErrorHandler);
                    }
                },
                // Create the merge PR operation.
                {
                    name: '<<<',
                    title: 'Merge PR',
                    validate: function() {return this.state === 'open'},
                    action: function() {
                        Promise.resolve(window.prompt('Enter your github token to continue'))
                        .then(token => {
                            return fetch('https://api.github.com/repos/' + localStorage.getItem('github_username') + '/' + localStorage.getItem('project') + '/pulls/' + this.number + '/merge', {
                                method: 'PUT',
                                cache: "no-store",
                                headers: {
                                    "Accept": "application/vnd.github.v3+json",
                                    'Content-Type': 'application/json',
                                    'Host': 'api.github.com',
                                    'User-Agent': 'curl/7.64.1',
                                    'Authorization': 'token ' + token
                                },
                                body: JSON.stringify({
                                    "commit_title": "Merged remotely by Gustavo's git tool",
                                })
    
                            });
                        })
                        .then(res => res.json())
                        .then(handlePrResponse)
                        .catch(defaultErrorHandler);
                    }
                },
            ]);
            // The refresh button.
            let refresh = document.createElement('button');
            refresh.setAttribute('type', 'button');
            refresh.innerText = 'Refresh data';
            refresh.onclick = () => showPRsView();
            // Create div wrapper.
            let div = document.createElement('div');
            // Create a title header.
            let title = document.createElement('h2');
            title.innerText = 'PR list ';
            // Create a description paragraph.
            let description = document.createElement('p');
            description.innerText = 'In the operations column, you may close(X), re-open(O) or merge(<<<) an open PR. If you want to create a new one, please got to the "Create Pr" tab.';
            // Append content to the main div.
            div.appendChild(title);
            div.appendChild(description);
            div.appendChild(refresh);
            div.appendChild(table);
            updateContent(div);
        });
}
/**
 * Displays the details of the given commit.
 * 
 * @param {string} commit The branch commit hash
 * @param {string} branch The branch name of the given commit
 */
const showCommitDetailsView = (commit, branch = '') => {
    fetch('/api/commit/' + commit,{
        cache: "no-store",
    })
        .then(r => r.json())
        .then(commitData => {
            // Create div wrapper.
            let div = document.createElement('div');
            let [propertyName, propertyValue, propertyWrapper, propertiesWrapper] = ['','','', document.createElement('div')];
            // Format the commit properties.
            for (let property in commitData) {
                [propertyName, propertyValue, propertyWrapper] = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
                [propertyName.innerText, propertyValue.innerText] = [property, commitData[property]];
                propertyName.classList.add('page--property-name');
                propertyValue.classList.add('page--property-value');
                propertyWrapper.classList.add('page--property-wrapper');
                propertyWrapper.appendChild(propertyName);
                propertyWrapper.appendChild(propertyValue);
                propertyWrapper.setAttribute('id', property.replace(/\s+/g, '-'));
                propertiesWrapper.appendChild(propertyWrapper);
            }
            // Display the go back button only if we have a branch.
            if (branch) {
                let goBackButton = document.createElement('button');
                goBackButton.setAttribute('type', 'button');
                goBackButton.innerText = 'Go back to commits';
                goBackButton.onclick = () => showCommitsView(branch);
                div.appendChild(goBackButton);
            }
            // Create a description header.
            let title = document.createElement('h2');
            title.innerText = 'Commit details for ' + commit;
            // Create a description paragraph.
            let description = document.createElement('p');
            description.innerText = 'Keep this information safe.';
            // Append content to the main div.
            div.appendChild(title);
            div.appendChild(description);
            div.appendChild(propertiesWrapper);
            updateContent(div);
        })
        .catch(defaultErrorHandler);
}
/**
 * Displays the Create PR view.
 */
const showCreatePrView = () => {
    // The base branch selector.
    let fromSelect = document.createElement('select');
    fromSelect.setAttribute('id', 'from-select');
    fromSelect.setAttribute('name', 'from-select');
    // The base branch selector label.
    let fromSelectLabel = document.createElement('label');
    fromSelectLabel.innerText = 'From branch: ';
    fromSelectLabel.setAttribute('for', 'from-select');
    // The target branch selector.
    let toSelect = document.createElement('select');
    toSelect.setAttribute('id', 'to-select');
    toSelect.setAttribute('name', 'to-select');
    // The target branch selector label.
    let toSelectLabel = document.createElement('label');
    toSelectLabel.innerText = 'To branch: ';
    toSelectLabel.setAttribute('for', 'to-select');
    // Fetch the branches from API.
    fetch('/api/branches', {
        cache: "no-store",
    })
    .then(r => r.json())
    .then(data => {
        // Create div wrapper.
        let div = document.createElement('div');
        // Create a title header.
        let title = document.createElement('h2');
        title.innerText = 'Create new Pull Request (PR)';
        // Create a description paragraph.
        let description = document.createElement('p');
        description.innerText = 'Choose a base and a target branch to merge. If you want to create a PR you will be asked for a token access.';
        // Fill the select items.
        let option;
        for(let branch of data.branches) {
            option = document.createElement('option');
            option.innerText = branch.replace(/[\* ]*/g,'');
            option.setAttribute('value', option.innerText);
            fromSelect.appendChild(option);
            toSelect.appendChild(option.cloneNode(true));
        }
        // Create the code segment.
        let code = document.createElement('code');
        code.setAttribute('id', 'code-comparison');
        // Create a little parser for the patch output on the <code> element.
        code.onchange = () => {
            let style = '';
            code.innerHTML = code.innerHTML.split('<br>')
                .map(i => {
                    style = i.match(/^\+.*/g) ? 'text-green' : i.match(/^\-.*/g) ? 'text-red' : i.match(/diff --git .+/g) ? 'text-blue' : '';
                    return '<span class = "' + style + '">' + i + '</span>';
                })
                .join('<br>');
        }
        let pre = document.createElement('pre');
        pre.appendChild(code);
        // Create the compare branches button.
        let compare = document.createElement('button');
        compare.setAttribute('type', 'button');
        compare.innerText = 'Compare branches';
        // Add the button action.
        compare.onclick = () => {
            fetch('/api/compare?' + new URLSearchParams({branchTo: toSelect.value, branchFrom: fromSelect.value}), {
                cache: "no-store",
            })
            .then(res => res.json())
            .then(compareData => {
                code.innerText = compareData.raw ? compareData.raw : 'No changes no show';
                code.dispatchEvent(new Event('change'));
            })
            .catch(defaultErrorHandler);
        };
        // The pull request title input.
        let pullRequestTitle = document.createElement('input');
        pullRequestTitle.setAttribute('type', 'text');
        pullRequestTitle.setAttribute('placeholder', 'Pull request title');
        // The pull request body message input.
        let pullRequestBody = document.createElement('textarea');
        pullRequestBody.setAttribute('placeholder', 'Pull request message');
        // The create pull request button.
        let createPullRequest = document.createElement('button');
        createPullRequest.setAttribute('type', 'button');
        createPullRequest.innerText = 'Create Pull Request';
        // Create pull request button action.
        createPullRequest.onclick = () => {
            if (!pullRequestTitle.value) {
                return alert('Please at least provide a title for the PR.');
            }
            // Ask for the github token.
            Promise.resolve(window.prompt('Enter your github token'))
            .then(token => {
                return fetch('https://api.github.com/repos/' + localStorage.getItem('github_username') + '/' + localStorage.getItem('project') + '/pulls', {
                    method: 'POST',
                    cache: "no-store",
                    headers: {
                        "Accept": "application/vnd.github.v3+json",
                        'Content-Type': 'application/json',
                        'Host': 'api.github.com',
                        'User-Agent': 'curl/7.64.1',
                        'Authorization': 'token ' + token
                    },
                    body: JSON.stringify({
                        "title": pullRequestTitle.value,
                        "body": pullRequestBody.value,
                        "head": fromSelect.value,
                        "base": toSelect.value,
                    })
                    
                });
            })
            .then(res => res.json())
            .then(jsonResponse => {
                if (jsonResponse.message && jsonResponse.errors) {
                    code.innerText = jsonResponse.message + "\n" + jsonResponse.errors.map(i => i.resource + ': ' + i.code + ' => ' + (i.field || i.message)).join("\n");
                }
                else if (jsonResponse.message) {
                    code.innerText = jsonResponse.message;
                }
                else {
                    code.innerText = "Pr created successfuly";
                }
            })
            .catch(error => {
                console.error(error);
                code.innerText = error;
            });
        };
        // Append the content to the page.
        div.appendChild(title);
        div.appendChild(description);
        div.appendChild(fromSelectLabel);
        div.appendChild(fromSelect);
        div.appendChild(toSelectLabel);
        div.appendChild(toSelect);
        div.appendChild(compare);
        div.appendChild(pullRequestTitle);
        div.appendChild(pullRequestBody);
        div.appendChild(createPullRequest);
        div.appendChild(pre);
        updateContent(div);
    })
    .catch(defaultErrorHandler);
}
/**
 * Handles the responses for the PRs view.
 * 
 * @param {Object} jsonResponse The Response object
 */
const handlePrResponse = jsonResponse => {
    // Show error messages on an alert.
    if (jsonResponse.message && jsonResponse.errors) {
        alert(jsonResponse.message + "\n" + jsonResponse.errors.map(i => i.resource + ': ' + i.code + ' => ' + (i.field || i.message)).join("\n"));
    }
    // Show message on alert.
    else if (jsonResponse.message) {
        alert(jsonResponse.message);
    }
    else {
        alert("PR Updated");
    }
    // Show a loading message.
    let loading = document.createElement('p');
    loading.innerText = "Retrieving new data...";
    loading.classList.add('text-loading');
    updateContent(loading);
    // Wait 5 seconds before updating the view.
    setTimeout(() => showPRsView(), 5000);
};
/**
 * Handles a default response for promise rejections.
 * 
 * @param {string|Object} error The error object.
 */
const defaultErrorHandler = error => {
    error.message ? alert(error.message) : alert(error);
}
