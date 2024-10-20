<?php

function generateGuzzleScript($jsonFilePath) {
    // Read the JSON file
    $jsonContent = file_get_contents($jsonFilePath);
    $requests = json_decode($jsonContent, true);

    $output = "<?php\n\n";
    $output .= "require 'vendor/autoload.php';\n\n";
    $output .= "use GuzzleHttp\\Client;\n";
    $output .= "use GuzzleHttp\\Psr7\\Request;\n\n";
    $output .= "\$client = new Client();\n\n";

    foreach ($requests as $index => $req) {
        $method = $req['method'];
        $url = $req['url'];
        $headers = var_export($req['sentHeaders'], true);
        $body = $req['sentData'] ? var_export($req['sentData'], true) : 'null';

        $output .= "// Request " . ($index + 1) . "\n";
        $output .= "\$headers{$index} = {$headers};\n";
        $output .= "\$body{$index} = " . ($req['sentData'] ? "json_encode({$body})" : "null") . ";\n";
        $output .= "\$request{$index} = new Request('{$method}', '{$url}', \$headers{$index}, \$body{$index});\n\n";
        $output .= "try {\n";
        $output .= "    \$response{$index} = \$client->send(\$request{$index});\n";
        $output .= "    echo \"Response Status for Request " . ($index + 1) . ": \" . \$response{$index}->getStatusCode() . \"\\n\";\n";
        $output .= "    echo \"Response Body for Request " . ($index + 1) . ": \" . \$response{$index}->getBody() . \"\\n\";\n";
        $output .= "} catch (\\Exception \$e) {\n";
        $output .= "    echo \"Error for Request " . ($index + 1) . ": \" . \$e->getMessage() . \"\\n\";\n";
        $output .= "}\n\n";
        $output .= "echo \"----------------------------------------\\n\\n\";\n\n";
    }

    return $output;
}

// Generate the Guzzle script
$jsonFilePath = 'requests.json';
$guzzleScript = generateGuzzleScript($jsonFilePath);

// Save the generated script to a new file
file_put_contents('generated_guzzle_script.php', $guzzleScript);

echo "Guzzle script has been generated and saved as 'generated_guzzle_script.php'.\n";
