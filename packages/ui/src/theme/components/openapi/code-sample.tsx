import { CodeBlockRuntime } from '@rspress/core/theme'
import { match, P } from 'massaman/match'
import type React from 'react'
import { useState } from 'react'

import { extractBodyExample, isBodyMethod } from './spec-utils'

export interface CodeSampleProps {
  /**
   * HTTP method (get, post, etc.).
   */
  readonly method: string
  /**
   * URL path (e.g. /users/{id}).
   */
  readonly path: string
  /**
   * Base URL for the API server.
   */
  readonly baseUrl: string
  /**
   * Operation parameters for generating sample values.
   */
  readonly parameters?: readonly Record<string, unknown>[]
  /**
   * Request body for POST/PUT/PATCH examples.
   */
  readonly requestBody?: Record<string, unknown>
}

interface TabConfig {
  readonly label: string
  readonly lang: string
  readonly generator: (props: CodeSampleProps) => string
}

const TABS: readonly TabConfig[] = [
  { label: 'cURL', lang: 'bash', generator: generateCurl },
  { label: 'JavaScript', lang: 'javascript', generator: generateJavascript },
  { label: 'Python', lang: 'python', generator: generatePython },
  { label: 'Go', lang: 'go', generator: generateGo },
  { label: 'Ruby', lang: 'ruby', generator: generateRuby },
  { label: 'Java', lang: 'java', generator: generateJava },
]

/**
 * Auto-generated code examples for an API operation.
 *
 * Renders cURL, JavaScript, Python, Go, Ruby, and Java code
 * using Rspress's CodeBlockRuntime for full syntax highlighting.
 *
 * @param props - Code sample props including method, path, baseUrl, and optional body
 * @returns React element with tabbed code examples
 */
export function CodeSample(props: CodeSampleProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<string>('cURL')

  const activeConfig = TABS.find((tab) => tab.label === activeTab)
  const resolved = match(activeConfig)
    .with(P.nonNullable, (config) => ({
      code: config.generator(props),
      lang: config.lang,
    }))
    .otherwise(() => ({ code: generateCurl(props), lang: 'bash' }))

  return (
    <div className="zp-oas-code-sample">
      <div className="zp-oas-code-sample__title">Code Examples</div>
      <div className="zp-oas-code-sample__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={match(activeTab === tab.label)
              .with(true, () => 'zp-oas-code-sample__tab zp-oas-code-sample__tab--active')
              .otherwise(() => 'zp-oas-code-sample__tab')}
            onClick={() => {
              setActiveTab(tab.label)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="zp-oas-code-sample__block">
        <CodeBlockRuntime lang={resolved.lang} code={resolved.code} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a full URL from base URL and path.
 *
 * @private
 * @param input - Object with baseUrl and path
 * @returns Full URL string
 */
function buildUrl(input: { readonly baseUrl: string; readonly path: string }): string {
  const base = input.baseUrl.replace(/\/+$/, '')
  if (input.path.startsWith('/')) {
    return `${base}${input.path}`
  }
  return `${base}/${input.path}`
}

/**
 * Generate a cURL code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns cURL command string
 */
function generateCurl(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toUpperCase()
  const headers = match(isBodyMethod(props.method.toLowerCase()))
    .with(true, () => " \\\n  -H 'Content-Type: application/json'")
    .otherwise(() => '')
  const body = match(extractBodyExample(props.requestBody))
    .with(P.nonNullable, (ex) => ` \\\n  -d '${JSON.stringify(ex)}'`)
    .otherwise(() => '')
  return `curl -X ${method} '${url}'${headers}${body}`
}

/**
 * Generate a Python requests code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns Python code string
 */
function generatePython(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toLowerCase()
  const bodyExample = extractBodyExample(props.requestBody)
  const hasBody = isBodyMethod(method) && bodyExample !== null

  const payloadLines = match(hasBody)
    .with(true, () => [`payload = ${JSON.stringify(bodyExample, null, 4)}`, ''])
    .otherwise(() => [])

  const jsonArg = match(hasBody)
    .with(true, () => ',\n    json=payload')
    .otherwise(() => '')

  return [
    'import requests',
    '',
    ...payloadLines,
    `response = requests.${method}(`,
    `    "${url}"${jsonArg}`,
    ')',
    '',
    'print(response.json())',
  ].join('\n')
}

/**
 * Generate a JavaScript fetch code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns JavaScript code string
 */
function generateJavascript(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toUpperCase()
  const hasBody = isBodyMethod(props.method.toLowerCase())
  const bodyExample = extractBodyExample(props.requestBody)

  const headersStr = match(hasBody)
    .with(true, () => "\n  headers: { 'Content-Type': 'application/json' },")
    .otherwise(() => '')

  const bodyStr = match(hasBody && bodyExample !== null)
    .with(true, () => `\n  body: JSON.stringify(${JSON.stringify(bodyExample, null, 2)}),`)
    .otherwise(() => '')

  return [
    `const response = await fetch('${url}', {`,
    `  method: '${method}',${headersStr}${bodyStr}`,
    '})',
    '',
    'const data = await response.json()',
    'console.log(data)',
  ].join('\n')
}

/**
 * Generate a Go net/http code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns Go code string
 */
function generateGo(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toUpperCase()
  const hasBody = isBodyMethod(props.method.toLowerCase())
  const bodyExample = extractBodyExample(props.requestBody)

  const hasBodyPayload = hasBody && bodyExample !== null
  const escapedBody = match(hasBodyPayload)
    .with(true, () => JSON.stringify(bodyExample).replaceAll('"', String.raw`\"`))
    .otherwise(() => '')

  const bodySetup = match(hasBodyPayload)
    .with(true, () =>
      [
        `\tpayload := strings.NewReader("${escapedBody}")`,
        `\treq, err := http.NewRequest("${method}", "${url}", payload)`,
      ].join('\n')
    )
    .otherwise(() => `\treq, err := http.NewRequest("${method}", "${url}", nil)`)

  const contentTypeHeader = match(hasBody)
    .with(true, () => '\treq.Header.Set("Content-Type", "application/json")')
    .otherwise(() => '')

  const stringsImport = match(hasBodyPayload)
    .with(true, () => ['\t"strings"'])
    .otherwise(() => [])

  return [
    'package main',
    '',
    'import (',
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    ...stringsImport,
    ')',
    '',
    'func main() {',
    bodySetup,
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    contentTypeHeader,
    '',
    '\tresp, err := http.DefaultClient.Do(req)',
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    '\tdefer resp.Body.Close()',
    '',
    '\tbody, _ := io.ReadAll(resp.Body)',
    '\tfmt.Println(string(body))',
    '}',
  ].join('\n')
}

/**
 * Generate a Ruby net/http code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns Ruby code string
 */
function generateRuby(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toLowerCase()
  const hasBody = isBodyMethod(method)
  const bodyExample = extractBodyExample(props.requestBody)

  const uriLines = ["require 'net/http'", "require 'json'", '', `uri = URI('${url}')`]

  const methodClass = match(method)
    .with('get', () => 'Get')
    .with('post', () => 'Post')
    .with('put', () => 'Put')
    .with('patch', () => 'Patch')
    .with('delete', () => 'Delete')
    .otherwise(() => 'Get')

  const requestLines = [`request = Net::HTTP::${methodClass}.new(uri)`]

  const bodyLines = match(hasBody && bodyExample !== null)
    .with(true, () => [
      "request['Content-Type'] = 'application/json'",
      `request.body = '${JSON.stringify(bodyExample)}'`,
    ])
    .otherwise(() => [])

  return [
    ...uriLines,
    ...requestLines,
    ...bodyLines,
    '',
    `response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: ${String(props.baseUrl.startsWith('https'))}) do |http|`,
    '  http.request(request)',
    'end',
    '',
    'puts JSON.parse(response.body)',
  ].join('\n')
}

/**
 * Generate a Java HttpClient code example for the operation.
 *
 * @private
 * @param props - Code sample props
 * @returns Java code string
 */
function generateJava(props: CodeSampleProps): string {
  const url = buildUrl({ baseUrl: props.baseUrl, path: props.path })
  const method = props.method.toUpperCase()
  const hasBody = isBodyMethod(props.method.toLowerCase())
  const bodyExample = extractBodyExample(props.requestBody)

  const builderMethod = match(hasBody && bodyExample !== null)
    .with(
      true,
      () =>
        `    .method("${method}", HttpRequest.BodyPublishers.ofString("${JSON.stringify(bodyExample).replaceAll('"', String.raw`\"`)}"))`
    )
    .otherwise(() => `    .method("${method}", HttpRequest.BodyPublishers.noBody())`)

  const contentTypeHeader = match(hasBody)
    .with(true, () => '\n    .header("Content-Type", "application/json")')
    .otherwise(() => '')

  return [
    'import java.net.http.*;',
    'import java.net.URI;',
    '',
    'HttpClient client = HttpClient.newHttpClient();',
    '',
    'HttpRequest request = HttpRequest.newBuilder()',
    `    .uri(URI.create("${url}"))`,
    `${builderMethod}${contentTypeHeader}`,
    '    .build();',
    '',
    'HttpResponse<String> response = client.send(',
    '    request, HttpResponse.BodyHandlers.ofString()',
    ');',
    '',
    'System.out.println(response.body());',
  ].join('\n')
}
