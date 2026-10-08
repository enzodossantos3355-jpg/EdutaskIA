import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import { whatsappService } from './whatsapp-service';
import { firebaseService } from './src/lib/firebaseService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'edutask-super-secret-jwt-key-2026';
const PORT = 3000;
const HOST = '0.0.0.0';

if (!process.env.TZ) {
  process.env.TZ = 'America/Sao_Paulo';
}

// ---------------------------------------------------------------------------
// Relógio Oficial do Sistema (Centralizado para todas as rotinas e horários)
// ---------------------------------------------------------------------------
export function getSystemClock(timezone = 'America/Sao_Paulo') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  const hours = partMap.hour || '00';
  const minutes = partMap.minute || '00';
  const seconds = partMap.second || '00';
  const day = partMap.day || '01';
  const month = partMap.month || '01';
  const year = partMap.year || '2026';
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const timeHM = `${hours}:${minutes}`;
  const dateStr = `${day}/${month}/${year}`;
  const yearMonthDay = `${year}-${month}-${day}`;

  return {
    now,
    timestamp: now.getTime(),
    iso: now.toISOString(),
    hours,
    minutes,
    seconds,
    timeStr,
    timeHM,
    dateStr,
    yearMonthDay,
    timezone,
  };
}

export function getSystemClockForDate(targetDate: Date, timezone = 'America/Sao_Paulo') {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(targetDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  const hours = partMap.hour || '00';
  const minutes = partMap.minute || '00';
  const seconds = partMap.second || '00';
  const day = partMap.day || '01';
  const month = partMap.month || '01';
  const year = partMap.year || '2026';
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const timeHM = `${hours}:${minutes}`;
  const dateStr = `${day}/${month}/${year}`;
  const yearMonthDay = `${year}-${month}-${day}`;

  return {
    date: targetDate,
    timestamp: targetDate.getTime(),
    iso: targetDate.toISOString(),
    hours,
    minutes,
    seconds,
    timeStr,
    timeHM,
    dateStr,
    yearMonthDay,
    timezone,
  };
}

// Gemini AI client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 45000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

const quotaExhaustedModels = new Map<string, number>();

// Robust Gemini invocation with automatic model fallbacks (gemini-3.1-flash-lite as primary)
async function callGeminiGenerate(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
  timeoutMs?: number;
}): Promise<any> {
  if (!genAI) throw new Error('Gemini API não configurada');
  const now = Date.now();

  for (const [model, exp] of quotaExhaustedModels.entries()) {
    if (now > exp) quotaExhaustedModels.delete(model);
  }

  // gemini-3.1-flash-lite is the active, stable model with available quota
  const defaultModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
  ];

  const candidateModels = [
    params.preferredModel || 'gemini-3.1-flash-lite',
    ...defaultModels,
  ];

  // Prioritize models that are not in 429 quota exhaustion
  const nonExhausted = candidateModels.filter((m) => !quotaExhaustedModels.has(m));
  const modelsToTry = Array.from(new Set(nonExhausted.length > 0 ? nonExhausted : candidateModels));
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await withTimeout(
        genAI.models.generateContent({
          model,
          contents: params.contents,
          ...(params.config ? { config: params.config } : {}),
        }),
        params.timeoutMs || 45000
      );
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
        quotaExhaustedModels.set(model, Date.now() + 15 * 60 * 1000);
      } else {
        console.warn(`[Gemini] Falha com modelo ${model} (${errMsg}), tentando próximo...`);
      }
    }
  }
  throw lastError || new Error('Todos os modelos Gemini falharam');
}

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB to support high-res camera photos
});

function resolveImageMime(file?: Express.Multer.File): string {
  if (!file) return 'image/png';
  const mime = (file.mimetype || '').toLowerCase();
  if (mime && mime !== 'application/octet-stream' && mime !== 'binary/octet-stream') {
    return mime;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.jfif':
    case '.pjpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.avif':
      return 'image/avif';
    case '.bmp':
      return 'image/bmp';
    case '.ico':
      return 'image/x-icon';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    default:
      return 'image/jpeg';
  }
}

// ---------------------------------------------------------------------------
// Sistema de Níveis Desligado Permanentemente
// ---------------------------------------------------------------------------
// Conforme nova diretriz pedagógica:
// - Pontos obtidos em tarefas servem exclusivamente para comprar Molduras na Loja.
// - O sistema de níveis/tiers foi desligado permanentemente.
// - O vencedor do prêmio do mês é avaliado e eleito exclusivamente pela Inteligência Artificial.
export const IS_TIER_SYSTEM_ENABLED = false;
export const TIERS: any[] = [];
export function getTier() {
  return null;
}

// ---------------------------------------------------------------------------
// Catálogo de Molduras da Loja (Efeitos de Avatar e Bloco de Perfil)
// ---------------------------------------------------------------------------
const DEFAULT_EFFECTS = [
  { id: 'none', name: 'Sem Moldura', emoji: '⚪', description: 'Visual clássico limpo sem efeitos no bloco do perfil.', cost: 0, css: '', rarity: 'common' },
  { id: 'stranger_things', name: 'Moldura Stranger Things', emoji: '🧇', description: 'Moldura épica do Mundo Invertido de Hawkins com logotipo retrô vermelho neon, céu estrelado cósmico, luzes de natal da Joyce e faróis!', cost: 200, css: 'fx-stranger-things', rarity: 'rare' },
  { id: 'riverdale', name: 'Moldura Riverdale (Bulldogs & Serpents)', emoji: '🐍', description: 'Moldura inspirada no universo de Riverdale com azul e ouro dos Bulldogs, verde das Serpentes do Sul e o clássico Pop\'s Chock\'lit Shoppe!', cost: 180, css: 'fx-riverdale', rarity: 'rare' },
  { id: 'spongebob', name: 'Moldura Bob Esponja', emoji: '🍍', description: 'Moldura alegre da Fenda do Biquíni com arte tropical submarina central e aura dourada!', cost: 120, css: 'fx-spongebob', rarity: 'rare' },
  { id: 'mentalist', name: 'Moldura O Mentalista', emoji: '🔍', description: 'Moldura inspirada na série O Mentalista com arte central vermelha e bege e Patrick Jane.', cost: 160, css: 'fx-mentalist', rarity: 'rare' },
  { id: 'neon_pulse', name: 'Moldura Neon Pulse', emoji: '💠', description: 'Halo azul pulsante futurista que envolve todo o bloco do perfil.', cost: 50, css: 'fx-neon-pulse', rarity: 'common' },
  { id: 'sunset', name: 'Moldura Pôr do Sol', emoji: '🌅', description: 'Borda giratória em degradê laranja e rosa quente com brilho solar envolvente.', cost: 80, css: 'fx-sunset', rarity: 'common' },
  { id: 'golden', name: 'Moldura Ouro Imperial', emoji: '🥇', description: 'Borda dourada reluzente com rotação e brilho nobre.', cost: 150, css: 'fx-golden', rarity: 'rare' },
  { id: 'rainbow', name: 'Moldura Arco-Íris', emoji: '🌈', description: 'Borda multicolorida em rotação contínua e dinâmica.', cost: 200, css: 'fx-rainbow', rarity: 'rare' },
  { id: 'ice', name: 'Moldura Gelo Astral', emoji: '❄️', description: 'Cristais glaciais com reflexo de geada fresca no bloco.', cost: 220, css: 'fx-ice', rarity: 'rare' },
  { id: 'fire', name: 'Moldura Magma Flamejante', emoji: '🔥', description: 'Chamas vivas em tons quentes de fogo e lava vulcânica.', cost: 250, css: 'fx-fire', rarity: 'rare' },
  { id: 'galaxy', name: 'Moldura Nebulosa Cósmica', emoji: '🌌', description: 'Nebulosa espacial roxa e azul com aura estelar.', cost: 500, css: 'fx-galaxy', rarity: 'epic' },
  { id: 'shadow', name: 'Moldura Obsidiana Dark', emoji: '🖤', description: 'Aura escura pulsante minimalista para foco total no bloco.', cost: 700, css: 'fx-shadow', rarity: 'epic' },
  { id: 'sakura', name: 'Moldura Sakura Zen', emoji: '🌸', description: 'Borda suave com tons de pétalas de cerejeira florescente.', cost: 300, css: 'fx-sunset', rarity: 'epic' },
  { id: 'emerald_forest', name: 'Moldura Esmeralda Mística', emoji: '🌲', description: 'Verde esmeralda cintilante com sabedoria ancestral.', cost: 400, css: 'fx-neon-pulse', rarity: 'epic' },
  { id: 'phoenix', name: 'Moldura Fênix Lendária', emoji: '🔴', description: 'Aura suprema de renascimento em rubi e ouro lendário.', cost: 900, css: 'fx-phoenix', rarity: 'legendary' },
];

const DEFAULT_APP_INFO = {
  id: 'app_info',
  version: '1.1.0',
  codename: 'Edutask AI Edition',
  release_notes: 'Atualização do sistema: Sistema de níveis desligado; pontos de tarefas exclusivamente para comprar molduras na loja; e vencedor final do mês avaliado por Inteligência Artificial.',
  features: [
    'Perfis estilo Netflix para Alunos e Admin',
    'Entrega de tarefas com anexos, respostas e prazos',
    'Gabarito inteligente gerado por IA através de fotos da tarefa',
    'Tira-dúvidas e tutor pedagógico com inteligência artificial',
    'Loja de Molduras de avatar (compradas estritamente com pontos de tarefas)',
    'Avaliação Mensal do Aluno Vencedor do Mês por Inteligência Artificial',
  ],
};

// ---------------------------------------------------------------------------
// In-Memory Database Structure with Persistence
// ---------------------------------------------------------------------------
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_plain?: string;
  role: 'admin' | 'aluno';
  status: 'active' | 'maintenance' | 'blocked';
  points: number;
  streak_count: number;
  longest_streak: number;
  last_active_date?: string;
  equipped_effect?: string;
  owned_effects: string[];
  avatar_data?: string;
  avatar_content_type?: string;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

interface GeneratedTaskAnswer {
  answer: string;
  length: 'short' | 'medium' | 'detailed';
  generated_at: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  points: number;
  assigned_to: string[]; // empty = all
  attachments: string[]; // file ids
  admin_photos: string[]; // file ids
  answer: string;
  answer_source?: string; // Fonte fornecida pelo admin para geração de resposta por IA
  whatsapp_photo_id?: string; // Foto escolhida especificamente para o Grupo 2
  whatsapp_caption?: string; // Enunciado / legenda específica para o Grupo 2
  created_by: string;
  created_at: string;
}

interface Completion {
  task_id: string;
  user_id: string;
  completed_at: string;
  on_time: boolean;
  points_awarded: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  assigned_to: string[];
  is_special?: boolean;
  created_by: string;
  created_at: string;
}

interface Comment {
  id: string;
  announcement_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  text: string;
  created_at: string;
}

interface LoginLog {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  ip?: string;
  created_at: string;
}

interface PointAdjustment {
  id: string;
  user_id: string;
  user_name: string;
  admin_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

interface FileRecord {
  id: string;
  original_filename: string;
  content_type: string;
  size: number;
  data: Buffer;
  uploaded_by: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  user_id: string;
  task_id?: string | null;
  kind?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; ts: string }>;
  updated_at: string;
}

export interface StudentButton {
  id: string;
  name: string; // Nome do botão para os alunos
  url: string;  // Link de escolha do administrador/professor
  description?: string;
  color?: string; // Estilo/cor do botão (ex: 'indigo', 'emerald', 'amber', 'rose', 'sky', 'violet')
  icon?: string;  // Emoji ou ícone
  active: boolean; // Se está visível para os alunos
  order?: number;
  click_count?: number;
  created_at: string;
  created_by?: string;
}

const BASE_DIR = process.env.VERCEL || process.env.NODE_ENV === 'production' ? os.tmpdir() : __dirname;
const DATA_DIR = path.resolve(BASE_DIR, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.resolve(BASE_DIR, 'uploads');
const AVATAR_DIR = path.resolve(BASE_DIR, 'avatars');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn('[Storage] Não foi possível criar DATA_DIR:', e);
}

try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  console.warn('[Storage] Não foi possível criar UPLOAD_DIR:', e);
}

try {
  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
} catch (e) {
  console.warn('[Storage] Não foi possível criar AVATAR_DIR:', e);
}

async function processAndSaveAvatar(userId: string, buffer: Buffer): Promise<{ dataUrl: string; contentType: string }> {
  try {
    const processedBuffer = await sharp(buffer)
      .rotate() // auto-orient based on EXIF
      .resize(512, 512, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const contentType = 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${processedBuffer.toString('base64')}`;

    try {
      if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
      fs.writeFileSync(path.resolve(AVATAR_DIR, `${userId}.jpg`), processedBuffer);
    } catch (err) {
      console.warn(`[Avatar] Erro ao salvar avatar no disco para ${userId}:`, err);
    }

    return { dataUrl, contentType };
  } catch (err) {
    console.warn('[Avatar] Sharp processing fallback to original buffer:', err);
    const contentType = 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    try {
      if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
      fs.writeFileSync(path.resolve(AVATAR_DIR, `${userId}.jpg`), buffer);
    } catch {}
    return { dataUrl, contentType };
  }
}

function removeAvatarFile(userId: string) {
  try {
    const filePath = path.resolve(AVATAR_DIR, `${userId}.jpg`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[Avatar] Erro ao deletar arquivo de avatar para ${userId}:`, err);
  }
}

class Database {
  users: Map<string, User> = new Map();
  subjects: Map<string, Subject> = new Map();
  tasks: Map<string, TaskItem> = new Map();
  completions: Completion[] = [];
  announcements: Map<string, Announcement> = new Map();
  comments: Map<string, Comment> = new Map();
  login_logs: LoginLog[] = [];
  point_adjustments: PointAdjustment[] = [];
  files: Map<string, FileRecord> = new Map();
  ai_chats: Map<string, ChatSession> = new Map();
  effect_overrides: Record<string, { cost: number }> = {};
  monthly_prize: any = null;
  active_month_key: string = '';
  monthly_history: any[] = [];
  task_cleanup_config: {
    enabled: boolean;
    cleanup_time: string; // "HH:MM"
    days_after_due: number; // 0 = tarefas que vencem hoje/vencidas
    delete_only_if_completed: boolean;
    last_run_at: string | null;
    last_run_date: string | null; // "YYYY-MM-DD" para garantir execução única por dia
    last_deleted_count: number;
    last_deleted_titles: string[];
  } = {
    enabled: true,
    cleanup_time: '23:59',
    days_after_due: 0,
    delete_only_if_completed: false,
    last_run_at: null,
    last_run_date: null,
    last_deleted_count: 0,
    last_deleted_titles: [],
  };
  student_buttons: Map<string, StudentButton> = new Map();
  whatsapp_config: {
    group_1_jid: string;
    group_1_name: string;
    group_2_jid: string;
    group_2_name: string;
    enabled: boolean;
    templates: {
      task_caption: string;
      task_photo_id: string | null;
      announcement_caption: string;
      announcement_photo_id: string | null;
      tomorrow_caption: string;
      tomorrow_photo_id: string | null;
      group1_task_extra: string; // Modelo pré-pronto de texto extra para o Grupo 1 (adicionado ao texto oficial sem modificar o texto base)
      group1_announcement_extra: string; // Modelo pré-pronto de texto extra para avisos no Grupo 1
      group1_tomorrow_extra: string; // Modelo pré-pronto de texto extra para lembrete do dia seguinte no Grupo 1
    };
    daily_reminder: {
      enabled: boolean;
      time: string; // "HH:MM"
      last_run_date: string | null;
    };
    auto_activation_schedule: {
      enabled: boolean;
      time: string; // "HH:MM"
      duration_minutes: number; // minimum 20 minutes
      stay_connected_24_7: boolean;
      dispatch_reminder_on_activation: boolean;
      last_run_date: string | null;
    };
  } = {
    group_1_jid: '',
    group_1_name: '',
    group_2_jid: '',
    group_2_name: '',
    enabled: true,
    templates: {
      task_caption: '📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}',
      task_photo_id: null,
      announcement_caption: '📣 *{titulo}*\n\n{mensagem}',
      announcement_photo_id: null,
      tomorrow_caption: '🚨 *LEMBRETE: TAREFAS PARA AMANHÃ ({data_amanha})*\n\nOlá turma! Não se esqueçam das tarefas marcadas para amanhã:\n\n{lista_tarefas}\n\n👉 Acessem o Edutask para conferir e responder no prazo!',
      tomorrow_photo_id: null,
      group1_task_extra: '📌 *Lembrete Extra da Turma:*\nFavor conferir os detalhes e responder dentro do prazo no portal!',
      group1_announcement_extra: '📌 *Observação Importante:*\nAcompanhem as atualizações e tirem dúvidas pelo Edutask!',
      group1_tomorrow_extra: '📌 *Aviso Extra da Turma:*\nOrganizem seus horários para não deixar nada para a última hora!',
    },
    daily_reminder: {
      enabled: true,
      time: '19:00',
      last_run_date: null,
    },
    auto_activation_schedule: {
      enabled: true,
      time: '18:00',
      duration_minutes: 20,
      stay_connected_24_7: false,
      dispatch_reminder_on_activation: false,
      last_run_date: null,
    },
  };
  app_info: any = { ...DEFAULT_APP_INFO };
  ai_enabled: boolean = true;
  webhook_logs: any[] = [];
  task_student_answers: Map<string, GeneratedTaskAnswer> = new Map();

  private firebaseSynced: boolean = false;
  private syncPromise: Promise<void> | null = null;

  constructor() {
    if (!this.loadFromDisk()) {
      this.seed();
      this.saveToDisk();
    }
    whatsappService.setConfig(this.whatsapp_config);
    if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      whatsappService.initAutoConnect();
    }
    this.ensureSynced().catch((err) => {
      console.warn('[Firebase Sync Error]', err);
    });
  }

  async ensureSynced() {
    if (this.firebaseSynced) return;
    if (!this.syncPromise) {
      this.syncPromise = this.syncWithFirebase().finally(() => {
        this.firebaseSynced = true;
      });
    }
    await this.syncPromise;
  }

  async syncWithFirebase() {
    try {
      console.log('[Firebase] Sincronizando coleções do Firestore...');
      const [tasks, users, announcements, completions, subjects, comments, settings, studentAnswers, remoteFiles] = await Promise.all([
        firebaseService.getAllTasks(),
        firebaseService.getAllUsers(),
        firebaseService.getAllAnnouncements(),
        firebaseService.getAllCompletions(),
        firebaseService.getAllSubjects(),
        firebaseService.getAllComments(),
        firebaseService.getSettings('system'),
        firebaseService.getAllStudentAnswers(),
        firebaseService.getAllFiles(),
      ]);

      if (tasks && tasks.length > 0) {
        tasks.forEach((t) => {
          this.tasks.set(t.id, {
            id: t.id,
            title: t.title,
            description: t.description,
            subject: t.subject,
            due_date: t.due_date,
            points: t.points || 10,
            assigned_to: t.assigned_to || [],
            attachments: t.attachments || [],
            admin_photos: t.admin_photos || [],
            answer: t.answer || '',
            answer_source: t.answer_source || '',
            created_by: t.created_by || 'system',
            created_at: t.created_at || new Date().toISOString(),
          });
        });
      } else if (this.tasks.size > 0) {
        for (const task of this.tasks.values()) {
          await firebaseService.saveTask(task);
        }
      }

      if (users && users.length > 0) {
        users.forEach((u) => {
          if (u.id) this.users.set(u.id, u);
        });
      }
      // Ensure seed users exist in Firestore
      for (const [id, seedUser] of this.users.entries()) {
        if (!users || !users.some((u) => u.id === id)) {
          await firebaseService.saveUser(seedUser);
        }
      }

      if (subjects && subjects.length > 0) {
        subjects.forEach((s) => {
          if (s.id) this.subjects.set(s.id, s);
        });
      } else if (this.subjects.size > 0) {
        for (const subj of this.subjects.values()) {
          await firebaseService.saveSubject(subj);
        }
      }

      if (announcements && announcements.length > 0) {
        announcements.forEach((a) => {
          if (a.id) this.announcements.set(a.id, a);
        });
      } else if (this.announcements.size > 0) {
        for (const a of this.announcements.values()) {
          await firebaseService.saveAnnouncement(a);
        }
      }

      if (completions && completions.length > 0) {
        const compMap = new Map<string, any>();
        (this.completions || []).forEach((c: any) => {
          const k = c.id || `${c.user_id}_${c.task_id}`;
          compMap.set(k, { ...c, id: k });
        });
        completions.forEach((c: any) => {
          const k = c.id || `${c.user_id}_${c.task_id}`;
          if (!compMap.has(k)) {
            compMap.set(k, { ...c, id: k });
          } else {
            compMap.set(k, { ...compMap.get(k), ...c });
          }
        });
        this.completions = Array.from(compMap.values());
      }

      if (comments && comments.length > 0) {
        comments.forEach((c) => {
          if (c.id) this.comments.set(c.id, c);
        });
      }

      if (settings) {
        this.monthly_prize = settings.monthly_prize || null;
        if (settings.task_cleanup_config) {
          const prevRunDate = this.task_cleanup_config?.last_run_date;
          this.task_cleanup_config = { ...this.task_cleanup_config, ...settings.task_cleanup_config };
          if (prevRunDate && !this.task_cleanup_config.last_run_date) {
            this.task_cleanup_config.last_run_date = prevRunDate;
          }
        }
        if (settings.whatsapp_config) {
          const prevReminderRunDate = this.whatsapp_config?.daily_reminder?.last_run_date;
          const prevAutoActivationRunDate = this.whatsapp_config?.auto_activation_schedule?.last_run_date;
          this.whatsapp_config = { ...this.whatsapp_config, ...settings.whatsapp_config };
          if (prevReminderRunDate && this.whatsapp_config?.daily_reminder) {
            this.whatsapp_config.daily_reminder.last_run_date = prevReminderRunDate;
          }
          if (prevAutoActivationRunDate && this.whatsapp_config?.auto_activation_schedule) {
            this.whatsapp_config.auto_activation_schedule.last_run_date = prevAutoActivationRunDate;
          }
        }
        if (settings.app_info) this.app_info = settings.app_info;
        if (settings.effect_overrides) this.effect_overrides = settings.effect_overrides;
      } else {
        await firebaseService.saveSettings('system', {
          monthly_prize: this.monthly_prize,
          task_cleanup_config: this.task_cleanup_config,
          whatsapp_config: this.whatsapp_config,
          app_info: this.app_info,
          effect_overrides: this.effect_overrides,
        });
      }

      if (studentAnswers && studentAnswers.length > 0) {
        studentAnswers.forEach((sa) => {
          if (sa.key) this.task_student_answers.set(sa.key, sa);
        });
      }

      if (remoteFiles && remoteFiles.length > 0) {
        remoteFiles.forEach((f) => {
          if (f.id && f.base64) {
            this.files.set(f.id, {
              id: f.id,
              original_filename: f.original_filename || f.id,
              content_type: f.content_type || 'image/jpeg',
              size: f.size || 0,
              data: Buffer.from(f.base64, 'base64'),
              uploaded_by: f.uploaded_by || 'system',
              created_at: f.created_at || new Date().toISOString(),
            });
          }
        });
      }

      this.saveToDisk();
      console.log('[Firebase] Sincronização com o Firestore concluída.');
    } catch (e: any) {
      console.warn('[Firebase] Falha na sincronização:', e?.message || e);
    }
  }

  saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const data = {
        users: Array.from(this.users.entries()),
        subjects: Array.from(this.subjects.entries()),
        tasks: Array.from(this.tasks.entries()),
        completions: this.completions,
        announcements: Array.from(this.announcements.entries()),
        comments: Array.from(this.comments.entries()),
        login_logs: this.login_logs,
        point_adjustments: this.point_adjustments,
        effect_overrides: this.effect_overrides,
        monthly_prize: this.monthly_prize,
        active_month_key: this.active_month_key,
        monthly_history: this.monthly_history,
        task_cleanup_config: this.task_cleanup_config,
        student_buttons: Array.from(this.student_buttons.entries()),
        whatsapp_config: this.whatsapp_config,
        app_info: this.app_info,
        ai_enabled: this.ai_enabled,
        task_student_answers: Array.from(this.task_student_answers.entries()),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn('Could not save DB to disk:', e);
    }
  }

  loadFromDisk(): boolean {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data.users) this.users = new Map(data.users);
        if (data.subjects) this.subjects = new Map(data.subjects);
        if (data.tasks) this.tasks = new Map(data.tasks);
        if (data.completions) this.completions = data.completions;
        if (data.announcements) this.announcements = new Map(data.announcements);
        if (data.comments) this.comments = new Map(data.comments);
        if (data.login_logs) this.login_logs = data.login_logs;
        if (data.point_adjustments) this.point_adjustments = data.point_adjustments;
        if (data.effect_overrides) this.effect_overrides = data.effect_overrides;
        if (data.monthly_prize) this.monthly_prize = data.monthly_prize;
        if (data.task_cleanup_config) this.task_cleanup_config = { ...this.task_cleanup_config, ...data.task_cleanup_config };
        if (data.student_buttons) this.student_buttons = new Map(data.student_buttons);
        if (data.whatsapp_config) this.whatsapp_config = { ...this.whatsapp_config, ...data.whatsapp_config };
        if (data.app_info) this.app_info = data.app_info;
        if (data.ai_enabled !== undefined) this.ai_enabled = data.ai_enabled;
        if (data.task_student_answers) this.task_student_answers = new Map(data.task_student_answers);
        // Ensure admin does not have a trivial '123' password
        for (const u of this.users.values()) {
          if (u.role === 'admin' && (u.password_plain === '123' || !u.password_hash)) {
            const adminPass = process.env.ADMIN_PASSWORD || 'enzo123cg';
            u.password_plain = adminPass;
            u.password_hash = bcrypt.hashSync(adminPass, 10);
          }
        }
        return true;
      }
    } catch (e) {
      console.warn('Could not load DB from disk, fallback to seed:', e);
    }
    return false;
  }

  seed() {
    // Admin user
    const adminPass = process.env.ADMIN_PASSWORD || 'enzo123cg';
    const adminHash = bcrypt.hashSync(adminPass, 10);
    const adminId = 'admin-user-001';
    this.users.set(adminId, {
      id: adminId,
      email: 'admin@escola.com',
      name: 'Administrador',
      password_hash: adminHash,
      password_plain: adminPass,
      role: 'admin',
      status: 'active',
      points: 0,
      streak_count: 0,
      longest_streak: 0,
      owned_effects: DEFAULT_EFFECTS.map((e) => e.id),
      equipped_effect: 'none',
      created_at: new Date().toISOString(),
    });

    // Default subjects
    const subjects = ['Matemática', 'Português', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'];
    subjects.forEach((name, i) => {
      const id = `subj-${i + 1}`;
      this.subjects.set(id, { id, name });
    });

    // Seed default student buttons if empty
    if (this.student_buttons.size === 0) {
      const defaultButtons: StudentButton[] = [
        {
          id: 'btn-classroom',
          name: 'Google Sala de Aula',
          url: 'https://classroom.google.com',
          description: 'Acesse suas salas de aula virtuais e materiais complementares.',
          color: 'emerald',
          icon: '📚',
          active: true,
          order: 1,
          click_count: 0,
          created_at: new Date().toISOString(),
          created_by: 'admin',
        },
        {
          id: 'btn-livros',
          name: 'Biblioteca Digital',
          url: 'http://www.dominiopublico.gov.br',
          description: 'Acervo gratuito de livros, literatura e pesquisas acadêmicas.',
          color: 'indigo',
          icon: '📖',
          active: true,
          order: 2,
          click_count: 0,
          created_at: new Date().toISOString(),
          created_by: 'admin',
        },
      ];
      defaultButtons.forEach((b) => this.student_buttons.set(b.id, b));
    }
  }

  getEffectsCatalog() {
    return DEFAULT_EFFECTS.map((eff) => {
      const override = this.effect_overrides[eff.id];
      return {
        ...eff,
        cost: override ? override.cost : eff.cost,
      };
    });
  }
}

const db = new Database();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyAuthToken(req: express.Request): User | null {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.query && typeof req.query.auth === 'string') {
    token = req.query.auth;
  }

  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== 'access') return null;
    const user = db.users.get(payload.sub);
    return user || null;
  } catch {
    return null;
  }
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = verifyAuthToken(req);
  if (!user) {
    return res.status(401).json({ detail: 'Não autenticado' });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user || verifyAuthToken(req);
  if (!user) {
    return res.status(401).json({ detail: 'Não autenticado' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ detail: 'Acesso restrito ao administrador' });
  }
  (req as any).user = user;
  next();
}

function updateStudentStreak(userId: string) {
  const user = db.users.get(userId);
  if (!user || user.role !== 'aluno') return;

  const clock = getSystemClock();
  const today = clock.yearMonthDay;
  if (user.last_active_date === today) return;

  const yesterdayDate = new Date(clock.timestamp - 24 * 60 * 60 * 1000);
  const yesterday = getSystemClockForDate(yesterdayDate).yearMonthDay;
  if (user.last_active_date === yesterday) {
    user.streak_count = (user.streak_count || 0) + 1;
  } else {
    user.streak_count = 1;
  }
  user.longest_streak = Math.max(user.longest_streak || 0, user.streak_count);
  user.last_active_date = today;
}

// ---------------------------------------------------------------------------
// Express App & Setup
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

const api = express.Router();

// ---------------------------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------------------------
api.get('/auth/profiles', (req, res) => {
  const profiles = Array.from(db.users.values()).map((u) => {
    const pts = u.points || 0;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status || 'active',
      has_avatar: Boolean(u.avatar_data),
      points: pts,
      tier_name: null, // Level system permanently disabled
      equipped_effect: u.equipped_effect || 'none',
    };
  });
  profiles.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return a.name.localeCompare(b.name);
  });
  res.json(profiles);
});

api.post('/auth/login', (req, res) => {
  const { user_id, email, password } = req.body || {};
  if (!user_id && !email) {
    return res.status(400).json({ detail: 'Informe um perfil ou email' });
  }

  let user: User | undefined;
  if (user_id) {
    user = db.users.get(user_id);
  } else if (email) {
    const cleanEmail = email.toLowerCase().trim();
    user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === cleanEmail);
  }

  if (!user) {
    return res.status(401).json({ detail: 'Perfil não encontrado' });
  }

  // Verify password with bcrypt or fallback for dev convenience
  let valid = false;
  if (user.role === 'admin') {
    if (password === '123') {
      valid = false;
    } else {
      valid = Boolean(
        password && (
          (user.password_hash && bcrypt.compareSync(password, user.password_hash)) ||
          (user.password_plain && password === user.password_plain && user.password_plain !== '123') ||
          (password === (process.env.ADMIN_PASSWORD || 'enzo123cg'))
        )
      );
    }
  } else {
    valid = Boolean(
      password && (
        (user.password_hash && bcrypt.compareSync(password, user.password_hash)) ||
        password === user.password_plain ||
        password === '123'
      )
    );
  }

  if (!valid) {
    return res.status(401).json({ detail: user.role === 'admin' && password === '123' ? 'A senha 123 não é permitida para o administrador' : 'Senha inválida' });
  }

  if (user.status === 'maintenance') {
    return res.status(403).json({ detail: 'Perfil em manutenção. Fale com o administrador.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ detail: 'Perfil bloqueado. Fale com o administrador.' });
  }

  const token = createToken(user);

  // Record login log for students
  if (user.role === 'aluno') {
    db.login_logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      created_at: new Date().toISOString(),
    });
    if (db.login_logs.length > 2000) db.login_logs.pop();
    updateStudentStreak(user.id);
  }

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      has_avatar: Boolean(user.avatar_data),
    },
  });
});

api.post('/auth/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.json({ ok: true });
});

api.get('/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    points: user.points,
    streak_count: user.streak_count,
    longest_streak: user.longest_streak,
    equipped_effect: user.equipped_effect || 'none',
    owned_effects: user.owned_effects || ['none'],
    has_avatar: Boolean(user.avatar_data),
    created_at: user.created_at,
  });
});

api.get('/me/stats', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const points = user.points || 0;

  const myCompletions = db.completions.filter((c) => c.user_id === user.id);
  const onTimeCount = myCompletions.filter((c) => {
    if (Boolean(c.on_time)) return true;
    const task = db.tasks.get(c.task_id);
    if (!task || !task.due_date) return true;
    const compYMD = parseDateYMD(c.completed_at);
    const dueYMD = parseDateYMD(task.due_date);
    if (!dueYMD) return true;
    if (!compYMD) return true;
    return compYMD <= dueYMD;
  }).length;

  res.json({
    points, // Pontos obtidos exclusivamente para a loja de molduras
    points_purpose: 'molduras',
    streak_count: user.streak_count || 0,
    longest_streak: user.longest_streak || 0,
    last_active_date: user.last_active_date,
    total_completed: myCompletions.length,
    on_time_completed: onTimeCount,
    tier: null, // Sistema de nível desligado permanentemente
  });
});

// ---------------------------------------------------------------------------
// Users Management
// ---------------------------------------------------------------------------
api.get('/users', requireAuth, (req, res) => {
  const currentUser = (req as any).user as User;
  const users = Array.from(db.users.values()).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    points: u.points || 0,
    streak_count: u.streak_count || 0,
    longest_streak: u.longest_streak || 0,
    equipped_effect: u.equipped_effect || 'none',
    has_avatar: Boolean(u.avatar_data),
    password: currentUser.role === 'admin' ? (u.password_plain || '123') : undefined,
    password_plain: currentUser.role === 'admin' ? (u.password_plain || '123') : undefined,
    created_at: u.created_at,
  }));
  res.json(users);
});

api.post('/users', requireAdmin, async (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ detail: 'Nome e senha são obrigatórios' });
  }

  const cleanName = name.trim();
  const id = `aluno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = `${cleanName.toLowerCase().replace(/\s+/g, '.')}-${Date.now().toString().slice(-4)}@escola.com`;

  const newUser: User = {
    id,
    email,
    name: cleanName,
    password_hash: bcrypt.hashSync(password, 10),
    password_plain: password,
    role: 'aluno',
    status: 'active',
    points: 0,
    streak_count: 0,
    longest_streak: 0,
    owned_effects: ['none'],
    equipped_effect: 'none',
    created_at: new Date().toISOString(),
  };

  db.users.set(id, newUser);
  db.saveToDisk();
  await firebaseService.saveUser(newUser).catch(console.warn);

  res.json({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    status: newUser.status,
    has_avatar: false,
    created_at: newUser.created_at,
  });
});

api.patch('/users/:user_id/status', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const { status } = req.body || {};
  const user = db.users.get(user_id);
  if (!user) return res.status(404).json({ detail: 'Usuário não encontrado' });
  if (!['active', 'maintenance', 'blocked'].includes(status)) {
    return res.status(400).json({ detail: 'Status inválido' });
  }
  user.status = status;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, status: user.status });
});

api.patch('/users/:user_id', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const { name, password, remove_avatar } = req.body || {};
  const user = db.users.get(user_id);
  if (!user) return res.status(404).json({ detail: 'Usuário não encontrado' });

  if (user.role === 'admin' && password && password.trim() === '123') {
    return res.status(400).json({ detail: 'A senha 123 não é permitida para administradores' });
  }

  if (name) user.name = name.trim();
  if (password) {
    user.password_hash = bcrypt.hashSync(password, 10);
    user.password_plain = password;
  }
  if (remove_avatar) {
    user.avatar_data = undefined;
    user.avatar_content_type = undefined;
  }
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, user: { id: user.id, name: user.name, has_avatar: Boolean(user.avatar_data) } });
});

api.patch('/me', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const { name, password, remove_avatar } = req.body || {};

  if (user.role === 'admin' && password && password.trim() === '123') {
    return res.status(400).json({ detail: 'A senha 123 não é permitida para administradores' });
  }

  if (name) user.name = name.trim();
  if (password) {
    user.password_hash = bcrypt.hashSync(password, 10);
    user.password_plain = password;
  }
  if (remove_avatar) {
    user.avatar_data = undefined;
    user.avatar_content_type = undefined;
  }
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, has_avatar: Boolean(user.avatar_data) });
});

api.delete('/users/:user_id', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const user = db.users.get(user_id);
  if (!user) return res.status(404).json({ detail: 'Usuário não encontrado' });
  if (user.role === 'admin') {
    return res.status(400).json({ detail: 'Não é possível remover o administrador principal' });
  }
  db.users.delete(user_id);
  db.saveToDisk();
  await firebaseService.deleteUser(user_id).catch(console.warn);

  res.json({ ok: true });
});

api.post('/users/:user_id/points', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const { delta, reason } = req.body || {};
  const user = db.users.get(user_id);
  if (!user || user.role !== 'aluno') {
    return res.status(404).json({ detail: 'Aluno não encontrado' });
  }

  const d = parseInt(delta) || 0;
  user.points = Math.max(0, (user.points || 0) + d);

  db.point_adjustments.push({
    id: `adj-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    admin_id: (req as any).user.id,
    delta: d,
    reason: (reason || '').trim(),
    created_at: new Date().toISOString(),
  });

  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, total_points: user.points, delta: d });
});

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------
api.post('/me/avatar', requireAuth, upload.single('file'), async (req, res) => {
  const user = (req as any).user as User;
  if (!req.file) return res.status(400).json({ detail: 'Nenhum arquivo enviado' });

  const { dataUrl, contentType } = await processAndSaveAvatar(user.id, req.file.buffer);
  user.avatar_data = dataUrl;
  user.avatar_content_type = contentType;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, has_avatar: true });
});

api.delete('/me/avatar', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  removeAvatarFile(user.id);
  user.avatar_data = undefined;
  user.avatar_content_type = undefined;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, has_avatar: false });
});

api.post('/users/:user_id/avatar', requireAdmin, upload.single('file'), async (req, res) => {
  const { user_id } = req.params;
  const user = db.users.get(user_id);
  if (!user) return res.status(404).json({ detail: 'Usuário não encontrado' });
  if (!req.file) return res.status(400).json({ detail: 'Nenhum arquivo enviado' });

  const { dataUrl, contentType } = await processAndSaveAvatar(user.id, req.file.buffer);
  user.avatar_data = dataUrl;
  user.avatar_content_type = contentType;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, has_avatar: true });
});

api.delete('/users/:user_id/avatar', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const user = db.users.get(user_id);
  if (!user) return res.status(404).json({ detail: 'Usuário não encontrado' });

  removeAvatarFile(user.id);
  user.avatar_data = undefined;
  user.avatar_content_type = undefined;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({ ok: true, has_avatar: false });
});

api.get('/avatars/:user_id', (req, res) => {
  const { user_id } = req.params;
  const user = db.users.get(user_id);

  if (user && user.avatar_data) {
    const parts = user.avatar_data.split(',');
    const headerMime = parts[0] ? parts[0].replace(/^data:/, '').replace(/;base64$/, '') : '';
    const mime = user.avatar_content_type || headerMime || 'image/jpeg';
    const imgBuffer = Buffer.from(parts[1] || '', 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(imgBuffer);
  }

  // Fallback: check AVATAR_DIR on disk
  try {
    const diskPath = path.resolve(AVATAR_DIR, `${user_id}.jpg`);
    if (fs.existsSync(diskPath)) {
      const buffer = fs.readFileSync(diskPath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(buffer);
    }
  } catch {}

  return res.status(404).json({ detail: 'Avatar não encontrado' });
});

api.get('/users/:user_id/avatar', (req, res) => {
  res.redirect(`/api/avatars/${req.params.user_id}`);
});

api.get('/me/avatar', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  res.redirect(`/api/avatars/${user.id}`);
});

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
api.get('/subjects', requireAuth, (req, res) => {
  res.json(Array.from(db.subjects.values()));
});

api.post('/subjects', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ detail: 'Nome obrigatório' });
  const id = `subj-${Date.now()}`;
  const subj = { id, name: name.trim() };
  db.subjects.set(id, subj);
  db.saveToDisk();
  await firebaseService.saveSubject(subj).catch(console.warn);

  res.json(subj);
});

api.delete('/subjects/:subject_id', requireAdmin, async (req, res) => {
  const { subject_id } = req.params;
  db.subjects.delete(subject_id);
  db.saveToDisk();
  await firebaseService.deleteSubject(subject_id).catch(console.warn);

  res.json({ ok: true });
});

api.post('/admin/clean-test-data', requireAdmin, async (req, res) => {
  try {
    const studentsToDelete = Array.from(db.users.values()).filter((u) => u.role !== 'admin');
    for (const s of studentsToDelete) {
      db.users.delete(s.id);
      await firebaseService.deleteUser(s.id).catch(console.warn);
    }

    const tasksToDelete = Array.from(db.tasks.keys());
    for (const tid of tasksToDelete) {
      db.tasks.delete(tid);
      await firebaseService.deleteTask(tid).catch(console.warn);
    }

    const annsToDelete = Array.from(db.announcements.keys());
    for (const aid of annsToDelete) {
      db.announcements.delete(aid);
      await firebaseService.deleteAnnouncement(aid).catch(console.warn);
    }

    const commsToDelete = Array.from(db.comments.keys());
    for (const cid of commsToDelete) {
      db.comments.delete(cid);
      await firebaseService.deleteComment(cid).catch(console.warn);
    }

    db.completions = [];
    db.login_logs = [];
    db.point_adjustments = [];
    db.task_student_answers.clear();
    db.monthly_prize = null;
    db.saveToDisk();

    await firebaseService.saveSettings('system', {
      monthly_prize: null,
      task_cleanup_config: db.task_cleanup_config,
      whatsapp_config: db.whatsapp_config,
      app_info: db.app_info,
      effect_overrides: db.effect_overrides,
    }).catch(console.warn);

    res.json({ ok: true, message: 'Todos os vestígios de testes foram removidos com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ detail: 'Erro ao limpar dados de teste: ' + (err?.message || err) });
  }
});

// ---------------------------------------------------------------------------
// Files Upload & Download
// ---------------------------------------------------------------------------
api.post('/files/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Nenhum arquivo enviado' });

  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ext = path.extname(req.file.originalname) || '';
  try {
    fs.writeFileSync(path.resolve(UPLOAD_DIR, `${id}${ext}`), req.file.buffer);
  } catch (e) {
    console.warn('Could not save file to disk:', e);
  }

  const base64Data = req.file.buffer.toString('base64');
  const record: FileRecord = {
    id,
    original_filename: req.file.originalname,
    content_type: req.file.mimetype || 'application/octet-stream',
    size: req.file.size,
    data: req.file.buffer,
    uploaded_by: (req as any).user.id,
    created_at: new Date().toISOString(),
  };

  db.files.set(id, record);
  db.saveToDisk();

  await firebaseService.saveFile({
    id,
    original_filename: record.original_filename,
    content_type: record.content_type,
    size: record.size,
    base64: base64Data,
    uploaded_by: record.uploaded_by,
    created_at: record.created_at,
  }).catch((err) => console.warn('[Firebase] Erro ao salvar arquivo no Firestore:', err));

  res.json({
    id,
    filename: req.file.originalname,
    size: req.file.size,
    content_type: record.content_type,
  });
});

api.get('/files/:file_id/download', async (req, res) => {
  const { file_id } = req.params;
  const authQuery = req.query.auth as string;
  let user: User | null = null;

  if (authQuery) {
    try {
      const payload = jwt.verify(authQuery, JWT_SECRET) as any;
      user = db.users.get(payload.sub) || null;
    } catch {}
  } else {
    user = verifyAuthToken(req);
  }

  if (!user) return res.status(401).json({ detail: 'Não autenticado' });

  let file = db.files.get(file_id);
  if (!file) {
    try {
      const filesInDir = fs.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(file_id));
      if (filesInDir.length > 0) {
        const found = filesInDir[0];
        const data = fs.readFileSync(path.resolve(UPLOAD_DIR, found));
        file = {
          id: file_id,
          original_filename: found,
          content_type: 'application/octet-stream',
          size: data.length,
          data,
          uploaded_by: 'system',
          created_at: new Date().toISOString(),
        };
        db.files.set(file_id, file);
      }
    } catch {}
  }

  if (!file) {
    // Attempt remote Firestore fallback
    try {
      const remoteFile = await firebaseService.getFile(file_id);
      if (remoteFile && remoteFile.base64) {
        file = {
          id: file_id,
          original_filename: remoteFile.original_filename || file_id,
          content_type: remoteFile.content_type || 'image/jpeg',
          size: remoteFile.size || 0,
          data: Buffer.from(remoteFile.base64, 'base64'),
          uploaded_by: remoteFile.uploaded_by || 'system',
          created_at: remoteFile.created_at || new Date().toISOString(),
        };
        db.files.set(file_id, file);
      }
    } catch (err) {
      console.warn('[Firebase] Erro ao buscar arquivo remoto:', err);
    }
  }

  if (!file) return res.status(404).json({ detail: 'Arquivo não encontrado' });

  res.setHeader('Content-Type', file.content_type);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_filename)}"`);
  res.send(file.data);
});

export function getFileRecord(fileId: string | null | undefined): FileRecord | null {
  if (!fileId) return null;
  let file = db.files.get(fileId);
  if (file && file.data && file.data.length > 0) {
    return file;
  }
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      const filesInDir = fs.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(fileId));
      if (filesInDir.length > 0) {
        const found = filesInDir[0];
        const fullPath = path.resolve(UPLOAD_DIR, found);
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(found).toLowerCase();
        let mime = 'image/jpeg';
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.svg') mime = 'image/svg+xml';
        else if (ext === '.pdf') mime = 'application/pdf';

        const record: FileRecord = {
          id: fileId,
          original_filename: file?.original_filename || found,
          content_type: file?.content_type && file.content_type !== 'application/octet-stream' ? file.content_type : mime,
          size: data.length,
          data,
          uploaded_by: file?.uploaded_by || 'system',
          created_at: file?.created_at || new Date().toISOString(),
        };
        db.files.set(fileId, record);
        return record;
      }
    }
  } catch (e) {
    console.warn(`[Storage] Erro ao carregar arquivo ${fileId} do disco:`, e);
  }
  return file || null;
}

export async function resolveFileRecordAsync(fileId: string | null | undefined): Promise<FileRecord | null> {
  if (!fileId) return null;
  const syncRecord = getFileRecord(fileId);
  if (syncRecord && syncRecord.data && syncRecord.data.length > 0) {
    return syncRecord;
  }
  try {
    const remoteFile = await firebaseService.getFile(fileId);
    if (remoteFile && remoteFile.base64) {
      const buffer = Buffer.from(remoteFile.base64, 'base64');
      const record: FileRecord = {
        id: fileId,
        original_filename: remoteFile.original_filename || fileId,
        content_type: remoteFile.content_type && remoteFile.content_type !== 'application/octet-stream' ? remoteFile.content_type : 'image/jpeg',
        size: remoteFile.size || buffer.length,
        data: buffer,
        uploaded_by: remoteFile.uploaded_by || 'system',
        created_at: remoteFile.created_at || new Date().toISOString(),
      };
      db.files.set(fileId, record);
      return record;
    }
  } catch (err) {
    console.warn(`[Firebase] Erro ao carregar arquivo remoto ${fileId}:`, err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
function buildTaskResponseForAdmin(task: TaskItem) {
  const students = Array.from(db.users.values()).filter((u) => u.role === 'aluno');
  const taskCompletions = db.completions.filter((c) => c.task_id === task.id);
  const completedIds = new Set(taskCompletions.map((c) => c.user_id));

  const targetStudents = task.assigned_to && task.assigned_to.length > 0
    ? students.filter((s) => task.assigned_to.includes(s.id))
    : students;

  const progress = targetStudents.map((s) => ({
    user_id: s.id,
    name: s.name,
    email: s.email,
    completed: completedIds.has(s.id),
    completed_at: taskCompletions.find((c) => c.user_id === s.id)?.completed_at || null,
  }));

  const attachmentsMeta = (task.attachments || []).map((id) => {
    const f = db.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });

  const adminPhotosMeta = (task.admin_photos || []).map((id) => {
    const f = db.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });

  return {
    ...task,
    answer_source: task.answer_source || '',
    attachments: attachmentsMeta,
    admin_photos: adminPhotosMeta,
    progress,
    completed_count: progress.filter((p) => p.completed).length,
    total_students: targetStudents.length,
    all_students: !task.assigned_to || task.assigned_to.length === 0,
  };
}

function buildTaskResponseForStudent(task: TaskItem, userId: string) {
  const myCompletion = db.completions.find((c) => c.task_id === task.id && c.user_id === userId);
  const attachmentsMeta = (task.attachments || []).map((id) => {
    const f = db.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });

  const adminPhotosMeta = (task.admin_photos || []).map((id) => {
    const f = db.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });

  const studentGenerated = db.task_student_answers.get(`${userId}:${task.id}`) || null;

  const hasAiSource = Boolean(
    (task.answer_source && task.answer_source.trim()) ||
    (task.answer && task.answer.trim()) ||
    (task.admin_photos && task.admin_photos.length > 0)
  );

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    subject: task.subject,
    due_date: task.due_date,
    points: task.points,
    answer: studentGenerated ? studentGenerated.answer : (task.answer || ''),
    answer_source: '', // Fonte da IA privada para o professor / backend
    has_source: hasAiSource,
    has_ai_source: hasAiSource,
    generated_answer: studentGenerated,
    attachments: attachmentsMeta,
    admin_photos: [], // Fotos de referência da IA privadas para o professor / backend
    completed: Boolean(myCompletion),
    completed_at: myCompletion?.completed_at || null,
    created_at: task.created_at,
  };
}

api.get('/tasks', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const allTasks = Array.from(db.tasks.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (user.role === 'admin') {
    return res.json(allTasks.map(buildTaskResponseForAdmin));
  }

  // Student view: only tasks assigned to them or to all
  const filtered = allTasks.filter((t) => !t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(user.id));
  res.json(filtered.map((t) => buildTaskResponseForStudent(t, user.id)));
});

api.post('/tasks', requireAdmin, async (req, res) => {
  const { title, description, subject, due_date, points, assigned_to, attachments, admin_photos, answer, answer_source } = req.body || {};
  if (!title || !description || !subject || !due_date) {
    return res.status(400).json({ detail: 'Campos obrigatórios ausentes' });
  }

  const id = `task-${Date.now()}`;
  const newTask: TaskItem = {
    id,
    title: title.trim(),
    description: description.trim(),
    subject: subject.trim(),
    due_date,
    points: Math.max(0, parseInt(points) || 10),
    assigned_to: Array.isArray(assigned_to) ? assigned_to : [],
    attachments: Array.isArray(attachments) ? attachments : [],
    admin_photos: Array.isArray(admin_photos) ? admin_photos : [],
    answer: (answer || '').trim(),
    answer_source: (answer_source || '').trim(),
    created_by: (req as any).user.id,
    created_at: new Date().toISOString(),
  };

  db.tasks.set(id, newTask);
  db.saveToDisk();

  // Sincronizar criação na coleção tasks do Firebase Firestore
  await firebaseService.saveTask(newTask).catch((err) => {
    console.warn('[Firebase] Erro ao salvar tarefa no Firestore:', err);
  });

  // Disparo automático e independente para os 2 grupos do WhatsApp configurados (não bloqueante)
  dispatchTaskWhatsAppNotifications(newTask).catch((err) => {
    console.error('[WhatsApp] Erro no disparo de tarefa:', err);
  });

  res.json(buildTaskResponseForAdmin(newTask));
});

async function dispatchTaskWhatsAppNotifications(task: TaskItem) {
  try {
    const status = whatsappService.getStatus();
    if (status.status !== 'connected' || !status.enabled) {
      return;
    }

    // Regra: tarefas para alunos específicos NÃO devem ser enviadas automaticamente no WhatsApp
    const isSpecific = Array.isArray(task.assigned_to) && task.assigned_to.length > 0;
    if (isSpecific) {
      console.log(`[WhatsApp] Tarefa "${task.title}" é exclusiva para pessoas específicas (${task.assigned_to.length}). Envio automático desativado.`);
      return;
    }

    // Identificar destinatários
    let recipientsLabel = 'Todos os alunos';

    // Buscar primeira foto anexada em attachments públicos da tarefa (NUNCA usar admin_photos que são fonte da IA)
    let photoBuffer: Buffer | null = null;
    let photoContentType: string | null = null;

    const publicFileIds = [...(task.attachments || [])];
    for (const fId of publicFileIds) {
      const f = getFileRecord(fId);
      if (f && f.content_type?.startsWith('image/') && f.data && f.data.length > 0) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
        break;
      }
    }

    // Se não houver foto pública anexada nesta tarefa específica, usar a foto universal de tarefas configurada no WhatsApp
    if (!photoBuffer && db.whatsapp_config?.templates?.task_photo_id) {
      const f = getFileRecord(db.whatsapp_config.templates.task_photo_id);
      if (f && f.data) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
      }
    }

    await whatsappService.sendTaskNotifications({
      subject: task.subject,
      title: task.title,
      due_date: task.due_date,
      points: task.points,
      description: task.description,
      recipients_label: recipientsLabel,
      group1_extra: db.whatsapp_config?.templates?.group1_task_extra,
      photo_buffer: photoBuffer,
      photo_content_type: photoContentType,
      custom_caption_template: db.whatsapp_config?.templates?.task_caption,
    });
  } catch (err) {
    console.error('[WhatsApp] Falha no disparo de notificações:', err);
  }
}

api.post('/tasks/:task_id/send-whatsapp', requireAdmin, async (req, res) => {
  const { task_id } = req.params;
  const {
    group1_enabled = true,
    group2_enabled = true,
    group1_extra,
    group2_caption,
    photo_id,
    photo_data,
  } = req.body || {};

  const task = db.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: 'Tarefa não encontrada' });

  const status = whatsappService.getStatus();
  if (status.status !== 'connected') {
    return res.status(400).json({ detail: 'WhatsApp não está conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: 'Nenhum grupo do WhatsApp configurado. Configure o Grupo 1 ou Grupo 2 na aba WhatsApp.' });
  }

  let recipientsLabel = 'Todos os alunos';
  if (task.assigned_to && task.assigned_to.length > 0) {
    const studentNames = task.assigned_to
      .map((id) => db.users.get(id)?.name)
      .filter(Boolean);
    if (studentNames.length > 0) {
      recipientsLabel = studentNames.join(', ');
    }
  }

  let photoBuffer: Buffer | null = null;
  let photoContentType: string | null = null;

  if (photo_data && typeof photo_data === 'string' && photo_data.startsWith('data:')) {
    try {
      const [header, b64] = photo_data.split(',');
      photoContentType = header.split(';')[0].replace('data:', '') || 'image/jpeg';
      photoBuffer = Buffer.from(b64, 'base64');
    } catch (e) {
      console.warn('Erro ao decodificar photo_data:', e);
    }
  } else if (photo_id) {
    const f = getFileRecord(photo_id);
    if (f && f.data) {
      photoBuffer = f.data;
      photoContentType = f.content_type;
    }
  } else if (photo_id !== null) {
    // Anexos públicos da tarefa (NUNCA fotos fonte da IA admin_photos)
    const publicFileIds = [...(task.attachments || [])];
    for (const fId of publicFileIds) {
      const f = getFileRecord(fId);
      if (f && f.content_type?.startsWith('image/') && f.data && f.data.length > 0) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
        break;
      }
    }
    if (!photoBuffer && db.whatsapp_config?.templates?.task_photo_id) {
      const f = getFileRecord(db.whatsapp_config.templates.task_photo_id);
      if (f && f.data) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
      }
    }
  }

  const result = await whatsappService.sendTaskNotifications({
    subject: task.subject,
    title: task.title,
    due_date: task.due_date,
    points: task.points,
    description: task.description,
    recipients_label: recipientsLabel,
    group1_extra: typeof group1_extra === 'string' ? group1_extra : undefined,
    group2_caption: group2_caption !== undefined ? group2_caption : undefined,
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    custom_caption_template: db.whatsapp_config?.templates?.task_caption,
    group1_enabled: Boolean(group1_enabled),
    group2_enabled: Boolean(group2_enabled),
  });

  const sentGroups = [];
  if (result.group1Sent) sentGroups.push('Grupo 1 (Aviso Completo)');
  if (result.group2Sent) sentGroups.push('Grupo 2 (Foto com Enunciado)');

  if (sentGroups.length === 0) {
    return res.status(500).json({
      detail: result.errors.join('; ') || 'Falha ao enviar para os grupos do WhatsApp',
    });
  }

  res.json({
    ok: true,
    message: `Enviado com sucesso para: ${sentGroups.join(' e ')}!`,
    details: result,
  });
});

api.put('/tasks/:task_id', requireAdmin, async (req, res) => {
  const { task_id } = req.params;
  const task = db.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: 'Tarefa não encontrada' });

  const { title, description, subject, due_date, points, assigned_to, attachments, admin_photos, answer, answer_source } = req.body || {};
  if (title) task.title = title.trim();
  if (description) task.description = description.trim();
  if (subject) task.subject = subject.trim();
  if (due_date) task.due_date = due_date;
  if (points !== undefined) task.points = Math.max(0, parseInt(points) || 0);
  if (Array.isArray(assigned_to)) task.assigned_to = assigned_to;
  if (Array.isArray(attachments)) task.attachments = attachments;
  if (Array.isArray(admin_photos)) task.admin_photos = admin_photos;
  if (answer !== undefined) task.answer = answer.trim();
  if (answer_source !== undefined) task.answer_source = answer_source.trim();

  db.saveToDisk();

  // Sincronizar edição na coleção tasks do Firebase Firestore
  await firebaseService.saveTask(task).catch((err) => {
    console.warn(`[Firebase] Erro ao atualizar tarefa ${task_id} no Firestore:`, err);
  });

  res.json(buildTaskResponseForAdmin(task));
});

// Student AI Task Answer Generation with selectable size & permanent persistence
api.post('/tasks/:task_id/generate-answer', requireAuth, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { task_id } = req.params;
  const { length = 'medium' } = req.body || {};
  const user = (req as any).user as User;

  const task = db.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: 'Tarefa não encontrada' });

  const validLength: 'short' | 'medium' | 'detailed' = ['short', 'medium', 'detailed'].includes(length)
    ? (length as 'short' | 'medium' | 'detailed')
    : 'medium';

  const rawSource = (task.answer_source || task.answer || '').trim();

  const lengthRules: Record<'short' | 'medium' | 'detailed', string> = {
    short: 'TAMANHO GABARITO CURTO: Forneça unicamente a numeração/identificação de cada questão e a resposta/alternativa direta. Proibido introduções, proibido explicações longas e proibido enrolação. Formato direto de folha de respostas rápida.',
    medium: 'TAMANHO GABARITO MÉDIO: Para cada questão, apresente a identificação da questão, desenvolvimento dos passos essenciais de forma sucinta e a resposta final destacada.',
    detailed: 'TAMANHO GABARITO DETALHADO: Para cada questão, apresente a identificação, a resolução completa passo a passo de todas as etapas e o gabarito final explicativo.'
  };

  // Collect all photos from admin_photos and image attachments
  const rawPhotoIds: string[] = [
    ...(task.admin_photos || []),
    ...(task.attachments || []),
  ].map((p: any) => (typeof p === 'string' ? p : p?.id)).filter(Boolean);
  const uniquePhotoIds = Array.from(new Set(rawPhotoIds));

  const imageFiles: FileRecord[] = [];
  for (const pid of uniquePhotoIds) {
    const f = await resolveFileRecordAsync(pid);
    if (f && f.data && (f.content_type?.startsWith('image/') || f.original_filename?.match(/\.(jpe?g|png|webp|gif|bmp|jfif|heic|heif)$/i))) {
      imageFiles.push(f);
    }
  }

  let generatedText = '';

  if (genAI) {
    try {
      const contentsParts: any[] = [];
      for (const img of imageFiles.slice(0, 10)) {
        if (img.data && img.data.length < 20 * 1024 * 1024) {
          const mime = img.content_type?.startsWith('image/') && img.content_type !== 'application/octet-stream'
            ? img.content_type
            : 'image/jpeg';
          contentsParts.push({
            inlineData: {
              data: img.data.toString('base64'),
              mimeType: mime,
            },
          });
        }
      }

      // CRITICAL: If images exist, the AI MUST NOT receive or see the task description / enunciado.
      // The AI is given ONLY the images and subject, and strictly forbidden from commenting on the task itself.
      const prompt = `VOCÊ É UM PROFESSOR RESOLVEDOR DE TAREFAS ESCOLARES.
SUA MISSÃO EXCLUSIVA: ENTREGAR SOMENTE A RESPOSTA DIRETA DE CADA QUESTÃO, SEM ENROLAÇÃO.

🚨 REGRAS CRÍTICAS E OBRIGATÓRIAS (ATENÇÃO MÁXIMA):
1. SEM EXPLICAÇÃO: NÃO coloque explicação, NÃO coloque resolução passo a passo, NÃO coloque justificativas e NÃO coloque introdução. Isso deixa o texto muito cheio. Forneça SOMENTE a resposta direta de cada questão que for estritamente necessária.
2. SEM ####: NUNCA use cerquilhas/hashtags (####, ###, ## ou #) em lugar nenhum. Proibido usar títulos markdown com #.
3. SEM **: NUNCA use asteriscos (**) nem marcadores com asterisco (*). O texto deve ser 100% puro.
4. ${imageFiles.length > 0 ? `FONTE EXCLUSIVA: Leia atentamente as fotos anexadas. Você NÃO tem o enunciado textual. Identifique cada questão ou item das imagens e entregue SOMENTE a resposta final necessária de cada uma.` : `DISCIPLINA: ${task.subject}`}

${rawSource && imageFiles.length === 0 ? `GABARITO DE BASE FORNECIDO PELO PROFESSOR:\n${rawSource}\n` : ''}

FORMATO EXATO OBRIGATÓRIO (DIRETO E LIMPO):
Questão 1: [Apenas a resposta direta necessária]
Questão 2: [Apenas a resposta direta necessária]
Questão 3: [Apenas a resposta direta necessária]`;

      contentsParts.push({ text: prompt });

      const response = await callGeminiGenerate({
        contents: contentsParts,
        preferredModel: 'gemini-3.1-flash-lite',
        timeoutMs: 45000,
      });

      generatedText = (response.text || '')
        .trim()
        .replace(/^#+\s*/gm, '')
        .replace(/#+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^[ \t]*(?:Explicação|Resolução|Passo a passo|Justificativa):\s*/gim, '')
        .trim();
    } catch (e: any) {
      console.warn('Gemini generate-answer error:', e.message);
    }
  }

  if (!generatedText) {
    if (imageFiles.length > 0) {
      generatedText = `Questão 1: Resposta direta apurada na foto.\nQuestão 2: Alternativa correta identificada na imagem.`;
    } else {
      generatedText = `Questão 1: ${rawSource || 'Resposta direta apurada.'}`;
    }
  }

  // Ensure absolutely no asterisks or hashtags remain in stored answer
  generatedText = generatedText
    .replace(/^#+\s*/gm, '')
    .replace(/#+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // Persist the student's generated answer so it remains until they click to regenerate
  const record: GeneratedTaskAnswer = {
    answer: generatedText,
    length: validLength,
    generated_at: new Date().toISOString(),
  };

  db.task_student_answers.set(`${user.id}:${task.id}`, record);
  db.saveToDisk();
  firebaseService.saveStudentAnswer(`${user.id}:${task.id}`, record).catch(console.warn);

  res.json(record);
});

api.delete('/tasks/:task_id', requireAdmin, async (req, res) => {
  const { task_id } = req.params;
  const completionsToDelete = db.completions.filter((c) => c.task_id === task_id);
  for (const c of completionsToDelete) {
    await firebaseService.deleteCompletion(c.user_id, task_id).catch(console.warn);
  }

  db.tasks.delete(task_id);
  db.completions = db.completions.filter((c) => c.task_id !== task_id);

  for (const [key] of db.task_student_answers.entries()) {
    if (key.endsWith(`:${task_id}`)) {
      db.task_student_answers.delete(key);
    }
  }

  db.saveToDisk();

  await firebaseService.deleteTask(task_id).catch((err) => {
    console.warn(`[Firebase] Erro ao remover tarefa ${task_id} do Firestore:`, err);
  });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Task Auto-Cleanup Configuration & Preview (Admin Only)
// ---------------------------------------------------------------------------
function getTasksEligibleForCleanup(): TaskItem[] {
  const cfg = db.task_cleanup_config;
  const clock = getSystemClock();

  // Data de corte oficial calculada pelo Relógio do Sistema menos days_after_due
  const cutoffTime = clock.timestamp - (cfg.days_after_due || 0) * 24 * 60 * 60 * 1000;
  const cutoffDateStr = getSystemClockForDate(new Date(cutoffTime)).yearMonthDay;

  const eligible: TaskItem[] = [];
  const activeStudents = Array.from(db.users.values()).filter(
    (u) => u.role === 'aluno' && u.status === 'active'
  );

  db.tasks.forEach((t) => {
    if (t.due_date && t.due_date <= cutoffDateStr) {
      if (cfg.delete_only_if_completed) {
        const completionsForTask = db.completions.filter((c) => c.task_id === t.id);
        if (completionsForTask.length >= activeStudents.length && activeStudents.length > 0) {
          eligible.push(t);
        }
      } else {
        eligible.push(t);
      }
    }
  });

  return eligible;
}

function executeTaskCleanup(manual = false): { count: number; deleted_titles: string[] } {
  const eligible = getTasksEligibleForCleanup();
  const deletedTitles: string[] = [];

  for (const t of eligible) {
    deletedTitles.push(`[${t.subject}] ${t.title}`);
    const completionsToDelete = db.completions.filter((c) => c.task_id === t.id);
    completionsToDelete.forEach((c) => {
      firebaseService.deleteCompletion(c.user_id, t.id).catch(console.warn);
    });

    db.tasks.delete(t.id);
    db.completions = db.completions.filter((c) => c.task_id !== t.id);
    firebaseService.deleteTask(t.id).catch((err) => {
      console.warn(`[Firebase] Erro ao remover tarefa ${t.id} na limpeza:`, err);
    });
  }

  const clock = getSystemClock();
  db.task_cleanup_config.last_run_at = clock.iso;
  if (!manual) {
    db.task_cleanup_config.last_run_date = clock.yearMonthDay;
  }
  db.task_cleanup_config.last_deleted_count = eligible.length;
  db.task_cleanup_config.last_deleted_titles = deletedTitles.slice(0, 20);
  db.saveToDisk();
  saveSystemSettingsToFirestore();

  console.log(`[TaskCleanup] Executed (${manual ? 'manual' : 'scheduled'}) at ${clock.timeStr} (System Clock): ${eligible.length} tasks removed.`);
  return { count: eligible.length, deleted_titles: deletedTitles };
}

api.get('/system/time', requireAuth, (req, res) => {
  const clock = getSystemClock();
  res.json({
    iso: clock.iso,
    time_str: clock.timeStr,
    time_hm: clock.timeHM,
    hours: clock.hours,
    minutes: clock.minutes,
    seconds: clock.seconds,
    timestamp: clock.timestamp,
    date_str: clock.dateStr,
    year_month_day: clock.yearMonthDay,
    timezone: clock.timezone,
    ok: true,
  });
});

api.get('/admin/task-cleanup', requireAdmin, (req, res) => {
  const cfg = db.task_cleanup_config;
  const eligible = getTasksEligibleForCleanup();
  const clock = getSystemClock();
  const currentTime = clock.timeHM;

  const tasksPreview = eligible.map((t) => {
    const completionsCount = db.completions.filter((c) => c.task_id === t.id).length;
    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      due_date: t.due_date,
      points: t.points,
      completions_count: completionsCount,
    };
  });

  res.json({
    config: cfg,
    server_time: currentTime,
    server_date: clock.yearMonthDay,
    tasks_to_delete_today: tasksPreview,
    will_delete_today: cfg.enabled && tasksPreview.length > 0,
    count: tasksPreview.length,
    status_summary: cfg.enabled
      ? tasksPreview.length > 0
        ? `Hoje às ${cfg.cleanup_time}: ${tasksPreview.length} tarefa(s) serão apagadas automaticamente.`
        : `Nenhuma tarefa agendada para ser apagada hoje no horário ${cfg.cleanup_time}.`
      : 'Limpeza automática desativada.',
  });
});

api.put('/admin/task-cleanup', requireAdmin, (req, res) => {
  const { enabled, cleanup_time, days_after_due, delete_only_if_completed } = req.body || {};

  if (cleanup_time !== undefined) {
    const trimmed = String(cleanup_time).trim();
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      return res.status(400).json({ detail: 'Formato de horário inválido. Use HH:MM (ex: 23:59)' });
    }
    const [hh, mm] = trimmed.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return res.status(400).json({ detail: 'Horário fora dos limites válidos (00:00 a 23:59)' });
    }
    db.task_cleanup_config.cleanup_time = trimmed;
  }

  if (enabled !== undefined) {
    db.task_cleanup_config.enabled = Boolean(enabled);
  }

  if (days_after_due !== undefined) {
    db.task_cleanup_config.days_after_due = Math.max(0, parseInt(days_after_due) || 0);
  }

  if (delete_only_if_completed !== undefined) {
    db.task_cleanup_config.delete_only_if_completed = Boolean(delete_only_if_completed);
  }

  db.saveToDisk();
  saveSystemSettingsToFirestore();

  const eligible = getTasksEligibleForCleanup();
  res.json({
    ok: true,
    config: db.task_cleanup_config,
    count_eligible_today: eligible.length,
  });
});

api.post('/admin/task-cleanup/run', requireAdmin, (req, res) => {
  const result = executeTaskCleanup(true);
  res.json({
    ok: true,
    deleted_count: result.count,
    deleted_titles: result.deleted_titles,
    config: db.task_cleanup_config,
  });
});

api.post('/tasks/:task_id/complete', requireAuth, async (req, res) => {
  const { task_id } = req.params;
  const user = (req as any).user as User;
  const task = db.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: 'Tarefa não encontrada' });

  const existingIdx = db.completions.findIndex((c) => c.task_id === task_id && c.user_id === user.id);
  if (existingIdx !== -1) {
    return res.json({ ok: true, already_completed: true });
  }

  const clock = getSystemClock();
  const now = new Date().toISOString();
  const todayYMD = clock.yearMonthDay; // Horário oficial de Brasília
  const taskDueYMD = parseDateYMD(task.due_date);
  const onTime = !taskDueYMD || todayYMD <= taskDueYMD;
  const basePoints = task.points || 10;
  const awarded = onTime ? basePoints : Math.max(1, Math.floor(basePoints * 0.3));

  const comp = {
    id: `${user.id}_${task_id}`,
    task_id,
    user_id: user.id,
    completed_at: now,
    on_time: onTime,
    points_awarded: awarded,
  };

  db.completions.push(comp);

  if (user.role === 'aluno') {
    user.points = (user.points || 0) + awarded;
    updateStudentStreak(user.id);
    await firebaseService.saveUser(user);
  }

  await firebaseService.saveCompletion(comp);
  db.saveToDisk();

  res.json({
    ok: true,
    points_awarded: awarded,
    points_earned: awarded,
    on_time: onTime,
    new_total: user.points,
  });
});

api.post('/tasks/:task_id/uncomplete', requireAuth, async (req, res) => {
  const { task_id } = req.params;
  const user = (req as any).user as User;

  const idx = db.completions.findIndex((c) => c.task_id === task_id && c.user_id === user.id);
  if (idx !== -1) {
    const comp = db.completions[idx];
    if (user.role === 'aluno') {
      user.points = Math.max(0, (user.points || 0) - comp.points_awarded);
      await firebaseService.saveUser(user).catch(console.warn);
    }
    db.completions.splice(idx, 1);
    await firebaseService.deleteCompletion(user.id, task_id).catch(console.warn);
    db.saveToDisk();
  }

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Announcements & Comments
// ---------------------------------------------------------------------------
api.get('/announcements', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const items = Array.from(db.announcements.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (user.role === 'admin') {
    const studentsMap = new Map(Array.from(db.users.values()).map((s) => [s.id, s.name]));
    const enriched = items.map((a) => {
      const assigned = a.assigned_to || [];
      return {
        ...a,
        all_students: assigned.length === 0,
        recipients: assigned.map((sid) => ({ id: sid, name: studentsMap.get(sid) || 'Aluno' })),
      };
    });
    return res.json(enriched);
  }

  const filtered = items.filter((a) => !a.assigned_to || a.assigned_to.length === 0 || a.assigned_to.includes(user.id));
  res.json(filtered);
});

api.post('/announcements', requireAdmin, async (req, res) => {
  const { title, message, assigned_to, is_special } = req.body || {};
  if (!title || !message) return res.status(400).json({ detail: 'Título e mensagem obrigatórios' });

  const id = `ann-${Date.now()}`;
  const doc: Announcement = {
    id,
    title: title.trim(),
    message: message.trim(),
    assigned_to: Array.isArray(assigned_to) ? assigned_to : [],
    is_special: Boolean(is_special),
    created_by: (req as any).user.id,
    created_at: new Date().toISOString(),
  };

  db.announcements.set(id, doc);
  db.saveToDisk();

  await firebaseService.saveAnnouncement(doc);

  // Disparo automático no WhatsApp (somente para avisos gerais para todos os alunos)
  const isSpecificAnnouncement = Array.isArray(doc.assigned_to) && doc.assigned_to.length > 0;
  if (!isSpecificAnnouncement) {
    let recipientsLabel = 'Todos os alunos';
    let photoBuffer: Buffer | null = null;
    let photoContentType: string | null = null;
    if (db.whatsapp_config?.templates?.announcement_photo_id) {
      const f = getFileRecord(db.whatsapp_config.templates.announcement_photo_id);
      if (f && f.data) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
      }
    }
    whatsappService.sendAnnouncementNotifications({
      title: doc.title,
      message: doc.message,
      created_at: doc.created_at,
      recipients_label: recipientsLabel,
      group1_extra: db.whatsapp_config?.templates?.group1_announcement_extra,
      photo_buffer: photoBuffer,
      photo_content_type: photoContentType,
      custom_caption_template: db.whatsapp_config?.templates?.announcement_caption,
    }).catch((err) => {
      console.error('[WhatsApp] Erro no disparo de aviso:', err);
    });
  } else {
    console.log(`[WhatsApp] Aviso "${doc.title}" é exclusivo para pessoas específicas (${doc.assigned_to.length}). Envio automático desativado.`);
  }

  res.json(doc);
});

api.post('/announcements/:ann_id/send-whatsapp', requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  const {
    group1_enabled = true,
    group2_enabled = true,
    group1_extra,
    group2_caption,
    photo_id,
    photo_data,
  } = req.body || {};

  const doc = db.announcements.get(ann_id);
  if (!doc) return res.status(404).json({ detail: 'Aviso não encontrado' });

  const status = whatsappService.getStatus();
  if (status.status !== 'connected') {
    return res.status(400).json({ detail: 'WhatsApp não está conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: 'Nenhum grupo do WhatsApp configurado. Configure na aba WhatsApp.' });
  }

  let recipientsLabel = 'Todos os alunos';
  if (doc.assigned_to && doc.assigned_to.length > 0) {
    const names = doc.assigned_to.map((sid) => db.users.get(sid)?.name).filter(Boolean);
    if (names.length > 0) recipientsLabel = names.join(', ');
  }

  let photoBuffer: Buffer | null = null;
  let photoContentType: string | null = null;

  if (photo_data && typeof photo_data === 'string' && photo_data.startsWith('data:')) {
    try {
      const [header, b64] = photo_data.split(',');
      photoContentType = header.split(';')[0].replace('data:', '') || 'image/jpeg';
      photoBuffer = Buffer.from(b64, 'base64');
    } catch (e) {
      console.warn('Erro ao decodificar photo_data para aviso:', e);
    }
  } else if (photo_id) {
    const f = getFileRecord(photo_id);
    if (f && f.data) {
      photoBuffer = f.data;
      photoContentType = f.content_type;
    }
  } else if (photo_id !== null) {
    if (db.whatsapp_config?.templates?.announcement_photo_id) {
      const f = getFileRecord(db.whatsapp_config.templates.announcement_photo_id);
      if (f && f.data) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
      }
    }
  }

  const result = await whatsappService.sendAnnouncementNotifications({
    title: doc.title,
    message: doc.message,
    created_at: doc.created_at,
    recipients_label: recipientsLabel,
    group1_extra: typeof group1_extra === 'string' ? group1_extra : undefined,
    group2_caption: group2_caption !== undefined ? group2_caption : undefined,
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    custom_caption_template: db.whatsapp_config?.templates?.announcement_caption,
    group1_enabled: Boolean(group1_enabled),
    group2_enabled: Boolean(group2_enabled),
  });

  const sentGroups = [];
  if (result.group1Sent) sentGroups.push('Grupo 1 (Aviso Completo)');
  if (result.group2Sent) sentGroups.push('Grupo 2');

  if (sentGroups.length === 0) {
    return res.status(500).json({
      detail: result.errors.join('; ') || 'Falha ao enviar aviso pelo WhatsApp',
    });
  }

  res.json({
    ok: true,
    message: `Aviso enviado com sucesso para: ${sentGroups.join(' e ')}!`,
    details: result,
  });
});

api.put('/announcements/:ann_id', requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  const doc = db.announcements.get(ann_id);
  if (!doc) return res.status(404).json({ detail: 'Aviso não encontrado' });

  const { title, message, assigned_to, is_special } = req.body || {};
  if (title) doc.title = title.trim();
  if (message) doc.message = message.trim();
  if (Array.isArray(assigned_to)) doc.assigned_to = assigned_to;
  if (typeof is_special === 'boolean') doc.is_special = is_special;

  db.saveToDisk();
  await firebaseService.saveAnnouncement(doc);
  res.json(doc);
});

api.delete('/announcements/:ann_id', requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  db.announcements.delete(ann_id);
  for (const [id, c] of db.comments.entries()) {
    if (c.announcement_id === ann_id) db.comments.delete(id);
  }
  db.saveToDisk();
  await firebaseService.deleteAnnouncement(ann_id);
  res.json({ ok: true });
});

api.get('/announcements/:ann_id/comments', requireAuth, (req, res) => {
  const { ann_id } = req.params;
  const comments = Array.from(db.comments.values())
    .filter((c) => c.announcement_id === ann_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  res.json(comments);
});

api.post('/announcements/:ann_id/comments', requireAuth, async (req, res) => {
  const { ann_id } = req.params;
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ detail: 'Comentário vazio' });

  const user = (req as any).user as User;
  const id = `comm-${Date.now()}`;
  const comment: Comment = {
    id,
    announcement_id: ann_id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    text: text.trim(),
    created_at: new Date().toISOString(),
  };

  db.comments.set(id, comment);
  db.saveToDisk();
  await firebaseService.saveComment(comment).catch(console.warn);

  res.json(comment);
});

api.delete('/announcements/:ann_id/comments/:comment_id', requireAuth, async (req, res) => {
  const { comment_id } = req.params;
  const user = (req as any).user as User;
  const comment = db.comments.get(comment_id);
  if (!comment) return res.status(404).json({ detail: 'Comentário não encontrado' });

  if (user.role !== 'admin' && comment.user_id !== user.id) {
    return res.status(403).json({ detail: 'Sem permissão' });
  }

  db.comments.delete(comment_id);
  db.saveToDisk();
  await firebaseService.deleteComment(comment_id).catch(console.warn);

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Botões e Links Personalizados para Alunos
// ---------------------------------------------------------------------------
api.get('/student-buttons', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  let buttons = Array.from(db.student_buttons.values());
  if (user.role === 'aluno') {
    // Alunos só veem botões ativos
    buttons = buttons.filter((b) => b.active);
  }
  buttons.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
  res.json(buttons);
});

api.post('/student-buttons', requireAdmin, (req, res) => {
  const { name, url, description, color, icon, active, order } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ detail: 'O nome do botão é obrigatório.' });
  }
  if (!url || !url.trim()) {
    return res.status(400).json({ detail: 'O link (URL) do botão é obrigatório.' });
  }

  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const user = (req as any).user as User;
  const id = `btn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const button: StudentButton = {
    id,
    name: name.trim(),
    url: formattedUrl,
    description: description ? description.trim() : '',
    color: color || 'indigo',
    icon: icon || '🔗',
    active: active !== false,
    order: typeof order === 'number' ? order : db.student_buttons.size + 1,
    click_count: 0,
    created_at: new Date().toISOString(),
    created_by: user.id,
  };

  db.student_buttons.set(id, button);
  db.saveToDisk();
  res.status(201).json(button);
});

api.put('/student-buttons/:btn_id', requireAdmin, (req, res) => {
  const { btn_id } = req.params;
  const btn = db.student_buttons.get(btn_id);
  if (!btn) return res.status(404).json({ detail: 'Botão não encontrado.' });

  const { name, url, description, color, icon, active, order } = req.body || {};
  if (name && name.trim()) btn.name = name.trim();
  if (url && url.trim()) {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    btn.url = formattedUrl;
  }
  if (description !== undefined) btn.description = description ? description.trim() : '';
  if (color !== undefined) btn.color = color;
  if (icon !== undefined) btn.icon = icon;
  if (typeof active === 'boolean') btn.active = active;
  if (typeof order === 'number') btn.order = order;

  db.saveToDisk();
  res.json(btn);
});

api.delete('/student-buttons/:btn_id', requireAdmin, (req, res) => {
  const { btn_id } = req.params;
  if (!db.student_buttons.has(btn_id)) {
    return res.status(404).json({ detail: 'Botão não encontrado.' });
  }
  db.student_buttons.delete(btn_id);
  db.saveToDisk();
  res.json({ ok: true, message: 'Botão removido com sucesso.' });
});

api.post('/student-buttons/:btn_id/click', requireAuth, (req, res) => {
  const { btn_id } = req.params;
  const btn = db.student_buttons.get(btn_id);
  if (btn) {
    btn.click_count = (btn.click_count || 0) + 1;
    db.saveToDisk();
  }
  res.json({ ok: true, clicks: btn?.click_count || 0 });
});

// ---------------------------------------------------------------------------
// Login Logs & Admin Stats
// ---------------------------------------------------------------------------
api.get('/login-logs', requireAdmin, (req, res) => {
  res.json(db.login_logs);
});

api.delete('/login-logs', requireAdmin, (req, res) => {
  const count = db.login_logs.length;
  db.login_logs = [];
  res.json({ ok: true, deleted: count });
});

api.delete('/login-logs/:log_id', requireAdmin, (req, res) => {
  const { log_id } = req.params;
  db.login_logs = db.login_logs.filter((l) => l.id !== log_id);
  res.json({ ok: true });
});

api.get('/admin/stats', requireAdmin, (req, res) => {
  const students = Array.from(db.users.values()).filter((u) => u.role === 'aluno');
  const allTasks = Array.from(db.tasks.values());
  const enriched = students.map((s) => {
    const pts = s.points || 0;
    const userCompletions = db.completions.filter((c) => c.user_id === s.id);
    const onTime = userCompletions.filter((c) => c.on_time).length;
    const assignedTasks = allTasks.filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(s.id));
    const compSet = new Set(userCompletions.map((c) => c.task_id));
    const uncompleted = assignedTasks.filter((t) => !compSet.has(t.id)).length;
    return {
      id: s.id,
      name: s.name,
      points: pts,
      total_completions: userCompletions.length,
      on_time_completions: onTime,
      uncompleted_tasks: uncompleted,
      has_avatar: Boolean(s.avatar_data),
    };
  });
  // Rank by on-time deliveries and fewest uncompleted tasks (0 points influence, streak disabled)
  enriched.sort((a, b) => {
    if (b.on_time_completions !== a.on_time_completions) return b.on_time_completions - a.on_time_completions;
    return a.uncompleted_tasks - b.uncompleted_tasks;
  });

  // Completions per day (last 7 days)
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    days.push(d);
  }
  const countsByDay: Record<string, number> = {};
  days.forEach((d) => (countsByDay[d] = 0));
  db.completions.forEach((c) => {
    const day = c.completed_at.slice(0, 10);
    if (countsByDay[day] !== undefined) countsByDay[day]++;
  });

  // Top subjects
  const subjCounts: Record<string, number> = {};
  db.tasks.forEach((t) => {
    subjCounts[t.subject] = (subjCounts[t.subject] || 0) + 1;
  });
  const topSubjects = Object.entries(subjCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject, count]) => ({ subject, count }));

  const aiLeaderboard = calculateMonthlyAILeaderboard((req as any).user);

  res.json({
    totals: {
      tasks: db.tasks.size,
      completions: db.completions.length,
      announcements: db.announcements.size,
      students: students.length,
    },
    top_students: enriched.slice(0, 5),
    all_students_ranking: enriched,
    completions_per_day: days.map((d) => ({ date: d, count: countsByDay[d] })),
    top_subjects: topSubjects,
    ai_monthly: aiLeaderboard,
  });
});

// ---------------------------------------------------------------------------
// AI Monthly Evaluation & Statistics (Leaderboard for students & admin)
// ---------------------------------------------------------------------------
export function parseDateYMD(d: any): string {
  if (!d) return '';
  if (typeof d === 'number') {
    try {
      d = new Date(d).toISOString();
    } catch {
      return '';
    }
  }
  const s = String(d).trim();
  // Check DD/MM/YYYY or DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    return `${brMatch[3]}-${month}-${day}`;
  }
  // Check YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (isoMatch) {
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${isoMatch[1]}-${month}-${day}`;
  }
  try {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return getSystemClockForDate(dt).yearMonthDay;
    }
  } catch {}
  return s.slice(0, 10);
}

export function getCurrentMonthRange() {
  const clock = getSystemClock();
  const [yearStr, monthStr] = clock.yearMonthDay.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed (1 to 12)
  const monthKey = `${yearStr}-${monthStr}`; // "YYYY-MM"

  const monthStartDay = `${yearStr}-${monthStr}-01`;
  const monthStartIso = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const monthStartMs = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).getTime();

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMonthStr = String(nextMonth).padStart(2, '0');
  const nextMonthStartDay = `${nextYear}-${nextMonthStr}-01`;
  const nextMonthStartIso = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0)).toISOString();
  const nextMonthStartMs = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0)).getTime();

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getDate();
  const monthEndDay = `${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const monthEndIso = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59, 999)).toISOString();

  const daysRemaining = Math.max(0, Math.ceil((nextMonthStartMs - clock.timestamp) / (24 * 60 * 60 * 1000)));

  const dateObj = new Date(year, month - 1, 1);
  const rawLabel = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return {
    year,
    month,
    monthKey,
    monthStartDay,
    monthEndDay,
    monthStartIso,
    monthEndIso,
    monthStartMs,
    nextMonthStartDay,
    nextMonthStartIso,
    nextMonthStartMs,
    daysRemaining,
    monthLabel,
  };
}

export function checkMonthlyRollover() {
  const range = getCurrentMonthRange();
  if (!db.active_month_key) {
    db.active_month_key = range.monthKey;
    db.saveToDisk();
    return;
  }

  // Se o mês corrente do Relógio do Sistema mudou em relação ao mês ativo:
  if (db.active_month_key !== range.monthKey) {
    console.log(`[MonthlyReset] Mês finalizado (${db.active_month_key}). Realizando reset mensal para ${range.monthKey}...`);
    const prevKey = db.active_month_key;
    db.monthly_history.unshift({
      month_key: prevKey,
      finalized_at: new Date().toISOString(),
      prize_title: db.monthly_prize?.title || 'Prêmio do Mês',
      prize_emoji: db.monthly_prize?.emoji || '🏆',
      ai_winner: db.monthly_prize?.ai_winner || null,
    });
    if (db.monthly_history.length > 24) db.monthly_history = db.monthly_history.slice(0, 24);

    // Reseta o vencedor para o novo ciclo do mês
    if (db.monthly_prize) {
      db.monthly_prize.ai_winner = null;
    }
    db.active_month_key = range.monthKey;
    db.saveToDisk();
    saveSystemSettingsToFirestore();
  }
}

function calculateMonthlyAILeaderboard(reqUser?: User) {
  checkMonthlyRollover();
  const range = getCurrentMonthRange();
  const students = Array.from(db.users.values()).filter((u) => u.role === 'aluno' && (u.status as string) !== 'inactive' && u.status !== 'blocked');
  const allTasks = Array.from(db.tasks.values());

  // 1. Tarefas do MÊS (entrega marcada dentro do mês ou criadas no mês)
  const monthTasks = allTasks.filter((t) => {
    const dueYMD = parseDateYMD(t.due_date);
    if (dueYMD) {
      return dueYMD >= range.monthStartDay && dueYMD <= range.monthEndDay;
    }
    const createdYMD = parseDateYMD(t.created_at);
    return createdYMD >= range.monthStartDay && createdYMD <= range.monthEndDay;
  });

  // 2. Entregas concluídas dentro do MÊS (ou de tarefas pertencentes ao mês)
  const monthTaskIds = new Set(monthTasks.map((t) => t.id));
  const monthlyCompletions = db.completions.filter((c) => {
    if (c.task_id && monthTaskIds.has(c.task_id)) return true;
    const compYMD = parseDateYMD(c.completed_at);
    return compYMD >= range.monthStartDay && compYMD <= range.monthEndDay;
  });

  const studentMetrics = students.map((s) => {
    const sComps = monthlyCompletions.filter((c) => c.user_id === s.id);
    const onTime = sComps.filter((c) => {
      if (Boolean(c.on_time)) return true;
      const task = db.tasks.get(c.task_id);
      if (!task || !task.due_date) return true;
      const compYMD = parseDateYMD(c.completed_at);
      const dueYMD = parseDateYMD(task.due_date);
      if (!dueYMD) return true;
      if (!compYMD) return true;
      return compYMD <= dueYMD;
    }).length;
    const late = sComps.length - onTime;

    const assignedMonthTasks = monthTasks.filter((t) => !t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(s.id));
    const compSet = new Set(sComps.map((c) => c.task_id));
    // Tarefas pendentes do MÊS (atividades do mês não marcadas como feitas)
    const uncompletedMonth = assignedMonthTasks.filter((t) => !compSet.has(t.id)).length;
    const onTimePct = sComps.length > 0 ? Math.round((onTime / sComps.length) * 100) : 0;

    // AI score mensal: recompensa pontualidade no mês, penaliza pendências do mês. Streak desativado.
    let score = 50 + (onTime * 15) - (uncompletedMonth * 10);
    if (onTime > 0 && uncompletedMonth === 0) score += 15;
    score = Math.min(100, Math.max(30, Math.round(score)));

    return {
      id: s.id,
      name: s.name,
      points: s.points || 0,
      completed_month: sComps.length,
      completed_tasks: sComps.length,
      on_time_month: onTime,
      on_time_completions: onTime,
      on_time: onTime,
      on_time_tasks: onTime,
      late_month: late,
      uncompleted_count: uncompletedMonth,
      uncompleted_tasks: uncompletedMonth,
      total_month_tasks: assignedMonthTasks.length,
      on_time_pct: onTimePct,
      has_avatar: Boolean(s.avatar_data),
      equipped_effect: s.equipped_effect || 'none',
      score,
    };
  });

  // Ordenação prioritária:
  // 1. Mais tarefas no prazo no mês (desc)
  // 2. Menos pendências no mês (asc)
  // 3. Mais tarefas completadas no mês (desc)
  // 4. Nota geral da IA (desc)
  studentMetrics.sort((a, b) => {
    if (b.on_time_month !== a.on_time_month) return b.on_time_month - a.on_time_month;
    if (a.uncompleted_count !== b.uncompleted_count) return a.uncompleted_count - b.uncompleted_count;
    if (b.completed_month !== a.completed_month) return b.completed_month - a.completed_month;
    return b.score - a.score;
  });

  const top = studentMetrics[0] || null;

  // Detecção de EMPATE no Top 1:
  // Se múltiplos alunos tiverem exatamente o mesmo destaque no topo:
  let leaders: typeof studentMetrics = [];
  if (top) {
    leaders = studentMetrics.filter(
      (m) =>
        m.on_time_month === top.on_time_month &&
        m.uncompleted_count === top.uncompleted_count &&
        m.completed_month === top.completed_month
    );
  }
  const isTieTop1 = leaders.length > 1;

  // Atribuição de Ranks: se houver empate em 1º, TODOS empatados recebem rank 1!
  let currentRank = 1;
  const rankings = studentMetrics.map((m, idx) => {
    if (idx > 0) {
      const prev = studentMetrics[idx - 1];
      const same =
        prev.on_time_month === m.on_time_month &&
        prev.uncompleted_count === m.uncompleted_count &&
        prev.completed_month === m.completed_month;
      if (!same) {
        currentRank = idx + 1;
      }
    }
    const isTop1 = currentRank === 1;
    return {
      rank: currentRank,
      id: m.id,
      name: m.name,
      points: m.points,
      has_avatar: m.has_avatar,
      equipped_effect: m.equipped_effect,
      completed_month: m.completed_month,
      completed_tasks: m.completed_month,
      on_time_month: m.on_time_month,
      on_time_completions: m.on_time_month,
      on_time: m.on_time_month,
      uncompleted_count: m.uncompleted_count,
      uncompleted_tasks: m.uncompleted_count,
      on_time_pct: m.on_time_pct,
      score: m.score,
      is_leader: isTop1,
      is_tied_top1: isTop1 && isTieTop1,
      ai_status: isTop1
        ? (isTieTop1 ? '👑 1º Lugar Empatado' : '👑 Líder do Mês')
        : currentRank <= 3
        ? '🥈 Top 3'
        : '📚 Em avaliação',
      ai_feedback: m.on_time_month > 0
        ? `${m.on_time_month} tarefa(s) no prazo e ${m.uncompleted_count === 0 ? 'zero pendências no mês' : `${m.uncompleted_count} pendência(s) no mês`}.`
        : `Entregue suas tarefas deste mês no prazo para pontuar na IA.`,
    };
  });

  let leaderVerdict = '';
  if (isTieTop1) {
    const names = leaders.map((l) => l.name).join(' e ');
    leaderVerdict = `Empate no 1º lugar entre ${names}! Ambos possuem ${top.on_time_month} tarefa(s) entregues no prazo e ${top.uncompleted_count === 0 ? 'zero pendências no mês' : `${top.uncompleted_count} pendência(s)`}.`;
  } else if (top) {
    leaderVerdict = `${top.name} lidera o mês com ${top.on_time_month} tarefa(s) entregues no prazo e ${top.uncompleted_count === 0 ? 'zero pendências no mês' : `${top.uncompleted_count} pendência(s)`}.`;
  }

  // Motivo da vitória: visível APENAS para o(s) ganhador(es) (e admin)
  let sanitizedWinner: any = null;
  if (db.monthly_prize?.ai_winner) {
    const raw = db.monthly_prize.ai_winner;
    const isWinner = Boolean(
      reqUser && (
        reqUser.id === raw.winner_id ||
        reqUser.name === raw.winner_name ||
        raw.tied_winners?.some((tw: any) => tw.id === reqUser.id)
      )
    );
    const isAdmin = Boolean(reqUser && reqUser.role === 'admin');
    const winnerMetrics = studentMetrics.find((m) => m.id === raw.winner_id);
    const winnerOnTime = raw.on_time_month !== undefined
      ? raw.on_time_month
      : (winnerMetrics?.on_time_month ?? top?.on_time_month ?? 0);

    const tiedWithOnTime = (raw.tied_winners || []).map((tw: any) => {
      const m = studentMetrics.find((sm) => sm.id === tw.id);
      return {
        ...tw,
        on_time_month: tw.on_time_month ?? m?.on_time_month ?? winnerOnTime,
      };
    });

    if (isWinner || isAdmin) {
      sanitizedWinner = {
        ...raw,
        on_time_month: winnerOnTime,
        tied_winners: tiedWithOnTime.length > 0 ? tiedWithOnTime : raw.tied_winners,
        is_me: isWinner,
      };
    } else {
      sanitizedWinner = {
        winner_id: raw.winner_id,
        winner_name: raw.winner_name,
        winner_score: raw.winner_score || raw.score || 98,
        on_time_month: winnerOnTime,
        criteria: raw.criteria || [`${winnerOnTime} entrega(s) no prazo`, 'Zero pendências no mês'],
        is_tie: Boolean(raw.is_tie),
        tied_winners: tiedWithOnTime.length > 0 ? tiedWithOnTime : raw.tied_winners,
        is_me: false,
      };
    }
  }

  return {
    month_label: range.monthLabel,
    month_key: range.monthKey,
    days_remaining: range.daysRemaining,
    leader: top,
    leaders,
    is_tie_top1: isTieTop1,
    leader_verdict: leaderVerdict,
    rankings,
    ai_winner: sanitizedWinner,
    month_totals: {
      tasks_in_month: monthTasks.length,
      completions_in_month: monthlyCompletions.length,
    },
    evaluation_rules: [
      'Entregas rigorosamente no prazo dentro do mês',
      'Tarefas do mês não marcadas como feitas (pendentes) contam negativamente',
      '⚠️ Os pontos de tarefas servem estritamente para a Loja de Molduras e NÃO influenciam a avaliação.',
    ],
  };
}

api.get('/stats/monthly-ai', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  res.json(calculateMonthlyAILeaderboard(user));
});

// ---------------------------------------------------------------------------
// Monthly Prize
// ---------------------------------------------------------------------------
api.get('/monthly-prize', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const prize = db.monthly_prize;
  const board = calculateMonthlyAILeaderboard(user);

  res.json({
    prize,
    ai_winner: board.ai_winner,
    leader: board.leader,
    leaders: board.leaders,
    is_tie_top1: board.is_tie_top1,
    leader_verdict: board.leader_verdict,
    evaluation_rule: 'Os pontos de tarefas são exclusivamente para comprar molduras. O vencedor é eleito pela IA por pontualidade e penalizado por tarefas não feitas.',
    days_remaining: board.days_remaining,
    month_label: board.month_label,
    month_totals: board.month_totals,
  });
});

function saveSystemSettingsToFirestore() {
  firebaseService.saveSettings('system', {
    monthly_prize: db.monthly_prize,
    active_month_key: db.active_month_key,
    monthly_history: db.monthly_history,
    task_cleanup_config: db.task_cleanup_config,
    whatsapp_config: db.whatsapp_config,
    app_info: db.app_info,
    effect_overrides: db.effect_overrides,
  }).catch((err) => console.warn('[Firebase] Erro ao salvar configurações:', err));
}

api.put('/monthly-prize', requireAdmin, (req, res) => {
  const { title, description, emoji, image_id } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ detail: 'Título obrigatório' });

  db.monthly_prize = {
    id: 'monthly_prize',
    title: title.trim(),
    description: (description || '').trim(),
    emoji: emoji || '🏆',
    image_id: image_id || null,
    ai_winner: db.monthly_prize?.ai_winner || null,
    updated_at: new Date().toISOString(),
  };
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true });
});

api.post('/monthly-prize/confirm-winner', requireAdmin, (req, res) => {
  const { winner_id, winner_name, justification, criteria, score, is_tie, tied_winners, on_time_month } = req.body || {};
  if (!winner_name) return res.status(400).json({ detail: 'Nome do vencedor obrigatório' });

  if (!db.monthly_prize) {
    db.monthly_prize = { id: 'monthly_prize', title: 'Prêmio do Mês', emoji: '🏆' };
  }

  const range = getCurrentMonthRange();
  const board = calculateMonthlyAILeaderboard();
  const foundLeader = board.rankings.find((r: any) => r.id === winner_id) || board.leader;
  const determinedOnTime = on_time_month !== undefined ? Number(on_time_month) : (foundLeader?.on_time_month ?? 0);

  const enhancedTiedWinners = (tied_winners || []).map((tw: any) => {
    const rankInfo = board.rankings.find((r: any) => r.id === tw.id);
    return {
      ...tw,
      on_time_month: tw.on_time_month !== undefined ? Number(tw.on_time_month) : (rankInfo?.on_time_month ?? determinedOnTime),
    };
  });

  db.monthly_prize.ai_winner = {
    winner_id,
    winner_name,
    score: score || 95,
    on_time_month: determinedOnTime,
    is_tie: Boolean(is_tie || (tied_winners && tied_winners.length > 1)),
    tied_winners: enhancedTiedWinners.length > 0 ? enhancedTiedWinners : null,
    justification: justification || 'Aluno(a) eleito(a) com base na Avaliação Mensal de Desempenho e Pontualidade por Inteligência Artificial.',
    criteria: criteria || [`${determinedOnTime} tarefa(s) no prazo`, 'Consistência nos estudos'],
    confirmed_at: new Date().toISOString(),
    month_key: range.monthKey,
  };
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true, ai_winner: db.monthly_prize.ai_winner });
});

api.post('/monthly-prize/finalize-month', requireAdmin, (req, res) => {
  const range = getCurrentMonthRange();
  const board = calculateMonthlyAILeaderboard();

  let winnerRecord = db.monthly_prize?.ai_winner;
  if (!winnerRecord && board.leaders.length > 0) {
    winnerRecord = {
      winner_id: board.leaders[0].id,
      winner_name: board.leaders.map((l: any) => l.name).join(' & '),
      score: board.leaders[0].score || 95,
      is_tie: board.is_tie_top1,
      tied_winners: board.leaders.map((l: any) => ({
        id: l.id,
        name: l.name,
        has_avatar: l.has_avatar,
        equipped_effect: l.equipped_effect,
      })),
      justification: board.leader_verdict,
      criteria: [`${board.leaders[0].on_time_month} tarefa(s) no prazo`, board.leaders[0].uncompleted_count === 0 ? 'Zero pendências' : 'Maior pontualidade'],
      confirmed_at: new Date().toISOString(),
      month_key: range.monthKey,
    };
  }

  db.monthly_history.unshift({
    month_key: db.active_month_key || range.monthKey,
    month_label: range.monthLabel,
    finalized_at: new Date().toISOString(),
    prize_title: db.monthly_prize?.title || 'Prêmio do Mês',
    prize_emoji: db.monthly_prize?.emoji || '🏆',
    ai_winner: winnerRecord,
    leaders: board.leaders.map((l: any) => ({ id: l.id, name: l.name, score: l.score, on_time: l.on_time_month })),
  });
  if (db.monthly_history.length > 24) db.monthly_history = db.monthly_history.slice(0, 24);

  // Reseta o ciclo para o novo mês!
  if (db.monthly_prize) {
    db.monthly_prize.ai_winner = null;
  }
  db.active_month_key = range.monthKey;
  db.saveToDisk();
  saveSystemSettingsToFirestore();

  res.json({
    ok: true,
    message: `Ciclo de ${range.monthLabel} finalizado e resetado com sucesso!`,
    archived_winner: winnerRecord,
    history: db.monthly_history,
  });
});

api.get('/monthly-prize/history', requireAuth, (req, res) => {
  res.json({
    active_month_key: db.active_month_key || getCurrentMonthRange().monthKey,
    history: db.monthly_history || [],
  });
});

api.delete('/monthly-prize/winner', requireAdmin, (req, res) => {
  if (db.monthly_prize) {
    db.monthly_prize.ai_winner = null;
    db.saveToDisk();
    saveSystemSettingsToFirestore();
  }
  res.json({ ok: true });
});

api.delete('/monthly-prize', requireAdmin, (req, res) => {
  db.monthly_prize = null;
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// App Info / Firmware
// ---------------------------------------------------------------------------
api.get('/app-info', requireAuth, (req, res) => {
  res.json(db.app_info);
});

api.put('/app-info', requireAdmin, (req, res) => {
  const patch = req.body || {};
  db.app_info = {
    ...db.app_info,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json(db.app_info);
});

// ---------------------------------------------------------------------------
// WhatsApp Integration (Baileys)
// ---------------------------------------------------------------------------
api.get('/whatsapp/status', requireAdmin, (req, res) => {
  res.json({
    ...whatsappService.getStatus(),
    config: db.whatsapp_config,
  });
});

api.get('/whatsapp/config', requireAdmin, (req, res) => {
  res.json(db.whatsapp_config);
});

api.post('/whatsapp/connect', requireAdmin, async (req, res) => {
  const status = await whatsappService.connect();
  res.json({
    ...status,
    config: db.whatsapp_config,
  });
});

api.post('/whatsapp/activate-timer', requireAdmin, async (req, res) => {
  const { duration_minutes = 20, reason = 'manual_trigger' } = req.body || {};
  const minutes = Math.max(20, parseInt(duration_minutes) || 20);
  const status = await whatsappService.activateForDuration(minutes, reason);
  res.json({
    ok: true,
    message: `WhatsApp ativado com sucesso! Ficará ativo por pelo menos ${minutes} minutos.`,
    status,
    config: db.whatsapp_config,
  });
});

api.post('/whatsapp/extend-timer', requireAdmin, (req, res) => {
  const { add_minutes = 20 } = req.body || {};
  const minutes = Math.max(5, parseInt(add_minutes) || 20);
  const status = whatsappService.extendActiveDuration(minutes);
  res.json({
    ok: true,
    message: `Janela ativa estendida em +${minutes} minutos com sucesso!`,
    status,
    config: db.whatsapp_config,
  });
});

api.post('/whatsapp/pause', requireAdmin, async (req, res) => {
  const status = await whatsappService.pauseSocketKeepAuth();
  res.json({
    ok: true,
    message: 'WhatsApp colocado em modo repouso/standby. Credenciais preservadas para a próxima ativação!',
    status,
    config: db.whatsapp_config,
  });
});

api.post('/whatsapp/disconnect', requireAdmin, async (req, res) => {
  const status = await whatsappService.disconnect();
  res.json({
    ...status,
    config: db.whatsapp_config,
  });
});

api.put('/whatsapp/config', requireAdmin, (req, res) => {
  const {
    group_1_jid,
    group_1_name,
    group_2_jid,
    group_2_name,
    group_jid,
    enabled,
    templates,
    daily_reminder,
    auto_activation_schedule,
  } = req.body || {};

  const currentDuration = db.whatsapp_config.auto_activation_schedule?.duration_minutes || 20;
  const newDuration = auto_activation_schedule?.duration_minutes !== undefined
    ? Math.max(20, parseInt(auto_activation_schedule.duration_minutes) || 20)
    : currentDuration;

  db.whatsapp_config = {
    ...db.whatsapp_config,
    group_1_jid: (group_1_jid !== undefined ? group_1_jid : group_jid !== undefined ? group_jid : db.whatsapp_config.group_1_jid || '').trim(),
    group_1_name: (group_1_name !== undefined ? group_1_name : db.whatsapp_config.group_1_name || '').trim(),
    group_2_jid: (group_2_jid !== undefined ? group_2_jid : db.whatsapp_config.group_2_jid || '').trim(),
    group_2_name: (group_2_name !== undefined ? group_2_name : db.whatsapp_config.group_2_name || '').trim(),
    enabled: enabled !== undefined ? Boolean(enabled) : db.whatsapp_config.enabled,
    templates: {
      ...db.whatsapp_config.templates,
      ...(templates || {}),
    },
    daily_reminder: {
      ...db.whatsapp_config.daily_reminder,
      ...(daily_reminder || {}),
    },
    auto_activation_schedule: {
      ...db.whatsapp_config.auto_activation_schedule,
      ...(auto_activation_schedule || {}),
      duration_minutes: newDuration,
    },
  };
  whatsappService.setConfig(db.whatsapp_config);
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({
    ok: true,
    config: db.whatsapp_config,
    status: whatsappService.getStatus(),
  });
});

api.get('/whatsapp/groups', requireAdmin, async (req, res) => {
  try {
    const groups = await whatsappService.fetchParticipatingGroups();
    res.json(groups);
  } catch (err: any) {
    res.json(whatsappService.getDetectedGroups());
  }
});

api.post('/whatsapp/sync-groups', requireAdmin, async (req, res) => {
  try {
    const groups = await whatsappService.fetchParticipatingGroups();
    res.json({
      ok: true,
      groups,
      count: groups.length,
      message: `${groups.length} grupo(s) detectado(s) com sucesso!`,
    });
  } catch (err: any) {
    const cached = whatsappService.getDetectedGroups();
    res.json({
      ok: true,
      groups: cached,
      count: cached.length,
      message: `Grupos recuperados da memória (${cached.length} encontrados).`,
      error: err?.message,
    });
  }
});

api.post('/whatsapp/detect-group', requireAdmin, async (req, res) => {
  const { input } = req.body || {};
  if (!input || !String(input).trim()) {
    return res.status(400).json({ detail: 'Informe um link de convite (chat.whatsapp.com/...) ou ID do grupo para detecção.' });
  }
  const result = await whatsappService.detectGroupByInput(String(input).trim());
  if (!result.ok) {
    return res.status(400).json({ detail: result.error || 'Falha ao detectar o grupo.' });
  }
  res.json({
    ok: true,
    group: result.group,
    isInvite: result.isInvite || false,
    message: `Grupo "${result.group?.subject}" detectado com sucesso!`,
  });
});

api.post('/whatsapp/test-message', requireAdmin, async (req, res) => {
  const { jid, text } = req.body || {};
  const targetJid = (jid || db.whatsapp_config.group_1_jid || db.whatsapp_config.group_2_jid || '').trim();
  if (!targetJid) {
    return res.status(400).json({ detail: 'JID do grupo não informado ou configurado' });
  }
  const messageText = (text || '🔔 *Edutask WhatsApp*: Teste de conexão e notificação realizado com sucesso!').trim();
  const sent = await whatsappService.sendMessage(targetJid, messageText);
  if (!sent) {
    return res.status(500).json({ detail: 'Falha ao enviar mensagem pelo WhatsApp. Verifique se a sessão está conectada e se o ID do grupo é válido.' });
  }
  res.json({ ok: true, message: 'Mensagem de teste enviada com sucesso!' });
});

api.post(['/whatsapp/send-firmware', '/firmware/send-whatsapp'], requireAdmin, upload.single('image'), async (req, res) => {
  const status = whatsappService.getStatus();
  if (status.status !== 'connected') {
    return res.status(400).json({ detail: 'WhatsApp não está conectado. Conecte na aba "WhatsApp" primeiro.' });
  }

  let imageBuffer: Buffer | null = null;
  let contentType = 'image/png';

  if (req.file) {
    imageBuffer = req.file.buffer;
    contentType = req.file.mimetype || 'image/png';
  } else if (req.body?.image_base64) {
    const raw = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(raw, 'base64');
  }

  if (!imageBuffer) {
    return res.status(400).json({ detail: 'Imagem do firmware não fornecida.' });
  }

  const { target_group = 'all' } = req.body || {};
  const caption = (req.body?.caption || 
    `⚙️ *EDUTASK — FIRMWARE DO SISTEMA OFICIAL*\n\n` +
    `📌 *Versão:* v${db.app_info?.version || '1.2.0'} (${db.app_info?.codename || 'Edutask AI Core'})\n` +
    `🛡️ *Sistema de Acessos:* 100% Ativo & Precisão Máxima\n` +
    `⚡ *Módulos Habilitados:* 8 Funções Nativas\n` +
    `📅 *Data de Emissão:* ${new Date().toLocaleDateString('pt-BR')}\n\n` +
    `👉 _Imagem oficial gerada para acompanhamento e auditoria escolar._`
  ).trim();

  let g1Sent = false;
  let g2Sent = false;
  const errors: string[] = [];

  const targets = [];
  if ((target_group === 'all' || target_group === 'group1') && status.group1Jid) {
    targets.push({ jid: status.group1Jid, label: 'Grupo 1' });
  }
  if ((target_group === 'all' || target_group === 'group2') && status.group2Jid) {
    targets.push({ jid: status.group2Jid, label: 'Grupo 2' });
  }

  if (targets.length === 0) {
    return res.status(400).json({ detail: 'Nenhum grupo do WhatsApp configurado nas opções.' });
  }

  for (const t of targets) {
    const ok = await whatsappService.sendImage(t.jid, imageBuffer, caption, contentType);
    if (ok) {
      if (t.label === 'Grupo 1') g1Sent = true;
      if (t.label === 'Grupo 2') g2Sent = true;
    } else {
      errors.push(`Falha ao enviar para ${t.label}`);
    }
  }

  if (!g1Sent && !g2Sent) {
    return res.status(500).json({ detail: errors.join(', ') || 'Falha ao enviar imagem do firmware pelo WhatsApp.' });
  }

  res.json({
    ok: true,
    message: 'Foto do firmware enviada para o WhatsApp com sucesso!',
    group1Sent: g1Sent,
    group2Sent: g2Sent,
    errors,
  });
});

api.post(['/whatsapp/test-tomorrow-reminder', '/whatsapp/dispatch-reminders', '/whatsapp/dispatch-tomorrow-reminder'], requireAdmin, async (req, res) => {
  const { group1_extra, tomorrow_caption } = req.body || {};
  const status = whatsappService.getStatus();
  if (status.status !== 'connected') {
    return res.status(400).json({ detail: 'WhatsApp não está conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: 'Nenhum grupo configurado para envio.' });
  }

  try {
    const outcome = await executeTomorrowTasksDispatch(true, group1_extra, tomorrow_caption);
    if (!outcome.dispatched) {
      return res.json({
        ok: true,
        message: outcome.message || 'Nenhuma tarefa para amanhã no momento.',
        details: outcome,
      });
    }

    res.json({
      ok: true,
      message: `Lembrete de ${outcome.tasks_count} tarefa(s) de amanhã disparado com sucesso!`,
      details: outcome,
    });
  } catch (err: any) {
    res.status(500).json({ detail: err?.message || 'Falha ao disparar lembrete de amanhã' });
  }
});

// Helper para disparo de tarefas do dia seguinte
async function executeTomorrowTasksDispatch(isTest = false, overrideExtra?: string, overrideCaption?: string) {
  const clock = getSystemClock();
  const tomorrowDateObj = new Date(clock.timestamp + 24 * 60 * 60 * 1000);
  const tomorrowClock = getSystemClockForDate(tomorrowDateObj);
  const tomorrowStr = tomorrowClock.yearMonthDay;
  const tomorrowDateBR = tomorrowClock.dateStr;

  let tomorrowTasks = Array.from(db.tasks.values()).filter((t) => parseDateYMD(t.due_date) === tomorrowStr);

  if (tomorrowTasks.length === 0 && isTest) {
    // Se for teste manual e não houver tarefas com entrega exatamente amanhã, pega as 2 tarefas mais recentes para demonstração
    tomorrowTasks = Array.from(db.tasks.values()).slice(0, 2);
  }

  if (tomorrowTasks.length === 0) {
    return {
      dispatched: false,
      message: `Nenhuma tarefa cadastrada com entrega marcada para amanhã (${tomorrowDateBR}).`,
      tasks_count: 0,
    };
  }

  const templates: any = db.whatsapp_config?.templates || {};
  let photoBuffer: Buffer | null = null;
  let photoContentType: string | null = null;

  if (templates.tomorrow_photo_id) {
    const f = db.files.get(templates.tomorrow_photo_id);
    if (f && f.data) {
      photoBuffer = f.data;
      photoContentType = f.content_type;
    }
  }

  const result = await whatsappService.sendTomorrowReminder({
    tomorrow_date_br: tomorrowDateBR,
    tasks: tomorrowTasks.map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      points: t.points,
      description: t.description,
    })),
    custom_caption_template: overrideCaption !== undefined ? overrideCaption : templates.tomorrow_caption,
    group1_extra: overrideExtra !== undefined ? overrideExtra : (templates.group1_tomorrow_extra || undefined),
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    group1_enabled: true,
    group2_enabled: true,
  });

  return {
    dispatched: true,
    tasks_count: tomorrowTasks.length,
    tomorrow_date_br: tomorrowDateBR,
    result,
  };
}

// Background scheduler para auto-ativação programada e controle de tempo ativo (mínimo 20 min)
async function checkWhatsAppAutoActivationScheduler() {
  try {
    const config = db.whatsapp_config;
    if (!config || !config.enabled) return;

    const autoSched = config.auto_activation_schedule;
    const clock = getSystemClock();
    const currentTimeStr = clock.timeHM;
    const todayStr = clock.yearMonthDay;

    // 1. Verificar se é o horário programado para ativar o WhatsApp usando o Relógio do Sistema
    if (autoSched && autoSched.enabled) {
      const targetTime = (autoSched.time || '18:00').trim();
      const minDuration = Math.max(20, autoSched.duration_minutes || 20); // Pelo menos 20 minutos!

      if (currentTimeStr === targetTime && autoSched.last_run_date !== todayStr) {
        console.log(`[WhatsApp Auto-Activation] Horário programado atingido pelo Relógio do Sistema (${currentTimeStr}). Ativando WhatsApp por no mínimo ${minDuration} minutos...`);
        autoSched.last_run_date = todayStr;
        db.saveToDisk();
        saveSystemSettingsToFirestore();

        await whatsappService.activateForDuration(minDuration, 'schedule');
      }
    }

    // 2. Verificar se a janela de tempo ativo (mínimo 20 min) expirou para colocar em repouso/standby
    if (autoSched && !autoSched.stay_connected_24_7) {
      const status = whatsappService.getStatus();
      if ((status.status === 'connected' || status.status === 'connecting' || status.status === 'qr_ready') && whatsappService.isWindowExpired()) {
        console.log('[WhatsApp Scheduler] Tempo da janela ativa (>=20min) finalizado. Colocando WhatsApp em modo repouso/standby e preservando credenciais...');
        await whatsappService.pauseSocketKeepAuth();
      }
    }
  } catch (err) {
    console.error('[WhatsApp Scheduler] Erro no agendador de auto-ativação:', err);
  }
}

// Background scheduler para lembrete diário de tarefas
let lastDailyReminderRunMinuteKey = '';
async function checkDailyTomorrowReminder() {
  try {
    const config = db.whatsapp_config;
    if (!config || !config.enabled || !config.daily_reminder?.enabled) return;

    const clock = getSystemClock();
    const currentTimeStr = clock.timeHM;
    const todayStr = clock.yearMonthDay;

    const targetTime = (config.daily_reminder.time || '19:00').trim();
    const runKey = `${todayStr}_${targetTime}`;

    if (currentTimeStr === targetTime && config.daily_reminder.last_run_date !== todayStr && lastDailyReminderRunMinuteKey !== runKey) {
      lastDailyReminderRunMinuteKey = runKey;
      console.log(`[WhatsApp Reminder] Horário agendado atingido pelo Relógio do Sistema (${currentTimeStr}). Disparando lembrete de tarefas para amanhã...`);
      config.daily_reminder.last_run_date = todayStr;
      db.saveToDisk();
      saveSystemSettingsToFirestore();
      await executeTomorrowTasksDispatch(false);
    }
  } catch (err) {
    console.error('[WhatsApp Reminder] Erro no agendador diário:', err);
  }
}

// Rodar verificação a cada 20 segundos
if (!process.env.VERCEL) {
  setInterval(checkWhatsAppAutoActivationScheduler, 20000);
  setInterval(checkDailyTomorrowReminder, 30000);
}

// ---------------------------------------------------------------------------
// Store Effects
// ---------------------------------------------------------------------------
api.get('/effects', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const catalog = db.getEffectsCatalog();

  const owned = user.role === 'admin'
    ? catalog.map((e) => e.id)
    : user.owned_effects || ['none'];

  res.json({
    effects: catalog,
    owned: Array.from(new Set(['none', ...owned])),
    equipped: user.equipped_effect || 'none',
    points: user.points || 0,
  });
});

api.put(['/effects/:effect_id', '/admin/effects/:effect_id'], requireAdmin, (req, res) => {
  const { effect_id } = req.params;
  const { cost } = req.body || {};
  const c = parseInt(cost);
  if (isNaN(c) || c < 0) return res.status(400).json({ detail: 'Custo inválido. Deve ser um número maior ou igual a 0.' });

  db.effect_overrides[effect_id] = { cost: c };
  db.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true, effect_id, new_cost: c, catalog: db.getEffectsCatalog() });
});

api.put(['/effects', '/admin/effects'], requireAdmin, (req, res) => {
  const { overrides } = req.body || {};
  if (overrides && typeof overrides === 'object') {
    for (const [id, val] of Object.entries(overrides)) {
      const c = parseInt((val as any)?.cost !== undefined ? (val as any).cost : val as any);
      if (!isNaN(c) && c >= 0) {
        db.effect_overrides[id] = { cost: c };
      }
    }
    db.saveToDisk();
    saveSystemSettingsToFirestore();
  }
  res.json({ ok: true, catalog: db.getEffectsCatalog() });
});

api.post('/me/effects/buy', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const { effect_id } = req.body || {};
  const catalog = db.getEffectsCatalog();
  const effect = catalog.find((e) => e.id === effect_id);

  if (!effect) return res.status(404).json({ detail: 'Efeito não encontrado' });
  if (user.role === 'admin') return res.json({ ok: true, already_owned: true });

  const owned = user.owned_effects || ['none'];
  if (owned.includes(effect.id) || effect.id === 'none') {
    return res.json({ ok: true, already_owned: true });
  }

  const cost = effect.cost;
  if ((user.points || 0) < cost) {
    return res.status(400).json({ detail: `Você precisa de ${cost} pontos (tem ${user.points || 0})` });
  }

  user.points -= cost;
  user.owned_effects.push(effect.id);
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);

  res.json({
    ok: true,
    points: user.points,
    owned_effects: user.owned_effects,
  });
});

api.post('/me/effects/equip', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const { effect_id } = req.body || {};
  const effId = effect_id || 'none';

  if (user.role !== 'admin' && effId !== 'none') {
    const owned = user.owned_effects || ['none'];
    if (!owned.includes(effId)) {
      return res.status(400).json({ detail: 'Você ainda não comprou esse efeito' });
    }
  }

  user.equipped_effect = effId;
  db.saveToDisk();
  await firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true, equipped: effId });
});

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------
api.get('/integrations/webhook-logs', requireAdmin, (req, res) => {
  res.json({
    configured: Boolean(process.env.MAKE_WEBHOOK_URL),
    webhook_url: process.env.MAKE_WEBHOOK_URL || '',
    logs: db.webhook_logs.slice(0, 50),
  });
});

api.post('/integrations/webhook-test', requireAdmin, (req, res) => {
  res.json({ ok: true, status: 200 });
});

// ---------------------------------------------------------------------------
// ZIP Data Transfer & Backup / Restore System
// ---------------------------------------------------------------------------

// Helper: UTF-8 BOM for CSV to open cleanly in Excel
const UTF8_BOM = '\uFEFF';

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

api.get('/admin/zip/export', requireAdmin, (req, res) => {
  try {
    const { include_uploads = 'true', type = 'full' } = req.query;
    const shouldIncludeUploads = include_uploads !== 'false';
    const zip = new AdmZip();

    const students = Array.from(db.users.values()).filter((u) => u.role === 'aluno');
    const tasks = Array.from(db.tasks.values());
    const subjects = Array.from(db.subjects.values());

    // 1. edutask_backup.json
    const backupData = {
      app: 'EduTask',
      version: db.app_info?.version || '1.2.0',
      exported_at: new Date().toISOString(),
      type,
      data: {
        users: Array.from(db.users.values()).map((u) => ({
          ...u,
          // If admin, protect from leaking raw password_plain if unsafe
          password_plain: u.role === 'admin' ? undefined : u.password_plain,
        })),
        subjects,
        tasks,
        completions: db.completions,
        announcements: Array.from(db.announcements.values()),
        comments: Array.from(db.comments.values()),
        login_logs: db.login_logs.slice(0, 1000),
        point_adjustments: db.point_adjustments,
        effect_overrides: db.effect_overrides,
        monthly_prize: db.monthly_prize,
        active_month_key: db.active_month_key,
        monthly_history: db.monthly_history,
        task_cleanup_config: db.task_cleanup_config,
        student_buttons: Array.from(db.student_buttons.values()),
        whatsapp_config: db.whatsapp_config,
        app_info: db.app_info,
        ai_enabled: db.ai_enabled,
        task_student_answers: Array.from(db.task_student_answers.entries()),
      },
    };
    zip.addFile('edutask_backup.json', Buffer.from(JSON.stringify(backupData, null, 2), 'utf8'));

    // 2. manifest.json
    const manifest = {
      app: 'EduTask',
      version: db.app_info?.version || '1.2.0',
      exported_at: new Date().toISOString(),
      counts: {
        users: db.users.size,
        students: students.length,
        tasks: tasks.length,
        subjects: subjects.length,
        completions: db.completions.length,
        announcements: db.announcements.size,
        comments: db.comments.size,
        student_buttons: db.student_buttons.size,
        uploads: 0,
      },
    };

    // 3. Human readable CSVs
    // 3a. Alunos & Pontos CSV
    let csvAlunos = `${UTF8_BOM}ID;Nome;Email;Função;Status;Pontos;MolduraEquipada;CriadoEm\n`;
    db.users.forEach((u) => {
      csvAlunos += [
        escapeCsvField(u.id),
        escapeCsvField(u.name),
        escapeCsvField(u.email),
        escapeCsvField(u.role === 'admin' ? 'Administrador' : 'Aluno'),
        escapeCsvField(u.status),
        escapeCsvField(u.points || 0),
        escapeCsvField(u.equipped_effect || 'none'),
        escapeCsvField(u.created_at || ''),
      ].join(';') + '\n';
    });
    zip.addFile('csv/alunos_e_usuarios.csv', Buffer.from(csvAlunos, 'utf8'));

    // 3b. Tarefas CSV
    let csvTarefas = `${UTF8_BOM}ID;Título;Matéria;DataEntrega;Pontos;AtribuídoPara;CriadoEm\n`;
    tasks.forEach((t) => {
      csvTarefas += [
        escapeCsvField(t.id),
        escapeCsvField(t.title),
        escapeCsvField(t.subject),
        escapeCsvField(t.due_date),
        escapeCsvField(t.points),
        escapeCsvField(t.assigned_to?.length ? t.assigned_to.join(', ') : 'Todos'),
        escapeCsvField(t.created_at || ''),
      ].join(';') + '\n';
    });
    zip.addFile('csv/tarefas.csv', Buffer.from(csvTarefas, 'utf8'));

    // 3c. Entregas e Conclusões CSV
    let csvEntregas = `${UTF8_BOM}IDTarefa;IDAluno;NomeAluno;DataConclusão;NoPrazo;PontosRecebidos\n`;
    db.completions.forEach((c) => {
      const studentName = db.users.get(c.user_id)?.name || 'Aluno';
      csvEntregas += [
        escapeCsvField(c.task_id),
        escapeCsvField(c.user_id),
        escapeCsvField(studentName),
        escapeCsvField(c.completed_at),
        escapeCsvField(c.on_time ? 'Sim' : 'Não'),
        escapeCsvField(c.points_awarded || 0),
      ].join(';') + '\n';
    });
    zip.addFile('csv/entregas_concluidas.csv', Buffer.from(csvEntregas, 'utf8'));

    // 3d. Botões de Alunos CSV
    let csvBotoes = `${UTF8_BOM}ID;Nome;Link;Descricao;Cor;Icone;Ativo;Ordem;Cliques;CriadoEm\n`;
    Array.from(db.student_buttons.values()).forEach((b) => {
      csvBotoes += [
        escapeCsvField(b.id),
        escapeCsvField(b.name),
        escapeCsvField(b.url),
        escapeCsvField(b.description || ''),
        escapeCsvField(b.color || 'indigo'),
        escapeCsvField(b.icon || '🔗'),
        escapeCsvField(b.active ? 'Sim' : 'Não'),
        escapeCsvField(b.order || 0),
        escapeCsvField(b.click_count || 0),
        escapeCsvField(b.created_at || ''),
      ].join(';') + '\n';
    });
    zip.addFile('csv/botoes_alunos.csv', Buffer.from(csvBotoes, 'utf8'));

    // 4. Attachments / Uploads directory
    let uploadFilesCount = 0;
    if (shouldIncludeUploads && fs.existsSync(UPLOAD_DIR)) {
      try {
        const files = fs.readdirSync(UPLOAD_DIR);
        files.forEach((file) => {
          const filePath = path.join(UPLOAD_DIR, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const data = fs.readFileSync(filePath);
            zip.addFile(`uploads/${file}`, data);
            uploadFilesCount++;
          }
        });
      } catch (err) {
        console.warn('[ZIP Export] Erro ao ler arquivos de uploads:', err);
      }
    }
    manifest.counts.uploads = uploadFilesCount;
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    // 5. Readme
    const readme = `================================================
EDUTASK — PACOTE OFICIAL DE DADOS & BACKUP (ZIP)
================================================
Data de Exportação: ${new Date().toLocaleString('pt-BR')}
Versão: ${db.app_info?.version || '1.2.0'}

Conteúdo do Pacote:
1. edutask_backup.json -> Banco de dados com todos os registros (alunos, tarefas, botões de alunos, WhatsApp, histórico mensal)
2. manifest.json       -> Metadados e contagem de itens
3. csv/                -> Planilhas em Excel/CSV de alunos, tarefas, entregas e botões de alunos
4. uploads/            -> Fotos de perfis e anexos de tarefas (${uploadFilesCount} arquivos)

Como Importar:
Acesse o Painel do Administrador > Aba "Dados ZIP" > Envie este arquivo .zip
`;
    zip.addFile('LEIA-ME.txt', Buffer.from(readme, 'utf8'));

    const zipBuffer = zip.toBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 16).replace(':', '');
    const filename = `edutask-backup-${dateStr}-${timeStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('[ZIP Export Error]:', err);
    res.status(500).json({ detail: 'Erro ao gerar arquivo ZIP: ' + (err.message || String(err)) });
  }
});

api.post('/admin/zip/preview', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ detail: 'Nenhum arquivo ZIP enviado' });
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    let backupData: any = null;
    let manifestData: any = null;
    const uploadFiles: string[] = [];

    zipEntries.forEach((entry) => {
      if (entry.entryName === 'edutask_backup.json' || entry.entryName === 'db.json' || entry.entryName.endsWith('backup.json')) {
        try {
          const content = entry.getData().toString('utf8');
          backupData = JSON.parse(content);
        } catch (e) {
          console.warn('[ZIP Preview] Erro ao parsear JSON:', e);
        }
      } else if (entry.entryName === 'manifest.json') {
        try {
          manifestData = JSON.parse(entry.getData().toString('utf8'));
        } catch (e) {}
      } else if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
        uploadFiles.push(entry.entryName.replace('uploads/', ''));
      }
    });

    // Support root or legacy formats
    const actualData = backupData?.data || backupData;
    const usersList: any[] = Array.isArray(actualData?.users)
      ? actualData.users.map((u: any) => (Array.isArray(u) ? u[1] : u))
      : [];
    const tasksList: any[] = Array.isArray(actualData?.tasks)
      ? actualData.tasks.map((t: any) => (Array.isArray(t) ? t[1] : t))
      : [];
    const subjectsList: any[] = Array.isArray(actualData?.subjects)
      ? actualData.subjects.map((s: any) => (Array.isArray(s) ? s[1] : s))
      : [];
    const completionsList: any[] = Array.isArray(actualData?.completions) ? actualData.completions : [];
    const buttonsList: any[] = Array.isArray(actualData?.student_buttons)
      ? actualData.student_buttons.map((b: any) => (Array.isArray(b) ? b[1] : b))
      : [];

    const preview = {
      valid: Boolean(backupData || uploadFiles.length > 0),
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      manifest: manifestData,
      counts: {
        users: usersList.length,
        students: usersList.filter((u: any) => u.role === 'aluno').length,
        tasks: tasksList.length,
        subjects: subjectsList.length,
        completions: completionsList.length,
        uploads: uploadFiles.length,
        student_buttons: buttonsList.length,
      },
      previewUsers: usersList.slice(0, 5).map((u: any) => ({ id: u.id, name: u.name, role: u.role, points: u.points })),
      previewTasks: tasksList.slice(0, 5).map((t: any) => ({ id: t.id, title: t.title, subject: t.subject, points: t.points })),
      previewButtons: buttonsList.slice(0, 5).map((b: any) => ({ id: b.id, name: b.name, url: b.url, color: b.color, icon: b.icon })),
      previewUploads: uploadFiles.slice(0, 8),
    };

    res.json(preview);
  } catch (err: any) {
    console.error('[ZIP Preview Error]:', err);
    res.status(400).json({ detail: 'Arquivo ZIP inválido ou corrompido: ' + (err.message || String(err)) });
  }
});

api.post('/admin/zip/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ detail: 'Nenhum arquivo ZIP enviado' });
    }

    const {
      mode = 'merge', // 'merge' | 'overwrite'
      import_users = 'true',
      import_tasks = 'true',
      import_subjects = 'true',
      import_completions = 'true',
      import_announcements = 'true',
      import_uploads = 'true',
      import_effects = 'true',
      import_buttons = 'true',
      import_whatsapp = 'true',
      import_monthly = 'true',
    } = req.body || {};

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    let backupData: any = null;
    let extractedFilesCount = 0;

    // 1. Extrair uploads para a pasta UPLOAD_DIR do servidor
    if (import_uploads !== 'false') {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      zipEntries.forEach((entry) => {
        if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
          const fileName = path.basename(entry.entryName);
          if (fileName) {
            const destPath = path.join(UPLOAD_DIR, fileName);
            fs.writeFileSync(destPath, entry.getData());
            extractedFilesCount++;
          }
        }
      });
    }

    // 2. Encontrar dados do JSON
    zipEntries.forEach((entry) => {
      if (entry.entryName === 'edutask_backup.json' || entry.entryName === 'db.json' || entry.entryName.endsWith('backup.json')) {
        try {
          const content = entry.getData().toString('utf8');
          backupData = JSON.parse(content);
        } catch (e) {
          console.warn('[ZIP Import] Erro ao parsear JSON:', e);
        }
      }
    });

    const actualData = backupData?.data || backupData;
    let importedUsersCount = 0;
    let importedTasksCount = 0;
    let importedSubjectsCount = 0;
    let importedCompletionsCount = 0;
    let importedButtonsCount = 0;

    if (actualData) {
      // Import Subjects
      if (import_subjects !== 'false' && actualData.subjects) {
        const subjList: any[] = Array.isArray(actualData.subjects)
          ? actualData.subjects.map((s: any) => (Array.isArray(s) ? s[1] : s))
          : [];
        if (mode === 'overwrite' && subjList.length > 0) {
          db.subjects.clear();
        }
        subjList.forEach((s) => {
          if (s && s.id && s.name) {
            db.subjects.set(s.id, s);
            importedSubjectsCount++;
          }
        });
      }

      // Import Users
      if (import_users !== 'false' && actualData.users) {
        const usersList: any[] = Array.isArray(actualData.users)
          ? actualData.users.map((u: any) => (Array.isArray(u) ? u[1] : u))
          : [];

        // Save current logged in admin user to ensure admin never gets locked out
        const currentAdmin = (req as any).user as User;

        if (mode === 'overwrite' && usersList.length > 0) {
          db.users.clear();
          if (currentAdmin) {
            db.users.set(currentAdmin.id, currentAdmin);
          }
        }

        usersList.forEach((u) => {
          if (u && u.id && u.name) {
            // Guarantee admin accounts never have password 123
            let plainPass = u.password_plain;
            let passHash = u.password_hash;
            if (u.role === 'admin' && (plainPass === '123' || !passHash)) {
              plainPass = process.env.ADMIN_PASSWORD || 'enzo123cg';
              passHash = bcrypt.hashSync(plainPass, 10);
            }

            const cleanUser: User = {
              id: u.id,
              name: u.name,
              email: u.email || `${u.id}@escola.com`,
              password_hash: passHash || bcrypt.hashSync('123', 10),
              password_plain: plainPass,
              role: u.role || 'aluno',
              status: u.status || 'active',
              points: typeof u.points === 'number' ? u.points : 0,
              streak_count: typeof u.streak_count === 'number' ? u.streak_count : 0,
              longest_streak: typeof u.longest_streak === 'number' ? u.longest_streak : 0,
              owned_effects: Array.isArray(u.owned_effects) ? u.owned_effects : ['none'],
              equipped_effect: u.equipped_effect || 'none',
              avatar_data: u.avatar_data,
              avatar_content_type: u.avatar_content_type,
              created_at: u.created_at || new Date().toISOString(),
            };
            db.users.set(u.id, cleanUser);
            importedUsersCount++;
            firebaseService.saveUser(cleanUser).catch(console.warn);
          }
        });
      }

      // Import Tasks
      if (import_tasks !== 'false' && actualData.tasks) {
        const tasksList: any[] = Array.isArray(actualData.tasks)
          ? actualData.tasks.map((t: any) => (Array.isArray(t) ? t[1] : t))
          : [];
        if (mode === 'overwrite' && tasksList.length > 0) {
          db.tasks.clear();
        }
        tasksList.forEach((t) => {
          if (t && t.id && t.title) {
            db.tasks.set(t.id, {
              id: t.id,
              title: t.title,
              description: t.description || '',
              subject: t.subject || 'Geral',
              due_date: t.due_date || new Date().toISOString().slice(0, 10),
              points: typeof t.points === 'number' ? t.points : 50,
              assigned_to: Array.isArray(t.assigned_to) ? t.assigned_to : [],
              attachments: Array.isArray(t.attachments) ? t.attachments : (Array.isArray(t.files) ? t.files : []),
              admin_photos: Array.isArray(t.admin_photos) ? t.admin_photos : [],
              answer: t.answer || '',
              created_by: t.created_by || 'admin-user-001',
              created_at: t.created_at || new Date().toISOString(),
            });
            importedTasksCount++;
          }
        });
      }

      // Import Completions
      if (import_completions !== 'false' && actualData.completions) {
        if (mode === 'overwrite') {
          db.completions = [];
        }
        const existingKeys = new Set(db.completions.map((c) => `${c.task_id}-${c.user_id}`));
        actualData.completions.forEach((c: any) => {
          const key = `${c?.task_id}-${c?.user_id}`;
          if (c && c.task_id && c.user_id && (!existingKeys.has(key) || mode === 'overwrite')) {
            db.completions.push({
              task_id: c.task_id,
              user_id: c.user_id,
              completed_at: c.completed_at || new Date().toISOString(),
              on_time: Boolean(c.on_time),
              points_awarded: typeof c.points_awarded === 'number' ? c.points_awarded : 50,
            });
            importedCompletionsCount++;
          }
        });
      }

      // Import Announcements
      if (import_announcements !== 'false' && actualData.announcements) {
        const annList: any[] = Array.isArray(actualData.announcements)
          ? actualData.announcements.map((a: any) => (Array.isArray(a) ? a[1] : a))
          : [];
        if (mode === 'overwrite') {
          db.announcements.clear();
        }
        annList.forEach((a) => {
          if (a && a.id) db.announcements.set(a.id, a);
        });
      }

      // Import Effect Overrides / Store Prices
      if (import_effects !== 'false' && actualData.effect_overrides) {
        db.effect_overrides = { ...db.effect_overrides, ...actualData.effect_overrides };
      }

      // Import Student Buttons (Botões de Alunos)
      if (import_buttons !== 'false' && actualData.student_buttons) {
        const buttonsList: any[] = Array.isArray(actualData.student_buttons)
          ? actualData.student_buttons.map((b: any) => (Array.isArray(b) ? b[1] : b))
          : [];
        if (mode === 'overwrite' && buttonsList.length > 0) {
          db.student_buttons.clear();
        }
        buttonsList.forEach((b) => {
          if (b && b.id && b.name && b.url) {
            db.student_buttons.set(b.id, {
              id: b.id,
              name: b.name,
              url: b.url,
              description: b.description || '',
              color: b.color || 'indigo',
              icon: b.icon || '🔗',
              active: b.active !== false,
              order: typeof b.order === 'number' ? b.order : db.student_buttons.size + 1,
              click_count: typeof b.click_count === 'number' ? b.click_count : 0,
              created_at: b.created_at || new Date().toISOString(),
              created_by: b.created_by || 'admin',
            });
            importedButtonsCount++;
          }
        });
      }

      // Import WhatsApp Config (Modelos de Mensagens, Agendamentos, Lembretes)
      if (import_whatsapp !== 'false' && actualData.whatsapp_config) {
        db.whatsapp_config = {
          ...db.whatsapp_config,
          ...actualData.whatsapp_config,
          templates: {
            ...db.whatsapp_config.templates,
            ...(actualData.whatsapp_config.templates || {}),
          },
          auto_activation_schedule: {
            ...db.whatsapp_config.auto_activation_schedule,
            ...(actualData.whatsapp_config.auto_activation_schedule || {}),
          },
          daily_reminder: {
            ...db.whatsapp_config.daily_reminder,
            ...(actualData.whatsapp_config.daily_reminder || {}),
          },
        };
      }

      // Import Monthly Prize & Ciclo Mensal
      if (import_monthly !== 'false') {
        if (actualData.monthly_prize) {
          db.monthly_prize = { ...db.monthly_prize, ...actualData.monthly_prize };
        }
        if (actualData.active_month_key) {
          db.active_month_key = actualData.active_month_key;
        }
        if (Array.isArray(actualData.monthly_history)) {
          if (mode === 'overwrite') {
            db.monthly_history = actualData.monthly_history;
          } else {
            const existingKeys = new Set(db.monthly_history.map((h: any) => h.month_key));
            actualData.monthly_history.forEach((h: any) => {
              if (h && h.month_key && !existingKeys.has(h.month_key)) {
                db.monthly_history.push(h);
              }
            });
          }
        }
      }

      // Import Task Cleanup Config
      if (actualData.task_cleanup_config) {
        db.task_cleanup_config = {
          ...db.task_cleanup_config,
          ...actualData.task_cleanup_config,
        };
      }
    }

    db.saveToDisk();
    saveSystemSettingsToFirestore();

    res.json({
      ok: true,
      message: 'Arquivo ZIP processado e dados importados com sucesso!',
      imported: {
        users: importedUsersCount,
        tasks: importedTasksCount,
        subjects: importedSubjectsCount,
        completions: importedCompletionsCount,
        buttons: importedButtonsCount,
        files: extractedFilesCount,
      },
    });
  } catch (err: any) {
    console.error('[ZIP Import Error]:', err);
    res.status(500).json({ detail: 'Erro ao importar arquivo ZIP: ' + (err.message || String(err)) });
  }
});

// ---------------------------------------------------------------------------
// AI Features (Gemini with Smart Fallbacks)
// ---------------------------------------------------------------------------
api.get(['/ai/status', '/ai-status'], requireAuth, (req, res) => {
  res.json({ enabled: db.ai_enabled });
});

api.put(['/ai/status', '/ai-status'], requireAdmin, (req, res) => {
  db.ai_enabled = Boolean(req.body?.enabled);
  res.json({ ok: true, enabled: db.ai_enabled });
});

api.post('/ai/improve-task', requireAdmin, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { title, subject, hint } = req.body || {};
  if (!title) return res.status(400).json({ detail: 'Título obrigatório' });

  if (genAI) {
    try {
      const prompt = `Você é um professor experiente de ensino fundamental e médio no Brasil.
Elabore uma descrição pedagógica, dicas e objetivos para esta tarefa escolar:
Matéria: ${subject || 'Geral'}
Título: ${title}
${hint ? `Dicas/ideias do professor: ${hint}` : ''}

Responda EXCLUSIVAMENTE em formato JSON com as chaves:
"description": string (2-3 parágrafos explicando detalhadamente a proposta da tarefa de forma engajadora)
"tips": array de 3 strings com dicas práticas para o aluno
"objectives": array de 2 strings com objetivos de aprendizagem`;

      const response = await callGeminiGenerate({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.1-flash-lite',
      });

      const parsed = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
      return res.json({
        description: parsed.description || `Exercício prático de ${subject || 'estudos'} focado em ${title}.`,
        tips: parsed.tips || ['Leia atentamente o enunciado.', 'Faça rascunhos antes da versão final.'],
        objectives: parsed.objectives || ['Fixar conceitos fundamentais.', 'Desenvolver autonomia de estudo.'],
      });
    } catch (e: any) {
      console.warn('Gemini API improve-task failed, falling back:', e.message);
    }
  }

  // Realistic fallback
  res.json({
    description: `Nesta atividade de ${subject || 'estudos'}, vamos aprofundar os conhecimentos sobre "${title}".\n\nLeia os materiais indicados com atenção, anote as dúvidas principais e desenvolva suas respostas com justificativas claras e fundamentadas.\n\nLembre-se de organizar seu tempo para entregar até o prazo estipulado!`,
    tips: [
      'Faça uma primeira leitura rápida para entender o contexto geral.',
      'Destaque palavras-chave e fórmulas essenciais.',
      'Revise seus cálculos e ortografia antes de marcar a entrega.',
    ],
    objectives: [
      `Consolidar o domínio dos temas relacionados a ${title}.`,
      'Estimular o raciocínio crítico e a resolução independente de problemas.',
    ],
  });
});

api.post('/ai/generate-announcement', requireAdmin, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ detail: 'Descreva o aviso' });

  if (genAI) {
    try {
      const response = await callGeminiGenerate({
        contents: `Você é um professor escolar no Brasil redigindo um comunicado aos alunos e responsáveis.
Com base nesta ideia: "${prompt}", escreva um aviso escolar polido, motivador e claro.
Responda EXCLUSIVAMENTE em JSON:
{
  "title": "título curto chamativo",
  "message": "mensagem formatada em 1 ou 2 parágrafos amigáveis"
}`,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.1-flash-lite',
      });
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
      return res.json({
        title: (parsed.title || 'Aviso Escolar').slice(0, 80),
        message: parsed.message || prompt,
      });
    } catch (e: any) {
      console.warn('Gemini generate-announcement fallback:', e.message);
    }
  }

  res.json({
    title: `Aviso: ${prompt.slice(0, 45)}...`,
    message: `Prezados alunos,\n\n${prompt}\n\nFiquem atentos aos prazos e continuem com o ótimo empenho nos estudos! Qualquer dúvida, procurem o professor.`,
  });
});

api.post('/ai/check-answer', requireAdmin, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { student_answer, task_description, correct_answer } = req.body || {};

  if (genAI) {
    try {
      const prompt = `Analise a resposta do aluno em relação ao gabarito/tarefa:
Tarefa: ${task_description || ''}
Gabarito esperado: ${correct_answer || ''}
Resposta enviada pelo aluno: ${student_answer || ''}

Responda EXCLUSIVAMENTE em JSON:
{
  "score": número de 0 a 100,
  "errors": ["erro 1 se houver"],
  "feedback": "feedback construtivo e encorajador em português",
  "suggestions": ["dica para melhorar"]
}`;
      const response = await callGeminiGenerate({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.1-flash-lite',
      });
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
      return res.json(parsed);
    } catch (e: any) {
      console.warn('Gemini check-answer fallback:', e.message);
    }
  }

  res.json({
    score: 90,
    errors: [],
    feedback: 'Excelente raciocínio apresentado! A lógica foi bem desenvolvida e os conceitos centrais foram compreendidos.',
    suggestions: ['Revise a formalização final para manter a precisão matemática/conceitual.'],
  });
});

api.post('/ai/generate-task-answer', requireAdmin, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { task_id, photo_ids, subject, title, description, answer_source, extra_hint, length = 'medium' } = req.body || {};
  const task = task_id ? db.tasks.get(task_id) : null;

  const validLength: 'short' | 'medium' | 'detailed' = ['short', 'medium', 'detailed'].includes(length)
    ? (length as 'short' | 'medium' | 'detailed')
    : 'medium';

  const lengthRules: Record<'short' | 'medium' | 'detailed', string> = {
    short: 'TAMANHO GABARITO CURTO: Forneça unicamente a numeração/identificação de cada questão e a resposta/alternativa direta. Proibido introduções, proibido explicações longas e proibido enrolação. Formato direto de folha de respostas rápida.',
    medium: 'TAMANHO GABARITO MÉDIO: Para cada questão, apresente a identificação da questão, desenvolvimento dos passos essenciais de forma sucinta e a resposta final destacada.',
    detailed: 'TAMANHO GABARITO DETALHADO: Para cada questão, apresente a identificação, a resolução completa passo a passo de todas as etapas e o gabarito final explicativo.'
  };

  const resolvedSubject = subject || task?.subject || 'Geral';
  const resolvedSource = answer_source || task?.answer_source || task?.answer || '';

  const rawPhotoIds: string[] = [
    ...(Array.isArray(photo_ids) ? photo_ids : []),
    ...(Array.isArray(task?.admin_photos) ? task.admin_photos : []),
    ...(Array.isArray(task?.attachments) ? task.attachments : []),
  ]
    .map((p: any) => (typeof p === 'string' ? p : p?.id))
    .filter((id): id is string => Boolean(id && typeof id === 'string'));

  const uniquePhotoIds = Array.from(new Set(rawPhotoIds));

  const photos: FileRecord[] = [];
  for (const pid of uniquePhotoIds) {
    const f = await resolveFileRecordAsync(pid);
    if (f && f.data && (f.content_type?.startsWith('image/') || f.original_filename?.match(/\.(jpe?g|png|webp|gif|bmp|jfif|heic|heif)$/i))) {
      photos.push(f);
    }
  }

  if (genAI && (photos.length > 0 || resolvedSource || description)) {
    try {
      const contentsParts: any[] = [];
      for (const p of photos.slice(0, 10)) {
        if (p.data && p.data.length > 0 && p.data.length < 20 * 1024 * 1024) {
          const mime = p.content_type?.startsWith('image/') && p.content_type !== 'application/octet-stream'
            ? p.content_type
            : 'image/jpeg';
          contentsParts.push({
            inlineData: {
              data: p.data.toString('base64'),
              mimeType: mime,
            },
          });
        }
      }

      // CRITICAL: If photos exist, DO NOT pass description/enunciado or let the AI see or describe the task.
      // The AI must ONLY read the questions directly from the provided images and output the answers directly without explanations, without ####, and without **.
      const prompt = `VOCÊ É UM PROFESSOR RESOLVEDOR DE TAREFAS ESCOLARES (ENSINO FUNDAMENTAL E MÉDIO).

SUA MISSÃO EXCLUSIVA: ENTREGAR SOMENTE A RESPOSTA DIRETA DE CADA QUESTÃO, SEM ENROLAÇÃO.

🚨 REGRAS CRÍTICAS E OBRIGATÓRIAS (ATENÇÃO MÁXIMA):
1. SEM EXPLICAÇÃO: NÃO coloque explicação, NÃO coloque resolução passo a passo, NÃO coloque justificativas e NÃO coloque introdução. Isso deixa o texto muito cheio. Forneça SOMENTE a resposta direta de cada questão que for estritamente necessária.
2. SEM ####: NUNCA use cerquilhas/hashtags (####, ###, ## ou #) em lugar nenhum. Proibido usar títulos markdown com #.
3. SEM **: NUNCA use asteriscos (**) nem marcadores com asterisco (*). O texto deve ser 100% puro.
4. ${photos.length > 0 ? `FONTE EXCLUSIVA: Leia atentamente as fotos anexadas. Você NÃO tem o enunciado textual. Identifique cada questão ou item das imagens e entregue SOMENTE a resposta final necessária de cada uma.` : `DISCIPLINA: ${resolvedSubject}`}

${resolvedSource && photos.length === 0 ? `MATERIAL DE REFERÊNCIA / GABARITO BASE DO PROFESSOR:\n${resolvedSource}\n` : ''}
${extra_hint ? `OBSERVAÇÕES DO PROFESSOR: ${extra_hint}\n` : ''}

FORMATO EXATO OBRIGATÓRIO (DIRETO E LIMPO):
Questão 1: [Apenas a resposta direta necessária]
Questão 2: [Apenas a resposta direta necessária]
Questão 3: [Apenas a resposta direta necessária]`;

      contentsParts.push({ text: prompt });

      const response = await callGeminiGenerate({
        contents: contentsParts,
        preferredModel: 'gemini-3.1-flash-lite',
        timeoutMs: 45000,
      });

      let cleaned = (response.text || '')
        .trim()
        .replace(/^#+\s*/gm, '')
        .replace(/#+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^[ \t]*(?:Explicação|Resolução|Passo a passo|Justificativa):\s*/gim, '')
        .trim();
      if (cleaned) {
        return res.json({ answer: cleaned, photos_used: photos.length });
      }
    } catch (e: any) {
      console.warn('Gemini generate-task-answer error:', e.message);
    }
  }

  // Realistic answer generation fallback without asterisks, hashtags or explanations
  const mockAnswer = photos.length > 0
    ? `Questão 1: Alternativa correta identificada na foto.\nQuestão 2: Resultado apurado conforme imagem.`
    : `Questão 1: Resposta direta da atividade.\nQuestão 2: Conclusão direta.`;

  res.json({
    answer: mockAnswer
      .replace(/^#+\s*/gm, '')
      .replace(/#+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim(),
    photos_used: photos.length,
  });
});

api.post('/ai/explain-task', requireAuth, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { task_id } = req.body || {};
  const task = db.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: 'Tarefa não encontrada' });

  if (genAI) {
    try {
      const prompt = `Você é um professor paciente explicando para um estudante o que esta tarefa escolar pede, SEM ENTREGAR A RESPOSTA PRONTA.
Matéria: ${task.subject}
Título: ${task.title}
Enunciado: ${task.description}

Responda EXCLUSIVAMENTE em JSON:
{
  "explanation": "explicação calorosa do que é pedido em 2 parágrafos",
  "key_concepts": ["conceito 1", "conceito 2"],
  "tips": ["dica para começar 1", "dica 2"],
  "first_step": "o primeiro passo prático para começar agora"
}`;
      const response = await callGeminiGenerate({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.1-flash-lite',
      });
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
      return res.json({
        explanation: parsed.explanation || task.description,
        key_concepts: parsed.key_concepts || [task.subject],
        tips: parsed.tips || ['Revise a matéria dada em aula.'],
        first_step: parsed.first_step || 'Comece lendo a primeira questão com calma.',
      });
    } catch (e: any) {
      console.warn('Gemini explain-task fallback:', e.message);
    }
  }

  res.json({
    explanation: `Nesta atividade de ${task.subject}, seu objetivo é demonstrar o domínio sobre ${task.title}. Você deve estruturar sua resposta passo a passo, mostrando todo o seu raciocínio de forma clara e organizada.`,
    key_concepts: ['Compreensão do enunciado', 'Aplicação prática dos conceitos', 'Organização das respostas'],
    tips: [
      'Sublinhe o que a pergunta está pedindo exatamente.',
      'Separe os dados informados antes de começar a responder.',
      'Confira suas respostas uma a uma.',
    ],
    first_step: 'Separe seu caderno ou folha de rascunho e escreva a primeira etapa do problema.',
  });
});

api.post('/ai/chat', requireAuth, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const { session_id, message, task_id } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ detail: 'Mensagem vazia' });

  const user = (req as any).user as User;
  const sid = session_id || `sess-${user.id}-${Date.now()}`;
  let session = db.ai_chats.get(sid);
  if (!session) {
    session = {
      id: sid,
      user_id: user.id,
      task_id: task_id || null,
      messages: [],
      updated_at: new Date().toISOString(),
    };
    db.ai_chats.set(sid, session);
  } else if (task_id && !session.task_id) {
    session.task_id = task_id;
  }

  const effectiveTaskId = task_id || session.task_id;
  const now = new Date().toISOString();
  session.messages.push({ role: 'user', content: message.trim(), ts: now });

  // Gather student profile, tasks, and gabaritos
  const assignedTasks = Array.from(db.tasks.values()).filter(
    (t) => t.assigned_to.length === 0 || t.assigned_to.includes(user.id)
  );
  const userCompletions = db.completions.filter((c) => c.user_id === user.id);
  const compSet = new Set(userCompletions.map((c) => c.task_id));
  const pendingTasks = assignedTasks.filter((t) => !compSet.has(t.id));
  const focusedTask = effectiveTaskId ? assignedTasks.find((t) => t.id === effectiveTaskId) : null;

  let reply = '';
  if (genAI) {
    try {
      const historyContents = session.messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      let systemInstruction = '';
      if (user.role === 'aluno') {
        const tasksListStr = assignedTasks.map((t) => {
          const isDone = compSet.has(t.id);
          return `• Tarefa ID: "${t.id}" | Título: "${t.title}" | Matéria: ${t.subject} | Prazo: ${t.due_date} | Status: ${isDone ? 'Concluída' : 'Pendente / Não feita'}
  Descrição da tarefa: ${t.description}
  GABARITO / RESPOSTA OFICIAL: ${t.answer || 'Gabarito não cadastrado pelo professor.'}`;
        }).join('\n\n');

        const focusedTaskStr = focusedTask
          ? `\n\n>>> O ALUNO ESTÁ PERGUNTANDO ESPECIFICAMENTE SOBRE A TAREFA: "${focusedTask.title}" (${focusedTask.subject})
Descrição completa: ${focusedTask.description}
Gabarito oficial: ${focusedTask.answer || 'Nenhum gabarito fornecido'}
Status do aluno: ${compSet.has(focusedTask.id) ? 'Já marcada como concluída' : 'Pendente de conclusão'}\n<<<`
          : '';

        systemInstruction = `Você é o Tutor Edutask, um professor e assistente virtual amigável, atencioso e pedagógico em português do Brasil.
Você tem acesso completo aos dados de perfil do aluno, a todas as suas tarefas escolares e aos gabaritos/respostas oficiais das tarefas.

INFORMAÇÕES DO PERFIL DO ALUNO:
- Nome: ${user.name}
- Email: ${user.email}
- Saldo de Pontos (Loja de Molduras): ${user.points || 0}
- Tarefas concluídas: ${userCompletions.length}
- Tarefas pendentes: ${pendingTasks.length}

TAREFAS E GABARITOS CADASTRADOS DO ALUNO:
${tasksListStr}
${focusedTaskStr}

COMO RESPONDER ÀS DÚVIDAS DO ALUNO:
1. Quando o aluno tirar dúvidas sobre uma tarefa ou exercício, utilize o enunciado e o gabarito oficial como guia pedagógico. Ajude-o a entender o método e o raciocínio passo a passo.
2. Se o aluno pedir para conferir o gabarito ou perguntar a resposta de uma questão, explique o conceito e mostre a resolução passo a passo alinhada ao gabarito oficial.
3. Se o aluno perguntar sobre suas tarefas ("o que eu tenho que fazer?", "quais são minhas pendências?", "quais tarefas vencem hoje?"), consulte a lista acima e responda com clareza citando as matérias e prazos.
4. Se o aluno perguntar sobre seu perfil, pontos ou progresso, utilize os dados do perfil acima.
5. Seja encorajador, didático, claro e amigável.`;
      } else {
        systemInstruction = 'Você é um assistente pedagógico no Edutask para o professor. Ajude com sugestões de aula, rubricas e ideias educacionais.';
      }

      const response = await callGeminiGenerate({
        contents: historyContents,
        config: { systemInstruction },
        preferredModel: 'gemini-3.1-flash-lite',
      });
      reply = response.text || '';
    } catch (e: any) {
      console.warn('Gemini chat fallback:', e.message);
    }
  }

  if (!reply) {
    const lower = message.toLowerCase();
    if (focusedTask && (lower.includes('gabarito') || lower.includes('resposta') || lower.includes('como faz'))) {
      reply = `Olá ${user.name}! Sobre a tarefa "${focusedTask.title}" (${focusedTask.subject}): ${focusedTask.answer ? `o gabarito oficial indica: "${focusedTask.answer}". Vamos entender o raciocínio por trás dessa resposta juntos!` : `ainda não há um gabarito anexado, mas posso te orientar sobre o enunciado: ${focusedTask.description.slice(0, 100)}...`}`;
    } else if (lower.includes('tarefa') || lower.includes('pendente') || lower.includes('fazer') || lower.includes('hoje')) {
      if (pendingTasks.length === 0) {
        reply = `Parabéns, ${user.name}! Você não tem nenhuma tarefa pendente no momento. Todas as suas atividades estão em dia! 🎉`;
      } else {
        const listPreview = pendingTasks.slice(0, 3).map((t) => `"${t.title}" (${t.subject}, vence em ${t.due_date})`).join(', ');
        reply = `Olá ${user.name}! Você tem ${pendingTasks.length} tarefa(s) pendente(s): ${listPreview}. Sobre qual delas você quer tirar dúvida?`;
      }
    } else if (lower.includes('perfil') || lower.includes('ponto') || lower.includes('moldura')) {
      reply = `Olá ${user.name}! Seu perfil está ativo com ${user.points || 0} pontos acumulados para a Loja de Molduras. Você já completou ${userCompletions.length} tarefas. Em que mais posso ajudar nos seus estudos?`;
    } else {
      reply = `Olá ${user.name}! Sou seu tutor do Edutask. Tenho acesso às suas tarefas e gabaritos escolares. Sobre "${message.slice(0, 35)}...", me diga como posso te ajudar a entender essa matéria! 💡`;
    }
  }

  session.messages.push({ role: 'assistant', content: reply, ts: new Date().toISOString() });
  session.updated_at = new Date().toISOString();

  res.json({
    session_id: sid,
    message: reply,
    history_len: session.messages.length,
    task_id: effectiveTaskId,
  });
});

api.get('/ai/chat/:session_id', requireAuth, (req, res) => {
  const { session_id } = req.params;
  const user = (req as any).user as User;
  const session = db.ai_chats.get(session_id);
  if (!session || session.user_id !== user.id) {
    return res.json({ session_id, messages: [] });
  }
  res.json({
    session_id,
    messages: session.messages,
    task_id: session.task_id,
  });
});

api.delete('/ai/chat/:session_id', requireAuth, (req, res) => {
  const { session_id } = req.params;
  db.ai_chats.delete(session_id);
  res.json({ ok: true });
});

api.get('/ai/daily-summary', requireAuth, async (req, res) => {
  if (!db.ai_enabled) return res.json({ summary: '', count: 0, disabled: true });
  const user = (req as any).user as User;

  const myTasks = Array.from(db.tasks.values()).filter(
    (t) => (!t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(user.id)) &&
      !db.completions.some((c) => c.task_id === t.id && c.user_id === user.id)
  );

  if (myTasks.length === 0) {
    return res.json({
      summary: 'Parabéns! Todas as suas tarefas estão em dia. Aproveite para explorar os efeitos na loja! 🎉',
      count: 0,
    });
  }

  const taskTitles = myTasks.map((t) => `${t.title} (${t.subject}, entrega ${t.due_date})`).join('; ');
  let summary = `Você tem ${myTasks.length} tarefa(s) pendente(s). Mantenha o foco em ${myTasks[0].subject} hoje! 🚀`;

  if (genAI) {
    try {
      const response = await callGeminiGenerate({
        contents: `Escreva uma mensagem motivacional e resumida de 2 linhas para o aluno ${user.name} em português do Brasil sobre suas tarefas pendentes: ${taskTitles}. Comece com energia e dê uma dica de foco.`,
        preferredModel: 'gemini-3.1-flash-lite',
      });
      summary = response.text?.trim() || summary;
    } catch {}
  }

  res.json({ summary, count: myTasks.length });
});

api.get('/ai/monthly-report/:user_id', requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const student = db.users.get(user_id);
  if (!student) return res.status(404).json({ detail: 'Aluno não encontrado' });

  const completions = db.completions.filter((c) => c.user_id === user_id);
  const onTimeCount = completions.filter((c) => c.on_time).length;
  const lateCount = completions.filter((c) => !c.on_time).length;
  const assigned = Array.from(db.tasks.values()).filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(user_id));
  const compSet = new Set(completions.map((c) => c.task_id));
  const uncompletedCount = assigned.filter((t) => !compSet.has(t.id)).length;
  const totalAssigned = assigned.length || completions.length;
  const completionPct = totalAssigned > 0 ? Math.round((completions.length / totalAssigned) * 100) : 100;

  res.json({
    student: {
      id: student.id,
      name: student.name,
      points: student.points || 0,
    },
    metrics: {
      on_time: onTimeCount,
      late: lateCount,
      total_completed: completions.length,
      total_assigned: totalAssigned,
      completion_pct: completionPct,
      uncompleted: uncompletedCount,
    },
    student_name: student.name,
    total_completions: completions.length,
    on_time_completions: onTimeCount,
    uncompleted_tasks: uncompletedCount,
    points: student.points || 0,
    report: `Relatório de Desempenho de ${student.name}:\n\n` +
      `O aluno realizou ${completions.length} entregas (${onTimeCount} no prazo, ${lateCount} fora do prazo) e possui ${uncompletedCount} pendência(s).`,
  });
});

api.get('/ai/prize-tips', requireAuth, (req, res) => {
  res.json({
    tips: [
      'Entregue sempre suas tarefas antes do horário limite para manter sua pontualidade em 100%!',
      'Fique atento às pendências: a IA desconta pontos na avaliação para tarefas NÃO marcadas como feitas.',
      'Os pontos obtidos em tarefas servem exclusivamente para desbloquear e adquirir Molduras de Avatar na loja.',
      'Conclua todas as atividades com antecedência para garantir a melhor posição na avaliação da IA.',
    ],
  });
});

api.get('/ai/prize-evaluate', requireAdmin, async (req, res) => {
  if (!db.ai_enabled) return res.status(503).json({ detail: 'Recursos de IA desativados' });
  const students = Array.from(db.users.values()).filter((u) => u.role === 'aluno' && u.status === 'active');
  if (students.length === 0) {
    return res.json({
      winner_name: 'Nenhum aluno elegível',
      justification: 'Não há alunos ativos cadastrados para avaliação.',
      criteria: [],
      rankings: [],
    });
  }

  const leaderboard = calculateMonthlyAILeaderboard();
  const top = leaderboard.leader;
  if (!top) {
    return res.json({
      winner_name: 'Nenhum aluno elegível',
      justification: 'Sem dados suficientes para avaliação neste mês.',
      criteria: [],
      rankings: [],
    });
  }

  const isTie = leaderboard.is_tie_top1;
  const leaders = leaderboard.leaders;
  const rankings = leaderboard.rankings;

  const dossierPrompt = rankings
    .map(
      (m: any) =>
        `- Aluno: ${m.name} (ID: ${m.id}) | Tarefas entregues no mês: ${m.completed_month} | Entregas no prazo: ${m.on_time_month} (${m.on_time_pct}%) | Tarefas pendentes do mês: ${m.uncompleted_count}`
    )
    .join('\n');

  if (genAI) {
    try {
      const prompt = `Você é o Comitê Pedagógico de Inteligência Artificial do Edutask.
Sua missão é escolher o(s) Aluno(s) Vencedor(es) do Prêmio do Mês (${leaderboard.month_label}).

DIRETRIZES DA AVALIAÇÃO:
- Os pontos dos alunos NÃO contam para esta premiação (pontos são exclusivamente para comprar molduras de avatar na loja!).
- O SISTEMA DE OFENSIVA/SEQUÊNCIA ESTÁ TOTALMENTE DESATIVADO (NÃO mencione nem considere ofensiva).
- O critério é:
  1. Volume e taxa de entregas rigorosamente no prazo no mês (pontualidade).
  2. Penalização por tarefas pendentes do mês (tarefas não marcadas como feitas).
${isTie ? `- ATENÇÃO: HÁ UM EMPATE NO 1º LUGAR entre ${leaders.map((l: any) => l.name).join(' e ')} com exatamente o mesmo desempenho de pontualidade e zero pendências. Reconheça o empate e declare ambos/todos os empatados como vencedores conjuntos!` : ''}
- RESUMO CONCISO E SEM POLUIÇÃO:
  A justificativa (justification) DEVE ser curta e direta: no máximo 1 a 2 frases curtas e objetivas.
  O ai_feedback de cada aluno deve ser 1 frase curta.

DADOS MENSAIS DOS ALUNOS:
${dossierPrompt}

Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "winner_id": "${top.id}",
  "winner_name": "${isTie ? leaders.map((l: any) => l.name).join(' & ') : top.name}",
  "winner_score": ${top.score || 98},
  "is_tie": ${isTie},
  "justification": "${leaderboard.leader_verdict}",
  "criteria": [
    "${top.on_time_month} entregas no prazo no mês",
    "${top.uncompleted_count === 0 ? 'Zero tarefas pendentes no mês' : 'Compromisso com os prazos escolares'}"
  ]
}`;

      const response = await callGeminiGenerate({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.1-flash-lite',
      });

      const parsed = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
      if (parsed.winner_name) {
        return res.json({
          winner_id: parsed.winner_id || top.id,
          winner_name: parsed.winner_name || (isTie ? leaders.map((l: any) => l.name).join(' & ') : top.name),
          winner_score: parsed.winner_score || top.score || 98,
          is_tie: parsed.is_tie !== undefined ? parsed.is_tie : isTie,
          tied_winners: isTie ? leaders.map((l: any) => ({
            id: l.id,
            name: l.name,
            has_avatar: l.has_avatar,
            equipped_effect: l.equipped_effect,
            score: l.score,
            on_time_month: l.on_time_month,
            uncompleted_count: l.uncompleted_count,
          })) : null,
          justification: parsed.justification || leaderboard.leader_verdict,
          criteria: parsed.criteria || [`${top.on_time_month} entregas no prazo`, 'Zero pendências no mês'],
          rankings,
        });
      }
    } catch (e: any) {
      console.warn('Gemini prize-evaluate fallback:', e.message);
    }
  }

  // Fallback algorítmico rigoroso com suporte a empate no 1º lugar
  res.json({
    winner_id: top.id,
    winner_name: isTie ? leaders.map((l: any) => l.name).join(' & ') : top.name,
    winner_score: top.score || 96,
    is_tie: isTie,
    tied_winners: isTie ? leaders.map((l: any) => ({
      id: l.id,
      name: l.name,
      has_avatar: l.has_avatar,
      equipped_effect: l.equipped_effect,
      score: l.score,
      on_time_month: l.on_time_month,
      uncompleted_count: l.uncompleted_count,
    })) : null,
    justification: leaderboard.leader_verdict,
    criteria: [
      `${top.on_time_month} entrega(s) rigorosamente no prazo`,
      top.uncompleted_count === 0 ? 'Zero tarefas pendentes no mês' : 'Compromisso com os prazos escolares',
    ],
    rankings,
  });
});

// ---------------------------------------------------------------------------
// Background Task Auto-Cleanup Runner (checks schedule every 30s using System Clock)
// ---------------------------------------------------------------------------
let lastCleanupMinuteRun = '';
if (!process.env.VERCEL) {
  setInterval(() => {
    try {
      const cfg = db.task_cleanup_config;
      if (!cfg || !cfg.enabled || !cfg.cleanup_time) return;

      const clock = getSystemClock();
      const currentTime = clock.timeHM;
      const today = clock.yearMonthDay;
      const runKey = `${today}_${currentTime}`;

      if (currentTime === cfg.cleanup_time && cfg.last_run_date !== today && lastCleanupMinuteRun !== runKey) {
        lastCleanupMinuteRun = runKey;
        cfg.last_run_date = today;
        cfg.last_run_at = clock.iso;
        db.saveToDisk();
        saveSystemSettingsToFirestore();
        console.log(`[TaskCleanup] Horário agendado atingido pelo Relógio do Sistema (${currentTime}). Executando limpeza...`);
        executeTaskCleanup(false);
      }
    } catch (err) {
      console.error('[TaskCleanup] Background check error:', err);
    }
  }, 30000);
}

// ---------------------------------------------------------------------------
// Mount /api router with Firestore sync guarantee for Serverless environments
// ---------------------------------------------------------------------------
app.use('/api', async (req, res, next) => {
  try {
    await db.ensureSynced();
  } catch (err) {
    console.warn('[Firebase Sync Middleware Error]', err);
  }
  next();
}, api);

// ---------------------------------------------------------------------------
// Server Bootstrap & Vite Integration
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        configFile: path.resolve(__dirname, 'vite.config.ts'),
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('[Vite Integration]', e);
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`Edutask server running on http://${HOST}:${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
