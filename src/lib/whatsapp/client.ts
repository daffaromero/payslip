import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import { promises as fs } from 'fs'
import P from 'pino'

const SESSION_DIR = process.env.WA_SESSION_DIR ?? path.join(process.cwd(), 'whatsapp-session')

export type WAStatus = 'disconnected' | 'connecting' | 'connected'

interface WAState {
  socket: WASocket | null
  status: WAStatus
  qr: string | null         // raw QR string for encoding
  qrDataUrl: string | null  // base64 PNG data URL
  error: string | null
}

// Persist across Next.js HMR reloads
declare global {
  // eslint-disable-next-line no-var
  var __wa: WAState | undefined
}

function getState(): WAState {
  if (!global.__wa) {
    global.__wa = { socket: null, status: 'disconnected', qr: null, qrDataUrl: null, error: null }
  }
  return global.__wa
}

async function generateQrDataUrl(qr: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(qr, { width: 280, margin: 2 })
}

export async function connect(): Promise<void> {
  const state = getState()
  if (state.status === 'connecting' || state.status === 'connected') return

  state.status = 'connecting'
  state.qr = null
  state.qrDataUrl = null
  state.error = null

  await fs.mkdir(SESSION_DIR, { recursive: true })

  const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  const logger = P({ level: 'silent' })

  const sock = makeWASocket({
    version,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['PayslipApp', 'Chrome', '1.0.0'],
  })

  state.socket = sock

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    const s = getState()

    if (qr) {
      s.qr = qr
      s.qrDataUrl = await generateQrDataUrl(qr)
      s.status = 'connecting'
    }

    if (connection === 'open') {
      s.status = 'connected'
      s.qr = null
      s.qrDataUrl = null
      s.error = null
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      s.status = 'disconnected'
      s.socket = null
      if (shouldReconnect) {
        setTimeout(() => connect(), 3000)
      } else {
        // Logged out — clear session
        s.error = 'Logged out. Scan QR to reconnect.'
        await fs.rm(SESSION_DIR, { recursive: true, force: true })
      }
    }
  })
}

export async function disconnect(): Promise<void> {
  const state = getState()
  if (state.socket) {
    await state.socket.logout().catch(() => null)
    state.socket = null
  }
  state.status = 'disconnected'
  state.qr = null
  state.qrDataUrl = null
  await fs.rm(SESSION_DIR, { recursive: true, force: true })
}

export function getStatus(): { status: WAStatus; qrDataUrl: string | null; error: string | null } {
  const { status, qrDataUrl, error } = getState()
  return { status, qrDataUrl, error }
}

export async function sendDocument(opts: {
  to: string          // e.g. "628123456789"
  caption: string
  filename: string
  buffer: Buffer
  mimetype: string
}): Promise<void> {
  const { socket, status } = getState()
  if (!socket || status !== 'connected') throw new Error('WhatsApp tidak terhubung')

  const jid = opts.to.includes('@') ? opts.to : `${opts.to}@s.whatsapp.net`

  await socket.sendMessage(jid, {
    document: opts.buffer,
    fileName: opts.filename,
    mimetype: opts.mimetype,
    caption: opts.caption,
  })
}
