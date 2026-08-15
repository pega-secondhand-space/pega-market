const https = require('https');
const fs = require('fs');

const configContent = fs.readFileSync('js/config.js', 'utf8');
const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)['"]/);

const realUrl = urlMatch[1];
const realKey = keyMatch[1];

const url = new URL(realUrl + '/rest/v1/items?select=id,title,created_at,type,description,device_id&order=created_at.desc');

const req = https.request(url, {
  method: 'GET',
  headers: {
    'apikey': realKey,
    'Authorization': 'Bearer ' + realKey,
    'Range-Unit': 'items',
    'Range': '0-9999',
    'Prefer': 'count=exact'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Content-Range Header:', res.headers['content-range']);
    const items = JSON.parse(data);
    console.log('Total items in DB:', items.length);
    
    let systemCount = 0;
    let soldCount = 0;
    let normalCount = 0;
    const typeCounts = {};

    items.forEach(it => {
      if (it.device_id === 'SYSTEM' || (it.title && it.title.startsWith('SYSTEM_')) || (it.id && it.id.startsWith('00000000-0000-0000-0000-'))) {
        systemCount++;
      } else if (it.description && it.description.includes('[SOLD:')) {
        soldCount++;
        typeCounts[it.type] = (typeCounts[it.type] || 0) + 1;
      } else {
        normalCount++;
        typeCounts[it.type] = (typeCounts[it.type] || 0) + 1;
      }
    });

    console.log('Breakdown:', { total: items.length, normalCount, soldCount, systemCount });
    console.log('By Type:', typeCounts);

    // Also check archive table (messages table with ARCHIVE uuid)
    const archiveUrl = new URL(realUrl + '/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000002&select=id,created_at');
    https.get(archiveUrl, {
      headers: {
        'apikey': realKey,
        'Authorization': 'Bearer ' + realKey
      }
    }, archRes => {
      let archData = '';
      archRes.on('data', c => archData += c);
      archRes.on('end', () => {
        const archives = JSON.parse(archData);
        console.log('Archived/Decommissioned historical deals in archive table:', archives.length);
      });
    });
  });
});
req.end();
