import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';

const genAIKey = process.env.GEMINI_API_KEY || '';
const ai = genAIKey ? new GoogleGenAI({ apiKey: genAIKey }) : null;

export interface CapturarPlurallParams {
  emailPlurall?: string;
  senhaPlurall?: string;
  accountOwner?: string;
  materia: string;
  tipoLivro: string;
  assunto?: string;
  bookQuery?: string;
  pageOrExercise?: string;
}

export async function capturarEAnalisarPlurall(params: CapturarPlurallParams) {
  let browser: any = null;
  try {
    const { emailPlurall, senhaPlurall, accountOwner, materia, tipoLivro, assunto, bookQuery, pageOrExercise } = params;

    console.log(`[PlurallBot] Iniciando captura automatizada no Plurall para ${materia}...`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // 1. Acessa a página oficial de Login do Plurall
    console.log('[PlurallBot] Acessando a página de login do Plurall (https://login.plurall.net/)...');
    try {
      await page.goto('https://login.plurall.net/', { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Tentativa de preenchimento de login se os campos estiverem disponíveis
      if (emailPlurall && senhaPlurall) {
        const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"], #email, #login');
        if (emailInput) {
          await emailInput.type(emailPlurall);
        }
        const passwordInput = await page.$('input[type="password"], input[name="password"], #password');
        if (passwordInput) {
          await passwordInput.type(senhaPlurall);
        }
      }
    } catch (loginErr: any) {
      console.warn('[PlurallBot] Aviso no carregamento do login:', loginErr?.message);
    }

    // 2. Navega até a Biblioteca de Conteúdo oficial do Plurall para selecionar apostilas
    const bibliotecaUrl = 'https://bibliotecadeconteudos.plurall.net/?utm_source=home&utm_medium=card-biblioteca-de-conteudos&utm_campaign=default';
    console.log(`[PlurallBot] Navegando até a Biblioteca de Conteúdos (${bibliotecaUrl})...`);
    try {
      await page.goto(bibliotecaUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (navErr: any) {
      console.warn('[PlurallBot] Aviso no carregamento da biblioteca:', navErr?.message);
    }

    // 3. Captura o print exato em formato base64
    console.log('[PlurallBot] Capturando o print da página da apostila...');
    const screenshotBase64 = (await page.screenshot({ encoding: 'base64', type: 'png' })) as string;

    await browser.close();

    const ownerName = accountOwner || (emailPlurall ? (emailPlurall.includes('@') ? emailPlurall.split('@')[0].toUpperCase() : emailPlurall) : 'Prof. Titular Plurall');

    return {
      sucesso: true,
      print_base64: screenshotBase64,
      account_owner: ownerName,
      owner_name: ownerName,
      materia,
      tipoLivro,
      pageOrExercise,
      bookQuery,
    };
  } catch (erro: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error('[PlurallBot] Erro na automação do Plurall:', erro);
    throw new Error(erro?.message || 'Falha na automação e captura do Plurall');
  }
}
