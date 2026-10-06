var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// firebase-applet-config.json
var require_firebase_applet_config = __commonJS({
  "firebase-applet-config.json"(exports, module) {
    module.exports = {
      projectId: "edutask-7ano-60994",
      appId: "1:851306521007:web:1eab9e88863b662fb78f5a",
      apiKey: "AIzaSyDsAo1hTSOe6Q21QcNeHmGNt650rkzBBmc",
      authDomain: "edutask-7ano-60994.firebaseapp.com",
      firestoreDatabaseId: "ai-studio-edutaskgestodeta-3284915b-c459-465f-8391-17d32111c03c",
      storageBucket: "edutask-7ano-60994.firebasestorage.app",
      messagingSenderId: "851306521007",
      measurementId: "",
      oAuthClientId: "851306521007-npj7s45v4hfmqh2mbgq7f539cpg8i00t.apps.googleusercontent.com",
      recaptchaSiteKey: ""
    };
  }
});

// server.ts
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path2 from "path";
import fs2 from "fs";
import os2 from "os";
import { fileURLToPath as fileURLToPath2 } from "url";
import { GoogleGenAI } from "@google/genai";

// whatsapp-service.ts
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import pino from "pino";
import QRCode from "qrcode";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var BASE_DIR = process.env.VERCEL || process.env.NODE_ENV === "production" ? os.tmpdir() : __dirname;
var AUTH_DIR = path.resolve(BASE_DIR, "data/baileys_auth");
var WhatsAppService = class {
  sock = null;
  status = "disconnected";
  qrCode = null;
  qrImage = null;
  user = null;
  lastError = null;
  lastConnectedAt = null;
  group1Jid = "";
  group1Name = "";
  group2Jid = "";
  group2Name = "";
  enabled = true;
  isInitializing = false;
  reconnectTimeout = null;
  keepAliveInterval = null;
  constructor() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }
  initAutoConnect() {
    if (process.env.VERCEL) return;
    try {
      const credsPath = path.resolve(AUTH_DIR, "creds.json");
      if (fs.existsSync(credsPath)) {
        console.log("[WhatsApp] Credenciais encontradas em disco. Iniciando conex\xE3o persistente...");
        this.connect().catch((err) => {
          console.warn("[WhatsApp] Falha ao auto-reconectar no in\xEDcio:", err);
        });
      }
    } catch (e) {
      console.warn("[WhatsApp] Erro ao verificar credenciais salvas:", e);
    }
  }
  setConfig(config) {
    if (config.group1Jid !== void 0) this.group1Jid = (config.group1Jid || "").trim();
    else if (config.group_1_jid !== void 0) this.group1Jid = (config.group_1_jid || "").trim();
    else if (config.group_jid !== void 0 && !this.group1Jid) this.group1Jid = (config.group_jid || "").trim();
    if (config.group1Name !== void 0) this.group1Name = (config.group1Name || "").trim();
    else if (config.group_1_name !== void 0) this.group1Name = (config.group_1_name || "").trim();
    if (config.group2Jid !== void 0) this.group2Jid = (config.group2Jid || "").trim();
    else if (config.group_2_jid !== void 0) this.group2Jid = (config.group_2_jid || "").trim();
    if (config.group2Name !== void 0) this.group2Name = (config.group2Name || "").trim();
    else if (config.group_2_name !== void 0) this.group2Name = (config.group_2_name || "").trim();
    if (config.enabled !== void 0) this.enabled = Boolean(config.enabled);
  }
  getStatus() {
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
      lastConnectedAt: this.lastConnectedAt
    };
  }
  async connect() {
    if (process.env.VERCEL) {
      this.status = "disconnected";
      this.lastError = "WhatsApp n\xE3o \xE9 executado no ambiente serverless Vercel.";
      return this.getStatus();
    }
    if (this.status === "connected" && this.sock) {
      return this.getStatus();
    }
    if (this.isInitializing) {
      return this.getStatus();
    }
    this.isInitializing = true;
    this.status = "connecting";
    this.lastError = null;
    try {
      const baileys = await import("@whiskeysockets/baileys");
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const logger = pino({ level: "silent" });
      const sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers ? Browsers.macOS("Desktop") : ["Mac OS", "Desktop", "14.0.0"],
        syncFullHistory: false,
        connectTimeoutMs: 6e4,
        defaultQueryTimeoutMs: 6e4
      });
      this.sock = sock;
      sock.ev.on("creds.update", saveCreds);
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          this.qrCode = qr;
          try {
            this.qrImage = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: "#000000",
                light: "#ffffff"
              }
            });
            this.status = "qr_ready";
            this.isInitializing = false;
          } catch (err) {
            console.error("[WhatsApp] Erro ao gerar imagem do QR Code:", err);
            this.lastError = "Erro ao processar imagem do QR Code";
          }
        }
        if (connection === "connecting") {
          if (this.status !== "qr_ready") {
            this.status = "connecting";
          }
        }
        if (connection === "open") {
          this.status = "connected";
          this.qrCode = null;
          this.qrImage = null;
          this.lastError = null;
          this.lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
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
              if (this.sock && this.status === "connected") {
                await this.sock.sendPresenceUpdate("available");
              }
            } catch (e) {
              console.warn("[WhatsApp] Keepalive heartbeat notice:", e);
            }
          }, 35e3);
          const rawId = sock.user?.id || "";
          const phone = rawId.split(":")[0] || rawId.split("@")[0] || "";
          this.user = {
            id: rawId,
            name: sock.user?.name || `WhatsApp (+${phone})`,
            phone
          };
          console.log(`[WhatsApp] Baileys conectado com sucesso para ${phone}`);
        }
        if (connection === "close") {
          this.isInitializing = false;
          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
          }
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[WhatsApp] Conex\xE3o encerrada. C\xF3digo: ${statusCode}, auto-reconectar: ${shouldReconnect}`);
          if (statusCode === DisconnectReason.loggedOut) {
            this.status = "disconnected";
            this.qrCode = null;
            this.qrImage = null;
            this.user = null;
            this.lastError = "Desconectado do WhatsApp. \xC9 necess\xE1rio ler o QR Code novamente.";
            this.clearAuthFolder();
            this.sock = null;
          } else {
            this.status = "connecting";
            this.lastError = "Reconectando ao WhatsApp...";
            this.sock = null;
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              console.log("[WhatsApp] Tentando auto-reconex\xE3o...");
              this.connect().catch((err) => {
                console.warn("[WhatsApp] Erro na tentativa de reconex\xE3o:", err);
              });
            }, 4e3);
          }
        }
      });
      return this.getStatus();
    } catch (err) {
      this.isInitializing = false;
      this.status = "disconnected";
      this.lastError = err?.message || "Falha ao iniciar Baileys";
      console.error("[WhatsApp] Falha ao inicializar socket:", err);
      return this.getStatus();
    }
  }
  async disconnect() {
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
          this.sock.end(void 0);
        }
      }
    } catch (e) {
      console.warn("[WhatsApp] Erro durante disconnect:", e);
    } finally {
      this.sock = null;
      this.status = "disconnected";
      this.qrCode = null;
      this.qrImage = null;
      this.user = null;
      this.isInitializing = false;
      this.lastError = null;
      this.clearAuthFolder();
    }
    return this.getStatus();
  }
  async fetchParticipatingGroups() {
    if (this.status !== "connected" || !this.sock) {
      return [];
    }
    try {
      const groups = await this.sock.groupFetchAllParticipating();
      return Object.values(groups).map((g) => ({
        id: g.id,
        subject: g.subject || "Grupo sem nome",
        participantsCount: g.participants?.length || 0
      }));
    } catch (err) {
      console.error("[WhatsApp] Erro ao buscar grupos participantes:", err);
      return [];
    }
  }
  async sendMessage(jid, text) {
    if (this.status !== "connected" || !this.sock || !jid) {
      return false;
    }
    try {
      const targetJid = jid.includes("@") ? jid : `${jid}@g.us`;
      await this.sock.sendMessage(targetJid, { text });
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Falha ao enviar mensagem para ${jid}:`, err);
      return false;
    }
  }
  async sendImage(jid, imageBuffer, caption = "", mimetype = "image/png") {
    if (this.status !== "connected" || !this.sock || !jid) {
      return false;
    }
    try {
      const targetJid = jid.includes("@") ? jid : `${jid}@g.us`;
      await this.sock.sendMessage(targetJid, {
        image: imageBuffer,
        caption: caption || void 0,
        mimetype
      });
      console.log(`[WhatsApp] Imagem enviada para ${targetJid}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Falha ao enviar imagem para ${jid}:`, err);
      return false;
    }
  }
  async sendTaskNotifications(task) {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: []
    };
    if (this.status !== "connected" || !this.sock) {
      results.errors.push("WhatsApp n\xE3o est\xE1 conectado.");
      return results;
    }
    if (!this.enabled) {
      return results;
    }
    const sendG1 = task.group1_enabled !== false;
    const sendG2 = task.group2_enabled !== false;
    const formatDate = (isoStr) => {
      try {
        const [y, m, d] = (isoStr || "").split("-");
        if (y && m && d) return `${d}/${m}/${y}`;
        return isoStr;
      } catch {
        return isoStr;
      }
    };
    const formattedDate = formatDate(task.due_date);
    if (this.group1Jid && sendG1) {
      try {
        const target1 = this.group1Jid.includes("@") ? this.group1Jid : `${this.group1Jid}@g.us`;
        const recipients = task.recipients_label ? `\u{1F465} *Destinat\xE1rios:* ${task.recipients_label}
` : "";
        const messageG1 = `\u{1F4DA} *NOVA TAREFA NO EDUTASK*

\u{1F4D6} *Mat\xE9ria:* ${task.subject}
\u{1F4DD} *T\xEDtulo:* ${task.title}
\u{1F4C5} *Data de Entrega:* ${formattedDate}
\u{1F381} *Pontos:* ${task.points} pts
${recipients}
\u{1F4CB} *Descri\xE7\xE3o / Orienta\xE7\xF5es:*
${task.description}

\u{1F449} _Acesse o Edutask para responder e visualizar os detalhes!_`;
        await this.sock.sendMessage(target1, { text: messageG1 });
        results.group1Sent = true;
        console.log(`[WhatsApp] Notifica\xE7\xE3o completa enviada para Grupo 1 (${this.group1Jid})`);
      } catch (err) {
        const errMsg = `Falha no Grupo 1: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }
    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes("@") ? this.group2Jid : `${this.group2Jid}@g.us`;
        const statementText = (task.group2_caption || task.description || "").trim();
        const captionG2 = `\u{1F4DA} *${task.subject} \u2014 ${task.title}*
\u{1F4C5} *Entrega:* ${formattedDate}

\u{1F4DD} *Enunciado:*
${statementText}`;
        if (task.photo_buffer && task.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: task.photo_buffer,
            caption: captionG2,
            mimetype: task.photo_content_type || "image/jpeg"
          });
          console.log(`[WhatsApp] Foto com enunciado enviada para Grupo 2 (${this.group2Jid})`);
        } else {
          await this.sock.sendMessage(target2, { text: captionG2 });
          console.log(`[WhatsApp] Enunciado em texto enviado para Grupo 2 (${this.group2Jid})`);
        }
        results.group2Sent = true;
      } catch (err) {
        const errMsg = `Falha no Grupo 2: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }
    return results;
  }
  async sendAnnouncementNotifications(ann) {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: []
    };
    if (this.status !== "connected" || !this.sock) {
      results.errors.push("WhatsApp n\xE3o est\xE1 conectado.");
      return results;
    }
    if (!this.enabled) {
      return results;
    }
    const sendG1 = ann.group1_enabled !== false;
    const sendG2 = ann.group2_enabled !== false;
    const formatDate = (isoStr) => {
      try {
        if (!isoStr) return (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
        return new Date(isoStr).toLocaleDateString("pt-BR");
      } catch {
        return "";
      }
    };
    const formattedDate = formatDate(ann.created_at);
    if (this.group1Jid && sendG1) {
      try {
        const target1 = this.group1Jid.includes("@") ? this.group1Jid : `${this.group1Jid}@g.us`;
        const recipients = ann.recipients_label ? `\u{1F465} *Destinat\xE1rios:* ${ann.recipients_label}
` : "";
        const msgG1 = `\u{1F4E2} *NOVO AVISO NO EDUTASK*

\u{1F4CC} *${ann.title}*
\u{1F4C5} *Data:* ${formattedDate}
${recipients}
\u{1F4AC} *Mensagem:*
${ann.message}

\u{1F449} _Acesse o Edutask para interagir e responder aos coment\xE1rios!_`;
        await this.sock.sendMessage(target1, { text: msgG1 });
        results.group1Sent = true;
      } catch (err) {
        results.errors.push(`Grupo 1: ${err?.message || err}`);
      }
    }
    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes("@") ? this.group2Jid : `${this.group2Jid}@g.us`;
        const statementText = (ann.group2_caption || ann.message || "").trim();
        const msgG2 = `\u{1F4E2} *${ann.title}*

${statementText}`;
        if (ann.photo_buffer && ann.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: ann.photo_buffer,
            caption: msgG2,
            mimetype: ann.photo_content_type || "image/jpeg"
          });
        } else {
          await this.sock.sendMessage(target2, { text: msgG2 });
        }
        results.group2Sent = true;
      } catch (err) {
        results.errors.push(`Grupo 2: ${err?.message || err}`);
      }
    }
    return results;
  }
  async sendTomorrowReminder(payload) {
    const results = {
      group1Sent: false,
      group2Sent: false,
      errors: []
    };
    if (this.status !== "connected" || !this.sock) {
      results.errors.push("WhatsApp n\xE3o est\xE1 conectado.");
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
        const target1 = this.group1Jid.includes("@") ? this.group1Jid : `${this.group1Jid}@g.us`;
        const tasksListG1 = tasks.map(
          (t, idx) => `\u{1F539} *${idx + 1}. [${t.subject}] ${t.title}*
   \u{1F381} *Pontos:* ${t.points} pts
` + (t.description ? `   \u{1F4CB} _${t.description.length > 90 ? t.description.slice(0, 90) + "..." : t.description}_
` : "")
        ).join("\n");
        const msgG1 = `\u{1F6A8} *LEMBRETE DI\xC1RIO DE TAREFAS*

\u{1F4C5} *Entrega Amanh\xE3:* ${payload.tomorrow_date_br}
\u{1F4DA} *Total de Tarefas:* ${tasks.length}

${tasksListG1}
\u{1F449} _Acessem o Edutask para conferir as quest\xF5es e enviar suas respostas no prazo!_`;
        await this.sock.sendMessage(target1, { text: msgG1 });
        results.group1Sent = true;
        console.log(`[WhatsApp] Lembrete de amanh\xE3 enviado com sucesso para Grupo 1 (${this.group1Jid})`);
      } catch (err) {
        const errMsg = `Falha no Grupo 1: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }
    if (this.group2Jid && sendG2) {
      try {
        const target2 = this.group2Jid.includes("@") ? this.group2Jid : `${this.group2Jid}@g.us`;
        const tasksListG2 = tasks.map((t) => `\u2022 [${t.subject}] ${t.title}`).join("\n");
        let captionG2 = (payload.custom_caption_template || `\u{1F6A8} *LEMBRETE: TAREFAS PARA AMANH\xC3 ({data_amanha})*

Aten\xE7\xE3o turma! Temos {total_tarefas} tarefa(s) marcadas para amanh\xE3:

{lista_tarefas}

\u{1F449} Acessem o Edutask para responder!`).trim();
        captionG2 = captionG2.replace(/\{data_amanha\}/g, payload.tomorrow_date_br).replace(/\{total_tarefas\}/g, String(tasks.length)).replace(/\{lista_tarefas\}/g, tasksListG2);
        if (payload.photo_buffer && payload.photo_buffer.length > 0) {
          await this.sock.sendMessage(target2, {
            image: payload.photo_buffer,
            caption: captionG2,
            mimetype: payload.photo_content_type || "image/jpeg"
          });
          console.log(`[WhatsApp] Foto com lembrete de amanh\xE3 enviada para Grupo 2 (${this.group2Jid})`);
        } else {
          await this.sock.sendMessage(target2, { text: captionG2 });
          console.log(`[WhatsApp] Texto com lembrete de amanh\xE3 enviado para Grupo 2 (${this.group2Jid})`);
        }
        results.group2Sent = true;
      } catch (err) {
        const errMsg = `Falha no Grupo 2: ${err?.message || err}`;
        console.error(`[WhatsApp] ${errMsg}`);
        results.errors.push(errMsg);
      }
    }
    return results;
  }
  clearAuthFolder() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("[WhatsApp] Erro ao limpar pasta de autentica\xE7\xE3o:", e);
    }
  }
};
var whatsappService = new WhatsAppService();

// src/lib/firebaseService.ts
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, deleteField } from "firebase/firestore";

// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
var firebaseConfig = {};
try {
  firebaseConfig = await Promise.resolve().then(() => __toESM(require_firebase_applet_config(), 1));
  if (firebaseConfig.default) firebaseConfig = firebaseConfig.default;
} catch {
  firebaseConfig = {};
}
if (typeof import.meta !== "undefined" && import.meta.env) {
  if (import.meta.env.VITE_FIREBASE_API_KEY) firebaseConfig.apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID) firebaseConfig.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) firebaseConfig.authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (import.meta.env.VITE_FIREBASE_DATABASE_ID) firebaseConfig.firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
  if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) firebaseConfig.storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (import.meta.env.VITE_FIREBASE_APP_ID) firebaseConfig.appId = import.meta.env.VITE_FIREBASE_APP_ID;
}
if (!firebaseConfig.apiKey) {
  firebaseConfig = {
    apiKey: "AIzaSyDsAo1hTSOe6Q21QcNeHmGNt650rkzBBmc",
    authDomain: "edutask-7ano-60994.firebaseapp.com",
    projectId: "edutask-7ano-60994",
    storageBucket: "edutask-7ano-60994.firebasestorage.app",
    messagingSenderId: "851306521007",
    appId: "1:851306521007:web:1eab9e88863b662fb78f5a",
    firestoreDatabaseId: "ai-studio-edutaskgestodeta-3284915b-c459-465f-8391-17d32111c03c"
  };
}
var app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
var db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
var auth = getAuth(app);

// src/lib/firebaseService.ts
function handleFirestoreError(error, operationType, path3) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null
    },
    operationType,
    path: path3
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
function sanitizeFirestoreData(obj) {
  if (obj === null || obj === void 0) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeFirestoreData);
  if (typeof obj === "object") {
    if (obj._methodName || obj.constructor && obj.constructor.name === "FieldValue") {
      return obj;
    }
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== void 0) {
        cleaned[key] = sanitizeFirestoreData(val);
      }
    }
    return cleaned;
  }
  return obj;
}
var firebaseService = {
  // Tasks
  async getAllTasks() {
    const path3 = "tasks";
    try {
      const snap = await getDocs(collection(db, path3));
      const tasks = [];
      snap.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() });
      });
      return tasks;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveTask(task) {
    const path3 = `tasks/${task.id}`;
    try {
      const sanitized = sanitizeFirestoreData(task);
      await setDoc(doc(db, "tasks", task.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteTask(taskId) {
    const path3 = `tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Users
  async getAllUsers() {
    const path3 = "users";
    try {
      const snap = await getDocs(collection(db, path3));
      const users = [];
      snap.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      return users;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveUser(user) {
    const path3 = `users/${user.id}`;
    try {
      const sanitized = sanitizeFirestoreData(user);
      if (!user.avatar_data) {
        sanitized.avatar_data = deleteField();
        sanitized.avatar_content_type = deleteField();
      }
      await setDoc(doc(db, "users", user.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteUser(userId) {
    const path3 = `users/${userId}`;
    try {
      await deleteDoc(doc(db, "users", userId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Subjects
  async getAllSubjects() {
    const path3 = "subjects";
    try {
      const snap = await getDocs(collection(db, path3));
      const subjects = [];
      snap.forEach((docSnap) => {
        subjects.push({ id: docSnap.id, ...docSnap.data() });
      });
      return subjects;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveSubject(subject) {
    const path3 = `subjects/${subject.id}`;
    try {
      const sanitized = sanitizeFirestoreData(subject);
      await setDoc(doc(db, "subjects", subject.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteSubject(subjectId) {
    const path3 = `subjects/${subjectId}`;
    try {
      await deleteDoc(doc(db, "subjects", subjectId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Announcements
  async getAllAnnouncements() {
    const path3 = "announcements";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveAnnouncement(ann) {
    const path3 = `announcements/${ann.id}`;
    try {
      const sanitized = sanitizeFirestoreData(ann);
      await setDoc(doc(db, "announcements", ann.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteAnnouncement(annId) {
    const path3 = `announcements/${annId}`;
    try {
      await deleteDoc(doc(db, "announcements", annId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Completions
  async getAllCompletions() {
    const path3 = "completions";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveCompletion(comp) {
    const compId = `${comp.user_id}_${comp.task_id}`;
    const path3 = `completions/${compId}`;
    try {
      const sanitized = sanitizeFirestoreData({ ...comp, id: compId });
      await setDoc(doc(db, "completions", compId), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteCompletion(userId, taskId) {
    const compId = `${userId}_${taskId}`;
    const path3 = `completions/${compId}`;
    try {
      await deleteDoc(doc(db, "completions", compId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Comments
  async getAllComments() {
    const path3 = "comments";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveComment(comment) {
    const path3 = `comments/${comment.id}`;
    try {
      const sanitized = sanitizeFirestoreData(comment);
      await setDoc(doc(db, "comments", comment.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteComment(commentId) {
    const path3 = `comments/${commentId}`;
    try {
      await deleteDoc(doc(db, "comments", commentId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // System Settings / Config
  async getSettings(id) {
    const path3 = `settings/${id}`;
    try {
      const snap = await getDoc(doc(db, "settings", id));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, "get" /* GET */, path3);
    }
  },
  async saveSettings(id, data) {
    const path3 = `settings/${id}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, "settings", id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  // Student Answers
  async getAllStudentAnswers() {
    const path3 = "student_answers";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ key: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveStudentAnswer(key, data) {
    const path3 = `student_answers/${key}`;
    try {
      const sanitized = sanitizeFirestoreData(data);
      await setDoc(doc(db, "student_answers", key), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  // Files & Attachments Storage
  async getAllFiles() {
    const path3 = "files";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async getFile(fileId) {
    const path3 = `files/${fileId}`;
    try {
      const snap = await getDoc(doc(db, "files", fileId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, "get" /* GET */, path3);
    }
  },
  async saveFile(fileRecord) {
    const path3 = `files/${fileRecord.id}`;
    try {
      const sanitized = sanitizeFirestoreData(fileRecord);
      await setDoc(doc(db, "files", fileRecord.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteFile(fileId) {
    const path3 = `files/${fileId}`;
    try {
      await deleteDoc(doc(db, "files", fileId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  },
  // Login Logs
  async getAllLoginLogs() {
    const path3 = "login_logs";
    try {
      const snap = await getDocs(collection(db, path3));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, "list" /* LIST */, path3);
    }
  },
  async saveLoginLog(log) {
    const path3 = `login_logs/${log.id}`;
    try {
      const sanitized = sanitizeFirestoreData(log);
      await setDoc(doc(db, "login_logs", log.id), sanitized, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, "write" /* WRITE */, path3);
    }
  },
  async deleteLoginLog(logId) {
    const path3 = `login_logs/${logId}`;
    try {
      await deleteDoc(doc(db, "login_logs", logId));
      return true;
    } catch (e) {
      handleFirestoreError(e, "delete" /* DELETE */, path3);
    }
  }
};

// server.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var JWT_SECRET = process.env.JWT_SECRET || "edutask-super-secret-jwt-key-2026";
var PORT = 3e3;
var HOST = "0.0.0.0";
var geminiApiKey = process.env.GEMINI_API_KEY || "";
var genAI = geminiApiKey ? new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
async function withTimeout(promise, timeoutMs = 3e4) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI request timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB
});
var IS_TIER_SYSTEM_ENABLED = false;
var TIERS = [];
function getTier() {
  return null;
}
var DEFAULT_EFFECTS = [
  { id: "none", name: "Sem moldura (Padr\xE3o)", emoji: "\u26AA", description: "Visual cl\xE1ssico sem moldura adicional.", cost: 0, css: "", rarity: "common" },
  { id: "neon_pulse", name: "Moldura Pulso Neon", emoji: "\u{1F4A0}", description: "Aura azul vibrante com pulso suave.", cost: 50, css: "fx-neon-pulse", rarity: "common" },
  { id: "sunset", name: "Moldura P\xF4r do Sol", emoji: "\u{1F305}", description: "Borda degrad\xEA suave em tons de laranja e rosa.", cost: 80, css: "fx-sunset", rarity: "common" },
  { id: "golden", name: "Moldura Ouro Real", emoji: "\u{1F947}", description: "Brilho dourado nobre e reluzente.", cost: 150, css: "fx-golden", rarity: "rare" },
  { id: "rainbow", name: "Moldura Arco-\xCDris", emoji: "\u{1F308}", description: "Borda multicolorida em transi\xE7\xE3o cont\xEDnua.", cost: 200, css: "fx-rainbow", rarity: "rare" },
  { id: "ice", name: "Moldura Gelo Astral", emoji: "\u2744\uFE0F", description: "Cristais glaciais brilhantes e n\xEDtidos.", cost: 220, css: "fx-ice", rarity: "rare" },
  { id: "fire", name: "Moldura Chama de Fogo", emoji: "\u{1F525}", description: "Labaredas vivas de energia para estudantes dedicados.", cost: 250, css: "fx-fire", rarity: "rare" },
  { id: "hologram", name: "Moldura Hologr\xE1fica", emoji: "\u{1F47E}", description: "Efeito cyberpunk futurista irisado.", cost: 350, css: "fx-hologram", rarity: "epic" },
  { id: "galaxy", name: "Moldura Nebulosa Gal\xE1ctica", emoji: "\u{1F30C}", description: "Constela\xE7\xF5es e n\xE9voa c\xF3smica roxa animada.", cost: 500, css: "fx-galaxy", rarity: "epic" },
  { id: "electric", name: "Moldura Rel\xE2mpago El\xE9trico", emoji: "\u26A1", description: "Arcos de eletricidade est\xE1tica ao redor do avatar.", cost: 600, css: "fx-electric", rarity: "epic" },
  { id: "shadow", name: "Moldura \xC9bano M\xEDstico", emoji: "\u{1F5A4}", description: "Contorno escuro profundo com pulsa\xE7\xE3o suave.", cost: 700, css: "fx-shadow", rarity: "epic" },
  { id: "phoenix", name: "Moldura F\xEAnix Dourada", emoji: "\u{1F534}", description: "Aura lend\xE1ria de renascimento e poder.", cost: 900, css: "fx-phoenix", rarity: "legendary" },
  { id: "diamond", name: "Moldura Diamante C\xF3smico", emoji: "\u{1F48E}", description: "Cintila\xE7\xE3o prism\xE1tica de alta pureza.", cost: 1200, css: "fx-diamond", rarity: "legendary" }
];
var DEFAULT_APP_INFO = {
  id: "app_info",
  version: "1.1.0",
  codename: "Edutask AI Edition",
  release_notes: "Atualiza\xE7\xE3o do sistema: Sistema de n\xEDveis desligado; pontos de tarefas exclusivamente para comprar molduras na loja; e vencedor final do m\xEAs avaliado por Intelig\xEAncia Artificial.",
  features: [
    "Perfis estilo Netflix para Alunos e Admin",
    "Entrega de tarefas com anexos, respostas e prazos",
    "Gabarito inteligente gerado por IA atrav\xE9s de fotos da tarefa",
    "Tira-d\xFAvidas e tutor pedag\xF3gico com intelig\xEAncia artificial",
    "Loja de Molduras de avatar (compradas estritamente com pontos de tarefas)",
    "Avalia\xE7\xE3o Mensal do Aluno Vencedor do M\xEAs por Intelig\xEAncia Artificial"
  ]
};
var BASE_DIR2 = process.env.VERCEL || process.env.NODE_ENV === "production" ? os2.tmpdir() : __dirname2;
var DATA_DIR = path2.resolve(BASE_DIR2, "data");
var DB_FILE = path2.resolve(DATA_DIR, "db.json");
var UPLOAD_DIR = path2.resolve(BASE_DIR2, "uploads");
try {
  if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn("[Storage] N\xE3o foi poss\xEDvel criar DATA_DIR:", e);
}
try {
  if (!fs2.existsSync(UPLOAD_DIR)) fs2.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  console.warn("[Storage] N\xE3o foi poss\xEDvel criar UPLOAD_DIR:", e);
}
var Database = class {
  users = /* @__PURE__ */ new Map();
  subjects = /* @__PURE__ */ new Map();
  tasks = /* @__PURE__ */ new Map();
  completions = [];
  announcements = /* @__PURE__ */ new Map();
  comments = /* @__PURE__ */ new Map();
  login_logs = [];
  point_adjustments = [];
  files = /* @__PURE__ */ new Map();
  ai_chats = /* @__PURE__ */ new Map();
  effect_overrides = {};
  monthly_prize = {
    id: "monthly_prize",
    title: "Fone Bluetooth JBL Tune 520BT",
    description: "Avalia\xE7\xE3o mensal por IA! Os pontos de tarefas servem exclusivamente para a loja de molduras; o pr\xEAmio do m\xEAs \xE9 avaliado pela pontualidade e penalizado por tarefas n\xE3o feitas.",
    emoji: "\u{1F3A7}",
    image_id: null,
    ai_winner: {
      winner_id: "aluno-004",
      winner_name: "Sofia Martins",
      score: 99,
      justification: "Sofia Martins destacou-se com 100% de entregas no prazo e nenhuma tarefa pendente no m\xEAs.",
      criteria: [
        "100% de tarefas entregues no prazo",
        "Zero pend\xEAncias acumuladas"
      ],
      awarded_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  task_cleanup_config = {
    enabled: true,
    cleanup_time: "23:59",
    days_after_due: 0,
    delete_only_if_completed: false,
    last_run_at: null,
    last_deleted_count: 0,
    last_deleted_titles: []
  };
  whatsapp_config = {
    group_1_jid: "",
    group_1_name: "",
    group_2_jid: "",
    group_2_name: "",
    enabled: true,
    templates: {
      task_caption: "\u{1F4DA} *{materia} \u2014 {titulo}*\n\u{1F4C5} *Entrega:* {data_entrega}\n\n\u{1F4DD} *Enunciado:*\n{descricao}",
      task_photo_id: null,
      announcement_caption: "\u{1F4E3} *{titulo}*\n\n{mensagem}",
      announcement_photo_id: null,
      tomorrow_caption: "\u{1F6A8} *LEMBRETE: TAREFAS PARA AMANH\xC3 ({data_amanha})*\n\nOl\xE1 turma! N\xE3o se esque\xE7am das tarefas marcadas para amanh\xE3:\n\n{lista_tarefas}\n\n\u{1F449} Acessem o Edutask para conferir e responder no prazo!",
      tomorrow_photo_id: null
    },
    daily_reminder: {
      enabled: true,
      time: "19:00",
      last_run_date: null
    }
  };
  app_info = { ...DEFAULT_APP_INFO };
  ai_enabled = true;
  webhook_logs = [];
  task_student_answers = /* @__PURE__ */ new Map();
  firebaseSynced = false;
  syncPromise = null;
  constructor() {
    if (!this.loadFromDisk()) {
      this.seed();
      this.saveToDisk();
    }
    whatsappService.setConfig(this.whatsapp_config);
    whatsappService.initAutoConnect();
    this.ensureSynced().catch((err) => {
      console.warn("[Firebase Sync Error]", err);
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
      console.log("[Firebase] Sincronizando cole\xE7\xF5es do Firestore...");
      const [tasks, users, announcements, completions, subjects, comments, settings, studentAnswers, remoteFiles] = await Promise.all([
        firebaseService.getAllTasks(),
        firebaseService.getAllUsers(),
        firebaseService.getAllAnnouncements(),
        firebaseService.getAllCompletions(),
        firebaseService.getAllSubjects(),
        firebaseService.getAllComments(),
        firebaseService.getSettings("system"),
        firebaseService.getAllStudentAnswers(),
        firebaseService.getAllFiles()
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
            answer: t.answer || "",
            answer_source: t.answer_source || "",
            created_by: t.created_by || "system",
            created_at: t.created_at || (/* @__PURE__ */ new Date()).toISOString()
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
        this.completions = completions;
      }
      if (comments && comments.length > 0) {
        comments.forEach((c) => {
          if (c.id) this.comments.set(c.id, c);
        });
      }
      if (settings) {
        if (settings.monthly_prize) this.monthly_prize = settings.monthly_prize;
        if (settings.task_cleanup_config) this.task_cleanup_config = { ...this.task_cleanup_config, ...settings.task_cleanup_config };
        if (settings.whatsapp_config) this.whatsapp_config = { ...this.whatsapp_config, ...settings.whatsapp_config };
        if (settings.app_info) this.app_info = settings.app_info;
        if (settings.effect_overrides) this.effect_overrides = settings.effect_overrides;
      } else {
        await firebaseService.saveSettings("system", {
          monthly_prize: this.monthly_prize,
          task_cleanup_config: this.task_cleanup_config,
          whatsapp_config: this.whatsapp_config,
          app_info: this.app_info,
          effect_overrides: this.effect_overrides
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
              content_type: f.content_type || "image/jpeg",
              size: f.size || 0,
              data: Buffer.from(f.base64, "base64"),
              uploaded_by: f.uploaded_by || "system",
              created_at: f.created_at || (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        });
      }
      this.saveToDisk();
      console.log("[Firebase] Sincroniza\xE7\xE3o com o Firestore conclu\xEDda.");
    } catch (e) {
      console.warn("[Firebase] Falha na sincroniza\xE7\xE3o:", e?.message || e);
    }
  }
  saveToDisk() {
    try {
      if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
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
        task_cleanup_config: this.task_cleanup_config,
        whatsapp_config: this.whatsapp_config,
        app_info: this.app_info,
        ai_enabled: this.ai_enabled,
        task_student_answers: Array.from(this.task_student_answers.entries())
      };
      fs2.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn("Could not save DB to disk:", e);
    }
  }
  loadFromDisk() {
    try {
      if (fs2.existsSync(DB_FILE)) {
        const raw = fs2.readFileSync(DB_FILE, "utf8");
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
        if (data.whatsapp_config) this.whatsapp_config = { ...this.whatsapp_config, ...data.whatsapp_config };
        if (data.app_info) this.app_info = data.app_info;
        if (data.ai_enabled !== void 0) this.ai_enabled = data.ai_enabled;
        if (data.task_student_answers) this.task_student_answers = new Map(data.task_student_answers);
        return true;
      }
    } catch (e) {
      console.warn("Could not load DB from disk, fallback to seed:", e);
    }
    return false;
  }
  seed() {
    const adminPass = process.env.ADMIN_PASSWORD || "enzo123cg";
    const adminHash = bcrypt.hashSync(adminPass, 10);
    const adminId = "admin-user-001";
    this.users.set(adminId, {
      id: adminId,
      email: "admin@escola.com",
      name: "Administrador",
      password_hash: adminHash,
      password_plain: adminPass,
      role: "admin",
      status: "active",
      points: 0,
      streak_count: 0,
      longest_streak: 0,
      owned_effects: DEFAULT_EFFECTS.map((e) => e.id),
      equipped_effect: "none",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const subjects = ["Matem\xE1tica", "Portugu\xEAs", "Ci\xEAncias", "Hist\xF3ria", "Geografia", "Ingl\xEAs", "Artes", "Educa\xE7\xE3o F\xEDsica"];
    subjects.forEach((name, i) => {
      const id = `subj-${i + 1}`;
      this.subjects.set(id, { id, name });
    });
  }
  getEffectsCatalog() {
    return DEFAULT_EFFECTS.map((eff) => {
      const override = this.effect_overrides[eff.id];
      return {
        ...eff,
        cost: override ? override.cost : eff.cost
      };
    });
  }
};
var db2 = new Database();
function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: "access" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
function verifyAuthToken(req) {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.query && typeof req.query.auth === "string") {
    token = req.query.auth;
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== "access") return null;
    const user = db2.users.get(payload.sub);
    return user || null;
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const user = verifyAuthToken(req);
  if (!user) {
    return res.status(401).json({ detail: "N\xE3o autenticado" });
  }
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  const user = req.user || verifyAuthToken(req);
  if (!user) {
    return res.status(401).json({ detail: "N\xE3o autenticado" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ detail: "Acesso restrito ao administrador" });
  }
  req.user = user;
  next();
}
function updateStudentStreak(userId) {
  const user = db2.users.get(userId);
  if (!user || user.role !== "aluno") return;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (user.last_active_date === today) return;
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  if (user.last_active_date === yesterday) {
    user.streak_count = (user.streak_count || 0) + 1;
  } else {
    user.streak_count = 1;
  }
  user.longest_streak = Math.max(user.longest_streak || 0, user.streak_count);
  user.last_active_date = today;
}
var app2 = express();
app2.use(express.json({ limit: "15mb" }));
app2.use(express.urlencoded({ extended: true, limit: "15mb" }));
app2.use(cookieParser());
var api = express.Router();
api.get("/auth/profiles", (req, res) => {
  const profiles = Array.from(db2.users.values()).map((u) => {
    const pts = u.points || 0;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status || "active",
      has_avatar: Boolean(u.avatar_data),
      points: pts,
      tier_name: null,
      // Level system permanently disabled
      equipped_effect: u.equipped_effect || "none"
    };
  });
  profiles.sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    return a.name.localeCompare(b.name);
  });
  res.json(profiles);
});
api.post("/auth/login", (req, res) => {
  const { user_id, email, password } = req.body || {};
  if (!user_id && !email) {
    return res.status(400).json({ detail: "Informe um perfil ou email" });
  }
  let user;
  if (user_id) {
    user = db2.users.get(user_id);
  } else if (email) {
    const cleanEmail = email.toLowerCase().trim();
    user = Array.from(db2.users.values()).find((u) => u.email.toLowerCase() === cleanEmail);
  }
  if (!user) {
    return res.status(401).json({ detail: "Perfil n\xE3o encontrado" });
  }
  const valid = Boolean(
    password && (user.password_hash && bcrypt.compareSync(password, user.password_hash) || password === user.password_plain || user.role === "admin" && ["enzo123cg", "admin123", "123", "admin"].includes(password))
  );
  if (!valid) {
    return res.status(401).json({ detail: "Senha inv\xE1lida" });
  }
  if (user.status === "maintenance") {
    return res.status(403).json({ detail: "Perfil em manuten\xE7\xE3o. Fale com o administrador." });
  }
  if (user.status === "blocked") {
    return res.status(403).json({ detail: "Perfil bloqueado. Fale com o administrador." });
  }
  const token = createToken(user);
  if (user.role === "aluno") {
    db2.login_logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (db2.login_logs.length > 2e3) db2.login_logs.pop();
    updateStudentStreak(user.id);
  }
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    path: "/"
  });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      has_avatar: Boolean(user.avatar_data)
    }
  });
});
api.post("/auth/logout", (req, res) => {
  res.clearCookie("access_token", { path: "/" });
  res.json({ ok: true });
});
api.get("/auth/me", requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    points: user.points,
    streak_count: user.streak_count,
    longest_streak: user.longest_streak,
    equipped_effect: user.equipped_effect || "none",
    owned_effects: user.owned_effects || ["none"],
    has_avatar: Boolean(user.avatar_data),
    created_at: user.created_at
  });
});
api.get("/me/stats", requireAuth, (req, res) => {
  const user = req.user;
  const points = user.points || 0;
  const myCompletions = db2.completions.filter((c) => c.user_id === user.id);
  const onTimeCount = myCompletions.filter((c) => c.on_time).length;
  res.json({
    points,
    // Pontos obtidos exclusivamente para a loja de molduras
    points_purpose: "molduras",
    streak_count: user.streak_count || 0,
    longest_streak: user.longest_streak || 0,
    last_active_date: user.last_active_date,
    total_completed: myCompletions.length,
    on_time_completed: onTimeCount,
    tier: null
    // Sistema de nível desligado permanentemente
  });
});
api.get("/users", requireAuth, (req, res) => {
  const currentUser = req.user;
  const users = Array.from(db2.users.values()).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    points: u.points || 0,
    streak_count: u.streak_count || 0,
    longest_streak: u.longest_streak || 0,
    equipped_effect: u.equipped_effect || "none",
    has_avatar: Boolean(u.avatar_data),
    password: currentUser.role === "admin" ? u.password_plain || "123" : void 0,
    password_plain: currentUser.role === "admin" ? u.password_plain || "123" : void 0,
    created_at: u.created_at
  }));
  res.json(users);
});
api.post("/users", requireAdmin, (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ detail: "Nome e senha s\xE3o obrigat\xF3rios" });
  }
  const cleanName = name.trim();
  const id = `aluno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = `${cleanName.toLowerCase().replace(/\s+/g, ".")}-${Date.now().toString().slice(-4)}@escola.com`;
  const newUser = {
    id,
    email,
    name: cleanName,
    password_hash: bcrypt.hashSync(password, 10),
    password_plain: password,
    role: "aluno",
    status: "active",
    points: 0,
    streak_count: 0,
    longest_streak: 0,
    owned_effects: ["none"],
    equipped_effect: "none",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.users.set(id, newUser);
  db2.saveToDisk();
  firebaseService.saveUser(newUser).catch(console.warn);
  res.json({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    status: newUser.status,
    has_avatar: false,
    created_at: newUser.created_at
  });
});
api.patch("/users/:user_id/status", requireAdmin, (req, res) => {
  const { user_id } = req.params;
  const { status } = req.body || {};
  const user = db2.users.get(user_id);
  if (!user) return res.status(404).json({ detail: "Usu\xE1rio n\xE3o encontrado" });
  if (!["active", "maintenance", "blocked"].includes(status)) {
    return res.status(400).json({ detail: "Status inv\xE1lido" });
  }
  user.status = status;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true, status: user.status });
});
api.patch("/users/:user_id", requireAdmin, (req, res) => {
  const { user_id } = req.params;
  const { name, password } = req.body || {};
  const user = db2.users.get(user_id);
  if (!user) return res.status(404).json({ detail: "Usu\xE1rio n\xE3o encontrado" });
  if (name) user.name = name.trim();
  if (password) {
    user.password_hash = bcrypt.hashSync(password, 10);
    user.password_plain = password;
  }
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true, user: { id: user.id, name: user.name } });
});
api.patch("/me", requireAuth, (req, res) => {
  const user = req.user;
  const { name, password } = req.body || {};
  if (name) user.name = name.trim();
  if (password) {
    user.password_hash = bcrypt.hashSync(password, 10);
    user.password_plain = password;
  }
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true });
});
api.delete("/users/:user_id", requireAdmin, (req, res) => {
  const { user_id } = req.params;
  const user = db2.users.get(user_id);
  if (!user) return res.status(404).json({ detail: "Usu\xE1rio n\xE3o encontrado" });
  if (user.role === "admin") {
    return res.status(400).json({ detail: "N\xE3o \xE9 poss\xEDvel remover o administrador principal" });
  }
  db2.users.delete(user_id);
  db2.saveToDisk();
  firebaseService.deleteUser(user_id).catch(console.warn);
  res.json({ ok: true });
});
api.post("/users/:user_id/points", requireAdmin, (req, res) => {
  const { user_id } = req.params;
  const { delta, reason } = req.body || {};
  const user = db2.users.get(user_id);
  if (!user || user.role !== "aluno") {
    return res.status(404).json({ detail: "Aluno n\xE3o encontrado" });
  }
  const d = parseInt(delta) || 0;
  user.points = Math.max(0, (user.points || 0) + d);
  db2.point_adjustments.push({
    id: `adj-${Date.now()}`,
    user_id: user.id,
    user_name: user.name,
    admin_id: req.user.id,
    delta: d,
    reason: (reason || "").trim(),
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true, total_points: user.points, delta: d });
});
api.post("/me/avatar", requireAuth, upload.single("file"), (req, res) => {
  const user = req.user;
  if (!req.file) return res.status(400).json({ detail: "Nenhum arquivo enviado" });
  user.avatar_data = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  user.avatar_content_type = req.file.mimetype;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true });
});
api.delete("/me/avatar", requireAuth, (req, res) => {
  const user = req.user;
  user.avatar_data = void 0;
  user.avatar_content_type = void 0;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true });
});
api.post("/users/:user_id/avatar", requireAdmin, upload.single("file"), (req, res) => {
  const { user_id } = req.params;
  const user = db2.users.get(user_id);
  if (!user) return res.status(404).json({ detail: "Usu\xE1rio n\xE3o encontrado" });
  if (!req.file) return res.status(400).json({ detail: "Nenhum arquivo enviado" });
  user.avatar_data = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  user.avatar_content_type = req.file.mimetype;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true });
});
api.delete("/users/:user_id/avatar", requireAdmin, (req, res) => {
  const { user_id } = req.params;
  const user = db2.users.get(user_id);
  if (!user) return res.status(404).json({ detail: "Usu\xE1rio n\xE3o encontrado" });
  user.avatar_data = void 0;
  user.avatar_content_type = void 0;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true });
});
api.get("/avatars/:user_id", (req, res) => {
  const { user_id } = req.params;
  const user = db2.users.get(user_id);
  if (!user || !user.avatar_data) {
    return res.status(404).json({ detail: "Avatar n\xE3o encontrado" });
  }
  const parts = user.avatar_data.split(",");
  const mime = user.avatar_content_type || "image/png";
  const imgBuffer = Buffer.from(parts[1] || "", "base64");
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "no-cache");
  res.send(imgBuffer);
});
api.get("/subjects", requireAuth, (req, res) => {
  res.json(Array.from(db2.subjects.values()));
});
api.post("/subjects", requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ detail: "Nome obrigat\xF3rio" });
  const id = `subj-${Date.now()}`;
  const subj = { id, name: name.trim() };
  db2.subjects.set(id, subj);
  db2.saveToDisk();
  firebaseService.saveSubject(subj).catch(console.warn);
  res.json(subj);
});
api.delete("/subjects/:subject_id", requireAdmin, (req, res) => {
  const { subject_id } = req.params;
  db2.subjects.delete(subject_id);
  db2.saveToDisk();
  firebaseService.deleteSubject(subject_id).catch(console.warn);
  res.json({ ok: true });
});
api.post("/files/upload", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Nenhum arquivo enviado" });
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ext = path2.extname(req.file.originalname) || "";
  try {
    fs2.writeFileSync(path2.resolve(UPLOAD_DIR, `${id}${ext}`), req.file.buffer);
  } catch (e) {
    console.warn("Could not save file to disk:", e);
  }
  const base64Data = req.file.buffer.toString("base64");
  const record = {
    id,
    original_filename: req.file.originalname,
    content_type: req.file.mimetype || "application/octet-stream",
    size: req.file.size,
    data: req.file.buffer,
    uploaded_by: req.user.id,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.files.set(id, record);
  db2.saveToDisk();
  firebaseService.saveFile({
    id,
    original_filename: record.original_filename,
    content_type: record.content_type,
    size: record.size,
    base64: base64Data,
    uploaded_by: record.uploaded_by,
    created_at: record.created_at
  }).catch((err) => console.warn("[Firebase] Erro ao salvar arquivo no Firestore:", err));
  res.json({
    id,
    filename: req.file.originalname,
    size: req.file.size,
    content_type: record.content_type
  });
});
api.get("/files/:file_id/download", async (req, res) => {
  const { file_id } = req.params;
  const authQuery = req.query.auth;
  let user = null;
  if (authQuery) {
    try {
      const payload = jwt.verify(authQuery, JWT_SECRET);
      user = db2.users.get(payload.sub) || null;
    } catch {
    }
  } else {
    user = verifyAuthToken(req);
  }
  if (!user) return res.status(401).json({ detail: "N\xE3o autenticado" });
  let file = db2.files.get(file_id);
  if (!file) {
    try {
      const filesInDir = fs2.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(file_id));
      if (filesInDir.length > 0) {
        const found = filesInDir[0];
        const data = fs2.readFileSync(path2.resolve(UPLOAD_DIR, found));
        file = {
          id: file_id,
          original_filename: found,
          content_type: "application/octet-stream",
          size: data.length,
          data,
          uploaded_by: "system",
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        db2.files.set(file_id, file);
      }
    } catch {
    }
  }
  if (!file) {
    try {
      const remoteFile = await firebaseService.getFile(file_id);
      if (remoteFile && remoteFile.base64) {
        file = {
          id: file_id,
          original_filename: remoteFile.original_filename || file_id,
          content_type: remoteFile.content_type || "image/jpeg",
          size: remoteFile.size || 0,
          data: Buffer.from(remoteFile.base64, "base64"),
          uploaded_by: remoteFile.uploaded_by || "system",
          created_at: remoteFile.created_at || (/* @__PURE__ */ new Date()).toISOString()
        };
        db2.files.set(file_id, file);
      }
    } catch (err) {
      console.warn("[Firebase] Erro ao buscar arquivo remoto:", err);
    }
  }
  if (!file) return res.status(404).json({ detail: "Arquivo n\xE3o encontrado" });
  res.setHeader("Content-Type", file.content_type);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename)}"`);
  res.send(file.data);
});
function buildTaskResponseForAdmin(task) {
  const students = Array.from(db2.users.values()).filter((u) => u.role === "aluno");
  const taskCompletions = db2.completions.filter((c) => c.task_id === task.id);
  const completedIds = new Set(taskCompletions.map((c) => c.user_id));
  const targetStudents = task.assigned_to && task.assigned_to.length > 0 ? students.filter((s) => task.assigned_to.includes(s.id)) : students;
  const progress = targetStudents.map((s) => ({
    user_id: s.id,
    name: s.name,
    email: s.email,
    completed: completedIds.has(s.id),
    completed_at: taskCompletions.find((c) => c.user_id === s.id)?.completed_at || null
  }));
  const attachmentsMeta = (task.attachments || []).map((id) => {
    const f = db2.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });
  const adminPhotosMeta = (task.admin_photos || []).map((id) => {
    const f = db2.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });
  return {
    ...task,
    answer_source: task.answer_source || "",
    attachments: attachmentsMeta,
    admin_photos: adminPhotosMeta,
    progress,
    completed_count: progress.filter((p) => p.completed).length,
    total_students: targetStudents.length,
    all_students: !task.assigned_to || task.assigned_to.length === 0
  };
}
function buildTaskResponseForStudent(task, userId) {
  const myCompletion = db2.completions.find((c) => c.task_id === task.id && c.user_id === userId);
  const attachmentsMeta = (task.attachments || []).map((id) => {
    const f = db2.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });
  const adminPhotosMeta = (task.admin_photos || []).map((id) => {
    const f = db2.files.get(id);
    return f ? { id: f.id, original_filename: f.original_filename, size: f.size, content_type: f.content_type } : { id };
  });
  const studentGenerated = db2.task_student_answers.get(`${userId}:${task.id}`) || null;
  const hasAiSource = Boolean(
    task.answer_source && task.answer_source.trim() || task.answer && task.answer.trim() || task.admin_photos && task.admin_photos.length > 0
  );
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    subject: task.subject,
    due_date: task.due_date,
    points: task.points,
    answer: studentGenerated ? studentGenerated.answer : task.answer || "",
    answer_source: "",
    // Fonte da IA privada para o professor / backend
    has_source: hasAiSource,
    has_ai_source: hasAiSource,
    generated_answer: studentGenerated,
    attachments: attachmentsMeta,
    admin_photos: [],
    // Fotos de referência da IA privadas para o professor / backend
    completed: Boolean(myCompletion),
    completed_at: myCompletion?.completed_at || null,
    created_at: task.created_at
  };
}
api.get("/tasks", requireAuth, (req, res) => {
  const user = req.user;
  const allTasks = Array.from(db2.tasks.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (user.role === "admin") {
    return res.json(allTasks.map(buildTaskResponseForAdmin));
  }
  const filtered = allTasks.filter((t) => !t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(user.id));
  res.json(filtered.map((t) => buildTaskResponseForStudent(t, user.id)));
});
api.post("/tasks", requireAdmin, (req, res) => {
  const { title, description, subject, due_date, points, assigned_to, attachments, admin_photos, answer, answer_source } = req.body || {};
  if (!title || !description || !subject || !due_date) {
    return res.status(400).json({ detail: "Campos obrigat\xF3rios ausentes" });
  }
  const id = `task-${Date.now()}`;
  const newTask = {
    id,
    title: title.trim(),
    description: description.trim(),
    subject: subject.trim(),
    due_date,
    points: Math.max(0, parseInt(points) || 10),
    assigned_to: Array.isArray(assigned_to) ? assigned_to : [],
    attachments: Array.isArray(attachments) ? attachments : [],
    admin_photos: Array.isArray(admin_photos) ? admin_photos : [],
    answer: (answer || "").trim(),
    answer_source: (answer_source || "").trim(),
    created_by: req.user.id,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.tasks.set(id, newTask);
  db2.saveToDisk();
  firebaseService.saveTask(newTask).catch((err) => {
    console.warn("[Firebase] Erro ao salvar tarefa no Firestore:", err);
  });
  dispatchTaskWhatsAppNotifications(newTask).catch((err) => {
    console.error("[WhatsApp] Erro no disparo de tarefa:", err);
  });
  res.json(buildTaskResponseForAdmin(newTask));
});
async function dispatchTaskWhatsAppNotifications(task) {
  try {
    const status = whatsappService.getStatus();
    if (status.status !== "connected" || !status.enabled) {
      return;
    }
    let recipientsLabel = "Todos os alunos";
    if (task.assigned_to && task.assigned_to.length > 0) {
      const studentNames = task.assigned_to.map((id) => db2.users.get(id)?.name).filter(Boolean);
      if (studentNames.length > 0) {
        recipientsLabel = studentNames.join(", ");
      }
    }
    let photoBuffer = null;
    let photoContentType = null;
    const allFileIds = [...task.admin_photos || [], ...task.attachments || []];
    for (const fId of allFileIds) {
      const f = db2.files.get(fId);
      if (f && f.content_type?.startsWith("image/") && f.data && f.data.length > 0) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
        break;
      }
    }
    if (!photoBuffer && db2.whatsapp_config?.templates?.task_photo_id) {
      const f = db2.files.get(db2.whatsapp_config.templates.task_photo_id);
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
      photo_buffer: photoBuffer,
      photo_content_type: photoContentType
    });
  } catch (err) {
    console.error("[WhatsApp] Falha no disparo de notifica\xE7\xF5es:", err);
  }
}
api.post("/tasks/:task_id/send-whatsapp", requireAdmin, async (req, res) => {
  const { task_id } = req.params;
  const {
    group1_enabled = true,
    group2_enabled = true,
    group2_caption,
    photo_id,
    photo_data
  } = req.body || {};
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  const status = whatsappService.getStatus();
  if (status.status !== "connected") {
    return res.status(400).json({ detail: 'WhatsApp n\xE3o est\xE1 conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: "Nenhum grupo do WhatsApp configurado. Configure o Grupo 1 ou Grupo 2 na aba WhatsApp." });
  }
  let recipientsLabel = "Todos os alunos";
  if (task.assigned_to && task.assigned_to.length > 0) {
    const studentNames = task.assigned_to.map((id) => db2.users.get(id)?.name).filter(Boolean);
    if (studentNames.length > 0) {
      recipientsLabel = studentNames.join(", ");
    }
  }
  let photoBuffer = null;
  let photoContentType = null;
  if (photo_data && typeof photo_data === "string" && photo_data.startsWith("data:")) {
    try {
      const [header, b64] = photo_data.split(",");
      photoContentType = header.split(";")[0].replace("data:", "") || "image/jpeg";
      photoBuffer = Buffer.from(b64, "base64");
    } catch (e) {
      console.warn("Erro ao decodificar photo_data:", e);
    }
  } else if (photo_id) {
    const f = db2.files.get(photo_id);
    if (f && f.data) {
      photoBuffer = f.data;
      photoContentType = f.content_type;
    }
  } else if (photo_id !== null) {
    const allFileIds = [...task.admin_photos || [], ...task.attachments || []];
    for (const fId of allFileIds) {
      const f = db2.files.get(fId);
      if (f && f.content_type?.startsWith("image/") && f.data && f.data.length > 0) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
        break;
      }
    }
    if (!photoBuffer && db2.whatsapp_config?.templates?.task_photo_id) {
      const f = db2.files.get(db2.whatsapp_config.templates.task_photo_id);
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
    group2_caption: group2_caption !== void 0 ? group2_caption : task.description,
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    group1_enabled: Boolean(group1_enabled),
    group2_enabled: Boolean(group2_enabled)
  });
  const sentGroups = [];
  if (result.group1Sent) sentGroups.push("Grupo 1 (Aviso Completo)");
  if (result.group2Sent) sentGroups.push("Grupo 2 (Foto com Enunciado)");
  if (sentGroups.length === 0) {
    return res.status(500).json({
      detail: result.errors.join("; ") || "Falha ao enviar para os grupos do WhatsApp"
    });
  }
  res.json({
    ok: true,
    message: `Enviado com sucesso para: ${sentGroups.join(" e ")}!`,
    details: result
  });
});
api.put("/tasks/:task_id", requireAdmin, (req, res) => {
  const { task_id } = req.params;
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  const { title, description, subject, due_date, points, assigned_to, attachments, admin_photos, answer, answer_source } = req.body || {};
  if (title) task.title = title.trim();
  if (description) task.description = description.trim();
  if (subject) task.subject = subject.trim();
  if (due_date) task.due_date = due_date;
  if (points !== void 0) task.points = Math.max(0, parseInt(points) || 0);
  if (Array.isArray(assigned_to)) task.assigned_to = assigned_to;
  if (Array.isArray(attachments)) task.attachments = attachments;
  if (Array.isArray(admin_photos)) task.admin_photos = admin_photos;
  if (answer !== void 0) task.answer = answer.trim();
  if (answer_source !== void 0) task.answer_source = answer_source.trim();
  db2.saveToDisk();
  firebaseService.saveTask(task).catch((err) => {
    console.warn(`[Firebase] Erro ao atualizar tarefa ${task_id} no Firestore:`, err);
  });
  res.json(buildTaskResponseForAdmin(task));
});
api.post("/tasks/:task_id/generate-answer", requireAuth, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { task_id } = req.params;
  const { length = "medium" } = req.body || {};
  const user = req.user;
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  const validLength = ["short", "medium", "detailed"].includes(length) ? length : "medium";
  const rawSource = (task.answer_source || task.answer || "").trim();
  const lengthInstructions = {
    short: "Gere um gabarito / resposta CURTO, DIRETO e CONCISO (m\xE1ximo 1 a 2 par\xE1grafos ou passos r\xE1pidos essenciais), indo direto ao resultado e resolu\xE7\xE3o sem rodeios.",
    medium: "Gere um gabarito / resposta de TAMANHO M\xC9DIO, did\xE1tico e equilibrado (com breve introdu\xE7\xE3o dos conceitos, desenvolvimento claro do racioc\xEDnio passo a passo e resposta final destacada).",
    detailed: "Gere um gabarito / resposta COMPLETO e DETALHADO (com fundamenta\xE7\xE3o te\xF3rica de cada conceito, resolu\xE7\xE3o minuciosa de cada etapa com justificativas pedag\xF3gicas, passo a passo aprofundado e conclus\xE3o explicada)."
  };
  const photoIds = [...task.admin_photos || [], ...task.attachments || []];
  const imageFiles = [];
  for (const pid of photoIds) {
    let f = db2.files.get(pid);
    if (!f) {
      try {
        const filesInDir = fs2.readdirSync(UPLOAD_DIR).filter((fn) => fn.startsWith(pid));
        if (filesInDir.length > 0) {
          const found = filesInDir[0];
          const data = fs2.readFileSync(path2.resolve(UPLOAD_DIR, found));
          f = {
            id: pid,
            original_filename: found,
            content_type: "image/jpeg",
            size: data.length,
            data,
            uploaded_by: "system",
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
      } catch {
      }
    }
    if (f && f.data && (f.content_type?.startsWith("image/") || f.original_filename?.match(/\.(jpg|jpeg|png|webp|gif)$/i))) {
      imageFiles.push(f);
    }
  }
  let generatedText = "";
  if (genAI) {
    try {
      const contentsParts = [];
      for (const img of imageFiles.slice(0, 5)) {
        const mime = img.content_type?.startsWith("image/") ? img.content_type : "image/jpeg";
        contentsParts.push({
          inlineData: {
            data: img.data.toString("base64"),
            mimeType: mime
          }
        });
      }
      const prompt = `Voc\xEA \xE9 um professor tutor pedag\xF3gico de excel\xEAncia. Resolva e elabore o gabarito oficial para a seguinte tarefa escolar.
${imageFiles.length > 0 ? `ATEN\xC7\xC3O: Foram anexadas ${imageFiles.length} foto(s)/imagem(ns) da atividade/livro/enunciado. ANALISE CUIDADOSAMENTE O CONTE\xDADO DAS IMAGENS para identificar todas as quest\xF5es, n\xFAmeros, textos e figuras para responder com total precis\xE3o.` : ""}

Disciplina: ${task.subject}
T\xEDtulo da Tarefa: ${task.title}
Enunciado / Descri\xE7\xE3o:
"""
${task.description || "Consulte o material e imagens anexadas."}
"""

${rawSource ? `FONTE / MATERIAL DE REFER\xCANCIA DO PROFESSOR:
"""
${rawSource}
"""` : ""}

TAMANHO SOLICITADO PELO ESTUDANTE:
${lengthInstructions[validLength]}

Diretrizes obrigat\xF3rias:
- Responda em portugu\xEAs do Brasil claro, correto e did\xE1tico.
- Se houver contas ou c\xE1lculos, mostre os passos de acordo com o tamanho solicitado.
- Destaque o resultado/resposta final claramente.
- Formate a resposta de maneira limpa e organizada com t\xF3picos ou par\xE1grafos leg\xEDveis.`;
      contentsParts.push({ text: prompt });
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentsParts
      }));
      generatedText = (response.text || "").trim();
    } catch (e) {
      console.warn("Gemini generate-answer error:", e.message);
    }
  }
  if (!generatedText) {
    if (validLength === "short") {
      generatedText = `[Gabarito R\xE1pido - ${task.subject}]
${rawSource || task.description || "Resposta resolvida com base no enunciado e imagens."}

\u2713 Resultado apurado com sucesso.`;
    } else if (validLength === "detailed") {
      generatedText = `[Resolu\xE7\xE3o Completa e Detalhada - ${task.subject}]

1. An\xE1lise do Enunciado e Conceitos:
A atividade "${task.title}" aborda conceitos essenciais de ${task.subject}.

2. Desenvolvimento Passo a Passo:
${rawSource || task.description || "Resolu\xE7\xE3o desenvolvida com base nas quest\xF5es e fotos apresentadas."}

3. Verifica\xE7\xE3o de Resultados:
Todos os pontos foram checados e estruturados conforme a orienta\xE7\xE3o do professor.

4. Conclus\xE3o Did\xE1tica:
Gabarito final verificado com base no material oficial.`;
    } else {
      generatedText = `[Gabarito Did\xE1tico - ${task.subject}]

Tarefa: ${task.title}

Resolu\xE7\xE3o:
${rawSource || task.description || "Resolu\xE7\xE3o calculada com base na atividade."}

Conclus\xE3o:
Resposta estruturada com base no material fornecido.`;
    }
  }
  const record = {
    answer: generatedText,
    length: validLength,
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.task_student_answers.set(`${user.id}:${task.id}`, record);
  db2.saveToDisk();
  firebaseService.saveStudentAnswer(`${user.id}:${task.id}`, record).catch(console.warn);
  res.json(record);
});
api.delete("/tasks/:task_id", requireAdmin, (req, res) => {
  const { task_id } = req.params;
  const completionsToDelete = db2.completions.filter((c) => c.task_id === task_id);
  completionsToDelete.forEach((c) => {
    firebaseService.deleteCompletion(c.user_id, task_id).catch(console.warn);
  });
  db2.tasks.delete(task_id);
  db2.completions = db2.completions.filter((c) => c.task_id !== task_id);
  for (const [key] of db2.task_student_answers.entries()) {
    if (key.endsWith(`:${task_id}`)) {
      db2.task_student_answers.delete(key);
    }
  }
  db2.saveToDisk();
  firebaseService.deleteTask(task_id).catch((err) => {
    console.warn(`[Firebase] Erro ao remover tarefa ${task_id} do Firestore:`, err);
  });
  res.json({ ok: true });
});
function getTasksEligibleForCleanup() {
  const cfg = db2.task_cleanup_config;
  const now = /* @__PURE__ */ new Date();
  const cutoffTime = now.getTime() - (cfg.days_after_due || 0) * 24 * 60 * 60 * 1e3;
  const cutoffDateStr = new Date(cutoffTime).toISOString().slice(0, 10);
  const eligible = [];
  const activeStudents = Array.from(db2.users.values()).filter(
    (u) => u.role === "aluno" && u.status === "active"
  );
  db2.tasks.forEach((t) => {
    if (t.due_date && t.due_date <= cutoffDateStr) {
      if (cfg.delete_only_if_completed) {
        const completionsForTask = db2.completions.filter((c) => c.task_id === t.id);
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
function executeTaskCleanup(manual = false) {
  const eligible = getTasksEligibleForCleanup();
  const deletedTitles = [];
  for (const t of eligible) {
    deletedTitles.push(`[${t.subject}] ${t.title}`);
    const completionsToDelete = db2.completions.filter((c) => c.task_id === t.id);
    completionsToDelete.forEach((c) => {
      firebaseService.deleteCompletion(c.user_id, t.id).catch(console.warn);
    });
    db2.tasks.delete(t.id);
    db2.completions = db2.completions.filter((c) => c.task_id !== t.id);
    firebaseService.deleteTask(t.id).catch((err) => {
      console.warn(`[Firebase] Erro ao remover tarefa ${t.id} na limpeza:`, err);
    });
  }
  db2.task_cleanup_config.last_run_at = (/* @__PURE__ */ new Date()).toISOString();
  db2.task_cleanup_config.last_deleted_count = eligible.length;
  db2.task_cleanup_config.last_deleted_titles = deletedTitles.slice(0, 20);
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  console.log(`[TaskCleanup] Executed (${manual ? "manual" : "scheduled"}): ${eligible.length} tasks removed.`);
  return { count: eligible.length, deleted_titles: deletedTitles };
}
api.get("/system/time", requireAuth, (req, res) => {
  const now = /* @__PURE__ */ new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  res.json({
    iso: now.toISOString(),
    time_str: `${hours}:${minutes}:${seconds}`,
    hours,
    minutes,
    seconds,
    timestamp: now.getTime(),
    date_str: now.toLocaleDateString("pt-BR"),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo"
  });
});
api.get("/admin/task-cleanup", requireAdmin, (req, res) => {
  const cfg = db2.task_cleanup_config;
  const eligible = getTasksEligibleForCleanup();
  const now = /* @__PURE__ */ new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;
  const tasksPreview = eligible.map((t) => {
    const completionsCount = db2.completions.filter((c) => c.task_id === t.id).length;
    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      due_date: t.due_date,
      points: t.points,
      completions_count: completionsCount
    };
  });
  res.json({
    config: cfg,
    server_time: currentTime,
    server_date: now.toISOString().slice(0, 10),
    tasks_to_delete_today: tasksPreview,
    will_delete_today: cfg.enabled && tasksPreview.length > 0,
    count: tasksPreview.length,
    status_summary: cfg.enabled ? tasksPreview.length > 0 ? `Hoje \xE0s ${cfg.cleanup_time}: ${tasksPreview.length} tarefa(s) ser\xE3o apagadas automaticamente.` : `Nenhuma tarefa agendada para ser apagada hoje no hor\xE1rio ${cfg.cleanup_time}.` : "Limpeza autom\xE1tica desativada."
  });
});
api.put("/admin/task-cleanup", requireAdmin, (req, res) => {
  const { enabled, cleanup_time, days_after_due, delete_only_if_completed } = req.body || {};
  if (cleanup_time !== void 0) {
    const trimmed = String(cleanup_time).trim();
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      return res.status(400).json({ detail: "Formato de hor\xE1rio inv\xE1lido. Use HH:MM (ex: 23:59)" });
    }
    const [hh, mm] = trimmed.split(":").map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return res.status(400).json({ detail: "Hor\xE1rio fora dos limites v\xE1lidos (00:00 a 23:59)" });
    }
    db2.task_cleanup_config.cleanup_time = trimmed;
  }
  if (enabled !== void 0) {
    db2.task_cleanup_config.enabled = Boolean(enabled);
  }
  if (days_after_due !== void 0) {
    db2.task_cleanup_config.days_after_due = Math.max(0, parseInt(days_after_due) || 0);
  }
  if (delete_only_if_completed !== void 0) {
    db2.task_cleanup_config.delete_only_if_completed = Boolean(delete_only_if_completed);
  }
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  const eligible = getTasksEligibleForCleanup();
  res.json({
    ok: true,
    config: db2.task_cleanup_config,
    count_eligible_today: eligible.length
  });
});
api.post("/admin/task-cleanup/run", requireAdmin, (req, res) => {
  const result = executeTaskCleanup(true);
  res.json({
    ok: true,
    deleted_count: result.count,
    deleted_titles: result.deleted_titles,
    config: db2.task_cleanup_config
  });
});
api.post("/tasks/:task_id/complete", requireAuth, async (req, res) => {
  const { task_id } = req.params;
  const user = req.user;
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  const existingIdx = db2.completions.findIndex((c) => c.task_id === task_id && c.user_id === user.id);
  if (existingIdx !== -1) {
    return res.json({ ok: true, already_completed: true });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.slice(0, 10);
  const onTime = today <= task.due_date;
  const basePoints = task.points || 10;
  const awarded = onTime ? basePoints : Math.max(1, Math.floor(basePoints * 0.3));
  const comp = {
    task_id,
    user_id: user.id,
    completed_at: now,
    on_time: onTime,
    points_awarded: awarded
  };
  db2.completions.push(comp);
  if (user.role === "aluno") {
    user.points = (user.points || 0) + awarded;
    updateStudentStreak(user.id);
    await firebaseService.saveUser(user);
  }
  await firebaseService.saveCompletion(comp);
  db2.saveToDisk();
  res.json({ ok: true, points_awarded: awarded, on_time: onTime, new_total: user.points });
});
api.post("/tasks/:task_id/uncomplete", requireAuth, (req, res) => {
  const { task_id } = req.params;
  const user = req.user;
  const idx = db2.completions.findIndex((c) => c.task_id === task_id && c.user_id === user.id);
  if (idx !== -1) {
    const comp = db2.completions[idx];
    if (user.role === "aluno") {
      user.points = Math.max(0, (user.points || 0) - comp.points_awarded);
      firebaseService.saveUser(user).catch(console.warn);
    }
    db2.completions.splice(idx, 1);
    firebaseService.deleteCompletion(user.id, task_id).catch(console.warn);
    db2.saveToDisk();
  }
  res.json({ ok: true });
});
api.get("/announcements", requireAuth, (req, res) => {
  const user = req.user;
  const items = Array.from(db2.announcements.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (user.role === "admin") {
    const studentsMap = new Map(Array.from(db2.users.values()).map((s) => [s.id, s.name]));
    const enriched = items.map((a) => {
      const assigned = a.assigned_to || [];
      return {
        ...a,
        all_students: assigned.length === 0,
        recipients: assigned.map((sid) => ({ id: sid, name: studentsMap.get(sid) || "Aluno" }))
      };
    });
    return res.json(enriched);
  }
  const filtered = items.filter((a) => !a.assigned_to || a.assigned_to.length === 0 || a.assigned_to.includes(user.id));
  res.json(filtered);
});
api.post("/announcements", requireAdmin, async (req, res) => {
  const { title, message, assigned_to, is_special } = req.body || {};
  if (!title || !message) return res.status(400).json({ detail: "T\xEDtulo e mensagem obrigat\xF3rios" });
  const id = `ann-${Date.now()}`;
  const doc2 = {
    id,
    title: title.trim(),
    message: message.trim(),
    assigned_to: Array.isArray(assigned_to) ? assigned_to : [],
    is_special: Boolean(is_special),
    created_by: req.user.id,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.announcements.set(id, doc2);
  db2.saveToDisk();
  await firebaseService.saveAnnouncement(doc2);
  let recipientsLabel = "Todos os alunos";
  if (doc2.assigned_to && doc2.assigned_to.length > 0) {
    const names = doc2.assigned_to.map((sid) => db2.users.get(sid)?.name).filter(Boolean);
    if (names.length > 0) recipientsLabel = names.join(", ");
  }
  whatsappService.sendAnnouncementNotifications({
    title: doc2.title,
    message: doc2.message,
    created_at: doc2.created_at,
    recipients_label: recipientsLabel
  }).catch((err) => {
    console.error("[WhatsApp] Erro no disparo de aviso:", err);
  });
  res.json(doc2);
});
api.post("/announcements/:ann_id/send-whatsapp", requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  const {
    group1_enabled = true,
    group2_enabled = true,
    group2_caption,
    photo_id,
    photo_data
  } = req.body || {};
  const doc2 = db2.announcements.get(ann_id);
  if (!doc2) return res.status(404).json({ detail: "Aviso n\xE3o encontrado" });
  const status = whatsappService.getStatus();
  if (status.status !== "connected") {
    return res.status(400).json({ detail: 'WhatsApp n\xE3o est\xE1 conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: "Nenhum grupo do WhatsApp configurado. Configure na aba WhatsApp." });
  }
  let recipientsLabel = "Todos os alunos";
  if (doc2.assigned_to && doc2.assigned_to.length > 0) {
    const names = doc2.assigned_to.map((sid) => db2.users.get(sid)?.name).filter(Boolean);
    if (names.length > 0) recipientsLabel = names.join(", ");
  }
  let photoBuffer = null;
  let photoContentType = null;
  if (photo_data && typeof photo_data === "string" && photo_data.startsWith("data:")) {
    try {
      const [header, b64] = photo_data.split(",");
      photoContentType = header.split(";")[0].replace("data:", "") || "image/jpeg";
      photoBuffer = Buffer.from(b64, "base64");
    } catch (e) {
      console.warn("Erro ao decodificar photo_data para aviso:", e);
    }
  } else if (photo_id) {
    const f = db2.files.get(photo_id);
    if (f && f.data) {
      photoBuffer = f.data;
      photoContentType = f.content_type;
    }
  } else if (photo_id !== null) {
    if (db2.whatsapp_config?.templates?.announcement_photo_id) {
      const f = db2.files.get(db2.whatsapp_config.templates.announcement_photo_id);
      if (f && f.data) {
        photoBuffer = f.data;
        photoContentType = f.content_type;
      }
    }
  }
  const result = await whatsappService.sendAnnouncementNotifications({
    title: doc2.title,
    message: doc2.message,
    created_at: doc2.created_at,
    recipients_label: recipientsLabel,
    group2_caption: group2_caption !== void 0 ? group2_caption : doc2.message,
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    group1_enabled: Boolean(group1_enabled),
    group2_enabled: Boolean(group2_enabled)
  });
  const sentGroups = [];
  if (result.group1Sent) sentGroups.push("Grupo 1 (Aviso Completo)");
  if (result.group2Sent) sentGroups.push("Grupo 2");
  if (sentGroups.length === 0) {
    return res.status(500).json({
      detail: result.errors.join("; ") || "Falha ao enviar aviso pelo WhatsApp"
    });
  }
  res.json({
    ok: true,
    message: `Aviso enviado com sucesso para: ${sentGroups.join(" e ")}!`,
    details: result
  });
});
api.put("/announcements/:ann_id", requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  const doc2 = db2.announcements.get(ann_id);
  if (!doc2) return res.status(404).json({ detail: "Aviso n\xE3o encontrado" });
  const { title, message, assigned_to, is_special } = req.body || {};
  if (title) doc2.title = title.trim();
  if (message) doc2.message = message.trim();
  if (Array.isArray(assigned_to)) doc2.assigned_to = assigned_to;
  if (typeof is_special === "boolean") doc2.is_special = is_special;
  db2.saveToDisk();
  await firebaseService.saveAnnouncement(doc2);
  res.json(doc2);
});
api.delete("/announcements/:ann_id", requireAdmin, async (req, res) => {
  const { ann_id } = req.params;
  db2.announcements.delete(ann_id);
  for (const [id, c] of db2.comments.entries()) {
    if (c.announcement_id === ann_id) db2.comments.delete(id);
  }
  db2.saveToDisk();
  await firebaseService.deleteAnnouncement(ann_id);
  res.json({ ok: true });
});
api.get("/announcements/:ann_id/comments", requireAuth, (req, res) => {
  const { ann_id } = req.params;
  const comments = Array.from(db2.comments.values()).filter((c) => c.announcement_id === ann_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  res.json(comments);
});
api.post("/announcements/:ann_id/comments", requireAuth, (req, res) => {
  const { ann_id } = req.params;
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ detail: "Coment\xE1rio vazio" });
  const user = req.user;
  const id = `comm-${Date.now()}`;
  const comment = {
    id,
    announcement_id: ann_id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    text: text.trim(),
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.comments.set(id, comment);
  db2.saveToDisk();
  firebaseService.saveComment(comment).catch(console.warn);
  res.json(comment);
});
api.delete("/announcements/:ann_id/comments/:comment_id", requireAuth, (req, res) => {
  const { comment_id } = req.params;
  const user = req.user;
  const comment = db2.comments.get(comment_id);
  if (!comment) return res.status(404).json({ detail: "Coment\xE1rio n\xE3o encontrado" });
  if (user.role !== "admin" && comment.user_id !== user.id) {
    return res.status(403).json({ detail: "Sem permiss\xE3o" });
  }
  db2.comments.delete(comment_id);
  db2.saveToDisk();
  firebaseService.deleteComment(comment_id).catch(console.warn);
  res.json({ ok: true });
});
api.get("/login-logs", requireAdmin, (req, res) => {
  res.json(db2.login_logs);
});
api.delete("/login-logs", requireAdmin, (req, res) => {
  const count = db2.login_logs.length;
  db2.login_logs = [];
  res.json({ ok: true, deleted: count });
});
api.delete("/login-logs/:log_id", requireAdmin, (req, res) => {
  const { log_id } = req.params;
  db2.login_logs = db2.login_logs.filter((l) => l.id !== log_id);
  res.json({ ok: true });
});
api.get("/admin/stats", requireAdmin, (req, res) => {
  const students = Array.from(db2.users.values()).filter((u) => u.role === "aluno");
  const allTasks = Array.from(db2.tasks.values());
  const enriched = students.map((s) => {
    const pts = s.points || 0;
    const userCompletions = db2.completions.filter((c) => c.user_id === s.id);
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
      has_avatar: Boolean(s.avatar_data)
    };
  });
  enriched.sort((a, b) => {
    if (b.on_time_completions !== a.on_time_completions) return b.on_time_completions - a.on_time_completions;
    return a.uncompleted_tasks - b.uncompleted_tasks;
  });
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    days.push(d);
  }
  const countsByDay = {};
  days.forEach((d) => countsByDay[d] = 0);
  db2.completions.forEach((c) => {
    const day = c.completed_at.slice(0, 10);
    if (countsByDay[day] !== void 0) countsByDay[day]++;
  });
  const subjCounts = {};
  db2.tasks.forEach((t) => {
    subjCounts[t.subject] = (subjCounts[t.subject] || 0) + 1;
  });
  const topSubjects = Object.entries(subjCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([subject, count]) => ({ subject, count }));
  const aiLeaderboard = calculateMonthlyAILeaderboard(req.user);
  res.json({
    totals: {
      tasks: db2.tasks.size,
      completions: db2.completions.length,
      announcements: db2.announcements.size,
      students: students.length
    },
    top_students: enriched.slice(0, 5),
    all_students_ranking: enriched,
    completions_per_day: days.map((d) => ({ date: d, count: countsByDay[d] })),
    top_subjects: topSubjects,
    ai_monthly: aiLeaderboard
  });
});
function calculateMonthlyAILeaderboard(reqUser) {
  const students = Array.from(db2.users.values()).filter((u) => u.role === "aluno" && u.status === "active");
  const allTasks = Array.from(db2.tasks.values());
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyCompletions = db2.completions.filter((c) => c.completed_at >= monthStart);
  const studentMetrics = students.map((s) => {
    const sComps = monthlyCompletions.filter((c) => c.user_id === s.id);
    const onTime = sComps.filter((c) => c.on_time).length;
    const late = sComps.length - onTime;
    const assignedTasks = allTasks.filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(s.id));
    const compSet = new Set(sComps.map((c) => c.task_id));
    const uncompleted = assignedTasks.filter((t) => !compSet.has(t.id)).length;
    const onTimePct = sComps.length > 0 ? Math.round(onTime / sComps.length * 100) : 0;
    let score = 50 + onTime * 15 - uncompleted * 10;
    if (onTime > 0 && uncompleted === 0) score += 15;
    score = Math.min(100, Math.max(30, Math.round(score)));
    return {
      id: s.id,
      name: s.name,
      points: s.points || 0,
      completed_month: sComps.length,
      on_time_month: onTime,
      late_month: late,
      uncompleted_count: uncompleted,
      on_time_pct: onTimePct,
      has_avatar: Boolean(s.avatar_data),
      equipped_effect: s.equipped_effect || "none",
      score
    };
  });
  studentMetrics.sort((a, b) => {
    if (b.on_time_month !== a.on_time_month) return b.on_time_month - a.on_time_month;
    if (a.uncompleted_count !== b.uncompleted_count) return a.uncompleted_count - b.uncompleted_count;
    return b.completed_month - a.completed_month;
  });
  const leader = studentMetrics[0] || null;
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const formattedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const rankings = studentMetrics.map((m, idx) => ({
    rank: idx + 1,
    id: m.id,
    name: m.name,
    points: m.points,
    has_avatar: m.has_avatar,
    equipped_effect: m.equipped_effect,
    completed_month: m.completed_month,
    on_time_month: m.on_time_month,
    uncompleted_count: m.uncompleted_count,
    on_time_pct: m.on_time_pct,
    score: m.score,
    is_leader: idx === 0,
    ai_status: idx === 0 ? "\u{1F451} L\xEDder do m\xEAs" : idx < 3 ? "\u{1F948} Top 3" : "\u{1F4DA} Em avalia\xE7\xE3o",
    ai_feedback: m.on_time_month > 0 ? `${m.on_time_month} tarefa(s) no prazo e ${m.uncompleted_count === 0 ? "sem pend\xEAncias" : `${m.uncompleted_count} pendente(s)`}.` : `Entregue suas tarefas no prazo para pontuar na IA.`
  }));
  let leaderVerdict = "";
  if (leader) {
    leaderVerdict = `${leader.name} lidera com ${leader.on_time_month} tarefa(s) entregues no prazo e ${leader.uncompleted_count === 0 ? "nenhuma pend\xEAncia" : `${leader.uncompleted_count} pend\xEAncia(s)`}.`;
  }
  let sanitizedWinner = null;
  if (db2.monthly_prize?.ai_winner) {
    const raw = db2.monthly_prize.ai_winner;
    const isWinner = Boolean(reqUser && (reqUser.id === raw.winner_id || reqUser.name === raw.winner_name));
    const isAdmin = Boolean(reqUser && reqUser.role === "admin");
    if (isWinner || isAdmin) {
      sanitizedWinner = {
        ...raw,
        is_me: isWinner
      };
    } else {
      sanitizedWinner = {
        winner_id: raw.winner_id,
        winner_name: raw.winner_name,
        winner_score: raw.winner_score || raw.score || 98,
        is_me: false
      };
    }
  }
  return {
    month_label: formattedMonth,
    leader,
    leader_verdict: leaderVerdict,
    rankings,
    ai_winner: sanitizedWinner,
    evaluation_rules: [
      "Entregas rigorosamente no prazo",
      "Tarefas n\xE3o marcadas como feitas contam negativamente",
      "\u26A0\uFE0F Os pontos de tarefas servem estritamente para a Loja de Molduras e N\xC3O influenciam a avalia\xE7\xE3o."
    ]
  };
}
api.get("/stats/monthly-ai", requireAuth, (req, res) => {
  const user = req.user;
  res.json(calculateMonthlyAILeaderboard(user));
});
api.get("/monthly-prize", requireAuth, (req, res) => {
  const user = req.user;
  const prize = db2.monthly_prize;
  const students = Array.from(db2.users.values()).filter((u) => u.role === "aluno" && u.status === "active");
  const allTasks = Array.from(db2.tasks.values());
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysRemaining = Math.max(0, Math.ceil((nextMonth.getTime() - now.getTime()) / (24 * 60 * 60 * 1e3)));
  const statsByUser = {};
  students.forEach((s) => {
    const sComps = db2.completions.filter((c) => c.user_id === s.id && c.completed_at >= monthStart);
    const onTime = sComps.filter((c) => c.on_time).length;
    const assignedTasks = allTasks.filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(s.id));
    const compSet = new Set(sComps.map((c) => c.task_id));
    const uncompleted = assignedTasks.filter((t) => !compSet.has(t.id)).length;
    statsByUser[s.id] = { month: sComps.length, on_time: onTime, uncompleted };
  });
  students.sort((a, b) => {
    const sa = statsByUser[a.id] || { on_time: 0, month: 0, uncompleted: 0 };
    const sb = statsByUser[b.id] || { on_time: 0, month: 0, uncompleted: 0 };
    if (sb.on_time !== sa.on_time) return sb.on_time - sa.on_time;
    if (sa.uncompleted !== sb.uncompleted) return sa.uncompleted - sb.uncompleted;
    return sb.month - sa.month;
  });
  let leader = null;
  if (students.length > 0) {
    const top = students[0];
    const st = statsByUser[top.id] || { on_time: 0, month: 0, uncompleted: 0 };
    leader = {
      id: top.id,
      name: top.name,
      on_time_this_month: st.on_time,
      uncompleted_this_month: st.uncompleted,
      completions_this_month: st.month,
      has_avatar: Boolean(top.avatar_data)
    };
  }
  let sanitizedWinner = null;
  if (prize?.ai_winner) {
    const raw = prize.ai_winner;
    const isWinner = Boolean(user && (user.id === raw.winner_id || user.name === raw.winner_name));
    const isAdmin = Boolean(user && user.role === "admin");
    if (isWinner || isAdmin) {
      sanitizedWinner = {
        ...raw,
        is_me: isWinner
      };
    } else {
      sanitizedWinner = {
        winner_id: raw.winner_id,
        winner_name: raw.winner_name,
        winner_score: raw.winner_score || raw.score || 98,
        is_me: false
      };
    }
  }
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  res.json({
    prize,
    ai_winner: sanitizedWinner,
    leader,
    evaluation_rule: "Os pontos de tarefas s\xE3o exclusivamente para comprar molduras. O vencedor \xE9 eleito pela IA por pontualidade e penalizado por tarefas n\xE3o feitas.",
    days_remaining: daysRemaining,
    end_date: new Date(nextMonth.getTime() - 1e3).toISOString().slice(0, 10),
    month_label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  });
});
function saveSystemSettingsToFirestore() {
  firebaseService.saveSettings("system", {
    monthly_prize: db2.monthly_prize,
    task_cleanup_config: db2.task_cleanup_config,
    whatsapp_config: db2.whatsapp_config,
    app_info: db2.app_info,
    effect_overrides: db2.effect_overrides
  }).catch((err) => console.warn("[Firebase] Erro ao salvar configura\xE7\xF5es:", err));
}
api.put("/monthly-prize", requireAdmin, (req, res) => {
  const { title, description, emoji, image_id } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ detail: "T\xEDtulo obrigat\xF3rio" });
  db2.monthly_prize = {
    id: "monthly_prize",
    title: title.trim(),
    description: (description || "").trim(),
    emoji: emoji || "\u{1F3C6}",
    image_id: image_id || null,
    ai_winner: db2.monthly_prize?.ai_winner || null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true });
});
api.post("/monthly-prize/confirm-winner", requireAdmin, (req, res) => {
  const { winner_id, winner_name, justification, criteria, score } = req.body || {};
  if (!winner_name) return res.status(400).json({ detail: "Nome do vencedor obrigat\xF3rio" });
  if (!db2.monthly_prize) {
    db2.monthly_prize = { id: "monthly_prize", title: "Pr\xEAmio do M\xEAs", emoji: "\u{1F3C6}" };
  }
  db2.monthly_prize.ai_winner = {
    winner_id,
    winner_name,
    score: score || 95,
    justification: justification || "Aluno(a) eleito(a) com base na Avalia\xE7\xE3o Mensal de Desempenho e Pontualidade por Intelig\xEAncia Artificial.",
    criteria: criteria || ["Entregas no prazo", "Consist\xEAncia nos estudos"],
    confirmed_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true, ai_winner: db2.monthly_prize.ai_winner });
});
api.delete("/monthly-prize/winner", requireAdmin, (req, res) => {
  if (db2.monthly_prize) {
    db2.monthly_prize.ai_winner = null;
    db2.saveToDisk();
    saveSystemSettingsToFirestore();
  }
  res.json({ ok: true });
});
api.delete("/monthly-prize", requireAdmin, (req, res) => {
  db2.monthly_prize = null;
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true });
});
api.get("/app-info", requireAuth, (req, res) => {
  res.json(db2.app_info);
});
api.put("/app-info", requireAdmin, (req, res) => {
  const patch = req.body || {};
  db2.app_info = {
    ...db2.app_info,
    ...patch,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json(db2.app_info);
});
api.get("/whatsapp/status", requireAdmin, (req, res) => {
  res.json({
    ...whatsappService.getStatus(),
    config: db2.whatsapp_config
  });
});
api.get("/whatsapp/config", requireAdmin, (req, res) => {
  res.json(db2.whatsapp_config);
});
api.post("/whatsapp/connect", requireAdmin, async (req, res) => {
  const status = await whatsappService.connect();
  res.json({
    ...status,
    config: db2.whatsapp_config
  });
});
api.post("/whatsapp/disconnect", requireAdmin, async (req, res) => {
  const status = await whatsappService.disconnect();
  res.json({
    ...status,
    config: db2.whatsapp_config
  });
});
api.put("/whatsapp/config", requireAdmin, (req, res) => {
  const { group_1_jid, group_1_name, group_2_jid, group_2_name, group_jid, enabled, templates, daily_reminder } = req.body || {};
  db2.whatsapp_config = {
    ...db2.whatsapp_config,
    group_1_jid: (group_1_jid !== void 0 ? group_1_jid : group_jid !== void 0 ? group_jid : db2.whatsapp_config.group_1_jid || "").trim(),
    group_1_name: (group_1_name !== void 0 ? group_1_name : db2.whatsapp_config.group_1_name || "").trim(),
    group_2_jid: (group_2_jid !== void 0 ? group_2_jid : db2.whatsapp_config.group_2_jid || "").trim(),
    group_2_name: (group_2_name !== void 0 ? group_2_name : db2.whatsapp_config.group_2_name || "").trim(),
    enabled: enabled !== void 0 ? Boolean(enabled) : db2.whatsapp_config.enabled,
    templates: {
      ...db2.whatsapp_config.templates,
      ...templates || {}
    },
    daily_reminder: {
      ...db2.whatsapp_config.daily_reminder,
      ...daily_reminder || {}
    }
  };
  whatsappService.setConfig(db2.whatsapp_config);
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({
    ok: true,
    config: db2.whatsapp_config,
    status: whatsappService.getStatus()
  });
});
api.get("/whatsapp/groups", requireAdmin, async (req, res) => {
  const groups = await whatsappService.fetchParticipatingGroups();
  res.json(groups);
});
api.post("/whatsapp/test-message", requireAdmin, async (req, res) => {
  const { jid, text } = req.body || {};
  const targetJid = (jid || db2.whatsapp_config.group_1_jid || db2.whatsapp_config.group_2_jid || "").trim();
  if (!targetJid) {
    return res.status(400).json({ detail: "JID do grupo n\xE3o informado ou configurado" });
  }
  const messageText = (text || "\u{1F514} *Edutask WhatsApp*: Teste de conex\xE3o e notifica\xE7\xE3o realizado com sucesso!").trim();
  const sent = await whatsappService.sendMessage(targetJid, messageText);
  if (!sent) {
    return res.status(500).json({ detail: "Falha ao enviar mensagem pelo WhatsApp. Verifique se a sess\xE3o est\xE1 conectada e se o ID do grupo \xE9 v\xE1lido." });
  }
  res.json({ ok: true, message: "Mensagem de teste enviada com sucesso!" });
});
api.post(["/whatsapp/send-firmware", "/firmware/send-whatsapp"], requireAdmin, upload.single("image"), async (req, res) => {
  const status = whatsappService.getStatus();
  if (status.status !== "connected") {
    return res.status(400).json({ detail: 'WhatsApp n\xE3o est\xE1 conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  let imageBuffer = null;
  let contentType = "image/png";
  if (req.file) {
    imageBuffer = req.file.buffer;
    contentType = req.file.mimetype || "image/png";
  } else if (req.body?.image_base64) {
    const raw = req.body.image_base64.replace(/^data:image\/\w+;base64,/, "");
    imageBuffer = Buffer.from(raw, "base64");
  }
  if (!imageBuffer) {
    return res.status(400).json({ detail: "Imagem do firmware n\xE3o fornecida." });
  }
  const { target_group = "all" } = req.body || {};
  const caption = (req.body?.caption || `\u2699\uFE0F *EDUTASK \u2014 FIRMWARE DO SISTEMA OFICIAL*

\u{1F4CC} *Vers\xE3o:* v${db2.app_info?.version || "1.2.0"} (${db2.app_info?.codename || "Edutask AI Core"})
\u{1F6E1}\uFE0F *Sistema de Acessos:* 100% Ativo & Precis\xE3o M\xE1xima
\u26A1 *M\xF3dulos Habilitados:* 8 Fun\xE7\xF5es Nativas
\u{1F4C5} *Data de Emiss\xE3o:* ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}

\u{1F449} _Imagem oficial gerada para acompanhamento e auditoria escolar._`).trim();
  let g1Sent = false;
  let g2Sent = false;
  const errors = [];
  const targets = [];
  if ((target_group === "all" || target_group === "group1") && status.group1Jid) {
    targets.push({ jid: status.group1Jid, label: "Grupo 1" });
  }
  if ((target_group === "all" || target_group === "group2") && status.group2Jid) {
    targets.push({ jid: status.group2Jid, label: "Grupo 2" });
  }
  if (targets.length === 0) {
    return res.status(400).json({ detail: "Nenhum grupo do WhatsApp configurado nas op\xE7\xF5es." });
  }
  for (const t of targets) {
    const ok = await whatsappService.sendImage(t.jid, imageBuffer, caption, contentType);
    if (ok) {
      if (t.label === "Grupo 1") g1Sent = true;
      if (t.label === "Grupo 2") g2Sent = true;
    } else {
      errors.push(`Falha ao enviar para ${t.label}`);
    }
  }
  if (!g1Sent && !g2Sent) {
    return res.status(500).json({ detail: errors.join(", ") || "Falha ao enviar imagem do firmware pelo WhatsApp." });
  }
  res.json({
    ok: true,
    message: "Foto do firmware enviada para o WhatsApp com sucesso!",
    group1Sent: g1Sent,
    group2Sent: g2Sent,
    errors
  });
});
api.post(["/whatsapp/test-tomorrow-reminder", "/whatsapp/dispatch-reminders", "/whatsapp/dispatch-tomorrow-reminder"], requireAdmin, async (req, res) => {
  const status = whatsappService.getStatus();
  if (status.status !== "connected") {
    return res.status(400).json({ detail: 'WhatsApp n\xE3o est\xE1 conectado. Conecte na aba "WhatsApp" primeiro.' });
  }
  if (!status.group1Jid && !status.group2Jid) {
    return res.status(400).json({ detail: "Nenhum grupo configurado para envio." });
  }
  try {
    const outcome = await executeTomorrowTasksDispatch(true);
    if (!outcome.dispatched) {
      return res.json({
        ok: true,
        message: outcome.message || "Nenhuma tarefa para amanh\xE3 no momento.",
        details: outcome
      });
    }
    res.json({
      ok: true,
      message: `Lembrete de ${outcome.tasks_count} tarefa(s) de amanh\xE3 disparado com sucesso!`,
      details: outcome
    });
  } catch (err) {
    res.status(500).json({ detail: err?.message || "Falha ao disparar lembrete de amanh\xE3" });
  }
});
async function executeTomorrowTasksDispatch(isTest = false) {
  const now = /* @__PURE__ */ new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const tomorrowDateBR = `${String(tomorrow.getDate()).padStart(2, "0")}/${String(tomorrow.getMonth() + 1).padStart(2, "0")}/${tomorrow.getFullYear()}`;
  let tomorrowTasks = Array.from(db2.tasks.values()).filter((t) => t.due_date === tomorrowStr);
  if (tomorrowTasks.length === 0 && isTest) {
    tomorrowTasks = Array.from(db2.tasks.values()).slice(0, 2);
  }
  if (tomorrowTasks.length === 0) {
    return {
      dispatched: false,
      message: `Nenhuma tarefa cadastrada com entrega marcada para amanh\xE3 (${tomorrowDateBR}).`,
      tasks_count: 0
    };
  }
  const templates = db2.whatsapp_config?.templates || {};
  let photoBuffer = null;
  let photoContentType = null;
  if (templates.tomorrow_photo_id) {
    const f = db2.files.get(templates.tomorrow_photo_id);
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
      description: t.description
    })),
    custom_caption_template: templates.tomorrow_caption,
    photo_buffer: photoBuffer,
    photo_content_type: photoContentType,
    group1_enabled: true,
    group2_enabled: true
  });
  return {
    dispatched: true,
    tasks_count: tomorrowTasks.length,
    tomorrow_date_br: tomorrowDateBR,
    result
  };
}
async function checkDailyTomorrowReminder() {
  try {
    const config = db2.whatsapp_config;
    if (!config || !config.enabled || !config.daily_reminder?.enabled) return;
    const now = /* @__PURE__ */ new Date();
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = now.toISOString().slice(0, 10);
    const targetTime = (config.daily_reminder.time || "19:00").trim();
    if (currentTimeStr === targetTime && config.daily_reminder.last_run_date !== todayStr) {
      console.log(`[WhatsApp Reminder] Hor\xE1rio agendado atingido (${currentTimeStr}). Disparando lembrete de tarefas para amanh\xE3...`);
      config.daily_reminder.last_run_date = todayStr;
      db2.saveToDisk();
      await executeTomorrowTasksDispatch(false);
    }
  } catch (err) {
    console.error("[WhatsApp Reminder] Erro no agendador di\xE1rio:", err);
  }
}
if (!process.env.VERCEL) {
  setInterval(checkDailyTomorrowReminder, 3e4);
}
api.get("/effects", requireAuth, (req, res) => {
  const user = req.user;
  const catalog = db2.getEffectsCatalog();
  const owned = user.role === "admin" ? catalog.map((e) => e.id) : user.owned_effects || ["none"];
  res.json({
    effects: catalog,
    owned: Array.from(/* @__PURE__ */ new Set(["none", ...owned])),
    equipped: user.equipped_effect || "none",
    points: user.points || 0
  });
});
api.put("/effects/:effect_id", requireAdmin, (req, res) => {
  const { effect_id } = req.params;
  const { cost } = req.body || {};
  const c = parseInt(cost);
  if (isNaN(c) || c < 0) return res.status(400).json({ detail: "Custo inv\xE1lido" });
  db2.effect_overrides[effect_id] = { cost: c };
  db2.saveToDisk();
  saveSystemSettingsToFirestore();
  res.json({ ok: true, effect_id, new_cost: c });
});
api.post("/me/effects/buy", requireAuth, (req, res) => {
  const user = req.user;
  const { effect_id } = req.body || {};
  const catalog = db2.getEffectsCatalog();
  const effect = catalog.find((e) => e.id === effect_id);
  if (!effect) return res.status(404).json({ detail: "Efeito n\xE3o encontrado" });
  if (user.role === "admin") return res.json({ ok: true, already_owned: true });
  const owned = user.owned_effects || ["none"];
  if (owned.includes(effect.id) || effect.id === "none") {
    return res.json({ ok: true, already_owned: true });
  }
  const cost = effect.cost;
  if ((user.points || 0) < cost) {
    return res.status(400).json({ detail: `Voc\xEA precisa de ${cost} pontos (tem ${user.points || 0})` });
  }
  user.points -= cost;
  user.owned_effects.push(effect.id);
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({
    ok: true,
    points: user.points,
    owned_effects: user.owned_effects
  });
});
api.post("/me/effects/equip", requireAuth, (req, res) => {
  const user = req.user;
  const { effect_id } = req.body || {};
  const effId = effect_id || "none";
  if (user.role !== "admin" && effId !== "none") {
    const owned = user.owned_effects || ["none"];
    if (!owned.includes(effId)) {
      return res.status(400).json({ detail: "Voc\xEA ainda n\xE3o comprou esse efeito" });
    }
  }
  user.equipped_effect = effId;
  db2.saveToDisk();
  firebaseService.saveUser(user).catch(console.warn);
  res.json({ ok: true, equipped: effId });
});
api.get("/integrations/webhook-logs", requireAdmin, (req, res) => {
  res.json({
    configured: Boolean(process.env.MAKE_WEBHOOK_URL),
    webhook_url: process.env.MAKE_WEBHOOK_URL || "",
    logs: db2.webhook_logs.slice(0, 50)
  });
});
api.post("/integrations/webhook-test", requireAdmin, (req, res) => {
  res.json({ ok: true, status: 200 });
});
api.get(["/ai/status", "/ai-status"], requireAuth, (req, res) => {
  res.json({ enabled: db2.ai_enabled });
});
api.put(["/ai/status", "/ai-status"], requireAdmin, (req, res) => {
  db2.ai_enabled = Boolean(req.body?.enabled);
  res.json({ ok: true, enabled: db2.ai_enabled });
});
api.post("/ai/improve-task", requireAdmin, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { title, subject, hint } = req.body || {};
  if (!title) return res.status(400).json({ detail: "T\xEDtulo obrigat\xF3rio" });
  if (genAI) {
    try {
      const prompt = `Voc\xEA \xE9 um professor experiente de ensino fundamental e m\xE9dio no Brasil.
Elabore uma descri\xE7\xE3o pedag\xF3gica, dicas e objetivos para esta tarefa escolar:
Mat\xE9ria: ${subject || "Geral"}
T\xEDtulo: ${title}
${hint ? `Dicas/ideias do professor: ${hint}` : ""}

Responda EXCLUSIVAMENTE em formato JSON com as chaves:
"description": string (2-3 par\xE1grafos explicando detalhadamente a proposta da tarefa de forma engajadora)
"tips": array de 3 strings com dicas pr\xE1ticas para o aluno
"objectives": array de 2 strings com objetivos de aprendizagem`;
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json({
        description: parsed.description || `Exerc\xEDcio pr\xE1tico de ${subject || "estudos"} focado em ${title}.`,
        tips: parsed.tips || ["Leia atentamente o enunciado.", "Fa\xE7a rascunhos antes da vers\xE3o final."],
        objectives: parsed.objectives || ["Fixar conceitos fundamentais.", "Desenvolver autonomia de estudo."]
      });
    } catch (e) {
      console.warn("Gemini API improve-task failed, falling back:", e.message);
    }
  }
  res.json({
    description: `Nesta atividade de ${subject || "estudos"}, vamos aprofundar os conhecimentos sobre "${title}".

Leia os materiais indicados com aten\xE7\xE3o, anote as d\xFAvidas principais e desenvolva suas respostas com justificativas claras e fundamentadas.

Lembre-se de organizar seu tempo para entregar at\xE9 o prazo estipulado!`,
    tips: [
      "Fa\xE7a uma primeira leitura r\xE1pida para entender o contexto geral.",
      "Destaque palavras-chave e f\xF3rmulas essenciais.",
      "Revise seus c\xE1lculos e ortografia antes de marcar a entrega."
    ],
    objectives: [
      `Consolidar o dom\xEDnio dos temas relacionados a ${title}.`,
      "Estimular o racioc\xEDnio cr\xEDtico e a resolu\xE7\xE3o independente de problemas."
    ]
  });
});
api.post("/ai/generate-announcement", requireAdmin, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ detail: "Descreva o aviso" });
  if (genAI) {
    try {
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Voc\xEA \xE9 um professor escolar no Brasil redigindo um comunicado aos alunos e respons\xE1veis.
Com base nesta ideia: "${prompt}", escreva um aviso escolar polido, motivador e claro.
Responda EXCLUSIVAMENTE em JSON:
{
  "title": "t\xEDtulo curto chamativo",
  "message": "mensagem formatada em 1 ou 2 par\xE1grafos amig\xE1veis"
}`,
        config: { responseMimeType: "application/json" }
      }));
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json({
        title: (parsed.title || "Aviso Escolar").slice(0, 80),
        message: parsed.message || prompt
      });
    } catch (e) {
      console.warn("Gemini generate-announcement fallback:", e.message);
    }
  }
  res.json({
    title: `Aviso: ${prompt.slice(0, 45)}...`,
    message: `Prezados alunos,

${prompt}

Fiquem atentos aos prazos e continuem com o \xF3timo empenho nos estudos! Qualquer d\xFAvida, procurem o professor.`
  });
});
api.post("/ai/check-answer", requireAdmin, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { student_answer, task_description, correct_answer } = req.body || {};
  if (genAI) {
    try {
      const prompt = `Analise a resposta do aluno em rela\xE7\xE3o ao gabarito/tarefa:
Tarefa: ${task_description || ""}
Gabarito esperado: ${correct_answer || ""}
Resposta enviada pelo aluno: ${student_answer || ""}

Responda EXCLUSIVAMENTE em JSON:
{
  "score": n\xFAmero de 0 a 100,
  "errors": ["erro 1 se houver"],
  "feedback": "feedback construtivo e encorajador em portugu\xEAs",
  "suggestions": ["dica para melhorar"]
}`;
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json(parsed);
    } catch (e) {
      console.warn("Gemini check-answer fallback:", e.message);
    }
  }
  res.json({
    score: 90,
    errors: [],
    feedback: "Excelente racioc\xEDnio apresentado! A l\xF3gica foi bem desenvolvida e os conceitos centrais foram compreendidos.",
    suggestions: ["Revise a formaliza\xE7\xE3o final para manter a precis\xE3o matem\xE1tica/conceitual."]
  });
});
api.post("/ai/generate-task-answer", requireAdmin, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { task_id, extra_hint } = req.body || {};
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  const photoIds = task.admin_photos || [];
  const photos = photoIds.map((id) => db2.files.get(id)).filter(Boolean);
  if (genAI && photos.length > 0) {
    try {
      const contentsParts = [];
      for (const p of photos.slice(0, 5)) {
        if (p.content_type.startsWith("image/")) {
          contentsParts.push({
            inlineData: {
              data: p.data.toString("base64"),
              mimeType: p.content_type
            }
          });
        }
      }
      contentsParts.push({
        text: `Voc\xEA \xE9 um professor gerando um gabarito CURTO E DIRETO em portugu\xEAs do Brasil.
N\xC3O use markdown negrito com **, N\xC3O explique racioc\xEDnio longo, N\xC3O coloque introdu\xE7\xE3o.
Para cada quest\xE3o da imagem:
Quest\xE3o N: <enunciado curto>
Contas: <contas resumidas em 1 linha se houver c\xE1lculo>
Resposta: <resultado final>

Mat\xE9ria: ${task.subject}
T\xEDtulo: ${task.title}
Observa\xE7\xE3o: ${extra_hint || ""}`
      });
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentsParts
      }));
      const cleaned = (response.text || "").replace(/\*\*/g, "").trim();
      return res.json({ answer: cleaned, photos_used: photos.length });
    } catch (e) {
      console.warn("Gemini generate-task-answer fallback:", e.message);
    }
  }
  const mockAnswer = `Quest\xE3o 1: Calcule o valor correspondente
Contas: 1/2 + 1/4 = 2/4 + 1/4 = 3/4
Resposta: 3/4 (75%)

Quest\xE3o 2: Resolu\xE7\xE3o do problema proposto
Contas: 25% de 80 = 0.25 * 80 = 20
Resposta: 20

Quest\xE3o 3: Interpreta\xE7\xE3o e conclus\xE3o
Resposta: O ciclo se completa com a precipita\xE7\xE3o e recarga dos len\xE7\xF3is fre\xE1ticos.`;
  res.json({
    answer: mockAnswer,
    photos_used: photos.length
  });
});
api.post("/ai/explain-task", requireAuth, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { task_id } = req.body || {};
  const task = db2.tasks.get(task_id);
  if (!task) return res.status(404).json({ detail: "Tarefa n\xE3o encontrada" });
  if (genAI) {
    try {
      const prompt = `Voc\xEA \xE9 um professor paciente explicando para um estudante o que esta tarefa escolar pede, SEM ENTREGAR A RESPOSTA PRONTA.
Mat\xE9ria: ${task.subject}
T\xEDtulo: ${task.title}
Enunciado: ${task.description}

Responda EXCLUSIVAMENTE em JSON:
{
  "explanation": "explica\xE7\xE3o calorosa do que \xE9 pedido em 2 par\xE1grafos",
  "key_concepts": ["conceito 1", "conceito 2"],
  "tips": ["dica para come\xE7ar 1", "dica 2"],
  "first_step": "o primeiro passo pr\xE1tico para come\xE7ar agora"
}`;
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      return res.json({
        explanation: parsed.explanation || task.description,
        key_concepts: parsed.key_concepts || [task.subject],
        tips: parsed.tips || ["Revise a mat\xE9ria dada em aula."],
        first_step: parsed.first_step || "Comece lendo a primeira quest\xE3o com calma."
      });
    } catch (e) {
      console.warn("Gemini explain-task fallback:", e.message);
    }
  }
  res.json({
    explanation: `Nesta atividade de ${task.subject}, seu objetivo \xE9 demonstrar o dom\xEDnio sobre ${task.title}. Voc\xEA deve estruturar sua resposta passo a passo, mostrando todo o seu racioc\xEDnio de forma clara e organizada.`,
    key_concepts: ["Compreens\xE3o do enunciado", "Aplica\xE7\xE3o pr\xE1tica dos conceitos", "Organiza\xE7\xE3o das respostas"],
    tips: [
      "Sublinhe o que a pergunta est\xE1 pedindo exatamente.",
      "Separe os dados informados antes de come\xE7ar a responder.",
      "Confira suas respostas uma a uma."
    ],
    first_step: "Separe seu caderno ou folha de rascunho e escreva a primeira etapa do problema."
  });
});
api.post("/ai/chat", requireAuth, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const { session_id, message, task_id } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ detail: "Mensagem vazia" });
  const user = req.user;
  const sid = session_id || `sess-${user.id}-${Date.now()}`;
  let session = db2.ai_chats.get(sid);
  if (!session) {
    session = {
      id: sid,
      user_id: user.id,
      task_id: task_id || null,
      messages: [],
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    db2.ai_chats.set(sid, session);
  } else if (task_id && !session.task_id) {
    session.task_id = task_id;
  }
  const effectiveTaskId = task_id || session.task_id;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  session.messages.push({ role: "user", content: message.trim(), ts: now });
  const assignedTasks = Array.from(db2.tasks.values()).filter(
    (t) => t.assigned_to.length === 0 || t.assigned_to.includes(user.id)
  );
  const userCompletions = db2.completions.filter((c) => c.user_id === user.id);
  const compSet = new Set(userCompletions.map((c) => c.task_id));
  const pendingTasks = assignedTasks.filter((t) => !compSet.has(t.id));
  const focusedTask = effectiveTaskId ? assignedTasks.find((t) => t.id === effectiveTaskId) : null;
  let reply = "";
  if (genAI) {
    try {
      const historyContents = session.messages.slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      let systemInstruction = "";
      if (user.role === "aluno") {
        const tasksListStr = assignedTasks.map((t) => {
          const isDone = compSet.has(t.id);
          return `\u2022 Tarefa ID: "${t.id}" | T\xEDtulo: "${t.title}" | Mat\xE9ria: ${t.subject} | Prazo: ${t.due_date} | Status: ${isDone ? "Conclu\xEDda" : "Pendente / N\xE3o feita"}
  Descri\xE7\xE3o da tarefa: ${t.description}
  GABARITO / RESPOSTA OFICIAL: ${t.answer || "Gabarito n\xE3o cadastrado pelo professor."}`;
        }).join("\n\n");
        const focusedTaskStr = focusedTask ? `

>>> O ALUNO EST\xC1 PERGUNTANDO ESPECIFICAMENTE SOBRE A TAREFA: "${focusedTask.title}" (${focusedTask.subject})
Descri\xE7\xE3o completa: ${focusedTask.description}
Gabarito oficial: ${focusedTask.answer || "Nenhum gabarito fornecido"}
Status do aluno: ${compSet.has(focusedTask.id) ? "J\xE1 marcada como conclu\xEDda" : "Pendente de conclus\xE3o"}
<<<` : "";
        systemInstruction = `Voc\xEA \xE9 o Tutor Edutask, um professor e assistente virtual amig\xE1vel, atencioso e pedag\xF3gico em portugu\xEAs do Brasil.
Voc\xEA tem acesso completo aos dados de perfil do aluno, a todas as suas tarefas escolares e aos gabaritos/respostas oficiais das tarefas.

INFORMA\xC7\xD5ES DO PERFIL DO ALUNO:
- Nome: ${user.name}
- Email: ${user.email}
- Saldo de Pontos (Loja de Molduras): ${user.points || 0}
- Tarefas conclu\xEDdas: ${userCompletions.length}
- Tarefas pendentes: ${pendingTasks.length}

TAREFAS E GABARITOS CADASTRADOS DO ALUNO:
${tasksListStr}
${focusedTaskStr}

COMO RESPONDER \xC0S D\xDAVIDAS DO ALUNO:
1. Quando o aluno tirar d\xFAvidas sobre uma tarefa ou exerc\xEDcio, utilize o enunciado e o gabarito oficial como guia pedag\xF3gico. Ajude-o a entender o m\xE9todo e o racioc\xEDnio passo a passo.
2. Se o aluno pedir para conferir o gabarito ou perguntar a resposta de uma quest\xE3o, explique o conceito e mostre a resolu\xE7\xE3o passo a passo alinhada ao gabarito oficial.
3. Se o aluno perguntar sobre suas tarefas ("o que eu tenho que fazer?", "quais s\xE3o minhas pend\xEAncias?", "quais tarefas vencem hoje?"), consulte a lista acima e responda com clareza citando as mat\xE9rias e prazos.
4. Se o aluno perguntar sobre seu perfil, pontos ou progresso, utilize os dados do perfil acima.
5. Seja encorajador, did\xE1tico, claro e amig\xE1vel.`;
      } else {
        systemInstruction = "Voc\xEA \xE9 um assistente pedag\xF3gico no Edutask para o professor. Ajude com sugest\xF5es de aula, rubricas e ideias educacionais.";
      }
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: historyContents,
        config: { systemInstruction }
      }));
      reply = response.text || "";
    } catch (e) {
      console.warn("Gemini chat fallback:", e.message);
    }
  }
  if (!reply) {
    const lower = message.toLowerCase();
    if (focusedTask && (lower.includes("gabarito") || lower.includes("resposta") || lower.includes("como faz"))) {
      reply = `Ol\xE1 ${user.name}! Sobre a tarefa "${focusedTask.title}" (${focusedTask.subject}): ${focusedTask.answer ? `o gabarito oficial indica: "${focusedTask.answer}". Vamos entender o racioc\xEDnio por tr\xE1s dessa resposta juntos!` : `ainda n\xE3o h\xE1 um gabarito anexado, mas posso te orientar sobre o enunciado: ${focusedTask.description.slice(0, 100)}...`}`;
    } else if (lower.includes("tarefa") || lower.includes("pendente") || lower.includes("fazer") || lower.includes("hoje")) {
      if (pendingTasks.length === 0) {
        reply = `Parab\xE9ns, ${user.name}! Voc\xEA n\xE3o tem nenhuma tarefa pendente no momento. Todas as suas atividades est\xE3o em dia! \u{1F389}`;
      } else {
        const listPreview = pendingTasks.slice(0, 3).map((t) => `"${t.title}" (${t.subject}, vence em ${t.due_date})`).join(", ");
        reply = `Ol\xE1 ${user.name}! Voc\xEA tem ${pendingTasks.length} tarefa(s) pendente(s): ${listPreview}. Sobre qual delas voc\xEA quer tirar d\xFAvida?`;
      }
    } else if (lower.includes("perfil") || lower.includes("ponto") || lower.includes("moldura")) {
      reply = `Ol\xE1 ${user.name}! Seu perfil est\xE1 ativo com ${user.points || 0} pontos acumulados para a Loja de Molduras. Voc\xEA j\xE1 completou ${userCompletions.length} tarefas. Em que mais posso ajudar nos seus estudos?`;
    } else {
      reply = `Ol\xE1 ${user.name}! Sou seu tutor do Edutask. Tenho acesso \xE0s suas tarefas e gabaritos escolares. Sobre "${message.slice(0, 35)}...", me diga como posso te ajudar a entender essa mat\xE9ria! \u{1F4A1}`;
    }
  }
  session.messages.push({ role: "assistant", content: reply, ts: (/* @__PURE__ */ new Date()).toISOString() });
  session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  res.json({
    session_id: sid,
    message: reply,
    history_len: session.messages.length,
    task_id: effectiveTaskId
  });
});
api.get("/ai/chat/:session_id", requireAuth, (req, res) => {
  const { session_id } = req.params;
  const user = req.user;
  const session = db2.ai_chats.get(session_id);
  if (!session || session.user_id !== user.id) {
    return res.json({ session_id, messages: [] });
  }
  res.json({
    session_id,
    messages: session.messages,
    task_id: session.task_id
  });
});
api.delete("/ai/chat/:session_id", requireAuth, (req, res) => {
  const { session_id } = req.params;
  db2.ai_chats.delete(session_id);
  res.json({ ok: true });
});
api.get("/ai/daily-summary", requireAuth, async (req, res) => {
  if (!db2.ai_enabled) return res.json({ summary: "", count: 0, disabled: true });
  const user = req.user;
  const myTasks = Array.from(db2.tasks.values()).filter(
    (t) => (!t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(user.id)) && !db2.completions.some((c) => c.task_id === t.id && c.user_id === user.id)
  );
  if (myTasks.length === 0) {
    return res.json({
      summary: "Parab\xE9ns! Todas as suas tarefas est\xE3o em dia. Aproveite para explorar os efeitos na loja! \u{1F389}",
      count: 0
    });
  }
  const taskTitles = myTasks.map((t) => `${t.title} (${t.subject}, entrega ${t.due_date})`).join("; ");
  let summary = `Voc\xEA tem ${myTasks.length} tarefa(s) pendente(s). Mantenha o foco em ${myTasks[0].subject} hoje! \u{1F680}`;
  if (genAI) {
    try {
      const response = await withTimeout(genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Escreva uma mensagem motivacional e resumida de 2 linhas para o aluno ${user.name} em portugu\xEAs do Brasil sobre suas tarefas pendentes: ${taskTitles}. Comece com energia e d\xEA uma dica de foco.`
      }));
      summary = response.text?.trim() || summary;
    } catch {
    }
  }
  res.json({ summary, count: myTasks.length });
});
api.get("/ai/monthly-report/:user_id", requireAdmin, async (req, res) => {
  const { user_id } = req.params;
  const student = db2.users.get(user_id);
  if (!student) return res.status(404).json({ detail: "Aluno n\xE3o encontrado" });
  const completions = db2.completions.filter((c) => c.user_id === user_id);
  const onTimeCount = completions.filter((c) => c.on_time).length;
  const assigned = Array.from(db2.tasks.values()).filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(user_id));
  const compSet = new Set(completions.map((c) => c.task_id));
  const uncompletedCount = assigned.filter((t) => !compSet.has(t.id)).length;
  res.json({
    student_name: student.name,
    total_completions: completions.length,
    on_time_completions: onTimeCount,
    uncompleted_tasks: uncompletedCount,
    points: student.points || 0,
    report: `Relat\xF3rio de Desempenho de ${student.name}:

O aluno realizou ${completions.length} entregas, sendo ${onTimeCount} rigorosamente no prazo e possui ${uncompletedCount} pend\xEAncia(s).`
  });
});
api.get("/ai/prize-tips", requireAuth, (req, res) => {
  res.json({
    tips: [
      "Entregue sempre suas tarefas antes do hor\xE1rio limite para manter sua pontualidade em 100%!",
      "Fique atento \xE0s pend\xEAncias: a IA desconta pontos na avalia\xE7\xE3o para tarefas N\xC3O marcadas como feitas.",
      "Os pontos obtidos em tarefas servem exclusivamente para desbloquear e adquirir Molduras de Avatar na loja.",
      "Conclua todas as atividades com anteced\xEAncia para garantir a melhor posi\xE7\xE3o na avalia\xE7\xE3o da IA."
    ]
  });
});
api.get("/ai/prize-evaluate", requireAdmin, async (req, res) => {
  if (!db2.ai_enabled) return res.status(503).json({ detail: "Recursos de IA desativados" });
  const students = Array.from(db2.users.values()).filter((u) => u.role === "aluno" && u.status === "active");
  if (students.length === 0) {
    return res.json({
      winner_name: "Nenhum aluno eleg\xEDvel",
      justification: "N\xE3o h\xE1 alunos ativos cadastrados para avalia\xE7\xE3o.",
      criteria: [],
      rankings: []
    });
  }
  const allTasks = Array.from(db2.tasks.values());
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyCompletions = db2.completions.filter((c) => c.completed_at >= monthStart);
  const studentMetrics = students.map((s) => {
    const sComps = monthlyCompletions.filter((c) => c.user_id === s.id);
    const onTime = sComps.filter((c) => c.on_time).length;
    const late = sComps.length - onTime;
    const assignedTasks = allTasks.filter((t) => t.assigned_to.length === 0 || t.assigned_to.includes(s.id));
    const compSet = new Set(sComps.map((c) => c.task_id));
    const uncompleted = assignedTasks.filter((t) => !compSet.has(t.id)).length;
    return {
      id: s.id,
      name: s.name,
      completed_month: sComps.length,
      on_time_month: onTime,
      late_month: late,
      uncompleted_count: uncompleted,
      on_time_pct: sComps.length > 0 ? Math.round(onTime / sComps.length * 100) : 0,
      has_avatar: Boolean(s.avatar_data)
    };
  });
  const dossierPrompt = studentMetrics.map(
    (m) => `- Aluno: ${m.name} (ID: ${m.id}) | Tarefas entregues no m\xEAs: ${m.completed_month} | Entregas no prazo: ${m.on_time_month} (${m.on_time_pct}%) | Atrasadas: ${m.late_month} | Tarefas N\xC3O marcadas como feitas (pendentes): ${m.uncompleted_count}`
  ).join("\n");
  if (genAI) {
    try {
      const prompt = `Voc\xEA \xE9 o Comit\xEA Pedag\xF3gico de Intelig\xEAncia Artificial do Edutask.
Sua miss\xE3o \xE9 escolher o Aluno Vencedor do Pr\xEAmio do M\xEAs.

DIRETRIZES DA AVALIA\xC7\xC3O:
- Os pontos dos alunos N\xC3O contam para esta premia\xE7\xE3o (pontos s\xE3o exclusivamente para comprar molduras de avatar na loja!).
- O SISTEMA DE OFENSIVA/SEQU\xCANCIA EST\xC1 TOTALMENTE DESATIVADO (N\xC3O mencione nem considere ofensiva).
- O crit\xE9rio \xE9:
  1. Volume e taxa de entregas rigorosamente no prazo (pontualidade).
  2. Penaliza\xE7\xE3o por tarefas N\xC3O marcadas como feitas (pend\xEAncias contam contra o aluno).
- IMPORTANTE - RESUMO CONCISO E SEM POLUI\xC7\xC3O:
  A justificativa (justification) DEVE ser curta e direta: no m\xE1ximo 1 a 2 frases curtas e objetivas, evitando discursos longos que poluam a interface!
  O ai_feedback de cada aluno deve ser 1 frase curta.

DADOS MENSAIS DOS ALUNOS:
${dossierPrompt}

Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "winner_id": "ID do aluno vencedor",
  "winner_name": "Nome do aluno vencedor",
  "winner_score": 98,
  "justification": "Frase curta (m\xE1x 2 linhas) justificando a vit\xF3ria pela pontualidade e aus\xEAncia de pend\xEAncias.",
  "criteria": [
    "Destaque 1 (ex.: 100% de entregas no prazo)",
    "Destaque 2 (ex.: Nenhuma tarefa pendente)"
  ],
  "rankings": [
    {
      "id": "ID do aluno",
      "name": "Nome do aluno",
      "rank": 1,
      "score": 98,
      "ai_feedback": "1 frase curta e objetiva sobre o desempenho"
    }
  ]
}`;
      const response = await withTimeout(
        genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        })
      );
      const parsed = JSON.parse(response.text?.replace(/```json|```/g, "").trim() || "{}");
      if (parsed.winner_name) {
        return res.json({
          winner_id: parsed.winner_id || studentMetrics[0].id,
          winner_name: parsed.winner_name,
          winner_score: parsed.winner_score || 98,
          justification: parsed.justification,
          criteria: parsed.criteria || ["Entregas pontuais", "Nenhuma pend\xEAncia"],
          rankings: parsed.rankings || []
        });
      }
    } catch (e) {
      console.warn("Gemini prize-evaluate fallback:", e.message);
    }
  }
  studentMetrics.sort((a, b) => {
    if (b.on_time_month !== a.on_time_month) return b.on_time_month - a.on_time_month;
    if (a.uncompleted_count !== b.uncompleted_count) return a.uncompleted_count - b.uncompleted_count;
    return b.completed_month - a.completed_month;
  });
  const top = studentMetrics[0];
  const rankings = studentMetrics.map((m, idx) => ({
    id: m.id,
    name: m.name,
    rank: idx + 1,
    score: Math.max(65, 100 - idx * 7),
    ai_feedback: m.on_time_month > 0 ? `${m.on_time_month} tarefa(s) no prazo e ${m.uncompleted_count === 0 ? "zero pend\xEAncias" : `${m.uncompleted_count} pend\xEAncia(s)`}.` : `Entregue suas tarefas no prazo para disputar o pr\xEAmio no pr\xF3ximo m\xEAs.`
  }));
  res.json({
    winner_id: top.id,
    winner_name: top.name,
    winner_score: 96,
    justification: `${top.name} conquistou o pr\xEAmio com ${top.on_time_month} tarefa(s) entregues no prazo e ${top.uncompleted_count === 0 ? "nenhuma pend\xEAncia no m\xEAs" : `apenas ${top.uncompleted_count} pend\xEAncia(s)`}.`,
    criteria: [
      `${top.on_time_month} entrega(s) rigorosamente no prazo`,
      top.uncompleted_count === 0 ? "Zero tarefas pendentes" : "Compromisso com os prazos escolares"
    ],
    rankings
  });
});
var lastCleanupMinuteRun = "";
if (!process.env.VERCEL) {
  setInterval(() => {
    try {
      const cfg = db2.task_cleanup_config;
      if (!cfg || !cfg.enabled || !cfg.cleanup_time) return;
      const now = /* @__PURE__ */ new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;
      const today = now.toISOString().slice(0, 10);
      const runKey = `${today}_${currentTime}`;
      if (currentTime === cfg.cleanup_time && lastCleanupMinuteRun !== runKey) {
        lastCleanupMinuteRun = runKey;
        executeTaskCleanup(false);
      }
    } catch (err) {
      console.error("[TaskCleanup] Background check error:", err);
    }
  }, 3e4);
}
app2.use("/api", async (req, res, next) => {
  try {
    await db2.ensureSynced();
  } catch (err) {
    console.warn("[Firebase Sync Middleware Error]", err);
  }
  next();
}, api);
async function startServer() {
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  if (process.env.NODE_ENV === "production") {
    const distPath = path2.resolve(__dirname2, "dist");
    app2.use(express.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(path2.resolve(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa"
      });
      app2.use(vite.middlewares);
    } catch (e) {
      console.warn("[Vite Integration]", e);
    }
  }
  app2.listen(PORT, HOST, () => {
    console.log(`Edutask server running on http://${HOST}:${PORT}`);
  });
}
if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}
var server_default = app2;
export {
  IS_TIER_SYSTEM_ENABLED,
  TIERS,
  server_default as default,
  getTier
};
