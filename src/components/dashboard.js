export function renderDashboard(container, sendCommand) {
  container.innerHTML = `
    <!-- Top Header Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
      <div>
        <h1 class="page-title" style="margin-bottom: 0.25rem;">MBt2 Unified Robot Control & Cascaded Dual-Loop PID Suite</h1>
        <p style="color: var(--text-muted); font-size: 0.85rem;">Live monitoring, diagnostic suite & real-time dual-loop PID tuning</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="btnToggleMode" style="padding: 8px 14px; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #f59e0b; font-weight: 700; border-radius: 6px; cursor: pointer;">⚙️ Mode: OPEN-LOOP (No Encoder)</button>
        <button id="btnBalanceToggle" style="padding: 8px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; font-weight: 700; border-radius: 6px; cursor: pointer;">⚖️ Toggle Balancing</button>
        <button id="btnStopAll" style="padding: 8px 14px; background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #ff8888; font-weight: 700; border-radius: 6px; cursor: pointer;">[SPACE] 🚨 STOP ALL</button>
      </div>
    </div>

    <!-- Main Diagnostic & Controls Grid (4 Columns) -->
    <div style="display: grid; grid-template-columns: 280px 1fr 1fr 340px; gap: 1.25rem; margin-bottom: 1.25rem;">
      
      <!-- Column 1: MPU6050 IMU & Artificial Horizon -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; gap: 0.75rem;">
        <h2 class="panel-header" style="margin-bottom: 0; display: flex; justify-content: space-between;">
          <span>MPU6050 IMU</span>
          <span id="imuStatusBadge" style="font-size:0.75rem; color:#10b981;">0x68 OK</span>
        </h2>
        <canvas id="horizonCanvas" style="width: 100%; height: 170px; background: #000; border-radius: 8px; border: 1px solid var(--border-color);"></canvas>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
          <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px;">
            <div style="font-size: 0.65rem; color: var(--text-muted);">PITCH</div>
            <div id="valPitch" style="font-size: 1.1rem; font-weight: 700; color: var(--primary-color);">0.00°</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px;">
            <div style="font-size: 0.65rem; color: var(--text-muted);">ROLL</div>
            <div id="valRoll" style="font-size: 1.1rem; font-weight: 700; color: #ff007f;">0.00°</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px;">
            <div style="font-size: 0.65rem; color: var(--text-muted);">ACCEL Z</div>
            <div id="valAccelZ" style="font-size: 1.0rem; font-weight: 700; color: #10b981;">1.00g</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px;">
            <div style="font-size: 0.65rem; color: var(--text-muted);">TEMP</div>
            <div id="valTemp" style="font-size: 1.0rem; font-weight: 700; color: #f59e0b;">--°C</div>
          </div>
        </div>
      </div>

      <!-- Column 2: AS5600 Encoders -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; gap: 0.75rem;">
        <h2 class="panel-header" style="margin-bottom: 0;">AS5600 Encoders</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; align-items: center;">
          <!-- Left Encoder Dial -->
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">LEFT (Bus 0)</div>
            <canvas id="dialLeft" style="width: 100px; height: 100px;"></canvas>
            <div id="valLeftDeg" style="font-size: 1.0rem; font-weight: 700; color: var(--primary-color); margin-top: 2px;">0.0°</div>
            <div id="valLeftRaw" style="font-size: 0.7rem; color: var(--text-muted);">0 / 4095</div>
            <div style="display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; justify-content: center;">
              <span id="pillLeftMD" style="font-size:0.6rem; padding:1px 4px; border-radius:4px; background:rgba(239,68,68,0.2); color:#ef4444;">MD: No</span>
              <span id="pillLeftDist" style="font-size:0.6rem; padding:1px 4px; border-radius:4px; background:rgba(255,255,255,0.05); color:#888;">Dist: --</span>
            </div>
          </div>

          <!-- Right Encoder Dial -->
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #ff007f; margin-bottom: 2px;">RIGHT (Bus 1)</div>
            <canvas id="dialRight" style="width: 100px; height: 100px;"></canvas>
            <div id="valRightDeg" style="font-size: 1.0rem; font-weight: 700; color: #ff007f; margin-top: 2px;">0.0°</div>
            <div id="valRightRaw" style="font-size: 0.7rem; color: var(--text-muted);">0 / 4095</div>
            <div style="display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; justify-content: center;">
              <span id="pillRightMD" style="font-size:0.6rem; padding:1px 4px; border-radius:4px; background:rgba(239,68,68,0.2); color:#ef4444;">MD: No</span>
              <span id="pillRightDist" style="font-size:0.6rem; padding:1px 4px; border-radius:4px; background:rgba(255,255,255,0.05); color:#888;">Dist: --</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: Motor Controls -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; gap: 0.5rem;">
        <h2 class="panel-header" style="margin-bottom: 0;">Motor Drivers</h2>
        
        <!-- Left Motor controls -->
        <div style="background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary-color);">Left (D13)</span>
            <label class="toggle-switch" style="scale: 0.7;">
              <input type="checkbox" id="chkLeftEnable">
              <span class="slider"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.65rem; color: var(--text-muted);">Invert Phase</label>
            <input type="checkbox" id="chkInvertLeft" checked>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <input type="range" id="rngLeftVel" min="-20" max="20" step="0.5" value="0" style="flex: 1;">
            <span id="lblLeftVel" style="font-size: 0.75rem; font-weight: 700; width: 50px; text-align: right;">0.0</span>
          </div>
        </div>

        <!-- Right Motor controls -->
        <div style="background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #ff007f;">Right (D12)</span>
            <label class="toggle-switch" style="scale: 0.7;">
              <input type="checkbox" id="chkRightEnable">
              <span class="slider"></span>
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.65rem; color: var(--text-muted);">Invert Phase</label>
            <input type="checkbox" id="chkInvertRight">
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <input type="range" id="rngRightVel" min="-20" max="20" step="0.5" value="0" style="flex: 1;">
            <span id="lblRightVel" style="font-size: 0.75rem; font-weight: 700; width: 50px; text-align: right;">0.0</span>
          </div>
        </div>

        <!-- Velocity Ramp Preset Buttons -->
        <div style="display: flex; gap: 4px;">
          <button id="btnRampLeftFwd" style="flex: 1; padding: 4px; font-size: 0.65rem; background: rgba(0,242,254,0.1); border: 1px solid var(--primary-color); color: var(--primary-color); border-radius: 4px; cursor: pointer;">📈 Left</button>
          <button id="btnRampRightFwd" style="flex: 1; padding: 4px; font-size: 0.65rem; background: rgba(255,0,127,0.1); border: 1px solid #ff007f; color: #ff007f; border-radius: 4px; cursor: pointer;">📈 Right</button>
          <button id="btnRampBothFwd" style="flex: 1; padding: 4px; font-size: 0.65rem; background: rgba(16,185,129,0.1); border: 1px solid #10b981; color: #10b981; border-radius: 4px; cursor: pointer;">🚀 Both</button>
        </div>
      </div>

      <!-- Column 4: ⚖️ Cascaded Dual-Loop PID Tuning Panel -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
        <h2 class="panel-header" style="margin-bottom: 0;">⚖️ Cascaded Dual-Loop PID</h2>
        
        <!-- Inner Stability PID (Tilt -> Torque Voltage Uq) -->
        <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 6px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: #10b981; margin-bottom: 2px;">INNER STABILITY LOOP (Tilt → Torque)</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Stb P</label>
              <input type="number" id="numStbP" value="80.0" step="1" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Stb I</label>
              <input type="number" id="numStbI" value="67.0" step="5" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Stb D</label>
              <input type="number" id="numStbD" value="0.8" step="0.1" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
          </div>
        </div>

        <!-- Outer Velocity PID (Vel -> Target Pitch) -->
        <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 6px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">OUTER VELOCITY LOOP (Speed → Pitch)</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Vel P</label>
              <input type="number" id="numVelP" value="0.012" step="0.002" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Vel I</label>
              <input type="number" id="numVelI" value="0.010" step="0.002" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
          </div>
        </div>

        <!-- Low Pass Filter & Trim -->
        <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 6px;">
          <div style="font-size: 0.65rem; font-weight: 700; color: #f59e0b; margin-bottom: 2px;">LPF NOISE FILTER & PITCH TRIM</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">LPF Tf (sec)</label>
              <input type="number" id="numLpfTf" value="0.07" step="0.01" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
            <div>
              <label style="font-size:0.55rem; color:var(--text-muted);">Pitch Trim (°)</label>
              <input type="number" id="numPitchOffset" value="1.83" step="0.1" style="width:100%; background:#111; border:1px solid #333; color:#fff; border-radius:4px; padding:2px; font-size:0.7rem;">
            </div>
          </div>
        </div>

        <!-- PID Apply & Calibration Buttons -->
        <div style="display: flex; gap: 4px; margin-top: 2px;">
          <button id="btnCalibrateZero" style="flex: 1; padding: 5px; font-size: 0.65rem; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #f59e0b; border-radius: 4px; cursor: pointer;">🎯 Zero Pitch</button>
          <button id="btnApplyPid" style="flex: 1.5; padding: 5px; font-size: 0.65rem; background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; font-weight: 700; border-radius: 4px; cursor: pointer;">💾 Apply Dual-Loop PID</button>
        </div>
      </div>

    </div>

    <!-- Bottom Row: Wide Oscilloscope (Left) & Restricted Serial Console (Right 280px) -->
    <div style="display: grid; grid-template-columns: 1fr 280px; gap: 1.25rem;">
      <div class="glass-panel" style="margin: 0;">
        <h2 class="panel-header">Real-Time Multi-Channel Oscilloscope</h2>
        <canvas id="plotCanvas" style="width: 100%; height: 210px; background: #000; border-radius: 6px; border: 1px solid var(--border-color);"></canvas>
      </div>

      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column;">
        <h2 class="panel-header" style="margin-bottom: 6px;">Diagnostic Console</h2>
        <pre id="serialLog" style="background: #000; color: var(--primary-color); padding: 8px; border-radius: 6px; height: 210px; overflow-y: auto; font-family: monospace; font-size: 0.7rem; margin: 0; flex: 1;"></pre>
      </div>
    </div>
  `;

  // Global State for UI
  let currentModeOpen = true;
  let balancingOn = false;
  let curPitch = 0, curRoll = 0, curAx = 0, curAy = 0, curAz = 9.81, curTemp = 0;

  const historyPitch = Array(300).fill(0);
  const historyLeftVel = Array(300).fill(0);
  const historyRightVel = Array(300).fill(0);

  let leftEnc = { deg: 0, raw: 0, md: false, ml: false, mh: false };
  let rightEnc = { deg: 0, raw: 0, md: false, ml: false, mh: false };

  // --- Element Bindings ---
  const chkL = document.getElementById('chkLeftEnable');
  const rngL = document.getElementById('rngLeftVel');
  const lblL = document.getElementById('lblLeftVel');
  const chkInvL = document.getElementById('chkInvertLeft');

  const chkR = document.getElementById('chkRightEnable');
  const rngR = document.getElementById('rngRightVel');
  const lblR = document.getElementById('lblRightVel');
  const chkInvR = document.getElementById('chkInvertRight');

  const btnToggleMode = document.getElementById('btnToggleMode');
  const btnBalanceToggle = document.getElementById('btnBalanceToggle');
  const btnStopAll = document.getElementById('btnStopAll');

  const logEl = document.getElementById('serialLog');
  function logMsg(msg) {
    if (logEl) {
      logEl.textContent += msg + '\n';
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  // --- Commands ---
  function sendLeftMotor() {
    lblL.textContent = parseFloat(rngL.value).toFixed(1);
    sendCommand('motor', { target: 'left', enable: chkL.checked, velocity: parseFloat(rngL.value) });
  }

  function sendRightMotor() {
    lblR.textContent = parseFloat(rngR.value).toFixed(1);
    sendCommand('motor', { target: 'right', enable: chkR.checked, velocity: parseFloat(rngR.value) });
  }

  function sendInvertConfig() {
    sendCommand('invert', { left: chkInvL.checked, right: chkInvR.checked });
    logMsg(`Invert Config Sent: Left=${chkInvL.checked ? 'YES' : 'NO'}, Right=${chkInvR.checked ? 'YES' : 'NO'}`);
  }

  chkL.addEventListener('change', sendLeftMotor);
  rngL.addEventListener('input', sendLeftMotor);
  chkInvL.addEventListener('change', sendInvertConfig);

  chkR.addEventListener('change', sendRightMotor);
  rngR.addEventListener('input', sendRightMotor);
  chkInvR.addEventListener('change', sendInvertConfig);

  btnToggleMode.onclick = () => {
    currentModeOpen = !currentModeOpen;
    if (currentModeOpen) {
      btnToggleMode.textContent = '⚙️ Mode: OPEN-LOOP (No Encoder)';
      btnToggleMode.style.borderColor = '#f59e0b';
      btnToggleMode.style.color = '#f59e0b';
      sendCommand('mode', { mode: 'open_loop' });
      logMsg("Mode set to: OPEN-LOOP");
    } else {
      btnToggleMode.textContent = '⚙️ Mode: CLOSED-LOOP (With Encoder)';
      btnToggleMode.style.borderColor = 'var(--primary-color)';
      btnToggleMode.style.color = 'var(--primary-color)';
      sendCommand('mode', { mode: 'closed_loop' });
      logMsg("Mode set to: CLOSED-LOOP FOC");
    }
  };

  btnBalanceToggle.onclick = () => {
    balancingOn = !balancingOn;
    if (balancingOn) {
      btnBalanceToggle.textContent = '⚖️ Balancing: ON';
      btnBalanceToggle.style.background = 'rgba(16, 185, 129, 0.4)';
      sendCommand('balance', { enable: true });
      logMsg("Auto-Balancing Mode ENGAGED!");
    } else {
      btnBalanceToggle.textContent = '⚖️ Toggle Balancing';
      btnBalanceToggle.style.background = 'rgba(16, 185, 129, 0.2)';
      sendCommand('balance', { enable: false });
      logMsg("Balancing Mode Disabled.");
    }
  };

  // --- PID Commands, Persistence & Calibration ---
  function loadSavedPidSettings() {
    try {
      const saved = localStorage.getItem('mbt2_pid_settings');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.stb_p !== undefined) document.getElementById('numStbP').value = p.stb_p;
        if (p.stb_i !== undefined) document.getElementById('numStbI').value = p.stb_i;
        if (p.stb_d !== undefined) document.getElementById('numStbD').value = p.stb_d;
        if (p.vel_p !== undefined) document.getElementById('numVelP').value = p.vel_p;
        if (p.vel_i !== undefined) document.getElementById('numVelI').value = p.vel_i;
        if (p.lpf_tf !== undefined) document.getElementById('numLpfTf').value = p.lpf_tf;
        if (p.pitch_offset !== undefined) document.getElementById('numPitchOffset').value = p.pitch_offset;
      }
    } catch (err) {
      console.error('Failed to load saved PID settings from localStorage:', err);
    }
  }

  function sendPidSettings() {
    const stb_p = parseFloat(document.getElementById('numStbP').value) || 80.0;
    const stb_i = parseFloat(document.getElementById('numStbI').value) || 67.0;
    const stb_d = parseFloat(document.getElementById('numStbD').value) || 0.8;
    const vel_p = parseFloat(document.getElementById('numVelP').value) || 0.012;
    const vel_i = parseFloat(document.getElementById('numVelI').value) || 0.010;
    const lpf_tf = parseFloat(document.getElementById('numLpfTf').value) || 0.07;
    const pitch_offset = parseFloat(document.getElementById('numPitchOffset').value) || 1.83;

    const config = { stb_p, stb_i, stb_d, vel_p, vel_i, lpf_tf, pitch_offset };
    try {
      localStorage.setItem('mbt2_pid_settings', JSON.stringify(config));
    } catch (e) {}

    sendCommand('pid', config);
    logMsg(`Dual-Loop PID Params Sent & Saved: STB[P=${stb_p}, I=${stb_i}, D=${stb_d}] VEL[P=${vel_p}, I=${vel_i}] LPF[Tf=${lpf_tf}] Offset=${pitch_offset}°`);
  }

  // Load saved settings immediately on component render
  loadSavedPidSettings();

  document.getElementById('btnApplyPid').onclick = sendPidSettings;

  document.getElementById('btnCalibrateZero').onclick = () => {
    document.getElementById('numPitchOffset').value = curPitch.toFixed(2);
    sendPidSettings();
    logMsg(`🎯 Calibrated Pitch Zero Offset to current pitch: ${curPitch.toFixed(2)}°`);
  };

  function stopAll() {
    chkL.checked = false; rngL.value = 0; lblL.textContent = '0.0';
    chkR.checked = false; rngR.value = 0; lblR.textContent = '0.0';
    balancingOn = false;
    btnBalanceToggle.textContent = '⚖️ Toggle Balancing';
    btnBalanceToggle.style.background = 'rgba(16, 185, 129, 0.2)';
    sendCommand('stop', {});
    logMsg("🚨 EMERGENCY STOP ACTIVATED!");
  }

  btnStopAll.onclick = stopAll;
  document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); stopAll(); } });

  document.getElementById('btnRampLeftFwd').onclick = () => sendCommand('ramp', { target: 'left', velocity: 10 });
  document.getElementById('btnRampRightFwd').onclick = () => sendCommand('ramp', { target: 'right', velocity: 10 });
  document.getElementById('btnRampBothFwd').onclick = () => sendCommand('ramp', { target: 'both', velocity: 10 });

  // --- Telemetry Handler ---
  const handleData = (e) => {
    const data = e.detail;
    if (!data) return;

    if (data.type === 'telemetry') {
      if (data.imu) {
        curPitch = data.imu.pitch;
        curRoll = data.imu.roll;
        curAz = data.imu.az;
        curTemp = data.imu.temp;
        document.getElementById('valPitch').textContent = curPitch.toFixed(2) + '°';
        document.getElementById('valRoll').textContent = curRoll.toFixed(2) + '°';
        document.getElementById('valAccelZ').textContent = (curAz / 9.81).toFixed(2) + 'g';
        if (curTemp) document.getElementById('valTemp').textContent = curTemp.toFixed(1) + '°C';
      }

      if (data.left_enc) {
        leftEnc = data.left_enc;
        document.getElementById('valLeftDeg').textContent = leftEnc.deg.toFixed(1) + '°';
        document.getElementById('valLeftRaw').textContent = `${leftEnc.raw} / 4095`;
        const md = document.getElementById('pillLeftMD');
        const dist = document.getElementById('pillLeftDist');
        if (leftEnc.md) { md.textContent = 'MD: Yes'; md.style.color = '#10b981'; md.style.background = 'rgba(16,185,129,0.2)'; }
        else { md.textContent = 'MD: No'; md.style.color = '#ef4444'; md.style.background = 'rgba(239,68,68,0.2)'; }
        if (leftEnc.ml) { dist.textContent = 'Dist: Too Far'; dist.style.color = '#f59e0b'; }
        else if (leftEnc.md) { dist.textContent = 'Dist: Perfect'; dist.style.color = '#10b981'; }
      }

      if (data.right_enc) {
        rightEnc = data.right_enc;
        document.getElementById('valRightDeg').textContent = rightEnc.deg.toFixed(1) + '°';
        document.getElementById('valRightRaw').textContent = `${rightEnc.raw} / 4095`;
        const md = document.getElementById('pillRightMD');
        const dist = document.getElementById('pillRightDist');
        if (rightEnc.md) { md.textContent = 'MD: Yes'; md.style.color = '#10b981'; md.style.background = 'rgba(16,185,129,0.2)'; }
        else { md.textContent = 'MD: No'; md.style.color = '#ef4444'; md.style.background = 'rgba(239,68,68,0.2)'; }
        if (rightEnc.ml) { dist.textContent = 'Dist: Too Far'; dist.style.color = '#f59e0b'; }
        else if (rightEnc.md) { dist.textContent = 'Dist: Perfect'; dist.style.color = '#10b981'; }
      }

      if (data.left_mot) {
        historyLeftVel.push(data.left_mot.act); historyLeftVel.shift();
      }
      if (data.right_mot) {
        historyRightVel.push(data.right_mot.act); historyRightVel.shift();
      }

      historyPitch.push(curPitch); historyPitch.shift();
    } else if (data.msg) {
      logMsg(data.msg);
    }
  };

  window.addEventListener('ws-data', handleData);

  // --- Rendering Canvases ---
  // 1. Artificial Horizon
  const hCanvas = document.getElementById('horizonCanvas');
  const hCtx = hCanvas.getContext('2d');

  function drawHorizon() {
    if (!hCanvas) return;
    const w = hCanvas.width = hCanvas.clientWidth;
    const h = hCanvas.height = hCanvas.clientHeight;
    const cx = w/2, cy = h/2;

    hCtx.clearRect(0, 0, w, h);
    hCtx.save();
    hCtx.translate(cx, cy);
    hCtx.rotate((curRoll * Math.PI) / 180);

    const pitchPx = curPitch * 2.5;

    hCtx.fillStyle = '#0f2b48'; hCtx.fillRect(-w, -h*2 + pitchPx, w*2, h*2);
    hCtx.fillStyle = '#3d2516'; hCtx.fillRect(-w, pitchPx, w*2, h*2);

    hCtx.strokeStyle = '#00f2fe'; hCtx.lineWidth = 2;
    hCtx.beginPath(); hCtx.moveTo(-w, pitchPx); hCtx.lineTo(w, pitchPx); hCtx.stroke();
    hCtx.restore();

    hCtx.strokeStyle = '#ff007f'; hCtx.lineWidth = 2;
    hCtx.beginPath();
    hCtx.moveTo(cx - 20, cy); hCtx.lineTo(cx - 6, cy);
    hCtx.moveTo(cx + 6, cy); hCtx.lineTo(cx + 20, cy);
    hCtx.moveTo(cx, cy - 6); hCtx.lineTo(cx, cy + 6);
    hCtx.stroke();

    requestAnimationFrame(drawHorizon);
  }
  requestAnimationFrame(drawHorizon);

  // 2. Circular Encoder Dial Gauges
  function drawDial(canvasId, angleDeg, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    const cx = w/2, cy = h/2, r = 38;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.stroke();

    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const nx = cx + (r - 8) * Math.cos(rad);
    const ny = cy + (r - 8) * Math.sin(rad);

    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2*Math.PI); ctx.fill();
  }

  function drawDials() {
    drawDial('dialLeft', leftEnc.deg, 'var(--primary-color)');
    drawDial('dialRight', rightEnc.deg, '#ff007f');
    requestAnimationFrame(drawDials);
  }
  requestAnimationFrame(drawDials);

  // 3. Multi-Channel Oscilloscope Plot
  const pCanvas = document.getElementById('plotCanvas');
  const pCtx = pCanvas.getContext('2d');

  function drawPlot() {
    if (!pCanvas) return;
    const w = pCanvas.width = pCanvas.clientWidth;
    const h = pCanvas.height = pCanvas.clientHeight;
    pCtx.clearRect(0, 0, w, h);

    pCtx.strokeStyle = 'rgba(255,255,255,0.1)'; pCtx.lineWidth = 1;
    pCtx.beginPath(); pCtx.moveTo(0, h/2); pCtx.lineTo(w, h/2); pCtx.stroke();

    const drawSeries = (arr, color, scale) => {
      pCtx.strokeStyle = color; pCtx.lineWidth = 2;
      pCtx.beginPath();
      for (let i = 0; i < 300; i++) {
        const x = (i / 300) * w;
        const y = (h/2) - (arr[i] * scale);
        if (i === 0) pCtx.moveTo(x, y); else pCtx.lineTo(x, y);
      }
      pCtx.stroke();
    };

    drawSeries(historyPitch, '#00f2fe', 2.5);
    drawSeries(historyLeftVel, 'rgba(0,242,254,0.5)', 4.0);
    drawSeries(historyRightVel, '#ff007f', 4.0);

    requestAnimationFrame(drawPlot);
  }
  requestAnimationFrame(drawPlot);
}
