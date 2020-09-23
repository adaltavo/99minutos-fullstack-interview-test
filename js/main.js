"use strict";
document.addEventListener('DOMContentLoaded', () => {
    // See branches action button.
    document.getElementById('see-branches').onclick = e => {
        showBranchesView();
    };
    // See branches action button.
    document.getElementById('create-pr').onclick = e => {
        showCreatePrView();
    };
}, false);

const homeContent = document.getElementById('page--dynamic-content').cloneNode(true);

// Function to create a table from a json array.
const createTable = (jsonArray, itemClickEvent = () => {}) => {
    // Debug array.
    console.log(jsonArray);
    let thead = document.createElement('thead');
    // Process the table headers.
    for (let property in jsonArray[0]) {
        let th = document.createElement('th');
        th.innerText = property;
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
        tbody.appendChild(tr);
    }
    // Create actual table object.
    let table = document.createElement('table');
    // Append table contents.
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

const updateContent = (newContent) => {
    // The segment of the html that will be changing it's content, simulating a SPA.
    let content = document.getElementById('page--dynamic-content');
    // The old content.
    content.innerHTML = '';
    content.appendChild(newContent);
}

const showBranchesView = () => {
    // Fetch the branches from API.
    fetch('/api/branches')
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
    });

}

const showCommitsView = branch => {
    fetch('/api/branches/' + branch)
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
            div.appendChild(goBackButton);
            div.appendChild(title);
            div.appendChild(description);
            div.appendChild(table);
            updateContent(div);
        });
}

const showCommitDetailsView = (commit, branch = '') => {
    fetch('/api/commit/' + commit)
        .then(r => r.json())
        .then(commitData => {
            // Create div wrapper.
            let div = document.createElement('div');
            let [propertyName, propertyValue, propertyWrapper, propertiesWrapper] = ['','','', document.createElement('div')];
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
            div.appendChild(title);
            div.appendChild(description);
            div.appendChild(propertiesWrapper);
            updateContent(div);
        });
}

const showCreatePrView = () => {
    let fromSelect = document.createElement('select');
    fromSelect.setAttribute('id', 'from-select');
    fromSelect.setAttribute('name', 'from-select');
    let fromSelectLabel = document.createElement('label');
    fromSelectLabel.innerText = 'From branch: ';
    fromSelectLabel.setAttribute('for', 'from-select');
    let toSelect = document.createElement('select');
    toSelect.setAttribute('id', 'to-select');
    toSelect.setAttribute('name', 'to-select');
    let toSelectLabel = document.createElement('label');
    toSelectLabel.innerText = 'To branch: ';
    toSelectLabel.setAttribute('for', 'to-select');
    // Fetch the branches from API.
    fetch('/api/branches')
    // Cast response to object.
    .then(r => r.json())
    // Process casted response.
    .then(data => {
        // Create div wrapper.
        let div = document.createElement('div');
        // Create a title header.
        let title = document.createElement('h2');
        title.innerText = 'Create new Pull Request (PR)';
        // Create a description paragraph.
        let description = document.createElement('p');
        description.innerText = 'Choose a base and a target branch to merge.';
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
        // Create the compare button.
        let compare = document.createElement('button');
        compare.setAttribute('type', 'button');
        compare.innerText = 'Compare branches';
        compare.onclick = () => {
            fetch('/api/compare?' + new URLSearchParams({branchTo: toSelect.value, branchFrom: fromSelect.value}))
            .then(res => res.json())
            .then(compareData => {
                code.innerText = compareData.raw ? compareData.raw : 'No changes no show';
                code.dispatchEvent(new Event('change'));
            })
        };
        // Append the content to the page.
        div.appendChild(title);
        div.appendChild(description);
        div.appendChild(fromSelectLabel);
        div.appendChild(fromSelect);
        div.appendChild(toSelectLabel);
        div.appendChild(toSelect);
        div.appendChild(compare);
        div.appendChild(pre);
        updateContent(div);
    });
}
