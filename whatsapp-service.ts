import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import pino from 'pino';
import QRCode from 'qrcode';

type WASocket = any;
type ConnectionState = any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = process.env.VERCEL || process.env.NODE_ENV === 'production' ? os.tmpdir() : __dirname;
const AUTH_DIR = path.resolve(BASE_DIR, 'data/baileys_auth');

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface WhatsAppGroupInfo {
  id: string;
  subject: string;
  participantsCount: number;
}

export interface WhatsAppServiceStatus {
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  qrImage: string | null;
  user: {
    id: string;
    name: string;
    phone: string;
  } | null;
  group1Jid: string;
  group1Name: string;
  group2Jid: string;
  group2Name: string;
  enabled: boolean;
  lastError: string | null;
  lastConnectedAt: string | null;
}

export interface TaskNotificationPayload {
  subject: string;
  title: string;
  due_date: string;
  points: number;
  description: string;
  recipients_label?: string;
  group2_caption?: string;
  photo_buffer?: Buffer | null;
  photo_content_type?: string | null;
  group1_enabled?: boolean;
  group2_enabled?: boolean;
}

export interface AnnouncementNotificationPayload {
  title: string;
  message: string;
  created_at?: string;
  recipients_label?: string;
  group2_caption?: string;
  photo_buffer?: Buffer | null;
  photo_content_type?: string | null;
  group1_enabled?: boolean;
  group2_enabled?: boolean;
}

export interface TomorrowReminderPayload {
  tomorrow_date_br: string;
  tasks: Array<{
    id: string;
    title: string;
    subject: string;
    points: number;
    description: string;
  }>;
  custom_caption_template?: string;
  photo_buffer?: Buffer | null;
  photo_content_type?: string | null;
  group1_enabled?: boolean;
  group2_enabled?: boolean;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WhatsAppConnectionStatus = 'disconnected';
  private qrCode: string | null = null;
  private qrImage: string | null = null;
  private user: { id: string; name: string; phone: string } | null = null;
  private lastError: string | null = null;
  private lastConnectedAt: string | null = null;
  private group1Jid: string = '';
  private group1Name: string = '';
  private group2Jid: string = '';
  private group2Name: string = '';
  private enabled: boolean = true;
  private isInitializing: boolean = false;
  private reconnectTimeout: any = null;
  private keepAliveInterval: any = null;

  constructor() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  public initAutoConnect() {
    if (process.env.VERCEL) return;
    try {
      const credsPath = path.resolve(AUTH_DIR, 'creds.json');
      if (fs.existsSync(credsPath)) {
        console.log('[WhatsApp] Credenciais encontradas em disco. Iniciando conexão persistente...');
        this.connect().catch((err) => {
          console.warn('[WhatsApp] Falha ao auto-reconectar no início:', err);
        });
      }
    } catch (e) {
      console.warn('[WhatsApp] Erro ao verificar credenciais salvas:', e);
    }
  }

  public setConfig(config: {
    group1Jid?: string;
    group1Name?: string;
    group2Jid?: string;
    group2Name?: string;
    group_1_jid?: string;
    group_1_name?: string;
    group_2_jid?: string;
    group_2_name?: string;
    group_jid?: string;
    enabled?: boolean;
  }) {
    if (config.group1Jid !== undefined) this.group1Jid = (config.group1Jid || '').trim();
    else if (config.group_1_jid !== undefined) this.group1Jid = (config.group_1_jid || '').trim();
    else if (config.group_jid !== undefined && !this.group1Jid) this.group1Jid = (config.group_jid || '').trim();

    if (config.group1Name !== undefined) this.group1Name = (config.group1Name || '').trim();
    else if (config.group_1_name !== undefined) this.group1Name = (config.group_1_name || '').trim();

    if (config.group2Jid !== undefined) this.group2Jid = (config.group2Jid || '').trim();
    else if (config.group_2_jid !== undefined) this.group2Jid = (config.group_2_jid || '').trim();

    if (config.group2Name !== undefined) this.group2Name = (config.group2Name || '').trim();
    else if (config.group_2_name !== undefined) this.group2Name = (config.group_2_name || '').trim();

    if (config.enabled !== undefined) this.enabled = Boolean(config.enabled);
  }

  public getStatus(): WhatsAppServiceStatus {
    return {
      status: this.status,
      qrCode: this.qrCode,
      qrImage: this.qrImage,
      user: this.user,
      group1Jid: this.group1Jid,
      group1Name: this.group1Name,
      group2Jid: this.group2Jid,
      group2Name: this.group2Name,
      enabled: this.enabled,
      lastError: this.lastError,
      lastConnectedAt: this.lastConnectedAt,
    };
  }

  public async connect(): Promise<WhatsAppServiceStatus> {
    if (process.env.VERCEL) {
      this.status = 'disconnected';
      this.lastError = 'WhatsApp não é executado no ambiente serverless Vercel.';
      return this.getStatus();
    }
    if (this.status === 'connected' && this.sock) {
      return this.getStatus();
    }
    if (this.isInitializing) {
      return this.getStatus();
    }
    this.isInitializing = true;
    this.status = 'connecting';
    this.lastError = null;

    try {
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const logger = pino({ level: 'silent' });

      const sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers ? Browsers.macOS('Desktop') : ['Mac OS', 'Desktop', '14.0.0'],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          try {
            this.qrImage = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            this.status = 'qr_ready';
            this.isInitializing = false;
          } catch (err: any) {
            console.error('[WhatsApp] Erro ao gerar imagem do QR Code:', err);
            this.lastError = 'Erro ao processar imagem do QR Code';
          }
        }

        if (connection === 'connecting') {
          if (this.status !== 'qr_ready') {
            this.status = 'connecting';
          }
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          this.qrImage = null;
          this.lastError = null;
          this.lastConnectedAt = new Date().toISOString();
          this.isInitializing = false;

          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }

          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
          }

          this.keepAliveInterval = setInterval(async () => {
            try {
              if (this.sock && this.status === 'connected') {
                await this.sock.sendPresenceUpdate('available');
              }
            } catch (e) {
              console.warn('[WhatsApp] Keepalive heartbeat notice:', e);
            }
          }, 35000);

          const rawId = sock.user?.id || '';
          const phone = rawId.split(':')[0] || rawId.split('@')[0] || '';
          this.user = {
            id: rawId,
            name: sock.user?.name || `WhatsApp (+${phone})`,
            phone,
          };
          console.log(`[WhatsApp] Baileys conectado com sucesso para ${phone}`);
        }

        if (connection === 'close') {
          this.isInitializing = false;
          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
          }

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[WhatsApp] Conexão encerrada. Código: ${statusCode}, auto-reconectar: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.status = 'disconnected';
            this.qrCode = null;
            this.qrImage = null;
            this.user = null;
            this.lastError = 'Desconectado do WhatsApp. É necessário ler o QR Code novamente.';
            this.clearAuthFolder();
            this.sock = null;
          } else {
            this.status = 'connecting';
            this.lastError = 'Reconectando ao WhatsApp...';
            this.sock = null;
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              console.log('[WhatsApp] Tentando auto-reconexão...');
              this.connect().catch((err) => {
                console.warn('[WhatsApp] Erro na tentativa de reconexão:', err);
              });
            }, 4000);
          }
        }
      });

      return this.getStatus();
    } catch (err: any) {
      this.isInitializing = false;
      this.status = 'disconnected';
      this.lastError = err?.message || 'Falha ao iniciar Baileys';
      console.error('[WhatsApp] Falha ao inicializar socket:', err);
      return this.getStatus();
    }
  }

  public async disconnect(): Promise<WhatsAppServiceStatus> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch {
          this.sock.end(undefined);
        }
      }
    } catch (e) {
      console.warn('[WhatsApp] Erro durante disconnect:', e);
    } finally {
      this.sock = null;
      this.status = 'disconnected';
      this.qrCode = null;
      this.qrImage = null;
      this.user = null;
      this.isInitializing = false;
      this.lastError = null;
      this.clearAuthFolder();
    }
    return this.getStatus();
  }

  public async fetchParticipatingGroups(): Promise<WhatsAppGroupInfo[]> {
    if (this.status !== 'connected' || !this.sock) {
      return [];
    }
    try {
      const groups = await this.sock.groupFetchAllParticipating();
      return Object.values(groups).map((g: any) => ({
        id: g.id,
        subject: g.subject || 'Grupo sem nome',
        participantsCount: g.participants?.length || 0,
      }));
    } catch (err: any) {
      console.error('[WhatsApp] Erro ao buscar grupos participantes:', err);
      return [];
    }
  }

  public async sendMessage(jid: string, text: string): Promise<boolean> {
    if (this.status !== 'connected' || !this.sock || !jid) {
      return false;
    }
    try {
      const targetJid = jid.includes('@') ? jid : `${jid}@g.us`;
      await this.sock.sendMessage(targetJid, { text });
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Falha ao enviar mensagem para ${jid}:`, err);
      return false;
    }
  }

  public async sendImage(jid: string, imageBuffer: Buffer, caption = '', mimetype = 'image/png'): Promise<boolean> {
    if (this.status !== 'connected' || !this.sock || !jid) {
      return false;
    }
    try {
      const targetJid = jid.includes('@') ? jid : `${jid}@g.us`;
      await this.sock.sendMessage(targetJid, {
        image: imageBuffer,
        caption: caption || undefined,
        mimetype,
      });
      console.log(`[WhatsApp] Imagem enviada para ${targetJid}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Falha ao enviar imagem para ${jid}:`, err);
      return false;
    }
  }

  public async sendTaskNotifications(task: TaskNotificationPayload): Promise<{
    group1Sent: boolean;
    group2Sent: boolean;
    errors: string[];
  }> {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: [] as string[],
    };

    if (this.status !== 'connected' || !this.sock) {
      results.errors.push('WhatsApp não está conectado.');
      return results;
    }
    if (!this.enabled) {
      return results;
    }

    const sendG1 = task.group1_enabled !== false;
    const sendG2 = task.group2_enabled !== false;

    const formatDate = (isoStr: string) => {
      try {
        const [y, m, d] = (isoStr || '').split('-');
        if (y && m && d) return `${d}/${m}/${y}`;
        return isoStr;
      } catch {
        return isoStr;
      }
    };

    const formattedDate = formatDate(task.due_date);

    if (this.group1Jid && sendG1) {
      try {
        const target1 = this.group1Jid.includes('@') ? this.group1Jid : `${this.group1Jid}@g.us`;
        const recipients = task.recipients_label ? `👥 *Destinatários:* ${task.recipients_label}\n` : '';
        const messageG1 =
          `📚 *NOVA TAREFA NO EDUTASK*\n\n` +
          `📖 *Matéria:* ${task.subject}\n` +
          `📝 *Título:* ${task.title}\n` +
          `📅 *Data de Entrega:* ${formattedDate}\n` +
          `🎁 *Pontos:* ${task.points} pts\n` +
          `${recipients}` +
          `\n📋 *Descrição / Orientações:*\n${task.description}\n\n` +
          `👉 _Acesse o Edutask para responder e visualizar os detalhes!_`;

        await this.sock.sendMessage(target1, { text: messageG1 });
        results.group1Sent = true;
        console.log(`[WhatsApp] Notificação completa enviada para Grupo 1 (${this.group1Jid})`);
      } catch (err: any) {
        const errMsg = `Falha no Grupo 1: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }

    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes('@') ? this.group2Jid : `${this.group2Jid}@g.us`;
        const statementText = (task.group2_caption || task.description || '').trim();
        const captionG2 =
          `📚 *${task.subject} — ${task.title}*\n` +
          `📅 *Entrega:* ${formattedDate}\n\n` +
          `📝 *Enunciado:*\n${statementText}`;

        if (task.photo_buffer && task.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: task.photo_buffer,
            caption: captionG2,
            mimetype: task.photo_content_type || 'image/jpeg',
          });
          console.log(`[WhatsApp] Foto com enunciado enviada para Grupo 2 (${this.group2Jid})`);
        } else {
          await this.sock.sendMessage(target2, { text: captionG2 });
          console.log(`[WhatsApp] Enunciado em texto enviado para Grupo 2 (${this.group2Jid})`);
        }
        results.group2Sent = true;
      } catch (err: any) {
        const errMsg = `Falha no Grupo 2: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }

    return results;
  }

  public async sendAnnouncementNotifications(ann: AnnouncementNotificationPayload): Promise<{
    group1Sent: boolean;
    group2Sent: boolean;
    errors: string[];
  }> {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: [] as string[],
    };

    if (this.status !== 'connected' || !this.sock) {
      results.errors.push('WhatsApp não está conectado.');
      return results;
    }
    if (!this.enabled) {
      return results;
    }

    const sendG1 = ann.group1_enabled !== false;
    const sendG2 = ann.group2_enabled !== false;

    const formatDate = (isoStr?: string) => {
      try {
        if (!isoStr) return new Date().toLocaleDateString('pt-BR');
        return new Date(isoStr).toLocaleDateString('pt-BR');
      } catch {
        return '';
      }
    };

    const formattedDate = formatDate(ann.created_at);

    if (this.group1Jid && sendG1) {
      try {
        const target1 = this.group1Jid.includes('@') ? this.group1Jid : `${this.group1Jid}@g.us`;
        const recipients = ann.recipients_label ? `👥 *Destinatários:* ${ann.recipients_label}\n` : '';
        const msgG1 =
          `📢 *NOVO AVISO NO EDUTASK*\n\n` +
          `📌 *${ann.title}*\n` +
          `📅 *Data:* ${formattedDate}\n` +
          `${recipients}` +
          `\n💬 *Mensagem:*\n${ann.message}\n\n` +
          `👉 _Acesse o Edutask para interagir e responder aos comentários!_`;

        await this.sock.sendMessage(target1, { text: msgG1 });
        results.group1Sent = true;
      } catch (err: any) {
        results.errors.push(`Grupo 1: ${err?.message || err}`);
      }
    }

    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes('@') ? this.group2Jid : `${this.group2Jid}@g.us`;
        const statementText = (ann.group2_caption || ann.message || '').trim();
        const msgG2 = `📢 *${ann.title}*\n\n${statementText}`;

        if (ann.photo_buffer && ann.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: ann.photo_buffer,
            caption: msgG2,
            mimetype: ann.photo_content_type || 'image/jpeg',
          });
        } else {
          await this.sock.sendMessage(target2, { text: msgG2 });
        }
        results.group2Sent = true;
      } catch (err: any) {
        results.errors.push(`Grupo 2: ${err?.message || err}`);
      }
    }

    return results;
  }

  public async sendTomorrowReminder(payload: TomorrowReminderPayload): Promise<{
    group1Sent: boolean;
    group2Sent: boolean;
    errors: string[];
  }> {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: [] as string[],
    };

    if (this.status !== 'connected' || !this.sock) {
      results.errors.push('WhatsApp não está conectado.');
      return results;
    }
    if (!this.enabled) {
      return results;
    }

    const sendG1 = payload.group1_enabled !== false;
    const sendG2 = payload.group2_enabled !== false;
    const tasks = payload.tasks || [];

    if (tasks.length === 0) {
      return results;
    }

    if (this.group1Jid && sendG1) {
      try {
        const target1 = this.group1Jid.includes('@') ? this.group1Jid : `${this.group1Jid}@g.us`;
        const tasksListG1 = tasks
          .map(
            (t, idx) =>
              `🔹 *${idx + 1}. [${t.subject}] ${t.title}*\n` +
              `   🎁 *Pontos:* ${t.points} pts\n` +
              (t.description
                ? `   📋 _${t.description.length > 90 ? t.description.slice(0, 90) + '...' : t.description}_\n`
                : '')
          )
          .join('\n');

        const msgG1 =
          `🚨 *LEMBRETE DIÁRIO DE TAREFAS*\n\n` +
          `📅 *Entrega Amanhã:* ${payload.tomorrow_date_br}\n` +
          `📚 *Total de Tarefas:* ${tasks.length}\n\n` +
          `${tasksListG1}\n` +
          `👉 _Acessem o Edutask para conferir as questões e enviar suas respostas no prazo!_`;

        await this.sock.sendMessage(target1, { text: msgG1 });
        results.group1Sent = true;
        console.log(`[WhatsApp] Lembrete de amanhã enviado com sucesso para Grupo 1 (${this.group1Jid})`);
      } catch (err: any) {
        const errMsg = `Falha no Grupo 1: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }

    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes('@') ? this.group2Jid : `${this.group2Jid}@g.us`;
        const tasksListG2 = tasks.map((t) => `• [${t.subject}] ${t.title}`).join('\n');
        let captionG2 = (
          payload.custom_caption_template ||
          `🚨 *LEMBRETE: TAREFAS PARA AMANHÃ ({data_amanha})*\n\nAtenção turma! Temos {total_tarefas} tarefa(s) marcadas para amanhã:\n\n{lista_tarefas}\n\n👉 Acessem o Edutask para responder!`
        ).trim();

        captionG2 = captionG2
          .replace(/\{data_amanha\}/g, payload.tomorrow_date_br)
          .replace(/\{total_tarefas\}/g, String(tasks.length))
          .replace(/\{lista_tarefas\}/g, tasksListG2);

        if (payload.photo_buffer && payload.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: payload.photo_buffer,
            caption: captionG2,
            mimetype: payload.photo_content_type || 'image/jpeg',
          });
          console.log(`[WhatsApp] Foto com lembrete de amanhã enviada para Grupo 2 (${this.group2Jid})`);
        } else {
          await this.sock.sendMessage(target2, { text: captionG2 });
          console.log(`[WhatsApp] Texto com lembrete de amanhã enviado para Grupo 2 (${this.group2Jid})`);
        }
        results.group2Sent = true;
      } catch (err: any) {
        const errMsg = `Falha no Grupo 2: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }

    return results;
  }

  private clearAuthFolder() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[WhatsApp] Erro ao limpar pasta de autenticação:', e);
    }
  }
}

export const whatsappService = new WhatsAppService();
