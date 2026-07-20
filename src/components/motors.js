export function renderMotors(container, sendCommand) {
  container.innerHTML = `
    <h1 class="page-title">Closed-Loop Velocity Testing</h1>
    <div class="grid-2">
      <!-- Left Motor -->
      <div class="glass-panel">
        <h2 class="panel-header">Left Motor (D32, D33, D14)</h2>
        <div class="control-group">
          <label>Enable Driver (D13)</label>
          <label class="toggle-switch">
            <input type="checkbox" id="left-enable">
            <span class="slider"></span>
          </label>
        </div>
        <div class="control-group">
          <label>Target Velocity (<span id="left-vel-val">0.0</span> rad/s)</label>
          <input type="range" id="left-vel" min="-20" max="20" step="0.5" value="0">
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="left-apply">Apply Left Velocity</button>
      </div>
      
      <!-- Right Motor -->
      <div class="glass-panel">
        <h2 class="panel-header">Right Motor (D25, D26, D27)</h2>
        <div class="control-group">
          <label>Enable Driver (D12)</label>
          <label class="toggle-switch">
            <input type="checkbox" id="right-enable">
            <span class="slider"></span>
          </label>
        </div>
        <div class="control-group">
          <label>Target Velocity (<span id="right-vel-val">0.0</span> rad/s)</label>
          <input type="range" id="right-vel" min="-20" max="20" step="0.5" value="0">
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="right-apply">Apply Right Velocity</button>
      </div>
    </div>
  `;

  // Left Motor Logic
  const leftVelInput = document.getElementById('left-vel');
  const leftVelVal = document.getElementById('left-vel-val');
  const leftEnable = document.getElementById('left-enable');
  const leftApply = document.getElementById('left-apply');

  leftVelInput.addEventListener('input', (e) => leftVelVal.textContent = parseFloat(e.target.value).toFixed(1));
  leftApply.addEventListener('click', () => {
    sendCommand('motor_test', {
      motor: 'left',
      enable: leftEnable.checked,
      velocity: parseFloat(leftVelInput.value)
    });
  });

  // Right Motor Logic
  const rightVelInput = document.getElementById('right-vel');
  const rightVelVal = document.getElementById('right-vel-val');
  const rightEnable = document.getElementById('right-enable');
  const rightApply = document.getElementById('right-apply');

  rightVelInput.addEventListener('input', (e) => rightVelVal.textContent = parseFloat(e.target.value).toFixed(1));
  rightApply.addEventListener('click', () => {
    sendCommand('motor_test', {
      motor: 'right',
      enable: rightEnable.checked,
      velocity: parseFloat(rightVelInput.value)
    });
  });
}
