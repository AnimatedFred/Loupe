import type { DesignToken } from '@/types'

export function buildHtmlWithTokens(tokens: DesignToken[]): string {
  const vars = tokens
    .filter(t => t.category === 'color' && typeof t.value === 'string')
    .map(t => `  --${t.name.replace(/\./g, '-')}: ${t.value};`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Subsrf Studio</title>
    <style>
      :root {
${vars}
      }
    </style>
    <script src="https://cdn.tailwindcss.com"><\/script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
}
