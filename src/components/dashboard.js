export function renderDashboard(container, sendCommand) {
  container.innerHTML = `
    <h1 class="page-title">Dashboard Overview</h1>

    <!-- First row: Health & System Info + Drive Control + Live Telemetry -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 1.5rem; margin-bottom: 1.5rem;">
      
      <!-- Left Column: Status/Health Info -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="glass-panel" style="margin: 0; flex: 1;">
          <h2 class="panel-header">Component Health</h2>
          <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
            <div class="health-item">
              <div class="health-dot" id="health-imu"></div>
              <div>
                <div class="health-label">MPU6050 IMU</div>
                <div class="health-sub" id="health-imu-text">Waiting...</div>
              </div>
            </div>
            <div class="health-item">
              <div class="health-dot" id="health-enc-left"></div>
              <div>
                <div class="health-label">Left AS5600</div>
                <div class="health-sub" id="health-enc-left-text">Waiting...</div>
              </div>
            </div>
            <div class="health-item">
              <div class="health-dot" id="health-enc-right"></div>
              <div>
                <div class="health-label">Right AS5600</div>
                <div class="health-sub" id="health-enc-right-text">Waiting...</div>
              </div>
            </div>
            <div class="health-item">
              <div class="health-dot" id="health-motor-left"></div>
              <div>
                <div class="health-label">Left Motor</div>
                <div class="health-sub" id="health-motor-left-text">Waiting...</div>
              </div>
            </div>
            <div class="health-item">
              <div class="health-dot" id="health-motor-right"></div>
              <div>
                <div class="health-label">Right Motor</div>
                <div class="health-sub" id="health-motor-right-text">Waiting...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel" style="margin: 0;">
          <h2 class="panel-header">System Info</h2>
          <div class="control-group" style="margin-bottom: 0.5rem;">
            <label>Uptime</label>
            <div class="sys-value" id="sys-uptime">—</div>
          </div>
          <div class="control-group" style="margin-bottom: 0.5rem;">
            <label>Free Heap</label>
            <div class="sys-value" id="sys-heap">—</div>
          </div>
          <div class="control-group" style="margin-bottom: 0;">
            <label>Link Frequency</label>
            <div class="sys-value" id="sys-rate">—</div>
          </div>
        </div>
      </div>

      <!-- Middle Column: Robot Drive Controls -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; align-items: center;">
        <h2 class="panel-header" style="width: 100%;">Drive Control</h2>
        
        <div style="font-size: 0.75rem; color: #888; margin-bottom: 1rem; text-align: center; line-height: 1.4;">
          Use keys <b>W, A, S, D</b> or <b>Arrows</b> to drive.<br>
          Status: <span id="drive-active-key" style="color: var(--primary-color); font-weight: bold; font-family: monospace;">None</span>
        </div>

        <!-- Speed Slider -->
        <div class="control-group" style="width: 100%; margin-bottom: 1.25rem;">
          <label style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-main);">
            <span>Target Speed</span>
            <span style="color: var(--primary-color); font-weight: bold;"><span id="drive-speed-val">5.0</span> rad/s</span>
          </label>
          <input type="range" id="drive-speed-slider" min="1" max="15" step="0.5" value="5" style="margin-top: 4px;">
        </div>

        <!-- Visual D-Pad -->
        <div style="display: grid; grid-template-columns: repeat(3, 50px); grid-template-rows: repeat(3, 50px); gap: 10px; justify-content: center; margin: auto 0;">
          <div></div>
          <button class="btn-drive" id="btn-drive-up" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-light); font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.1s ease; outline: none; user-select: none;">▲</button>
          <div></div>
          <button class="btn-drive" id="btn-drive-left" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-light); font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.1s ease; outline: none; user-select: none;">◀</button>
          <button class="btn-drive" id="btn-drive-stop" style="background: rgba(255, 75, 75, 0.2); border: 1px solid rgba(255, 75, 75, 0.3); border-radius: 8px; color: var(--danger-color); font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; transition: all 0.1s ease; outline: none; user-select: none;">STOP</button>
          <button class="btn-drive" id="btn-drive-right" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-light); font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.1s ease; outline: none; user-select: none;">▶</button>
          <div></div>
          <button class="btn-drive" id="btn-drive-down" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-light); font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.1s ease; outline: none; user-select: none;">▼</button>
          <div></div>
        </div>
      </div>

      <!-- Right Column: Visual Telemetry Dials & Attitude Indicator -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column;">
        <h2 class="panel-header">Live Telemetry</h2>
        <div style="display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 0.5rem; align-items: center; justify-items: center; flex: 1; min-height: 250px;">
          
          <!-- Left Encoder Dial -->
          <div style="text-align: center;">
            <div class="value-label" style="margin-bottom: 0.4rem; font-size: 0.75rem;">Left Wheel</div>
            <div style="position: relative; display: inline-block;">
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6"/>
                <circle id="enc-left-track" cx="50" cy="50" r="44" fill="none" stroke="var(--primary-color)" stroke-width="6" stroke-dasharray="276" stroke-dashoffset="276" transform="rotate(-90 50 50)" style="transition: stroke-dashoffset 0.08s ease-out;"/>
                <line id="enc-left-pointer" x1="50" y1="50" x2="50" y2="12" stroke="var(--primary-color)" stroke-width="3.5" transform="rotate(0 50 50)" style="transition: transform 0.08s ease-out;"/>
                <text id="enc-left-text-val" x="50" y="55" fill="var(--text-light)" font-size="11" font-family="monospace" text-anchor="middle" font-weight="bold">0°</text>
              </svg>
            </div>
            <div style="margin-top: 0.4rem;">
              <div class="value-label" style="font-size: 0.65rem;">Velocity</div>
              <div id="enc-left-vel-text" style="font-family: monospace; font-size: 0.95rem; color: var(--primary-color); font-weight: bold;">0.00 rad/s</div>
            </div>
          </div>

          <!-- IMU Attitude Indicator (Horizon) -->
          <div style="text-align: center;">
            <div class="value-label" style="margin-bottom: 0.4rem; font-size: 0.75rem;">Attitude</div>
            <div class="imu-horizon-container" style="position: relative; width: 110px; height: 110px; border-radius: 50%; overflow: hidden; background: rgba(0,0,0,0.5); border: 2.5px solid var(--panel-border); margin: 0 auto; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 10px rgba(0,0,0,0.6);">
              <div id="imu-horizon-disk" style="position: absolute; width: 240px; height: 240px; transition: transform 0.08s ease-out; transform-origin: center;">
                <!-- Sky -->
                <div style="width: 100%; height: 50%; background: linear-gradient(to bottom, #1d2b64, #f8cdda); border-bottom: 2px solid var(--primary-color);"></div>
                <!-- Ground -->
                <div style="width: 100%; height: 50%; background: linear-gradient(to bottom, #1f4037, #99f2c8);"></div>
              </div>
              <div style="position: absolute; width: 36px; height: 2px; background: #ff4b4b; box-shadow: 0 0 4px #ff4b4b;"></div>
              <div style="position: absolute; width: 2px; height: 10px; background: #ff4b4b; top: calc(50% - 5px);"></div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 0.5rem;">
              <div>
                <div class="value-label" style="font-size: 0.65rem;">P: <span id="imu-pitch-text" style="font-family: monospace; font-size: 0.8rem; font-weight: bold; color: var(--text-light); text-transform: none;">0.0°</span></div>
              </div>
              <div>
                <div class="value-label" style="font-size: 0.65rem;">R: <span id="imu-roll-text" style="font-family: monospace; font-size: 0.8rem; font-weight: bold; color: var(--text-light); text-transform: none;">0.0°</span></div>
              </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; justify-content: center; margin-top: 0.3rem;">
              <svg width="36" height="36" viewBox="0 0 80 80" style="margin-right: -4px;">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
                <text x="40" y="15" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle" font-family="monospace">N</text>
                <line id="imu-compass-pointer" x1="40" y1="40" x2="40" y2="18" stroke="var(--primary-color)" stroke-width="3" transform="rotate(0 40 40)" style="transition: transform 0.08s ease-out;"/>
              </svg>
              <div id="imu-yaw-text" style="font-family: monospace; font-size: 0.8rem; font-weight: bold; color: var(--secondary-color);">0°</div>
            </div>
          </div>

          <!-- Right Encoder Dial -->
          <div style="text-align: center;">
            <div class="value-label" style="margin-bottom: 0.4rem; font-size: 0.75rem;">Right Wheel</div>
            <div style="position: relative; display: inline-block;">
              <svg width="110" height="110" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6"/>
                <circle id="enc-right-track" cx="50" cy="50" r="44" fill="none" stroke="var(--primary-color)" stroke-width="6" stroke-dasharray="276" stroke-dashoffset="276" transform="rotate(-90 50 50)" style="transition: stroke-dashoffset 0.08s ease-out;"/>
                <line id="enc-right-pointer" x1="50" y1="50" x2="50" y2="12" stroke="var(--primary-color)" stroke-width="3.5" transform="rotate(0 50 50)" style="transition: transform 0.08s ease-out;"/>
                <text id="enc-right-text-val" x="50" y="55" fill="var(--text-light)" font-size="11" font-family="monospace" text-anchor="middle" font-weight="bold">0°</text>
              </svg>
            </div>
            <div style="margin-top: 0.4rem;">
              <div class="value-label" style="font-size: 0.65rem;">Velocity</div>
              <div id="enc-right-vel-text" style="font-family: monospace; font-size: 0.95rem; color: var(--primary-color); font-weight: bold;">0.00 rad/s</div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- Second row: PID Tuning & Live Stability Plot -->
    <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 1.5rem; margin-bottom: 1.5rem;">
      
      <!-- PID Sliders Panel -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <h2 class="panel-header">Balancing PID Configuration</h2>
        
        <div class="control-group" style="flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <label style="font-weight: bold; color: var(--text-light); font-size: 0.95rem; cursor: pointer; user-select: none;" for="balance-mode-toggle">Enable Self-Balancing Mode</label>
          <label class="toggle-switch">
            <input type="checkbox" id="balance-mode-toggle">
            <span class="slider"></span>
          </label>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Kp Angle</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="kpa-val">4.0</span>
            </label>
            <input type="range" id="kpa-slider" min="0" max="15" step="0.1" value="4">
          </div>

          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Kd Angle</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="kda-val">0.15</span>
            </label>
            <input type="range" id="kda-slider" min="0" max="1" step="0.01" value="0.15">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Kp Speed</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="kpv-val">0.08</span>
            </label>
            <input type="range" id="kpv-slider" min="0" max="0.5" step="0.005" value="0.08">
          </div>

          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Ki Speed</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="kiv-val">0.003</span>
            </label>
            <input type="range" id="kiv-slider" min="0" max="0.05" step="0.0005" value="0.003">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Target Pitch</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="pitch-zero-val">0.0°</span>
            </label>
            <input type="range" id="pitch-zero-slider" min="-10" max="10" step="0.1" value="0">
          </div>

          <div class="control-group" style="margin-bottom: 0.4rem;">
            <label style="display: flex; justify-content: space-between; font-size: 0.75rem;">
              <span>Voltage Limit</span>
              <span style="color: var(--primary-color); font-weight: bold;" id="volt-lim-val">9.0V</span>
            </label>
            <input type="range" id="volt-lim-slider" min="1" max="11" step="0.5" value="9">
          </div>
        </div>

        <button class="btn btn-primary" style="width: 100%; padding: 8px; background: var(--primary-color); border: none; color: black; font-weight: bold; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; margin-top: 0.25rem;" id="pid-apply-btn">Apply PID Settings</button>
        
        <!-- Presets management -->
        <div style="border-top: 1px solid var(--panel-border); margin-top: 0.5rem; padding-top: 0.5rem;">
          <label style="font-size: 0.75rem; color: var(--text-main); display: block; margin-bottom: 0.3rem;">Tuning Presets</label>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <select id="pid-preset-select" style="flex: 1; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--panel-border); border-radius: 4px; color: var(--text-light); font-size: 0.75rem; outline: none; cursor: pointer;"></select>
            <button class="btn" id="pid-preset-delete" style="padding: 4px 8px; background: rgba(255, 75, 75, 0.15); border: 1px solid rgba(255, 75, 75, 0.3); color: var(--danger-color); font-size: 0.7rem; border-radius: 4px; cursor: pointer;">Delete</button>
          </div>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="pid-preset-name" placeholder="Preset name" style="flex: 1; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--panel-border); border-radius: 4px; color: var(--text-light); font-size: 0.75rem; outline: none;">
            <button class="btn btn-primary" id="pid-preset-save" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 4px; cursor: pointer; font-weight: bold; background: var(--secondary-color); color: black; border: none;">Save</button>
          </div>
        </div>
      </div>

      <!-- Real-time Plotter Panel -->
      <div class="glass-panel" style="margin: 0; display: flex; flex-direction: column;">
        <h2 class="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          Live Stability Plot
          <span style="font-size: 0.7rem; color: #888;">Measured Pitch (<span style="color: var(--primary-color);">Cyan</span>) vs Target (<span style="color: #ff4b4b;">Red</span>)</span>
        </h2>
        <div style="flex: 1; position: relative; min-height: 220px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); padding: 6px;">
          <canvas id="pid-plot-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
        </div>
      </div>
    </div>

    <!-- Serial Console -->
    <div class="glass-panel" style="margin-bottom: 0;">
      <h2 class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
        Serial Console
        <div style="display: flex; gap: 8px;">
          <button id="ping-btn" style="font-size: 0.75rem; padding: 4px 10px; background: var(--primary-color); border: none; color: black; font-weight: bold; border-radius: 4px; cursor: pointer;">Ping ESP32</button>
          <button id="console-clear-btn" style="font-size: 0.75rem; padding: 4px 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: var(--text-main); border-radius: 4px; cursor: pointer;">Clear</button>
        </div>
      </h2>
      <div id="serial-console"></div>
    </div>
  `;

  // Presets definition
  const DEFAULT_PRESETS = {
    "Low Power Bench Test": { kp_a: 1.5, kd_a: 0.05, kp_v: 0.02, ki_v: 0.0, target_pitch: 0.0, volt_lim: 3.0 },
    "Stiff Balancing": { kp_a: 6.0, kd_a: 0.22, kp_v: 0.08, ki_v: 0.003, target_pitch: 0.0, volt_lim: 9.0 },
    "Gentle Balancing": { kp_a: 4.0, kd_a: 0.15, kp_v: 0.05, ki_v: 0.002, target_pitch: 0.0, volt_lim: 7.0 }
  };

  const getPresets = () => {
    try {
      const stored = localStorage.getItem('mbt2_presets');
      if (stored) {
        return { ...DEFAULT_PRESETS, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return { ...DEFAULT_PRESETS };
  };

  const savePresets = (presets) => {
    const custom = {};
    Object.keys(presets).forEach(name => {
      if (!(name in DEFAULT_PRESETS)) {
        custom[name] = presets[name];
      }
    });
    localStorage.setItem('mbt2_presets', JSON.stringify(custom));
  };

  const populatePresetsDropdown = () => {
    const select = document.getElementById('pid-preset-select');
    if (!select) return;
    const presets = getPresets();
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    Object.keys(presets).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  };

  const handlePresetSelect = (e) => {
    const name = e.target.value;
    if (!name) return;
    const presets = getPresets();
    const p = presets[name];
    if (!p) return;

    const kpaS = document.getElementById('kpa-slider');
    const kdaS = document.getElementById('kda-slider');
    const kpvS = document.getElementById('kpv-slider');
    const kivS = document.getElementById('kiv-slider');
    const pzS = document.getElementById('pitch-zero-slider');
    const vlS = document.getElementById('volt-lim-slider');

    if (kpaS && p.kp_a !== undefined) { kpaS.value = p.kp_a; document.getElementById('kpa-val').textContent = p.kp_a.toFixed(1); }
    if (kdaS && p.kd_a !== undefined) { kdaS.value = p.kd_a; document.getElementById('kda-val').textContent = p.kd_a.toFixed(2); }
    if (kpvS && p.kp_v !== undefined) { kpvS.value = p.kp_v; document.getElementById('kpv-val').textContent = p.kp_v.toFixed(3); }
    if (kivS && p.ki_v !== undefined) { kivS.value = p.ki_v; document.getElementById('kiv-val').textContent = p.ki_v.toFixed(4); }
    if (pzS && p.target_pitch !== undefined) { pzS.value = p.target_pitch; document.getElementById('pitch-zero-val').textContent = p.target_pitch.toFixed(1) + '°'; }
    if (vlS && p.volt_lim !== undefined) { vlS.value = p.volt_lim; document.getElementById('volt-lim-val').textContent = p.volt_lim.toFixed(1) + 'V'; }

    applyPidSettings();
  };

  const handlePresetSave = () => {
    const nameInput = document.getElementById('pid-preset-name');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a preset name');
      return;
    }

    const kp_a = parseFloat(document.getElementById('kpa-slider').value);
    const kd_a = parseFloat(document.getElementById('kda-slider').value);
    const kp_v = parseFloat(document.getElementById('kpv-slider').value);
    const ki_v = parseFloat(document.getElementById('kiv-slider').value);
    const target_pitch = parseFloat(document.getElementById('pitch-zero-slider').value);
    const volt_lim = parseFloat(document.getElementById('volt-lim-slider').value);

    const presets = getPresets();
    presets[name] = { kp_a, kd_a, kp_v, ki_v, target_pitch, volt_lim };
    savePresets(presets);
    populatePresetsDropdown();
    nameInput.value = '';

    const select = document.getElementById('pid-preset-select');
    if (select) select.value = name;
  };

  const handlePresetDelete = () => {
    const select = document.getElementById('pid-preset-select');
    if (!select) return;
    const name = select.value;
    if (!name) {
      alert('Please select a preset to delete');
      return;
    }
    if (name in DEFAULT_PRESETS) {
      alert('Cannot delete default built-in presets');
      return;
    }

    const presets = getPresets();
    delete presets[name];
    savePresets(presets);
    populatePresetsDropdown();
  };

  // Dynamic values binding for PID sliders
  const setupSliderVal = (sliderId, valId, isDeg = false, isV = false) => {
    const s = document.getElementById(sliderId);
    const v = document.getElementById(valId);
    if (s && v) {
      s.addEventListener('input', (e) => {
        let dec = 2;
        if (sliderId.includes('kiv')) dec = 4;
        else if (sliderId.includes('kpv')) dec = 3;
        else if (sliderId.includes('kpa') || sliderId.includes('pitch-zero') || sliderId.includes('volt-lim')) dec = 1;
        v.textContent = parseFloat(e.target.value).toFixed(dec) + (isDeg ? '°' : '') + (isV ? 'V' : '');
      });
    }
  };
  setupSliderVal('kpa-slider', 'kpa-val');
  setupSliderVal('kda-slider', 'kda-val');
  setupSliderVal('kpv-slider', 'kpv-val');
  setupSliderVal('kiv-slider', 'kiv-val');
  setupSliderVal('pitch-zero-slider', 'pitch-zero-val', true);
  setupSliderVal('volt-lim-slider', 'volt-lim-val', false, true);

  // Speed Slider value updates
  const speedSlider = document.getElementById('drive-speed-slider');
  const speedVal = document.getElementById('drive-speed-val');
  if (speedSlider && speedVal) {
    speedSlider.addEventListener('input', (e) => {
      speedVal.textContent = parseFloat(e.target.value).toFixed(1);
    });
  }

  // Keyboard Control State
  const keyState = {
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false
  };

  let activeDrive = { linear: 0, angular: 0 };
  let currentKeyText = 'None';

  const updateDriveState = () => {
    const targetSlider = document.getElementById('drive-speed-slider');
    const speed = targetSlider ? parseFloat(targetSlider.value) : 5.0;
    
    let linear = 0;
    let angular = 0;

    if (keyState.w || keyState.arrowup) {
      linear = speed;
      currentKeyText = 'FORWARD';
    } else if (keyState.s || keyState.arrowdown) {
      linear = -speed;
      currentKeyText = 'BACKWARD';
    }

    if (keyState.a || keyState.arrowleft) {
      angular = -speed * 0.5; // Turn left
      if (linear === 0) currentKeyText = 'TURN LEFT';
      else currentKeyText += ' + LEFT';
    } else if (keyState.d || keyState.arrowright) {
      angular = speed * 0.5;  // Turn right
      if (linear === 0) currentKeyText = 'TURN RIGHT';
      else currentKeyText += ' + RIGHT';
    }

    if (linear === 0 && angular === 0) {
      currentKeyText = 'None';
    }

    setButtonActive('btn-drive-up', linear > 0);
    setButtonActive('btn-drive-down', linear < 0);
    setButtonActive('btn-drive-left', angular < 0);
    setButtonActive('btn-drive-right', angular > 0);
    setButtonActive('btn-drive-stop', linear === 0 && angular === 0);

    const activeKeyEl = document.getElementById('drive-active-key');
    if (activeKeyEl) activeKeyEl.textContent = currentKeyText;

    if (linear !== activeDrive.linear || angular !== activeDrive.angular) {
      activeDrive = { linear, angular };
      if (sendCommand) {
        sendCommand('drive', {
          linear: activeDrive.linear,
          angular: activeDrive.angular,
          enable: (activeDrive.linear !== 0 || activeDrive.angular !== 0)
        });
      }
    }
  };

  const setButtonActive = (id, active) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (id === 'btn-drive-stop') {
      btn.style.background = active ? 'var(--danger-color)' : 'rgba(255, 75, 75, 0.2)';
      btn.style.color = active ? 'black' : 'var(--danger-color)';
      return;
    }
    if (active) {
      btn.style.background = 'rgba(102,252,241,0.15)';
      btn.style.borderColor = 'var(--primary-color)';
      btn.style.color = 'var(--primary-color)';
      btn.style.boxShadow = '0 0 10px rgba(102,252,241,0.3)';
    } else {
      btn.style.background = 'rgba(255,255,255,0.05)';
      btn.style.borderColor = 'rgba(255,255,255,0.15)';
      btn.style.color = 'var(--text-light)';
      btn.style.boxShadow = 'none';
    }
  };

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (key in keyState) {
      if (key.startsWith('arrow')) {
        e.preventDefault();
      }
      keyState[key] = true;
      updateDriveState();
    }
  };

  const handleKeyUp = (e) => {
    const key = e.key.toLowerCase();
    if (key in keyState) {
      if (key.startsWith('arrow')) {
        e.preventDefault();
      }
      keyState[key] = false;
      updateDriveState();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // D-pad button mouse/touch handlers
  const setupDpadButton = (id, direction) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const startDrive = (e) => {
      e.preventDefault();
      const currentSlider = document.getElementById('drive-speed-slider');
      const speed = currentSlider ? parseFloat(currentSlider.value) : 5.0;
      let linear = 0;
      let angular = 0;

      if (direction === 'up') linear = speed;
      if (direction === 'down') linear = -speed;
      if (direction === 'left') angular = -speed * 0.5;
      if (direction === 'right') angular = speed * 0.5;

      if (sendCommand) {
        sendCommand('drive', { linear, angular, enable: true });
      }
      setButtonActive(id, true);
      const activeKeyEl = document.getElementById('drive-active-key');
      if (activeKeyEl) activeKeyEl.textContent = direction.toUpperCase();
    };

    const stopDrive = (e) => {
      e.preventDefault();
      if (sendCommand) {
        sendCommand('drive', { linear: 0, angular: 0, enable: false });
      }
      setButtonActive(id, false);
      setButtonActive('btn-drive-stop', true);
      const activeKeyEl = document.getElementById('drive-active-key');
      if (activeKeyEl) activeKeyEl.textContent = 'None';
    };

    btn.addEventListener('mousedown', startDrive);
    btn.addEventListener('mouseup', stopDrive);
    btn.addEventListener('mouseleave', stopDrive);
    btn.addEventListener('touchstart', startDrive, { passive: false });
    btn.addEventListener('touchend', stopDrive, { passive: false });
  };

  setupDpadButton('btn-drive-up', 'up');
  setupDpadButton('btn-drive-down', 'down');
  setupDpadButton('btn-drive-left', 'left');
  setupDpadButton('btn-drive-right', 'right');

  const stopBtn = document.getElementById('btn-drive-stop');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (sendCommand) {
        sendCommand('drive', { linear: 0, angular: 0, enable: false });
      }
      const activeKeyEl = document.getElementById('drive-active-key');
      if (activeKeyEl) activeKeyEl.textContent = 'None';
      updateDriveState();
    });
  }

  // Hook up PID settings application
  const applyPidSettings = () => {
    if (!sendCommand) return;
    const kp_a = parseFloat(document.getElementById('kpa-slider').value);
    const kd_a = parseFloat(document.getElementById('kda-slider').value);
    const kp_v = parseFloat(document.getElementById('kpv-slider').value);
    const ki_v = parseFloat(document.getElementById('kiv-slider').value);
    const target_pitch = parseFloat(document.getElementById('pitch-zero-slider').value);
    const volt_lim = parseFloat(document.getElementById('volt-lim-slider').value);
    const balancing = document.getElementById('balance-mode-toggle').checked;

    sendCommand('set_pid', {
      kp_a, kp_v, kd_a, ki_v, target_pitch, volt_lim, balancing
    });
  };

  const pidApplyBtn = document.getElementById('pid-apply-btn');
  if (pidApplyBtn) pidApplyBtn.addEventListener('click', applyPidSettings);

  const balToggle = document.getElementById('balance-mode-toggle');
  if (balToggle) balToggle.addEventListener('change', applyPidSettings);

  // Wire presets dropdown and actions
  populatePresetsDropdown();
  const presetSelect = document.getElementById('pid-preset-select');
  if (presetSelect) presetSelect.addEventListener('change', handlePresetSelect);
  
  const presetSaveBtn = document.getElementById('pid-preset-save');
  if (presetSaveBtn) presetSaveBtn.addEventListener('click', handlePresetSave);
  
  const presetDeleteBtn = document.getElementById('pid-preset-delete');
  if (presetDeleteBtn) presetDeleteBtn.addEventListener('click', handlePresetDelete);

  // Set up Canvas plotter history
  const canvas = document.getElementById('pid-plot-canvas');
  let ctx = null;
  const pitchHistory = [];
  const targetHistory = [];
  const MAX_POINTS = 200;

  if (canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  const drawPlot = (pitch, target) => {
    if (!canvas || !ctx) return;
    
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    pitchHistory.push(pitch);
    targetHistory.push(target);
    if (pitchHistory.length > MAX_POINTS) pitchHistory.shift();
    if (targetHistory.length > MAX_POINTS) targetHistory.shift();

    // Clear
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += h / 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Draw zero center reference
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const maxVal = 15; // ±15 degrees limit visual
    const scaleY = (val) => {
      return h / 2 - (val / maxVal) * (h / 2);
    };

    const drawLine = (history, color) => {
      if (history.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scaleY(history[0]));
      
      const stepX = w / MAX_POINTS;
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(i * stepX, scaleY(history[i]));
      }
      ctx.stroke();
    };

    drawLine(pitchHistory, '#66fcf1'); // measured pitch (Cyan)
    drawLine(targetHistory, '#ff4b4b'); // target pitch (Red)
  };

  // Track telemetry message rates
  let lastMsgTime = Date.now();
  let sampleCount = 0;
  let initializedPids = false;

  // Sync sliders helper
  const syncSliders = (data) => {
    const kpaS = document.getElementById('kpa-slider');
    const kdaS = document.getElementById('kda-slider');
    const kpvS = document.getElementById('kpv-slider');
    const kivS = document.getElementById('kiv-slider');
    const pzS = document.getElementById('pitch-zero-slider');
    const vlS = document.getElementById('volt-lim-slider');
    const balT = document.getElementById('balance-mode-toggle');

    if (kpaS && data.kp_a !== undefined) { kpaS.value = data.kp_a; document.getElementById('kpa-val').textContent = data.kp_a.toFixed(1); }
    if (kdaS && data.kd_a !== undefined) { kdaS.value = data.kd_a; document.getElementById('kda-val').textContent = data.kd_a.toFixed(2); }
    if (kpvS && data.kp_v !== undefined) { kpvS.value = data.kp_v; document.getElementById('kpv-val').textContent = data.kp_v.toFixed(3); }
    if (kivS && data.ki_v !== undefined) { kivS.value = data.ki_v; document.getElementById('kiv-val').textContent = data.ki_v.toFixed(4); }
    if (pzS && data.target_pitch !== undefined) { pzS.value = data.target_pitch; document.getElementById('pitch-zero-val').textContent = data.target_pitch.toFixed(1) + '°'; }
    if (vlS && data.volt_lim !== undefined) { vlS.value = data.volt_lim; document.getElementById('volt-lim-val').textContent = data.volt_lim.toFixed(1) + 'V'; }
    if (balT && data.balancingActive !== undefined) { balT.checked = data.balancingActive; }
  };

  // Listen for live data
  const handleData = (e) => {
    const data = e.detail;

    if (data.type === 'status') {
      sampleCount++;
      const now = Date.now();
      if (now - lastMsgTime >= 1000) {
        const rate = (sampleCount / ((now - lastMsgTime) / 1000)).toFixed(1);
        const rateEl = document.getElementById('sys-rate');
        if (rateEl) {
          rateEl.textContent = `${rate} Hz`;
        }
        sampleCount = 0;
        lastMsgTime = now;
      }

      // Sync PIDs on first status packet
      if (data.kp_a !== undefined && !initializedPids) {
        initializedPids = true;
        syncSliders(data);
      }

      // Draw real-time plot
      if (data.pitch !== undefined) {
        drawPlot(data.pitch, data.target_pitch !== undefined ? data.target_pitch : 0.0);
      }

      // If safety cutoff turned off balancingActive, sync balancing active toggle state
      const balT = document.getElementById('balance-mode-toggle');
      if (balT && data.balancingActive !== undefined) {
        balT.checked = data.balancingActive;
      }

      updateHealthIndicators(data);
      updateVisuals(data);
    }

    if (data.type === 'log') {
      const con = document.getElementById('serial-console');
      if (con) {
        appendLogLine(con, data);
        while (con.children.length > 200) {
          con.removeChild(con.firstChild);
        }
        con.scrollTop = con.scrollHeight;
      }
    }
  };

  window.addEventListener('ws-data', handleData);

  // Store cleanup ref so we don't leak listeners on nav
  container.__dashboardCleanup = () => {
    window.removeEventListener('ws-data', handleData);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}

function updateVisuals(data) {
  // Update Left Encoder
  const leftAngleRad = data.encLeftAngle !== undefined ? data.encLeftAngle : 0;
  const leftAngleDeg = ((leftAngleRad * 180 / Math.PI) % 360 + 360) % 360;
  const leftPointer = document.getElementById('enc-left-pointer');
  const leftTrack = document.getElementById('enc-left-track');
  const leftTextVal = document.getElementById('enc-left-text-val');
  const leftVelText = document.getElementById('enc-left-vel-text');

  if (leftPointer) leftPointer.setAttribute('transform', `rotate(${leftAngleDeg} 50 50)`);
  if (leftTrack) {
    const dashoffset = 276 - (leftAngleDeg / 360) * 276;
    leftTrack.setAttribute('stroke-dashoffset', dashoffset);
  }
  if (leftTextVal) leftTextVal.textContent = leftAngleDeg.toFixed(0) + '°';
  if (leftVelText && data.encLeftVel !== undefined) {
    leftVelText.textContent = data.encLeftVel.toFixed(2) + ' rad/s';
  }

  // Update Right Encoder
  const rightAngleRad = data.encRightAngle !== undefined ? data.encRightAngle : 0;
  const rightAngleDeg = ((rightAngleRad * 180 / Math.PI) % 360 + 360) % 360;
  const rightPointer = document.getElementById('enc-right-pointer');
  const rightTrack = document.getElementById('enc-right-track');
  const rightTextVal = document.getElementById('enc-right-text-val');
  const rightVelText = document.getElementById('enc-right-vel-text');

  if (rightPointer) rightPointer.setAttribute('transform', `rotate(${rightAngleDeg} 50 50)`);
  if (rightTrack) {
    const dashoffset = 276 - (rightAngleDeg / 360) * 276;
    rightTrack.setAttribute('stroke-dashoffset', dashoffset);
  }
  if (rightTextVal) rightTextVal.textContent = rightAngleDeg.toFixed(0) + '°';
  if (rightVelText && data.encRightVel !== undefined) {
    rightVelText.textContent = data.encRightVel.toFixed(2) + ' rad/s';
  }

  // Update IMU Attitude
  const pitch = data.pitch !== undefined ? data.pitch : 0;
  const roll = data.roll !== undefined ? data.roll : 0;
  const yaw = data.yaw !== undefined ? data.yaw : 0;

  const horizonDisk = document.getElementById('imu-horizon-disk');
  const pitchText = document.getElementById('imu-pitch-text');
  const rollText = document.getElementById('imu-roll-text');
  const compassPointer = document.getElementById('imu-compass-pointer');
  const yawText = document.getElementById('imu-yaw-text');

  if (horizonDisk) {
    const yOffset = pitch * 1.5;
    horizonDisk.style.transform = `rotate(${-roll}deg) translateY(${yOffset}px)`;
  }
  if (pitchText) pitchText.textContent = pitch.toFixed(1) + '°';
  if (rollText) rollText.textContent = roll.toFixed(1) + '°';
  if (compassPointer) {
    compassPointer.setAttribute('transform', `rotate(${yaw} 40 40)`);
  }
  if (yawText) yawText.textContent = yaw.toFixed(0) + '°';
}

function updateHealthIndicators(data) {
  setHealthDot('health-imu', data.imu, 'health-imu-text', data.imu ? 'Online' : 'Offline');
  setHealthDot('health-enc-left', data.encLeft, 'health-enc-left-text', data.encLeft ? 'Online' : 'Offline');
  setHealthDot('health-enc-right', data.encRight, 'health-enc-right-text', data.encRight ? 'Online' : 'Offline');

  const lmText = !data.motorLeft ? 'Offline' : (data.motorLeftEnabled ? 'Enabled' : 'Ready (disabled)');
  const rmText = !data.motorRight ? 'Offline' : (data.motorRightEnabled ? 'Enabled' : 'Ready (disabled)');
  setHealthDot('health-motor-left', data.motorLeft, 'health-motor-left-text', lmText);
  setHealthDot('health-motor-right', data.motorRight, 'health-motor-right-text', rmText);

  // Uptime
  const uptimeEl = document.getElementById('sys-uptime');
  if (uptimeEl && data.uptimeMs !== undefined) {
    const s = Math.floor(data.uptimeMs / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    uptimeEl.textContent = `${h}h ${m % 60}m ${s % 60}s`;
  }

  // Heap
  const heapEl = document.getElementById('sys-heap');
  if (heapEl && data.freeHeap !== undefined) {
    heapEl.textContent = (data.freeHeap / 1024).toFixed(1) + ' KB';
  }
}

function setHealthDot(dotId, isOk, textId, text) {
  const dot = document.getElementById(dotId);
  const txt = document.getElementById(textId);
  if (dot) {
    dot.className = 'health-dot ' + (isOk ? 'health-ok' : 'health-fail');
  }
  if (txt) {
    txt.textContent = text;
  }
}

function appendLogLine(container, data) {
  const line = document.createElement('div');
  line.className = 'console-line';

  const ts = document.createElement('span');
  ts.className = 'console-ts';
  const seconds = data.t !== undefined ? (data.t / 1000).toFixed(2) : '—';
  ts.textContent = seconds + 's';

  const badge = document.createElement('span');
  badge.className = 'console-badge console-badge-' + (data.level || 'info');
  badge.textContent = (data.level || 'info').toUpperCase();

  const msg = document.createElement('span');
  msg.className = 'console-msg';
  msg.textContent = data.msg || '';

  line.appendChild(ts);
  line.appendChild(badge);
  line.appendChild(msg);
  container.appendChild(line);
}
