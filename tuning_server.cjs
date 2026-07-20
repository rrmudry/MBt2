const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── Configuration ───
// Use the Bluetooth SPP port created by 'sudo rfcomm bind 0 <MAC>'
const PORT_NAME = process.env.PORT || '/dev/rfcomm0';
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
