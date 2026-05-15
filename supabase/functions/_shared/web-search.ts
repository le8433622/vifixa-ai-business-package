// 🌐 Vifixa AI Web Search — Real-time internet access
// Cho phép AI tra cứu thông tin từ internet để phục vụ người dùng tốt nhất
// AGI feature: tự động quyết định khi nào cần tra cứu

const SEARCH_API = 'https://api.duckduckgo.com/?q=QUERY&format=json&no_html=1&skip_disambig=1'
const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search'
const FALLBACK_SCRAPE = 'https://textise.iitty'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

// ============================================================
// MAIN SEARCH FUNCTION
// ============================================================

export async function webSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  // Try multiple search sources
  const searches = [
    searchDuckDuckGo(query, maxResults),
    searchBrave(query, maxResults),
  ]

  const settled = await Promise.allSettled(searches)
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      results.push(...result.value)
    }
  }

  return results.slice(0, maxResults)
}

// ============================================================
// DUCKDUCKGO SEARCH (no API key needed)
// ============================================================

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VifixaAI/1.0' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const data = await response.json()
    const results: SearchResult[] = []

    // Abstract (featured snippet)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || 'Kết quả chính',
        url: data.AbstractURL || '',
        snippet: data.AbstractText.slice(0, 500),
        source: 'DuckDuckGo',
      })
    }

    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.Text) {
          results.push({
            title: topic.Text || topic.FirstURL || '',
            url: topic.FirstURL || '',
            snippet: topic.Text?.slice(0, 300) || '',
            source: 'DuckDuckGo',
          })
        }
      }
    }

    // Web results via DuckDuckGo HTML (fallback)
    if (results.length < maxResults) {
      const htmlResults = await scrapeDuckDuckGoHTML(query, maxResults - results.length)
      results.push(...htmlResults)
    }

    return results.slice(0, maxResults)
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo error:', err)
    return []
  }
}

// ============================================================
// DUCKDUCKGO HTML SCRAPE (for web results not in API)
// ============================================================

async function scrapeDuckDuckGoHTML(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VifixaAI/1.0)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const html = await response.text()
    const results: SearchResult[] = []

    // Simple regex-based extraction of search results
    const resultRegex = /<a rel="nofollow" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g
    let match
    let count = 0
    while ((match = resultRegex.exec(html)) !== null && count < maxResults) {
      results.push({
        title: match[2].replace(/<[^>]+>/g, '').trim(),
        url: match[1],
        snippet: match[3].replace(/<[^>]+>/g, '').trim().slice(0, 300),
        source: 'DuckDuckGo',
      })
      count++
    }

    return results
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo HTML scrape error:', err)
    return []
  }
}

// ============================================================
// BRAVE SEARCH (if API key configured)
// ============================================================

async function searchBrave(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = Deno.env.get('BRAVE_SEARCH_API_KEY')
  if (!apiKey) return [] // Brave requires API key, skip if not configured

  try {
    const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${maxResults}`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const data = await response.json()
    const results: SearchResult[] = []

    if (data.web?.results) {
      for (const r of data.web.results.slice(0, maxResults)) {
        results.push({
          title: r.title || '',
          url: r.url || '',
          snippet: r.description || '',
          source: 'Brave',
        })
      }
    }

    return results
  } catch (err) {
    console.warn('[WebSearch] Brave error:', err)
    return []
  }
}

// ============================================================
// WEB PAGE FETCHER — Read full content of a URL
// ============================================================

export interface PageContent {
  url: string
  title: string
  content: string
  textLength: number
}

export async function fetchWebPage(url: string, maxChars: number = 8000): Promise<PageContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VifixaAI/1.0)',
        'Accept': 'text/html,text/plain,*/*',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : url

    // Extract text content (strip HTML tags)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/\s+/g, ' ')
      .trim()

    // Truncate if too long
    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + '...'
    }

    return {
      url,
      title,
      content: text,
      textLength: text.length,
    }
  } catch (err) {
    console.warn('[WebSearch] Fetch page error:', err)
    return null
  }
}

// ============================================================
// INTELLIGENT SEARCH — AI tự quyết định search gì
// ============================================================

export function shouldSearch(message: string): boolean {
  const searchIndicators = [
    'tìm', 'search', 'google', 'tra cứu', 'kiểm tra',
    'giá', 'bao nhiêu', 'thế nào', 'ra sao',
    'tin tức', 'news', 'mới nhất', 'hôm nay',
    'cập nhật', 'update', 'real-time', 'hiện tại',
    'thời tiết', 'weather', 'giờ', 'tuyến',
    'công ty', 'sản phẩm', 'hãng', 'thương hiệu',
    'cách', 'hướng dẫn', 'làm thế nào',
  ]

  const lower = message.toLowerCase()
  return searchIndicators.some(indicator => lower.includes(indicator))
}

export function extractSearchQuery(message: string): string {
  // Remove common prefixes
  const prefixes = [
    'tìm', 'tìm kiếm', 'search', 'tra cứu', 'kiểm tra', 'google',
    'cho tôi biết', 'cho mình hỏi', 'cho em hỏi',
  ]

  let query = message
  for (const prefix of prefixes) {
    if (query.toLowerCase().startsWith(prefix + ' ')) {
      query = query.slice(prefix.length + 1)
    }
  }

  return query.trim()
}

// ============================================================
// SEARCH RESULT FORMATTER
// ============================================================

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return ''

  let output = `\n\n📡 KẾT QUẢ TRA CỨU INTERNET:\n`
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    output += `\n${i + 1}. ${r.title}`
    if (r.snippet) output += `\n   ${r.snippet.slice(0, 200)}`
    if (r.url) output += `\n   🔗 ${r.url}`
  }

  return output
}
