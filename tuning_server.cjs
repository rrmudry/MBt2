const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve frontend dist files & diagnostic GUIs
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/tuning_gui.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tuning_gui.html'));
});
app.get('/imu_test_gui.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'imu_test_gui.html'));
});
app.get('/encoder_test_gui.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'encoder_test_gui.html'));
});
app.get('/motor_test_gui.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'motor_test_gui.html'));
});

// ─── Configuration ───
const PORT_NAME = process.env.PORT || '/dev/ttyUSB0';
const BAUD_RATE = 115200;
const WS_PORT = 8080;

console.log(`Connecting to ${PORT_NAME} at ${BAUD_RATE} baud...`);
const port = new SerialPort({ path: PORT_NAME, baudRate: BAUD_RATE, autoOpen: false });

// Important: Don't toggle DTR/RTS during open on Linux/CH340 to prevent disconnects
port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }
  console.log('Port opened successfully!');
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

wss.on('connection', (ws) => {
  console.log('GUI client connected.');
  
  ws.on('message', (msg) => {
    const data = msg.toString();
    console.log('> ' + data.trim());
    port.write(data);
  });
  
  ws.on('close', () => {
    console.log('GUI client disconnected.');
  });
});

parser.on('data', (data) => {
  const line = data.trim();
  wss.clients.forEach(function each(client) {
    if (client.readyState === 1) {
      client.send(line);
    }
  });
});

port.on('error', (err) => {
  console.error('Serial Port Error:', err.message);
});

const WEB_PORT = 8080;
server.listen(WEB_PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${WEB_PORT}`);
});
