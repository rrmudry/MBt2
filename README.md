# MBt2: High-Performance ESP32 SimpleFOC Balancing Robot

This project implements a self-balancing robot using an ESP32, two BLDC motors, AS5600 magnetic encoders, and an MPU6050 IMU. It utilizes the [SimpleFOC](https://docs.simplefoc.com/) library for Field Oriented Control (FOC) and features a real-time 100Hz Web WebSocket tuning GUI.

## 🧠 Key Learnings & Engineering Challenges

Over the course of developing this robot, we encountered and solved several complex hardware and software integration issues:

### 1. I2C Bus Saturation & IMU FIFO Overflows
Initially, we attempted to use the MPU6050's internal Digital Motion Processor (DMP) to calculate quaternions. However, the DMP requires strict, timely FIFO buffer clearing. When combined with the heavy computational load of the SimpleFOC loop (running at several kHz), the FIFO buffer overflowed, causing the I2C bus to permanently lock up. 
**Solution:** We abandoned the DMP and switched to reading raw accelerometer and gyroscope data using `Adafruit_MPU6050::getEvent()`, running it through a lightweight **Complementary Filter** (98% Gyro, 2% Accel). This proved completely immune to I2C lockups while maintaining excellent pitch accuracy.

### 2. Telemetry Overhead Starving the FOC Loop
We originally used `ArduinoJson` to serialize telemetry data for a web dashboard. The string formatting and JSON serialization took too long, starving the FOC loop of CPU cycles. This resulted in horrible motor stuttering and vibrations.
**Solution:** We stripped out JSON entirely and moved to raw CSV string concatenation (`DATA,pitch,velL,velR...`). This reduced the loop time drastically, allowing the motors to spin flawlessly smooth.

### 3. USB Brownouts During Calibration
During `initFOC()`, the ESP32 injects a static voltage into the motor coils to align the electrical zero-angle with the AS5600 sensor. The default alignment voltage (3.0V) drew too much current from the battery/USB, causing a voltage sag (brownout). This caused the CH340 USB-to-Serial chip to momentarily disconnect from the computer.
**Solution:** We lowered `motor.voltage_sensor_align = 1.5f;`. This was enough voltage to accurately align the unloaded wheels without crashing the USB chip.

### 4. Chrome Web Serial API vs. Linux CH340 Lockouts
We attempted to use the HTML5 Web Serial API for our tuning GUI. However, Chrome strictly adheres to the RS-232 spec and asserts the DTR (Data Terminal Ready) line upon opening the port. On ESP32 dev boards, DTR resets the chip. On Ubuntu/Linux, this hardware reset transiently detaches the `/dev/ttyUSB0` node. Chrome interprets this momentary detachment as a fatal hardware loss and permanently drops the stream.
**Solution:** We built a local Node.js backend (`tuning_server.cjs`) using the native `serialport` module, which elegantly handles DTR toggling without dropping the connection. The Node server broadcasts the 100Hz serial stream over WebSockets to the Web GUI, bypassing browser security lockouts completely.

### 5. Kinematics of Mechanically Mirrored Wheels
Because the two motors are mounted on opposite sides of the chassis, their physical rotation axes are mirrored.
1. `initFOC()` automatically detects which electrical direction corresponds to the sensor counting upwards.
2. Because the sensors are also mirrored (magnets facing outwards), moving the robot forward causes the Left sensor to count UP, and the Right sensor to count DOWN.
3. Therefore, `initFOC()` calibrates the motors such that applying a **Positive Target Voltage** makes the Left wheel spin physically Forward, and the Right wheel spin physically Backward.
**Solution:** We explicitly negated the Right motor's target voltage and shaft velocity readings in the software. This unified the system so that `+Voltage` drives BOTH wheels forward, allowing standard balancing PID math to work.

### 6. PID Integral Windup in the Air
Tuning a balancing robot while holding it in the air causes the Velocity PID loop to assume the robot isn't responding to wheel movement. The Integral (I) term rapidly accumulates the error, winding up to maximum voltage. When balancing is engaged, the wheels instantly spin out of control (Positive Feedback).
**Solution:** 
- The PID controllers (`pid_stb` and `pid_vel`) are explicitly reset via `.reset()` every time balancing is toggled via the Spacebar.
- The correct tuning procedure requires setting Velocity P/I to 0, tuning Stability P/D while the robot is actually on the ground, and only introducing Velocity P/I once basic stability is achieved.

### 7. Voltage Constraints & Hitting Bumps
Currently, the motor `voltage_limit` is hardcoded to `10.0V` to prevent the driver from drawing excessive peak currents from the 12V LiPo battery. However, when the robot hits a bump, the PID controller needs to command an instantaneous, massive torque spike to keep the chassis from pitching over. If 10.0V isn't enough electrical "pressure" to generate that torque, the robot will fall.
**Solution (Hardware Upgrade):** A common trick is to add a high-power Buck-Boost converter between the battery and the motor drivers to increase the supply voltage (e.g., from 12V to 24V). This allows the motors to draw significantly higher peak currents to hop over bumps, and also increases the robot's top speed by overcoming back-EMF at high RPMs. **Warning:** The buck-boost MUST be rated for high peak currents (10A+). If a cheap 3A converter trips its over-current protection mid-bump, the robot will immediately lose power and crash.

## 🚀 Running the Tuning GUI

To manually tune the robot's PID loops in real-time:

1. Flash the ESP32 firmware via PlatformIO.
2. Start the local WebSocket Serial server:
   ```bash
   node tuning_server.cjs
   ```
3. Start the Vite frontend server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173/tuning_gui.html` and click **Connect**.
5. Keep the robot perfectly upright and adjust the **Pitch Offset** until the Live Pitch reads `0.0`.
6. Press **Spacebar** to toggle balancing mode.
