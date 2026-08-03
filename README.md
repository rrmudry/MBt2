# MBt2: High-Performance ESP32 SimpleFOC Dual-Core Balancing Robot

This project implements a high-performance self-balancing robot using an ESP32, two BLDC motors driven by SimpleFOC Mini drivers, AS5600 magnetic encoders, an MPU6050 6-DOF IMU, and a Bluepad32 Bluetooth Gamepad controller. It features a FreeRTOS dual-core firmware architecture and a real-time WebSocket web dashboard.

---

## 🧠 Key Learnings & Engineering Breakthroughs

Over the course of developing this robot, several hardware and software integration challenges were resolved:

### 1. FreeRTOS Dual-Core Task Allocation & 100Hz Synchronized Loop
Running FOC motor loops, MPU6050 filter math, AS5600 encoder polling, and serial JSON formatting on a single core caused CPU starvation and motor stuttering.
**Solution:** 
- **Core 1 (Priority 10):** Dedicated exclusively to SimpleFOC execution (`loopFOC()` and `move()`) running at >20 kHz + 100Hz Rate-Limited IMU sampling and Cascaded Dual-Loop PID execution.
- **Core 0 (Normal Priority):** Handles Bluepad32 Bluetooth Gamepad updates, AS5600 diagnostic polling, JSON telemetry serialization, and WebSocket command parsing.

### 2. Multi-Core I2C Bus Contention & FreeRTOS Mutex
The MPU6050 IMU (`0x68`) and Left AS5600 encoder (`0x36`) share physical I2C Bus 0 (GPIO 21 SDA / GPIO 22 SCL). In closed-loop mode, Core 1 read AS5600 while Core 0 read MPU6050, causing SDA/SCL signal collisions on the PCB traces and corrupting IMU data ("going haywire").
**Solution:** Implemented a FreeRTOS Mutex Semaphore (`i2c0Mutex = xSemaphoreCreateMutex()`) protecting Bus 0. Both cores acquire `i2c0Mutex` prior to any Wire 0 transaction, eliminating collisions.

### 3. Cascaded Dual-Loop PID Control
Single-loop stability controllers suffer from position drift and high-frequency chatter.
**Solution:**
- **Inner Stability Loop (`pid_stb`):** Fast loop ($P, I, D$) that converts tilt angle errors into direct motor voltage / torque ($U_q$).
- **Outer Velocity Loop (`pid_vel`):** Measures physical forward wheel velocity `(motorLeft.shaft_velocity - motorRight.shaft_velocity) / 2.0f` and outputs a target pitch angle (`target_pitch`) filtered through `lpf_pitch_cmd` ($\text{Tf} = 0.07\text{s}$) to hold position.

### 4. 🎮 Bluepad32 Bluetooth Gamepad Remote Control
**Solution:** Integrated Bluepad32 stack on Core 0. Pair any Bluetooth gamepad (PS4, PS5, Xbox, Switch Pro).
- **Left Stick Y:** Throttle (Drive Forward / Reverse).
- **Right Stick X:** Steering (Turn Left / Right).
- **Low-Pass Filtered Inputs:** `lpf_throttle` ($\text{Tf} = 0.4\text{s}$) and `lpf_steering` ($\text{Tf} = 0.1\text{s}$) ensure smooth acceleration and turning without tipping.

### 5. ⚖️ Auto-Enable Balancing
**Solution:** Holding the robot upright near its vertical zero point ($\pm 3.0^\circ$) for 1 second automatically engages balancing mode (`MotionControlType::torque`) and enables motor drivers. Includes an automatic **45° Tipped-Over Safety Cutoff**.

### 6. ⚡ 9.0V Torque Headroom & Max Lean Angle Clamp
Rapid forward acceleration previously caused the robot to lean beyond its recovery torque limit and tip over.
**Solution:**
- Increased motor & driver voltage limits from `6.0V` to **`9.0V`** (on a 12V supply), providing 50% more peak acceleration torque.
- Clamped `target_pitch` to **$\pm 8.6^\circ$** ($\pm 0.15\text{ rad}$) so joystick commands can never exceed the physical recovery limit.

### 7. Mirrored Kinematics & Software Direction Inversion
Because the BLDC motors are mounted back-to-back, applying identical 3-phase AC voltage sequences makes one wheel spin physically forward and the other spin physically backward.
**Solution:** Implemented software direction inversion (`invertLeft = true`) so positive target velocity commands drive both physical wheels forward symmetrically.

### 8. Sensor Supply Voltage & 3.3V Logic Protection
Breakout boards have onboard 4.7kΩ pull-up resistors connected to VCC. Supplying 5V to the sensor VCC rail pulled SDA/SCL lines up to 5.0V, overvoltaging ESP32 3.3V logic pins and causing I2C bus lockups.
**Solution:** All sensor VCC pins connect strictly to the ESP32's **3V3** regulator output pin.

---

## 🖥️ Unified Control Dashboard & Diagnostic Suite

The web application provides a single-page dashboard uniting all diagnostic & tuning tools:

1. **Start the WebSocket Bridge Server:**
   ```bash
   node tuning_server.cjs
   ```
2. **Open the Dashboard in Browser:**
   ### 👉 **[http://localhost:8080/](http://localhost:8080/)**
3. **Features:**
   - **MPU6050 Panel:** Real-time 3D Artificial Horizon Gauge, Pitch/Roll angles, Accel Z ($g$), and Chip Temp.
   - **AS5600 Encoders Panel:** Live Left (Bus 0) and Right (Bus 1) circular dial gauges, 12-bit raw counts ($0–4095$), and Magnet Health (`MD`/`ML`/`MH`/`AGC`) diagnostics.
   - **SimpleFOC Motor Drivers Panel:** Independent Left (GPIO 13) & Right (GPIO 12) enable toggles, velocity sliders, preset buttons, auto ramps, and direction inversion.
   - **⚖️ Cascaded Dual-Loop PID Tuning Panel:** Real-time PID parameter inputs (`Stb P`, `Stb I`, `Stb D`, `Vel P`, `Vel I`, `LPF Tf`, `Pitch Trim`) with automatic browser `localStorage` persistence and one-click `🎯 Zero Pitch` calibration.
   - **Real-Time Oscilloscope:** Wide multi-channel streaming plot combining Pitch, Encoder angles, and Motor speeds.
   - **Diagnostic Serial Console:** Compact 280px sidebar for live system messages.

### 🎯 Official Tuned Baseline Parameters:
- **Inner Stability Loop:** `Stb P = 80.0`, `Stb I = 67.0`, `Stb D = 0.8`
- **Outer Velocity Loop:** `Vel P = 0.012`, `Vel I = 0.010`
- **LPF Noise Filter:** `LPF Tf = 0.07` s
- **Equilibrium Pitch Trim:** `1.83°`

---

## 🔖 Version History

| Tag / Milestone | Description |
|-----------------|-------------|
| `v1.0-single-core` | Legacy single-core implementation running all tasks in `loop()` on Core 1. |
| `v2.0-dual-core-unified` | **Current State:** FreeRTOS Dual-Core architecture, Bus 0 I2C Mutex, 100Hz Synchronized Cascaded Dual-Loop PID, Bluepad32 Bluetooth Gamepad, Auto-Balancing, and Unified Tuning Dashboard. |
