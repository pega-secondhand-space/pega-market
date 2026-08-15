const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const SITE_ID = '7fc6873d-980a-4c79-87aa-f0c292ea13ed';
const TOKEN = 'nfp_V3DpF4V5iA15yiQeDEsZwnV2yvcd6BYt7ed3';
const ZIP_PATH = 'deploy.zip';

console.log('📦 正在使用 Python 建立具備標準 POSIX Unix 路徑 (/) 之 deploy.zip ...');

execSync(`python -c "import zipfile, os; zf = zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED); zf.write('index.html', 'index.html'); zf.write('guide.html', 'guide.html') if os.path.exists('guide.html') else None; [zf.write(os.path.join(r, f), os.path.join(r, f).replace(chr(92), '/')) for r, d, files in os.walk('css') for f in files]; [zf.write(os.path.join(r, f), os.path.join(r, f).replace(chr(92), '/')) for r, d, files in os.walk('js') for f in files]; zf.close()"`);

console.log('🚀 開始透過 Netlify API 上傳發布 deploy.zip ...');

const fileBuffer = fs.readFileSync(ZIP_PATH);

const options = {
  hostname: 'api.netlify.com',
  port: 443,
  path: `/api/v1/sites/${SITE_ID}/deploys`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/zip',
    'Content-Length': fileBuffer.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('🎉 部署成功！');
        console.log('🌐 部署 URL:', json.deploy_url || json.url);
        console.log('🌐 正式網站 URL:', json.ssl_url || 'https://pega-exchange.netlify.app');
        console.log('狀態:', json.state);
        
        // 刪除暫存 zip
        if (fs.existsSync(ZIP_PATH)) {
          fs.unlinkSync(ZIP_PATH);
        }
      } else {
        console.error('⚠️ 部署回應錯誤 (Status:', res.statusCode, '):', json);
      }
    } catch(e) {
      console.log('回應內容:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ 上傳失敗:', e);
});

req.write(fileBuffer);
req.end();
