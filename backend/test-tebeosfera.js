const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': 'https://www.tebeosfera.com/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

async function test() {
  try {
    console.log("Fetching Tebeosfera...");
    const { data: html } = await axios.get('https://www.tebeosfera.com/obras/buscar.html', {
      params: { q: 'asterix', pagina: 1 },
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5
    });

    console.log("HTML length:", html.length);
    
    const $ = cheerio.load(html);
    
    // Check for various result containers
    console.log("\n=== Checking for result containers ===");
    console.log("div.resultado count:", $('div.resultado').length);
    console.log(".search-result count:", $('.search-result').length);
    console.log("table.resultados rows:", $('table.resultados tr').length);
    console.log("div.result count:", $('div.result').length);
    console.log("div[class*='result'] count:", $('div[class*="result"]').length);
    
    // List all unique divs with IDs or classes containing 'result', 'busca', 'obra'
    console.log("\n=== All elements with result/busca/obra in class/id ===");
    let count = 0;
    $('[class*="result"], [id*="result"], [class*="busca"], [id*="busca"], [class*="obra"], [id*="obra"]').each((i, el) => {
      const tag = $(el).prop('tagName');
      const className = $(el).attr('class');
      const id = $(el).attr('id');
      if (count < 20) {
        console.log(`${tag}#${id || 'N/A'} class="${className || 'N/A'}"`);
        count++;
      }
    });

    // Check main content area structure
    console.log("\n=== Main content structure ===");
    const content = $('.container.t3_contenido, #content, main, [role="main"]');
    console.log("Content container found:", content.length > 0);
    if (content.length > 0) {
      const html = content.html();
      if (html) {
        console.log("Content HTML (first 800 chars):");
        console.log(html.substring(0, 800));
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response?.status) {
      console.error("Status:", error.response.status);
    }
  }
}

test();
