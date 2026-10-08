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
const DETECTED_GROUPS_FILE = path.resolve(BASE_DIR, 'data/detected_whatsapp_groups.json');

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface WhatsAppGroupInfo {
  id: string;
  subject: string;
  participantsCount: number;
  desc?: string;
  detectedAt?: string;
  source?: 'sync' | 'invite' | 'message' | 'config' | 'manual';
}

export interface WhatsAppTemplatesConfig {
  task_caption?: string;
  task_photo_id?: string | null;
  announcement_caption?: string;
  announcement_photo_id?: string | null;
  tomorrow_caption?: string;
  tomorrow_photo_id?: string | null;
  group1_task_extra?: string;
  group1_announcement_extra?: string;
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
  templates?: WhatsAppTemplatesConfig;
  lastError: string | null;
  lastConnectedAt: string | null;
  hasSavedAuth?: boolean;
  isWindowActive?: boolean;
  activeUntil?: string | null;
  activatedAt?: string | null;
  remainingSeconds?: number | null;
  remainingMinutes?: number | null;
  activeDurationMinutes?: number | null;
  activeReason?: string | null;
  detectedGroupsCount?: number;
}

export interface TaskNotificationPayload {
  subject: string;
  title: string;
  due_date: string;
  points?: number;
  description: string;
  recipients_label?: string;
  group1_extra?: string; // Parte extra para o Grupo 1 (adicionada ao texto base sem modificar o texto oficial)
  group2_caption?: string;
  custom_caption_template?: string;
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
  group1_extra?: string; // Parte extra para o Grupo 1
  group2_caption?: string;
  custom_caption_template?: string;
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
  private templates: WhatsAppTemplatesConfig = {};
  private isInitializing: boolean = false;
  private reconnectTimeout: any = null;
  private keepAliveInterval: any = null;
  private activeUntil: number | null = null;
  private activatedAt: number | null = null;
  private activeReason: string | null = null;
  private detectedGroupsMap: Map<string, WhatsAppGroupInfo> = new Map();

  constructor() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    this.loadDetectedGroupsFromDisk();
  }

  private loadDetectedGroupsFromDisk() {
    try {
      if (fs.existsSync(DETECTED_GROUPS_FILE)) {
        const raw = fs.readFileSync(DETECTED_GROUPS_FILE, 'utf-8');
        const list: WhatsAppGroupInfo[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.id) {
              this.detectedGroupsMap.set(item.id, item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[WhatsApp] Erro ao carregar grupos detectados do disco:', e);
    }
  }

  private saveDetectedGroupsToDisk() {
    try {
      const dataDir = path.dirname(DETECTED_GROUPS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.detectedGroupsMap.values());
      fs.writeFileSync(DETECTED_GROUPS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[WhatsApp] Erro ao salvar grupos detectados no disco:', e);
    }
  }

  public addOrUpdateDetectedGroup(group: Partial<WhatsAppGroupInfo> & { id: string }) {
    if (!group || !group.id) return;
    const existing = this.detectedGroupsMap.get(group.id);
    const updated: WhatsAppGroupInfo = {
      id: group.id,
      subject: (group.subject || existing?.subject || 'Grupo WhatsApp').trim(),
      participantsCount: group.participantsCount !== undefined ? group.participantsCount : (existing?.participantsCount || 0),
      desc: group.desc || existing?.desc || undefined,
      detectedAt: group.detectedAt || existing?.detectedAt || new Date().toISOString(),
      source: group.source || existing?.source || 'manual',
    };
    this.detectedGroupsMap.set(group.id, updated);
    this.saveDetectedGroupsToDisk();
    return updated;
  }

  public hasSavedAuth(): boolean {
    try {
      const credsPath = path.resolve(AUTH_DIR, 'creds.json');
      return fs.existsSync(credsPath);
    } catch {
      return false;
    }
  }

  public initAutoConnect() {
    if (process.env.VERCEL) return;
    try {
      if (this.hasSavedAuth()) {
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
    templates?: WhatsAppTemplatesConfig;
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

    if (config.templates) {
      this.templates = {
        ...this.templates,
        ...config.templates,
      };
    }

    if (this.group1Jid) {
      this.addOrUpdateDetectedGroup({
        id: this.group1Jid,
        subject: this.group1Name || 'Grupo 1 (Aviso Completo)',
        source: 'config',
      });
    }
    if (this.group2Jid) {
      this.addOrUpdateDetectedGroup({
        id: this.group2Jid,
        subject: this.group2Name || 'Grupo 2 (Foto com Enunciado)',
        source: 'config',
      });
    }
  }

  public isWindowExpired(): boolean {
    if (!this.activeUntil) return false;
    return Date.now() >= this.activeUntil;
  }

  public async activateForDuration(durationMinutes: number = 20, reason: string = 'manual'): Promise<WhatsAppServiceStatus> {
    // Garante que o tempo mínimo ativo seja de pelo menos 20 minutos conforme requisito
    const validMinutes = Math.max(20, durationMinutes || 20);
    const now = Date.now();
    this.activatedAt = now;
    this.activeUntil = now + validMinutes * 60 * 1000;
    this.activeReason = reason;

    console.log(`[WhatsApp] Ativado com janela de ${validMinutes} minutos (até ${new Date(this.activeUntil).toLocaleTimeString('pt-BR')}) - Motivo: ${reason}`);

    if (this.status !== 'connected') {
      await this.connect();
    }
    return this.getStatus();
  }

  public extendActiveDuration(addMinutes: number = 20): WhatsAppServiceStatus {
    const validAdd = Math.max(5, addMinutes || 20);
    const now = Date.now();
    const currentBase = (this.activeUntil && this.activeUntil > now) ? this.activeUntil : now;
    this.activeUntil = currentBase + validAdd * 60 * 1000;
    if (!this.activatedAt) this.activatedAt = now;

    console.log(`[WhatsApp] Janela ativa estendida em +${validAdd} minutos (nova validade: ${new Date(this.activeUntil).toLocaleTimeString('pt-BR')})`);
    return this.getStatus();
  }

  public async pauseSocketKeepAuth(): Promise<WhatsAppServiceStatus> {
    console.log('[WhatsApp] Pausando conexão Baileys e preservando credenciais salvas em disco...');
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
          this.sock.end(undefined);
        } catch (e) {
          console.warn('[WhatsApp] Erro ao finalizar socket:', e);
        }
      }
    } finally {
      this.sock = null;
      this.status = 'disconnected';
      this.qrCode = null;
      this.qrImage = null;
      this.isInitializing = false;
      this.activeUntil = null;
    }
    return this.getStatus();
  }

  public getStatus(): WhatsAppServiceStatus {
    const now = Date.now();
    const isWindowActive = this.activeUntil !== null && this.activeUntil > now;
    const remainingSeconds = this.activeUntil ? Math.max(0, Math.floor((this.activeUntil - now) / 1000)) : null;
    const remainingMinutes = remainingSeconds !== null ? Math.ceil(remainingSeconds / 60) : null;
    const activeDurationMinutes = this.activatedAt ? Math.max(0, Math.round((now - this.activatedAt) / (60 * 1000))) : null;

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
      templates: this.templates,
      lastError: this.lastError,
      lastConnectedAt: this.lastConnectedAt,
      hasSavedAuth: this.hasSavedAuth(),
      isWindowActive,
      activeUntil: this.activeUntil ? new Date(this.activeUntil).toISOString() : null,
      activatedAt: this.activatedAt ? new Date(this.activatedAt).toISOString() : null,
      remainingSeconds,
      remainingMinutes,
      activeDurationMinutes,
      activeReason: this.activeReason,
      detectedGroupsCount: this.detectedGroupsMap.size,
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

          // Sincronização inicial de grupos em segundo plano
          setTimeout(async () => {
            try {
              if (this.sock && this.status === 'connected') {
                console.log('[WhatsApp] Realizando detecção automática de grupos pós-conexão...');
                await this.fetchParticipatingGroups();
              }
            } catch (syncErr) {
              console.warn('[WhatsApp] Aviso na detecção inicial de grupos:', syncErr);
            }
          }, 3500);
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

      // ---------------------------------------------------------------------------
      // Detectores automáticos de grupos em tempo real
      // ---------------------------------------------------------------------------
      sock.ev.on('groups.update', async (groupUpdates: any[]) => {
        try {
          for (const g of groupUpdates || []) {
            if (g?.id) {
              this.addOrUpdateDetectedGroup({
                id: g.id,
                subject: g.subject || undefined,
                desc: g.desc || undefined,
                participantsCount: g.participants?.length || undefined,
                source: 'sync',
              });
            }
          }
        } catch (e) {
          console.warn('[WhatsApp] Erro no evento groups.update:', e);
        }
      });

      sock.ev.on('chats.upsert', async (chats: any[]) => {
        try {
          for (const c of chats || []) {
            if (c?.id && c.id.endsWith('@g.us')) {
              this.addOrUpdateDetectedGroup({
                id: c.id,
                subject: c.name || c.subject || undefined,
                source: 'sync',
              });
            }
          }
        } catch (e) {
          console.warn('[WhatsApp] Erro no evento chats.upsert:', e);
        }
      });

      sock.ev.on('messages.upsert', async (m: any) => {
        try {
          const messages = m?.messages || [];
          for (const msg of messages) {
            const remoteJid = msg?.key?.remoteJid;
            if (!remoteJid || !remoteJid.endsWith('@g.us')) continue;

            const existing = this.detectedGroupsMap.get(remoteJid);
            const text = (
              msg?.message?.conversation ||
              msg?.message?.extendedTextMessage?.text ||
              ''
            ).trim().toLowerCase();

            // Detecta ou enriquece o grupo automaticamente
            if (!existing || !existing.subject || existing.subject === 'Grupo sem nome' || existing.subject === 'Grupo WhatsApp') {
              try {
                if (this.sock && typeof this.sock.groupMetadata === 'function') {
                  const meta = await this.sock.groupMetadata(remoteJid);
                  if (meta && meta.id) {
                    this.addOrUpdateDetectedGroup({
                      id: meta.id,
                      subject: meta.subject || 'Grupo Detectado',
                      participantsCount: meta.participants?.length || 0,
                      desc: meta.desc || undefined,
                      source: 'message',
                    });
                  }
                }
              } catch {
                this.addOrUpdateDetectedGroup({
                  id: remoteJid,
                  subject: existing?.subject || 'Grupo WhatsApp',
                  source: 'message',
                });
              }
            }

            // Responde comando amigável de verificação de ID no grupo se solicitado
            if (text === '!id' || text === '!grupo' || text === '!edutask') {
              try {
                const groupObj = this.detectedGroupsMap.get(remoteJid);
                const subj = groupObj?.subject || 'Grupo';
                const replyText = `🎓 *EduTask — Detecção de Grupo*\n\n✅ *Grupo identificado!*\n• *Nome:* ${subj}\n• *ID (JID):* \`${remoteJid}\`\n\nEste grupo já está disponível na lista de grupos do painel EduTask.`;
                await this.sendMessage(remoteJid, replyText);
              } catch (replyErr) {
                console.warn('[WhatsApp] Aviso ao responder !id no grupo:', replyErr);
              }
            }
          }
        } catch (e) {
          console.warn('[WhatsApp] Erro no evento messages.upsert:', e);
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

  public getDetectedGroups(): WhatsAppGroupInfo[] {
    if (this.detectedGroupsMap.size === 0) {
      this.loadDetectedGroupsFromDisk();
    }
    if (this.group1Jid && !this.detectedGroupsMap.has(this.group1Jid)) {
      this.addOrUpdateDetectedGroup({
        id: this.group1Jid,
        subject: this.group1Name || 'Grupo 1 (Configurado)',
        source: 'config',
      });
    }
    if (this.group2Jid && !this.detectedGroupsMap.has(this.group2Jid)) {
      this.addOrUpdateDetectedGroup({
        id: this.group2Jid,
        subject: this.group2Name || 'Grupo 2 (Configurado)',
        source: 'config',
      });
    }
    const list = Array.from(this.detectedGroupsMap.values());
    list.sort((a, b) => (a.subject || '').localeCompare(b.subject || '', 'pt-BR'));
    return list;
  }

  public async fetchParticipatingGroups(): Promise<WhatsAppGroupInfo[]> {
    if (this.detectedGroupsMap.size === 0) {
      this.loadDetectedGroupsFromDisk();
    }

    if (this.status === 'connected' && this.sock) {
      try {
        console.log('[WhatsApp] Consultando grupos participantes do Baileys...');
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite excedido na consulta de grupos ao WhatsApp')), 15000)
        );
        const fetchPromise = this.sock.groupFetchAllParticipating();
        const groups: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (groups && typeof groups === 'object') {
          for (const g of Object.values(groups) as any[]) {
            if (g && g.id) {
              this.addOrUpdateDetectedGroup({
                id: g.id,
                subject: g.subject || 'Grupo sem nome',
                participantsCount: g.participants?.length || 0,
                desc: typeof g.desc === 'string' ? g.desc : undefined,
                source: 'sync',
              });
            }
          }
          this.saveDetectedGroupsToDisk();
          console.log(`[WhatsApp] Sucesso: ${Object.keys(groups).length} grupo(s) participantes sincronizados.`);
        }
      } catch (err: any) {
        console.warn('[WhatsApp] Aviso ao consultar grupos via API:', err?.message || err);
      }
    }

    return this.getDetectedGroups();
  }

  public async detectGroupByInput(rawInput: string): Promise<{
    ok: boolean;
    group?: WhatsAppGroupInfo;
    error?: string;
    isInvite?: boolean;
  }> {
    if (this.status !== 'connected' || !this.sock) {
      return { ok: false, error: 'WhatsApp não está conectado. Conecte pelo QR Code primeiro.' };
    }
    const input = (rawInput || '').trim();
    if (!input) {
      return { ok: false, error: 'Informe um link de convite (ex: https://chat.whatsapp.com/...) ou o ID do grupo.' };
    }

    // 1. Detecção por link de convite ou código de convite
    const inviteMatch = input.match(/(?:chat\.whatsapp\.com\/|chat\.whatsapp\.com\/invite\/)?([A-Za-z0-9_-]{18,26})/i);
    const isExplicitInvite = input.includes('chat.whatsapp.com') || (inviteMatch && !input.includes('@') && input.length >= 18 && input.length <= 30);

    if (isExplicitInvite) {
      const code = inviteMatch ? inviteMatch[1] : input.replace(/^https?:\/\/chat\.whatsapp\.com\//i, '').trim();
      try {
        console.log(`[WhatsApp] Consultando informações do grupo pelo convite: ${code}`);
        const info = await this.sock.groupGetInviteInfo(code);
        if (info && info.id) {
          const groupJid = info.id.includes('@') ? info.id : `${info.id}@g.us`;
          const groupItem: WhatsAppGroupInfo = {
            id: groupJid,
            subject: (info.subject || 'Grupo via Convite').trim(),
            participantsCount: info.size || info.participants?.length || 0,
            desc: typeof info.desc === 'string' ? info.desc : undefined,
            source: 'invite',
            detectedAt: new Date().toISOString(),
          };
          this.addOrUpdateDetectedGroup(groupItem);
          return { ok: true, group: groupItem, isInvite: true };
        }
      } catch (inviteErr: any) {
        console.warn(`[WhatsApp] Falha ao consultar link de convite (${code}):`, inviteErr?.message || inviteErr);
      }
    }

    // 2. Detecção por JID ou ID numérico (ex: 12036302847291823@g.us)
    let candidateJid = input;
    if (!candidateJid.includes('@')) {
      const digitsOnly = candidateJid.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 10) {
        candidateJid = `${digitsOnly}@g.us`;
      }
    }

    if (candidateJid.endsWith('@g.us')) {
      try {
        console.log(`[WhatsApp] Consultando metadados do grupo pelo JID: ${candidateJid}`);
        const meta = await this.sock.groupMetadata(candidateJid);
        if (meta && meta.id) {
          const groupItem: WhatsAppGroupInfo = {
            id: meta.id,
            subject: (meta.subject || 'Grupo WhatsApp').trim(),
            participantsCount: meta.participants?.length || 0,
            desc: typeof meta.desc === 'string' ? meta.desc : undefined,
            source: 'manual',
            detectedAt: new Date().toISOString(),
          };
          this.addOrUpdateDetectedGroup(groupItem);
          return { ok: true, group: groupItem };
        }
      } catch (metaErr: any) {
        console.warn(`[WhatsApp] Falha ao consultar metadados do JID (${candidateJid}):`, metaErr?.message || metaErr);
      }
    }

    // 3. Fallback: verificar se já constava nos grupos detectados em memória/disco
    const cached = this.detectedGroupsMap.get(input) || this.detectedGroupsMap.get(candidateJid);
    if (cached) {
      return { ok: true, group: cached };
    }

    return {
      ok: false,
      error: 'Não foi possível detectar o grupo. Verifique se o link/ID é válido ou envie qualquer mensagem no grupo pelo WhatsApp para auto-detecção.',
    };
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
        const baseMessageG1 =
          `📚 *NOVA TAREFA NO EDUTASK*\n\n` +
          `📖 *Matéria:* ${task.subject}\n` +
          `📝 *Título:* ${task.title}\n` +
          `📅 *Data de Entrega:* ${formattedDate}\n` +
          `🎁 *Pontos:* ${task.points} pts\n` +
          `${recipients}` +
          `\n📋 *Descrição / Orientações:*\n${task.description}\n`;

        // O texto completo acima NUNCA é modificado; apenas a parte extra pré-pronta/configurada é adicionada
        let extraSectionG1 = '';
        const rawExtra = (task.group1_extra !== undefined && task.group1_extra !== null
          ? task.group1_extra
          : (this.templates?.group1_task_extra || '')).trim();

        if (rawExtra) {
          const formattedExtra = rawExtra
            .replace(/\{materia\}/gi, task.subject || '')
            .replace(/\{titulo\}/gi, task.title || '')
            .replace(/\{data_entrega\}/gi, formattedDate)
            .replace(/\{pontos\}/gi, String(task.points || 0))
            .replace(/\{destinatarios\}/gi, task.recipients_label || 'Todos os alunos');
          extraSectionG1 = `\n${formattedExtra}\n`;
        }

        const messageG1 = `${baseMessageG1}${extraSectionG1}\n👉 _Acesse o Edutask para responder e visualizar os detalhes!_`;

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
        let captionG2 = '';
        if (task.group2_caption !== undefined && task.group2_caption !== null && task.group2_caption.trim() !== '') {
          // Enunciado gerado a partir do modelo programado ou alterado pelo usuário no diálogo
          captionG2 = task.group2_caption
            .replace(/\{materia\}/gi, task.subject || '')
            .replace(/\{subject\}/gi, task.subject || '')
            .replace(/\{titulo\}/gi, task.title || '')
            .replace(/\{title\}/gi, task.title || '')
            .replace(/\{data_entrega\}/gi, formattedDate)
            .replace(/\{due_date\}/gi, formattedDate)
            .replace(/\{pontos\}/gi, String(task.points || 0))
            .replace(/\{points\}/gi, String(task.points || 0))
            .replace(/\{destinatarios\}/gi, task.recipients_label || 'Todos os alunos')
            .replace(/\{recipients\}/gi, task.recipients_label || 'Todos os alunos')
            .replace(/\{descricao\}/gi, task.description || '')
            .replace(/\{enunciado\}/gi, task.description || '')
            .replace(/\{description\}/gi, task.description || '');
        } else {
          const taskTemplate = (
            task.custom_caption_template ||
            this.templates?.task_caption ||
            '📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}'
          ).trim();

          captionG2 = taskTemplate
            .replace(/\{materia\}/gi, task.subject || '')
            .replace(/\{subject\}/gi, task.subject || '')
            .replace(/\{titulo\}/gi, task.title || '')
            .replace(/\{title\}/gi, task.title || '')
            .replace(/\{data_entrega\}/gi, formattedDate)
            .replace(/\{due_date\}/gi, formattedDate)
            .replace(/\{pontos\}/gi, String(task.points || 0))
            .replace(/\{points\}/gi, String(task.points || 0))
            .replace(/\{destinatarios\}/gi, task.recipients_label || 'Todos os alunos')
            .replace(/\{recipients\}/gi, task.recipients_label || 'Todos os alunos')
            .replace(/\{descricao\}/gi, task.description || '')
            .replace(/\{enunciado\}/gi, task.description || '')
            .replace(/\{description\}/gi, task.description || '');
        }

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
        const baseMsgG1 =
          `📢 *NOVO AVISO NO EDUTASK*\n\n` +
          `📌 *${ann.title}*\n` +
          `📅 *Data:* ${formattedDate}\n` +
          `${recipients}` +
          `\n💬 *Mensagem:*\n${ann.message}\n`;

        // Parte extra para o Grupo 1 (o texto completo acima NUNCA é modificado; apenas a parte extra configurada é adicionada)
        let extraSectionG1 = '';
        const rawExtra = (ann.group1_extra !== undefined && ann.group1_extra !== null
          ? ann.group1_extra
          : (this.templates?.group1_announcement_extra || '')).trim();

        if (rawExtra) {
          const formattedExtra = rawExtra
            .replace(/\{titulo\}/gi, ann.title || '')
            .replace(/\{data\}/gi, formattedDate)
            .replace(/\{destinatarios\}/gi, ann.recipients_label || 'Todos os alunos');
          extraSectionG1 = `\n${formattedExtra}\n`;
        }

        const msgG1 = `${baseMsgG1}${extraSectionG1}\n👉 _Acesse o Edutask para interagir e responder aos comentários!_`;

        // Grupo 1 SEMPRE recebe exclusivamente mensagem em texto (fotos programadas são apenas para o Grupo 2)
        await this.sock.sendMessage(target1, { text: msgG1 });
        results.group1Sent = true;
      } catch (err: any) {
        results.errors.push(`Grupo 1: ${err?.message || err}`);
      }
    }

    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes('@') ? this.group2Jid : `${this.group2Jid}@g.us`;
        let msgG2 = '';

        if (ann.group2_caption !== undefined && ann.group2_caption !== null && ann.group2_caption.trim() !== '') {
          // Enunciado gerado a partir do modelo programado ou alterado pelo usuário no diálogo
          msgG2 = ann.group2_caption
            .replace(/\{titulo\}/gi, ann.title || '')
            .replace(/\{title\}/gi, ann.title || '')
            .replace(/\{data\}/gi, formattedDate)
            .replace(/\{created_at\}/gi, formattedDate)
            .replace(/\{destinatarios\}/gi, ann.recipients_label || 'Todos os alunos')
            .replace(/\{recipients\}/gi, ann.recipients_label || 'Todos os alunos')
            .replace(/\{mensagem\}/gi, ann.message || '')
            .replace(/\{comunicado\}/gi, ann.message || '')
            .replace(/\{message\}/gi, ann.message || '');
        } else {
          const annTemplate = (
            ann.custom_caption_template ||
            this.templates?.announcement_caption ||
            '📣 *{titulo}*\n\n{mensagem}'
          ).trim();

          msgG2 = annTemplate
            .replace(/\{titulo\}/gi, ann.title || '')
            .replace(/\{title\}/gi, ann.title || '')
            .replace(/\{data\}/gi, formattedDate)
            .replace(/\{created_at\}/gi, formattedDate)
            .replace(/\{destinatarios\}/gi, ann.recipients_label || 'Todos os alunos')
            .replace(/\{recipients\}/gi, ann.recipients_label || 'Todos os alunos')
            .replace(/\{mensagem\}/gi, ann.message || '')
            .replace(/\{comunicado\}/gi, ann.message || '')
            .replace(/\{message\}/gi, ann.message || '');
        }

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
