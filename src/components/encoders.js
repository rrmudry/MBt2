export function renderEncoders(container, sendCommand) {
  container.innerHTML = `
    <h1 class="page-title">Encoder Testing (AS5600)</h1>
    <div class="grid-2">
      <!-- Left Encoder -->
      <div class="glass-panel">
        <h2 class="panel-header">Left Encoder (SDA: D21, SCL: D22)</h2>
        <div class="control-group">
          <label>Absolute Angle</label>
          <div class="data-readout" id="enc-left-angle">0.0°</div>
        </div>
        <div class="control-group">
          <label>Velocity</label>
          <div class="data-readout" id="enc-left-vel">0.0 rad/s</div>
        </div>
      </div>
      
      <!-- Right Encoder -->
      <div class="glass-panel">
        <h2 class="panel-header">Right Encoder (SDA: D18, SCL: D19)</h2>
        <div class="control-group">
          <label>Absolute Angle</label>
          <div class="data-readout" id="enc-right-angle">0.0°</div>
        </div>
        <div class="control-group">
          <label>Velocity</label>
          <div class="data-readout" id="enc-right-vel">0.0 rad/s</div>
        </div>
      </div>
    </div>
    <div style="margin-top: 2rem; text-align: center;">
      <button class="btn btn-primary" onclick="window.handleEncDiag()">Run Magnet Diagnostics</button>
      <p style="margin-top: 1rem; color: #aaa; font-size: 0.9rem;">Check the Dashboard Console for Magnet Status (MD/ML/MH)</p>
    </div>
  `;

  window.handleEncDiag = () => {
    if (sendCommand) {
      sendCommand('enc_diag', {});
    }
  };

  // Attach listener for WS data
  const handleData = (e) => {
    if (e.detail.type === 'status') {
      const leftAngle = document.getElementById('enc-left-angle');
      const rightAngle = document.getElementById('enc-right-angle');
      
      if(leftAngle && e.detail.encLeftAngle !== undefined) leftAngle.innerText = e.detail.encLeftAngle.toFixed(2) + ' rad';
      if(rightAngle && e.detail.encRightAngle !== undefined) rightAngle.innerText = e.detail.encRightAngle.toFixed(2) + ' rad';
    }
  };

  window.addEventListener('ws-data', handleData);
}
