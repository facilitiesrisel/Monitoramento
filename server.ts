import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHAREPOINT_EXCEL_URL = "https://riselcombustiveis-my.sharepoint.com/:x:/g/personal/deny_goncalves_risel_com_br/IQDvB_WI4DAJRqI5YBLPPVikAcz3rrrVEgKW__Ba3fdrHOo?download=1";

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

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/sharepoint-vehicles", async (req, res) => {
    try {
      const arrayBuffer = await fetchSharepointExcelBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return res.json({ rows: [] });
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const excelRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      res.json({ rows: excelRows });
    } catch (error: any) {
      console.error("Error fetching SharePoint Excel:", error);
      res.status(500).json({ error: error.message || 'Failed to fetch SharePoint Excel' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with caching for assets, but NO CACHE for index.html
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Cache assets for 1 year
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      }
    }));
    
    // Fallback for SPA
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
