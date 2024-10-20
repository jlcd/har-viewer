function escapePhpString(str) {
    return str.replace(/\$/g, '\\$').replace(/'/g, "\\'");
}

function objectToPHPArray(obj, indent = '') {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? `'${escapePhpString(obj)}'` : JSON.stringify(obj);
    }

    const nextIndent = indent + '    ';
    const pairs = Object.entries(obj).map(([key, value]) => {
        const formattedKey = `'${escapePhpString(key)}'`;
        return `${nextIndent}${formattedKey} => ${objectToPHPArray(value, nextIndent)}`;
    });

    return `[\n${pairs.join(",\n")}\n${indent}]`;
}

function generateGuzzleScript(selectedData) {
    let script = `<?php

require 'vendor/autoload.php';

use GuzzleHttp\\Client;
use GuzzleHttp\\Psr7\\Request;

$client = new Client();

$requests = [];

`;

    selectedData.forEach((entry, index) => {
        const headers = objectToPHPArray(entry.sentHeaders, '    ');
        const body = entry.sentData ? escapePhpString(JSON.stringify(entry.sentData, null, 2)) : 'null';

        script += `// Request ${index + 1}
$requests[] = [
    'method' => '${entry.method}',
    'url' => '${entry.url}',
    'headers' => ${headers},
    'body' => ${body},
];

`;
    });

    script += `
foreach ($requests as $index => $requestData) {
    $request = new Request($requestData['method'], $requestData['url'], $requestData['headers'], $requestData['body']);

    try {
        $response = $client->send($request);
        echo "Response Status for Request " . ($index + 1) . ": " . $response->getStatusCode() . "\\n";
        echo "Response Body for Request " . ($index + 1) . ": " . $response->getBody() . "\\n";
    } catch (\\Exception $e) {
        echo "Error for Request " . ($index + 1) . ": " . $e->getMessage() . "\\n";
    }

    echo "----------------------------------------\\n\\n";
}
`;

    return script;
}
