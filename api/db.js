// api/db.js — Vercel Serverless Function
// Acts as proxy between portal and Google Sheets
// Same domain as portal = zero CORS issues

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}');

async function getSheet() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export default async function handler(req, res) {
  // Allow all origins (same vercel domain anyway)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sheets = await getSheet();

    if (req.method === 'GET') {
      // Load data from sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'data!A1'
      });
      const val = response.data.values?.[0]?.[0];
      if (!val) return res.status(200).json(null);
      return res.status(200).json(JSON.parse(val));
    }

    if (req.method === 'POST') {
      // Save data to sheet
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: 'No data provided' });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'data!A1',
        valueInputOption: 'RAW',
        requestBody: { values: [[JSON.stringify(data)]] }
      });
      return res.status(200).json({ success: true, savedAt: new Date().toISOString() });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('DB Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
