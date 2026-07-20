const WebSocket = require('ws');
const fs = require('fs');

const ws = new WebSocket('ws://localhost:8080');
const stream = fs.createWriteStream('telemetry_capture.csv');

// Write CSV Header
stream.write('Timestamp_ms,MotorLeft_Vel,MotorRight_Vel,AccelX,AccelY,AccelZ\n');

let startTime = Date.now();
let capturedLines = 0;

console.log("Starting 10-second capture...");

setTimeout(() => {
    console.log(`Capture complete! Recorded ${capturedLines} data points.`);
    stream.end();
    ws.close();
    process.exit(0);
}, 10000);

ws.on('open', () => {
    console.log("Connected to WebSocket, waiting for DATA...");
});

ws.on('message', (data) => {
    const msg = data.toString().trim();
    if (msg.startsWith('DATA,')) {
        const csvLine = msg.substring(5) + '\n';
        stream.write(csvLine);
        capturedLines++;
    }
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    process.exit(1);
});
