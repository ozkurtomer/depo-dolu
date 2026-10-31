// Veri sağlığı kontrolü: toplayıcı çalışmayı bıraktıysa kullanıcılardan önce sen fark et.
//
// Saatte bir (health.yml) çalışır. "Fiyatları topla" iş akışının son çalıştırmalarına ve
// data/latest.json'a bakar. Sorun varsa "veri-sagligi" etiketli bir issue açar (GitHub
// uygulaması bildirim gönderir) ve isteğe bağlı olarak Telegram'dan yazar. Düzelince issue'yu
// kapatır. Sorun sürdükçe tekrar tekrar yazmaz.
//
//   GITHUB_TOKEN, GITHUB_REPOSITORY            (Actions verir)
//   TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID (isteğe bağlı; sadece sana gelen mesaj)
//   node tools/health_check.mjs --data data [--dry-run]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LABEL = 'veri-sagligi';
const HOUR = 3600_000;

/**
 * Saf karar fonksiyonu.
 * @param runs   collect.yml çalıştırmaları, yeniden eskiye: { status, conclusion, updated_at, html_url }
 * @param latestUpdatedAt  latest.json'daki updatedAt (son fiyat değişikliği yazımı)
 */
export function assess({ runs, latestUpdatedAt, now = new Date(), quietHours = 3, failStreak = 3, staleDays = 7 }) {
  const problems = [];
  const done = runs.filter(r => r.status === 'completed');
  const lastSuccess = done.find(r => r.conclusion === 'success');

  // Toplayıcı 15 dakikada bir çalışır; GitHub zamanlamayı bazen bir saate kadar geciktirir.
  if (!lastSuccess) {
    problems.push(`Son ${done.length} toplayıcı çalıştırmasının hiçbiri başarılı değil.`);
  } else {
    const hours = (now - new Date(lastSuccess.updated_at)) / HOUR;
    if (hours > quietHours) problems.push(`Toplayıcı ${Math.floor(hours)} saattir başarıyla çalışmadı.`);
  }

  let streak = 0;
  for (const r of done) {
    if (r.conclusion === 'success' || r.conclusion === 'skipped' || r.conclusion === 'cancelled') break;
    streak++;
  }
  if (streak >= failStreak && lastSuccess) {
    problems.push(`Son ${streak} çalıştırma başarısız oldu. En yenisi: ${done[0].html_url}`);
  }

  // Fiyatlar haftalarca hiç değişmiyorsa toplayıcı "başarılı" görünse de kaynak sayfa değişmiş olabilir.
  if (latestUpdatedAt) {
    const days = (now - new Date(latestUpdatedAt)) / (24 * HOUR);
    if (days > staleDays) {
      problems.push(`Hiçbir ilde ${Math.floor(days)} gündür fiyat değişmedi. Petrol Ofisi sayfasının biçimi değişmiş olabilir.`);
    }
  }

  return { healthy: problems.length === 0, problems };
}

/** Issue ve Telegram metni. */
export function report(problems, repo) {
  const lines = problems.map(p => `- ${p}`).join('\n');
  return {
    title: 'Veri sağlığı: fiyatlar güncellenmiyor olabilir',
    body: `Saatlik kontrol bir sorun buldu:\n\n${lines}\n\n` +
      `Bakılacak yerler: [Fiyatları topla](https://github.com/${repo}/actions/workflows/collect.yml) çalıştırmaları ` +
      `ve docs/OPERATIONS.md. Sorun düzelince bu issue kendiliğinden kapanır.`,
    telegram: `⚠️ Depo Dolu veri sağlığı\n\n${problems.join('\n')}\n\nhttps://github.com/${repo}/actions/workflows/collect.yml`,
  };
}

async function main() {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
  };
  const dryRun = process.argv.includes('--dry-run');
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error('GITHUB_REPOSITORY ve GITHUB_TOKEN gerekli.');

  const gh = async (path, init = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...init.headers },
    });
    if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };

  const { workflow_runs: runs } = await gh('/actions/workflows/collect.yml/runs?per_page=20&branch=main');
  const latest = JSON.parse(readFileSync(join(arg('--data', 'data'), 'latest.json'), 'utf8'));
  const result = assess({ runs, latestUpdatedAt: latest.updatedAt });
  const open = (await gh(`/issues?labels=${LABEL}&state=open&per_page=5`)).filter(i => !i.pull_request);

  console.log(result.healthy ? '✓ Veri sağlıklı.' : `✗ Sorun:\n${result.problems.join('\n')}`);
  if (dryRun) return;

  if (!result.healthy && open.length === 0) {
    const r = report(result.problems, repo);
    const issue = await gh('/issues', { method: 'POST', body: JSON.stringify({ title: r.title, body: r.body, labels: [LABEL] }) });
    console.log(`Issue açıldı: ${issue.html_url}`);
    await telegram(r.telegram);
  } else if (result.healthy && open.length) {
    for (const issue of open) {
      await gh(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Toplayıcı yeniden düzenli çalışıyor. Kapatıyorum.' }) });
      await gh(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
      console.log(`Issue kapatıldı: ${issue.html_url}`);
    }
    await telegram('✅ Depo Dolu veri sağlığı: toplayıcı yeniden düzenli çalışıyor.');
  }
}

async function telegram(text) {
  const { TELEGRAM_BOT_TOKEN: botToken, TELEGRAM_ADMIN_CHAT_ID: chatId } = process.env;
  if (!botToken || !chatId) return;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  // Telegram'a ulaşılamaması kontrolü başarısız saymaz; issue zaten açıldı.
  if (!res.ok) console.warn(`Telegram gönderilemedi: ${res.status}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
