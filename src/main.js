import './style.css';
import { renderDashboard } from './components/dashboard.js';

// App state
const state = {
  currentPage: 'dashboard',
  connected: false,
};

const mainView = document.getElementById('main-view');
const connStatus = document.getElementById('connection-status');
const connText = document.getElementById('connection-text');

function navigateToDashboard() {
  mainView.innerHTML = '';
  renderDashboard(mainView, sendCommand);
}

const connectBtn = document.getElementById('connect-btn');
const connectWsBtn = document.getElementById('connect-ws-btn');

if (connectBtn) connectBtn.addEventListener('click', connectWebSerial);
if (connectWsBtn) connectWsBtn.addEventListener('click', connectWebSocket);

let ws = null;

function connectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  connText.textContent = 'Connecting WS...';
  ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    connText.textContent = 'Connected (WebSocket)';
    connStatus.classList.remove('disconnected');
    connStatus.classList.add('connected');
    state.connected = true;
    state.mode = 'websocket';
  };

  ws.onmessage = (event) => {
    const trimmed = event.data.trim();
    if (trimmed.length === 0) return;
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      data = { type: 'log', level: 'raw', msg: trimmed, t: Date.now() };
    }

    // Buffer raw line
    window.__serialRawLines.push({ ts: Date.now(), raw: trimmed });
    if (window.__serialRawLines.length > MAX_RAW_LINES) window.__serialRawLines.shift();

    // Buffer logs globally
    if (data.type === 'log') {
      window.__serialLogBuffer.push(data);
      if (window.__serialLogBuffer.length > MAX_LOG_BUFFER) window.__serialLogBuffer.shift();
    }

    // Cache latest status globally
    if (data.type === 'status') {
      window.__lastStatus = data;
    }

    // Buffer telemetry
    if (data.type === 'imu' || data.type === 'encoders') {
      window.__telemetryBuffer.push({ ts: Date.now(), ...data });
      if (window.__telemetryBuffer.length > MAX_TELEMETRY_BUFFER) window.__telemetryBuffer.shift();
    }

    const customEvent = new CustomEvent('ws-data', { detail: data });
    window.dispatchEvent(customEvent);
  };

  ws.onclose = () => {
    state.connected = false;
    connStatus.classList.remove('connected');
    connStatus.classList.add('disconnected');
    connText.textContent = 'Disconnected';
  };

  ws.onerror = (err) => {
    console.error('WebSocket Error:', err);
    alert('Failed to connect to WebSocket server at ws://localhost:8080.\nMake sure "node tuning_server.cjs" is running in a terminal!');
  };
}

// Web Serial connection
let serialPort = null;
let serialWriter = null;
let serialReader = null;

async function connectWebSerial() {
  if (!('serial' in navigator)) {
    alert('Web Serial API not supported in your browser. Please use Chrome or Edge.');
    return;
  }

  // Safeguard: Clean up any existing connection before opening a new one
  if (serialPort) {
    try {
      if (serialReader) {
        await serialReader.cancel();
        serialReader.releaseLock();
      }
    } catch (e) {}
    try {
      if (serialWriter) {
        await serialWriter.close();
        serialWriter.releaseLock();
      }
    } catch (e) {}
    try {
      await serialPort.close();
    } catch (e) {}
    serialPort = null;
    serialReader = null;
    serialWriter = null;
    state.connected = false;
  }

  try {
    // Filter specifically for USB serial chips (CP210x, CH340, Espressif, FTDI) so Chrome ignores Bluetooth devices
    serialPort = await navigator.serial.requestPort({
      filters: [
        { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (ESP32 DevKit V1)
        { usbVendorId: 0x1a86 }, // QinHeng / WCH CH340
        { usbVendorId: 0x303a }, // Espressif Systems (ESP32-S2/S3/C3 Native USB)
        { usbVendorId: 0x0403 }  // FTDI
      ]
    });
    // Check if the selected port is not already open
    if (!serialPort.readable) {
      await serialPort.open({ baudRate: 115200 });
    }

    // Toggle DTR/RTS to reset the ESP32 so it doesn't get stuck in bootloader or held in reset
    await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise(r => setTimeout(r, 100));
    await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
    await new Promise(r => setTimeout(r, 100));
    await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });

    connText.textContent = 'Connected';
    connStatus.classList.remove('disconnected');
    connStatus.classList.add('connected');
    state.connected = true;

    const textEncoder = new TextEncoderStream();
    const writableStreamClosed = textEncoder.readable.pipeTo(serialPort.writable);
    serialWriter = textEncoder.writable.getWriter();

    readUntilClosed();
  } catch (error) {
    console.error('There was an error opening the serial port:', error);
  }
}

// Global buffers — survive page navigation
window.__serialLogBuffer = window.__serialLogBuffer || [];    // log messages
window.__serialRawLines = window.__serialRawLines || [];      // every line received (raw text)
window.__lastStatus = window.__lastStatus || null;            // latest status snapshot
window.__telemetryBuffer = window.__telemetryBuffer || [];    // imu + encoder samples
window.__commandsSent = window.__commandsSent || [];          // commands sent to ESP32
const MAX_LOG_BUFFER = 500;
const MAX_TELEMETRY_BUFFER = 2000;
const MAX_RAW_LINES = 2000;

async function readUntilClosed() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  serialReader = textDecoder.readable
    .pipeThrough(new TransformStream(new LineBreakTransformer()))
    .getReader();

  try {
    while (true) {
      const { value, done } = await serialReader.read();
      if (done) {
        break;
      }
      if (value) {
        const trimmed = value.trim();
        if (trimmed.length === 0) continue;
        let data;
        try {
          data = JSON.parse(trimmed);
        } catch (e) {
          // Non-JSON serial output — capture as a raw log line
          if (value.trim().length > 0) {
            data = { type: 'log', level: 'raw', msg: value.trim(), t: Date.now() };
          } else {
            continue;
          }
        }

        // Buffer raw line
        window.__serialRawLines.push({ ts: Date.now(), raw: trimmed });
        if (window.__serialRawLines.length > MAX_RAW_LINES) {
          window.__serialRawLines.shift();
        }

        // Buffer logs globally
        if (data.type === 'log') {
          window.__serialLogBuffer.push(data);
          if (window.__serialLogBuffer.length > MAX_LOG_BUFFER) {
            window.__serialLogBuffer.shift();
          }
        }

        // Cache latest status globally
        if (data.type === 'status') {
          window.__lastStatus = data;
        }

        // Buffer telemetry
        if (data.type === 'imu' || data.type === 'encoders') {
          window.__telemetryBuffer.push({ ts: Date.now(), ...data });
          if (window.__telemetryBuffer.length > MAX_TELEMETRY_BUFFER) {
            window.__telemetryBuffer.shift();
          }
        }

        const customEvent = new CustomEvent('ws-data', { detail: data });
        window.dispatchEvent(customEvent);
      }
    }
  } catch (error) {
    console.error('Error reading serial data', error);
  } finally {
    state.connected = false;
    connStatus.classList.remove('connected');
    connStatus.classList.add('disconnected');
    connText.textContent = 'Disconnected';
    
    if (serialReader) {
      try {
        await serialReader.cancel();
      } catch (e) {}
      try {
        serialReader.releaseLock();
      } catch (e) {}
      serialReader = null;
    }
    if (serialWriter) {
      try {
        await serialWriter.close();
      } catch (e) {}
      try {
        serialWriter.releaseLock();
      } catch (e) {}
      serialWriter = null;
    }
    if (serialPort) {
      try {
        await serialPort.close();
      } catch (e) {}
      serialPort = null;
    }
  }
}

class LineBreakTransformer {
  constructor() {
    this.buffer = '';
  }

  transform(chunk, controller) {
    // Append incoming chunk to our buffer
    this.buffer += chunk;
    // Split on any line ending: \r\n, \r, or \n
    const parts = this.buffer.split(/\r?\n|\r/);
    // The last element is either an incomplete line or empty string — keep it
    this.buffer = parts.pop();
    for (const part of parts) {
      // Strip any remaining control characters
      const clean = part.replace(/[\x00-\x1F\x7F]/g, '').trim();
      if (clean.length > 0) {
        controller.enqueue(clean);
      }
    }
  }

  flush(controller) {
    const clean = this.buffer.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (clean.length > 0) {
      controller.enqueue(clean);
    }
  }
}

function sendCommand(command, data) {
  if (!state.connected) {
    console.warn('Not connected! Cannot send:', command, data);
    return;
  }
  const payload = JSON.stringify({ command, ...data }) + '\n';
  if (state.mode === 'websocket' && ws && ws.readyState === WebSocket.OPEN) {
    console.log('Sending over WebSocket:', payload);
    ws.send(payload);
  } else if (serialWriter) {
    console.log('Sending over Serial:', payload);
    serialWriter.write(payload);
  }

  // Track commands sent
  window.__commandsSent.push({ ts: Date.now(), command, ...data });
}

// === Auto-Export to local file via Vite server ===
function buildExportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    connectionState: state.connected ? 'connected' : 'disconnected',
    lastStatus: window.__lastStatus,
    logs: window.__serialLogBuffer,
    telemetry: window.__telemetryBuffer,
    commandsSent: window.__commandsSent,
    rawSerialLines: window.__serialRawLines,
  };
}

async function pushExport() {
  try {
    await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildExportPayload(), null, 2),
    });
  } catch (e) {
    // Silently ignore — server might not be ready yet
  }
}

// Auto-push every 5 seconds while connected
setInterval(() => {
  if (state.connected) {
    pushExport();
  }
}, 5000);

// Manual export button — triggers immediate push + download
function exportData() {
  pushExport();

  const blob = new Blob([JSON.stringify(buildExportPayload(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mbt2-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Wire up export button
const exportBtn = document.getElementById('export-btn');
if (exportBtn) exportBtn.addEventListener('click', exportData);

// Initialize
navigateToDashboard();
