const { spawn } = require('child_process');

async function testPage(port, path, inputs) {
  const listRes = await fetch(`http://127.0.0.1:${port}/json`);
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page') || pages[0];
  const wsUrl = page.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.onopen = resolve);

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://localhost:5000${path}` });

  // Wait for page to finish loading
  await new Promise((resolve) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', handler);
        resolve();
      }
    };
    ws.addEventListener('message', handler);
    setTimeout(resolve, 3000); // fallback timeout
  });

  await new Promise(r => setTimeout(r, 500));

  const results = {};
  for (const inputId of inputs) {
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.getElementById('${inputId}');
          if (!input) return { error: 'Input ${inputId} not found on ' + window.location.href };
          const wrap = input.closest('.password-wrap');
          const btn = wrap ? wrap.querySelector('.password-toggle-btn') : null;
          if (!btn) return { error: 'Button for ${inputId} not found' };

          input.value = 'Pass12345';
          const initialType = input.type;

          // First click -> Should become text
          btn.click();
          const typeAfterClick1 = input.type;
          const iconAfterClick1 = btn.querySelector('i') ? btn.querySelector('i').className : null;

          // Second click -> Should return to password
          btn.click();
          const typeAfterClick2 = input.type;
          const iconAfterClick2 = btn.querySelector('i') ? btn.querySelector('i').className : null;

          return {
            inputId: '${inputId}',
            initialType,
            typeAfterClick1,
            iconAfterClick1,
            typeAfterClick2,
            iconAfterClick2,
            success: typeAfterClick1 === 'text' && typeAfterClick2 === 'password'
          };
        })()
      `,
      returnByValue: true
    });
    results[inputId] = res.result.value;
  }

  ws.close();
  return results;
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9339;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=C:\\Users\\PC05\\AppData\\Local\\Temp\\chrome-debug-verify-2',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('--- Testing /login ---');
    const loginRes = await testPage(port, '/login', ['loginPassword']);
    console.log(loginRes);

    console.log('--- Testing /register ---');
    const regRes = await testPage(port, '/register', ['registerPassword', 'registerConfirmPassword']);
    console.log(regRes);

    console.log('--- Testing /reset-password ---');
    const resetRes = await testPage(port, '/reset-password', ['newPassword', 'confirmNewPassword']);
    console.log(resetRes);

    const allPassed = 
      loginRes.loginPassword.success &&
      regRes.registerPassword.success &&
      regRes.registerConfirmPassword.success &&
      resetRes.newPassword.success &&
      resetRes.confirmNewPassword.success;

    console.log('\n=======================================');
    console.log('OVERALL VERIFICATION RESULT:', allPassed ? 'PASSED ✅' : 'FAILED ❌');
    console.log('=======================================');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill();
  }
}

run();
