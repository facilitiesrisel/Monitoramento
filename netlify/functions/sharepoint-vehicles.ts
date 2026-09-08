import * as XLSX from 'xlsx';

async function fetchSharepointExcelBuffer(): Promise<ArrayBuffer> {
  const originalUrl = "https://riselcombustiveis-my.sharepoint.com/:x:/g/personal/deny_goncalves_risel_com_br/IQDvB_WI4DAJRqI5YBLPPVikAcz3rrrVEgKW__Ba3fdrHOo";
  
  let currentUrl = originalUrl;
  let cookies: string[] = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  let uniqueId = '88f507ef-30e0-4609-a239-6012cf3d58a4';

  for (let step = 0; step < 5; step++) {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        ...headers,
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      },
      redirect: 'manual'
    });

    const newCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
    for (const c of newCookies) {
      if (c) cookies.push(c);
    }

    const location = res.headers.get('location');
    if (location) {
      currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
    } else {
      const text = await res.text();
      const uniqueMatch = text.match(/download\.aspx\?UniqueId=([a-f0-9\-]+)/i) || text.match(/sourcedoc=%7B([a-f0-9\-]+)%7D/i);
      if (uniqueMatch && uniqueMatch[1]) {
        uniqueId = uniqueMatch[1];
      }
      break;
    }
  }

  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  const dlUrl = `https://riselcombustiveis-my.sharepoint.com/personal/deny_goncalves_risel_com_br/_layouts/15/download.aspx?UniqueId=${uniqueId}`;
  
  const dlRes = await fetch(dlUrl, {
    headers: {
      ...headers,
      ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
    }
  });

  if (!dlRes.ok) {
    throw new Error(`SharePoint download failed with status ${dlRes.status}`);
  }

  const contentType = dlRes.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('SharePoint returned HTML instead of Excel binary');
  }

  return await dlRes.arrayBuffer();
}

export const handler = async (event: any = {}, context: any = {}) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const arrayBuffer = await fetchSharepointExcelBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ rows: [] })
      };
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const excelRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({ rows: excelRows })
    };
  } catch (error: any) {
    console.error("Error in Netlify function sharepoint-vehicles:", error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message || 'Failed to fetch SharePoint Excel' })
    };
  }
};
