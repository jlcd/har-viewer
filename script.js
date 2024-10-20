let harData = null;
let filteredData = null;

function addClickFeedback(element) {
    const originalColor = element.style.backgroundColor;
    element.style.backgroundColor = '#45a049';
    setTimeout(() => {
        element.style.backgroundColor = originalColor;
    }, 200);
}

function processHAR() {
    const processButton = document.querySelector('button[onclick="processHAR()"]');
    addClickFeedback(processButton);

    const fileInput = document.getElementById('fileInput');
    const outputDiv = document.getElementById('output');

    if (fileInput.files.length === 0) {
        alert('Please select a .har file');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            harData = JSON.parse(e.target.result);
            applyFilters();
        } catch (error) {
            console.error('Error processing HAR file:', error);
            outputDiv.textContent = 'Error processing HAR file. Please check the console for details.';
        }
    };

    reader.readAsText(file);
}

function applyFilters() {
    if (!harData) return;

    const selectedFilters = Array.from(document.querySelectorAll('input[name="filter"]:checked')).map(cb => cb.value);
    const urlSearchTerm = document.getElementById('urlSearch').value.toLowerCase();
    
    filteredData = processEntries(harData.log.entries, selectedFilters, urlSearchTerm);
    populateTable(filteredData);
}

function processEntries(entries, filters, urlSearchTerm) {
    return entries
        .map(entry => ({
            url: entry.request.url,
            method: entry.request.method,
            type: getRequestType(entry),
            statusCode: entry.response.status,
            sentHeaders: convertHeaders(entry.request.headers),
            responseHeaders: convertHeaders(entry.response.headers),
            sentData: entry.request.postData ? entry.request.postData.text : null,
            receivedData: entry.response.content.text || null
        }))
        .filter(entry => 
            filters.includes(entry.type) && 
            entry.url.toLowerCase().includes(urlSearchTerm)
        );
}

function populateTable(data) {
    const tableBody = document.getElementById('resultBody');
    tableBody.innerHTML = '';

    data.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-entry-index', index);
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" checked></td>
            <td class="url-cell" title="${sanitizeHtml(entry.url)}">
                <i class="fas fa-copy copy-btn" data-url="${sanitizeHtml(entry.url)}" onclick="copyUrl(${index})"></i>
                ${sanitizeHtml(truncateText(entry.url, 50))}
            </td>
            <td>${sanitizeHtml(entry.method)}</td>
            <td>${sanitizeHtml(entry.type)}</td>
            <td>${sanitizeHtml(entry.statusCode)}</td>
            <td>${createCollapsibleContent('Sent Headers', entry.sentHeaders)}</td>
            <td>${createCollapsibleContent('Response Headers', entry.responseHeaders)}</td>
            <td>${createCollapsibleContent('Sent Data', entry.sentData)}</td>
            <td>${createCollapsibleContent('Received Data', entry.receivedData)}</td>
        `;
        tableBody.appendChild(row);
    });

    attachCollapsibleListeners();
}

function createCollapsibleContent(title, content) {
    const sanitizedContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : sanitizeHtml(content);
    return `
        <button class="collapsible">${title}</button>
        <div class="content" style="max-height: 0; overflow: hidden; transition: max-height 0.2s ease-out;">
            <pre>${sanitizedContent}</pre>
        </div>
    `;
}

function attachCollapsibleListeners() {
    const collapsibles = document.querySelectorAll('.collapsible');
    collapsibles.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight === "0px" || content.style.maxHeight === "") {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = "0px";
            }
        });
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength - 3) + '...';
}

function sanitizeHtml(input) {
    if (input === null || input === undefined) {
        return '';
    }
    if (typeof input === 'object') {
        return JSON.stringify(input);
    }
    return input.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&'+'lt;')
        .replace(/>/g, '&'+'gt;')
        .replace(/"/g, '&quote;')
        .replace(/'/g, '&#039;');
}

function getRequestType(entry) {
    const url = entry.request.url;
    const contentType = entry.response.content.mimeType;

    if (entry.request.method === 'OPTIONS') return 'Fetch/XHR';
    if (url.endsWith('.css') || contentType.includes('text/css')) return 'CSS';
    if (url.endsWith('.js') || contentType.includes('javascript')) return 'JS';
    if (url.endsWith('.woff') || url.endsWith('.woff2') || url.endsWith('.ttf') || url.endsWith('.otf')) return 'Font';
    if (contentType.startsWith('image/')) return 'Img';
    if (contentType.startsWith('audio/') || contentType.startsWith('video/')) return 'Media';
    if (url.endsWith('.webmanifest') || contentType.includes('application/manifest')) return 'Manifest';
    if (contentType.includes('application/wasm')) return 'Wasm';
    if (contentType.includes('html')) return 'Doc';
    if (contentType.includes('json') || contentType.includes('xml') || url.includes('/api/')) return 'Fetch/XHR';
    if (url.startsWith('ws://') || url.startsWith('wss://')) return 'WS';

    return 'Other';
}

function convertHeaders(headers) {
    const result = {};
    headers.forEach(header => {
        result[header.name] = header.value;
    });
    return result;
}

function copyUrl(index) {
    const url = filteredData[index].url;
    navigator.clipboard.writeText(url).then(() => {
        console.log('URL copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy URL: ', err);
    });
}

function copySelectedRequests() {
    const copyButton = document.getElementById('copySelectedBtn');
    addClickFeedback(copyButton);

    const selectedRows = document.querySelectorAll('.row-checkbox:checked');
    const selectedData = Array.from(selectedRows).map(checkbox => {
        const row = checkbox.closest('tr');
        const index = parseInt(row.getAttribute('data-entry-index'), 10);
        const entry = filteredData[index];
        return {
            url: entry.url,
            method: entry.method,
            statusCode: entry.statusCode,
            sentHeaders: entry.sentHeaders,
            responseHeaders: entry.responseHeaders,
            sentData: parseSentData(entry.sentData),
            receivedData: entry.receivedData
        };
    });

    const formattedData = JSON.stringify(selectedData, null, 2);
    navigator.clipboard.writeText(formattedData).then(() => {
        console.log('Selected requests copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy selected requests: ', err);
    });
}

function parseSentData(postData) {
    if (!postData) return null;
    try {
        return JSON.parse(postData);
    } catch (e) {
        // If it's not valid JSON, return it as a string
        return postData;
    }
}

function generateAndCopyGuzzleScript() {
    const generateButton = document.getElementById('generateGuzzleBtn');
    addClickFeedback(generateButton);

    const selectedRows = document.querySelectorAll('.row-checkbox:checked');
    const selectedData = Array.from(selectedRows).map(checkbox => {
        const row = checkbox.closest('tr');
        const index = parseInt(row.getAttribute('data-entry-index'), 10);
        return filteredData[index];
    });

    const script = generateGuzzleScript(selectedData);

    navigator.clipboard.writeText(script).then(() => {
        console.log('PHP/Guzzle script copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy PHP/Guzzle script to clipboard:', err);
        alert('Failed to copy PHP/Guzzle script to clipboard. Please check the console for details.');
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    const filterCheckboxes = document.querySelectorAll('input[name="filter"]');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    const urlSearchInput = document.getElementById('urlSearch');
    urlSearchInput.addEventListener('input', applyFilters);

    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.addEventListener('change', function() {
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // Add click feedback to buttons
    const processButton = document.querySelector('button[onclick="processHAR()"]');
    processButton.addEventListener('click', processHAR);

    const copySelectedBtn = document.getElementById('copySelectedBtn');
    copySelectedBtn.addEventListener('click', copySelectedRequests);

    const generateGuzzleBtn = document.getElementById('generateGuzzleBtn');
    generateGuzzleBtn.addEventListener('click', generateAndCopyGuzzleScript);
});
