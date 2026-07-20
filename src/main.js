import './style.css';
import { renderDashboard } from './components/dashboard.js';
import { renderMotors } from './components/motors.js';
import { renderEncoders } from './components/encoders.js';
import { renderImu } from './components/imu.js';

// App state
const state = {
  currentPage: 'dashboard',
  connected: false,
};

const mainView = document.getElementById('main-view');
const navLinks = document.querySelectorAll('nav a');
const connStatus = document.getElementById('connection-status');
const connText = document.getElementById('connection-text');

// Navigation handler
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.getAttribute('data-page');
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  state.currentPage = page;
  
  // Update active state on nav
  navLinks.forEach(link => {
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Render content
  mainView.innerHTML = ''; // Clear current
  mainView.style.opacity = '0';
  
  setTimeout(() => {
    switch(page) {
      case 'dashboard': renderDashboard(mainView, sendCommand); break;
      case 'motors': renderMotors(mainView, sendCommand); break;
      case 'encoders': renderEncoders(mainView, sendCommand); break;
      case 'imu': renderImu(mainView); break;
    }
    
    // Fade in
    mainView.style.transition = 'opacity 0.3s ease';
    mainView.style.opacity = '1';
  }, 150);
}

const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', connectWebSerial);

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
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 230400 });

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
  if (!state.connected || !serialWriter) {
    console.warn('Not connected! Cannot send:', command, data);
    return;
  }
  const payload = JSON.stringify({ command, ...data }) + '\n';
  console.log('Sending over Serial:', payload);
  serialWriter.write(payload);

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
setupNavigation();
navigateTo('dashboard');
