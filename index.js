const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { chromium } = require('playwright');

// ====== CẤU HÌNH (đặt trong Environment Variables của Render) ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL; // Render tự cấp
const DATA_FILE = path.join(process.env.DATA_DIR || __dirname, 'proxies.json');

if (!BOT_TOKEN || !OWNER_ID) {
  console.error('Thiếu BOT_TOKEN hoặc OWNER_ID trong biến môi trường.');
  process.exit(1);
}

// ====== LƯU PROXY ======
let proxies = [];
try {
  proxies = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (_) {}

function saveProxies() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(proxies, null, 2));
  } catch (e) {
    console.error('Không lưu được proxies:', e.message);
  }
}

function parseSocks5(line) {
  const parts = line.trim().split(':');
  if (parts.length !== 4 && parts.length !== 2) return null;
  const [host, port, user = '', pass = ''] = parts;
  if (!host || !/^\d{1,5}$/.test(port) || Number(port) > 65535) return null;
  return { host, port, user, pass };
}

function proxyUrl(p) {
  const auth = p.user ? `${encodeURIComponent(p.user)}:${encodeURIComponent(p.pass)}@` : '';
  return `socks5://${auth}${p.host}:${p.port}`;
}

function maskProxy(p) {
  return `${p.host}:${p.port}${p.user ? ` (user: ${p.user})` : ''}`;
}

// ====== LẤY IP ======
function fetchIp(agent) {
  return new Promise((resolve, reject) => {
    const req = https.get('https://api.ipify.org', { agent, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data.trim()));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

// ====== BOT ======
const bot = new Telegraf(BOT_TOKEN);

// Chỉ owner mới dùng được
bot.use((ctx, next) => {
  if (ctx.from && ctx.from.id === OWNER_ID) return next();
});

bot.start((ctx) =>
  ctx.reply(
    [
      'Lệnh khả dụng:',
      '/addsocks5 ip:port:user:pass',
      '/delproxy – xóa toàn bộ proxy',
      '/ip – IP hiện tại của bot',
      '/delete user|pass|sđt|SPC_F',
    ].join('\n')
  )
);

bot.command('addsocks5', async (ctx) => {
  const text = ctx.message.text.replace(/^\/addsocks5(@\w+)?/i, '').trim();
  if (!text) return ctx.reply('Cú pháp: /addsocks5 ip:port:user:pass\n(có thể gửi nhiều dòng)');

  const added = [];
  const failed = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const p = parseSocks5(line);
    if (p) {
      proxies.push(p);
      added.push(maskProxy(p));
    } else {
      failed.push(line.split(':').slice(0, 2).join(':'));
    }
  }
  saveProxies();

  // Xóa tin nhắn chứa mật khẩu proxy cho an toàn
  ctx.deleteMessage().catch(() => {});

  let msg = '';
  if (added.length) msg += `✅ Đã thêm ${added.length} proxy:\n${added.join('\n')}\n`;
  if (failed.length) msg += `❌ Sai định dạng: ${failed.join(', ')}\n`;
  msg += `Tổng proxy hiện có: ${proxies.length}`;
  ctx.reply(msg);
});

bot.command('delproxy', (ctx) => {
  const n = proxies.length;
  proxies = [];
  saveProxies();
  ctx.reply(`🗑 Đã xóa ${n} proxy.`);
});

bot.command('ip', async (ctx) => {
  let msg = '';
  try {
    msg += `🌐 IP bot (trực tiếp): ${await fetchIp()}\n`;
  } catch (e) {
    msg += `🌐 IP bot (trực tiếp): lỗi (${e.message})\n`;
  }
  if (proxies.length) {
    const p = proxies[proxies.length - 1];
    try {
      msg += `🧦 IP qua proxy ${p.host}:${p.port}: ${await fetchIp(new SocksProxyAgent(proxyUrl(p)))}`;
    } catch (e) {
      msg += `🧦 Proxy ${p.host}:${p.port} lỗi: ${e.message}`;
    }
  } else {
    msg += 'Chưa có proxy nào.';
  }
  ctx.reply(msg);
});

bot.command('delete', async (ctx) => {
  const text = ctx.message.text.replace(/^\/delete(@\w+)?/i, '').trim();
  const parts = text.split('|').map((s) => s.trim());

  if (parts.length !== 4 || parts.some((s) => !s)) {
    return ctx.reply(
      '❌ Cú pháp: /delete user|pass|sđt|SPC_F\n' +
      'VD: /delete xdyd5gpmvn|IwujU86U7A3%|0568053785|LuNn4tc7nkHkaBLnNiinbdBCas4UJYAi'
    );
  }

  // Xóa tin nhắn chứa thông tin nhạy cảm ngay lập tức
  ctx.deleteMessage().catch(() => {});

  const [shopeeUser, shopeePass, phone, spcfValue] = parts;

  // ── 1. Kiểm tra proxy ──
  if (!proxies.length) {
    return ctx.reply('❌ Chưa có proxy nào. Dùng /addsocks5 để thêm trước.');
  }
  const proxy = proxies[proxies.length - 1];

  const statusMsg = await ctx.reply('⏳ Đang kiểm tra proxy...');
  const editStatus = (t) =>
    ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, t).catch(() => {});

  // Verify proxy hoạt động
  let proxyIp;
  try {
    proxyIp = await fetchIp(new SocksProxyAgent(proxyUrl(proxy)));
  } catch (e) {
    return editStatus(`❌ Proxy ${proxy.host}:${proxy.port} không hoạt động: ${e.message}`);
  }
  await editStatus(`✅ Proxy OK – IP: ${proxyIp}\n⏳ Đang mở Shopee...`);

  // ── 2. Mở browser qua proxy ──
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        `--proxy-server=socks5://${proxy.host}:${proxy.port}`,
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ...(proxy.user
        ? {
            httpCredentials: {
              username: proxy.user,
              password: proxy.pass,
            },
          }
        : {}),
    });

    // Inject SPC_F cookie trước khi vào trang
    await context.addCookies([
      {
        name: 'SPC_F',
        value: spcfValue,
        domain: '.shopee.vn',
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'None',
      },
    ]);

    const page = await context.newPage();

    await editStatus(`✅ Proxy OK – IP: ${proxyIp}\n⏳ Đang tải trang login Shopee...`);

    // Vào trang login
    await page.goto('https://shopee.vn/buyer/login?next=', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Đợi trang ổn định
    await page.waitForTimeout(2000);

    // Kiểm tra cookie SPC_F đã được set chưa
    const cookies = await context.cookies('https://shopee.vn');
    const spcfCookie = cookies.find((c) => c.name === 'SPC_F');

    if (!spcfCookie) {
      await browser.close();
      return editStatus('❌ Không inject được cookie SPC_F vào Shopee.');
    }

    await editStatus(
      `✅ Proxy OK – IP: ${proxyIp}\n✅ Cookie SPC_F đã set\n⏳ Đang đăng nhập...`
    );

    // Đợi trang load hoàn toàn (networkidle = không còn request nào)
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Dùng đúng JS snippet mà Shopee cần để React nhận giá trị
    const loginResult = await page.evaluate(
      ({ user, pass }) => {
        const userInput = document.querySelector(
          'div:nth-of-type(2) > form > div > div:nth-of-type(2) > input'
        );
        const passInput = document.querySelector(
          'div:nth-of-type(2) > form > div > div:nth-of-type(3) > input'
        );
        const loginBtn = document.querySelector(
          'div:nth-of-type(2) > div:nth-of-type(2) > form > div > button'
        );

        if (!userInput || !passInput || !loginBtn) {
          return { ok: false, reason: 'Không tìm thấy input/button trên trang' };
        }

        function setInputValue(input, value) {
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setInputValue(userInput, user);
        setInputValue(passInput, pass);

        return { ok: true };
      },
      { user: shopeeUser, pass: shopeePass }
    );

    if (!loginResult.ok) {
      await browser.close();
      return editStatus(`❌ ${loginResult.reason}\nShopee có thể đã thay đổi cấu trúc trang.`);
    }

    // Đợi 0.5s như snippet gốc rồi bấm login
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const loginBtn = document.querySelector(
        'div:nth-of-type(2) > div:nth-of-type(2) > form > div > button'
      );
      if (loginBtn) loginBtn.click();
    });

    // Chờ redirect / response sau khi bấm
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const pageCookies = await context.cookies('https://shopee.vn');
    const hasSession = pageCookies.some((c) => c.name === 'SPC_EC' || c.name === 'SPC_U');

    await browser.close();

    if (hasSession) {
      await editStatus(
        `✅ *Đăng nhập thành công!*\n` +
        `🧦 IP: ${proxyIp}\n` +
        `👤 User: ${shopeeUser}\n` +
        `📱 SĐT: ${phone}\n` +
        `🍪 SPC_F đã được áp dụng`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await editStatus(
        `⚠️ Đăng nhập chưa xác nhận được.\n` +
        `URL hiện tại: ${currentUrl}\n` +
        `(Có thể cần xác minh OTP hoặc captcha)`
      );
    }
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('delete cmd error:', err);
    await editStatus(`❌ Lỗi: ${err.message}`);
  }
});

bot.catch((err) => console.error('Bot error:', err));

// ====== KHỞI CHẠY ======
async function main() {
  if (PUBLIC_URL) {
    // Webhook (hợp với Render, free plan được đánh thức khi có request)
    const hookPath = `/telegraf/${bot.secretPathComponent()}`;
    const handler = bot.webhookCallback(hookPath);
    await bot.telegram.setWebhook(`${PUBLIC_URL}${hookPath}`);
    http
      .createServer((req, res) => {
        if (req.url === hookPath && req.method === 'POST') return handler(req, res);
        res.writeHead(200);
        res.end('ok');
      })
      .listen(PORT, () => console.log(`Webhook mode, port ${PORT}`));
  } else {
    // Chạy local: long polling
    await bot.telegram.deleteWebhook();
    bot.launch();
    console.log('Polling mode');
  }
}

main();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
