export function renderImu(container) {
  container.innerHTML = `
    <h1 class="page-title">IMU Testing (MPU6050)</h1>
    <div class="grid-2">
      <div class="glass-panel">
        <h2 class="panel-header">Orientation Data (SDA: D21, SCL: D22)</h2>
        <div class="control-group">
          <label>Pitch</label>
          <div class="data-readout" id="imu-pitch" style="color: var(--primary-color)">0.00°</div>
        </div>
        <div class="control-group">
          <label>Roll</label>
          <div class="data-readout" id="imu-roll" style="color: var(--secondary-color)">0.00°</div>
        </div>
        <div class="control-group">
          <label>Yaw</label>
          <div class="data-readout" id="imu-yaw">0.00°</div>
        </div>
      </div>
    </div>
  `;

  // Attach listener for simulated WS data
  const handleData = (e) => {
    if (e.detail.type === 'imu') {
      const p = document.getElementById('imu-pitch');
      const r = document.getElementById('imu-roll');
      const y = document.getElementById('imu-yaw');
      
      if(p) p.innerText = e.detail.pitch + '°';
      if(r) r.innerText = e.detail.roll + '°';
      if(y) y.innerText = e.detail.yaw + '°';
    }
  };

  window.addEventListener('ws-data', handleData);
}
