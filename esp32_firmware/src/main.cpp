/*
 * MBt2 High-Performance Dual-Core Self-Balancing Robot Firmware
 * Real-Time Cascaded Dual-Loop PID + Bluepad32 Bluetooth Gamepad + Auto-Enable Balancing
 * 
 * FreeRTOS Dual-Core Task Allocation:
 * - CORE 1 (High Priority): Dedicated SimpleFOC Motor Control Task (loopFOC & move) + 100Hz IMU/PID Loop + Auto-Balancing
 * - CORE 0 (Normal Priority): Bluepad32 Bluetooth Gamepad, AS5600 Diagnostics, Telemetry JSON & Serial Command Parsing
 * 
 * Target: ESP32 DevKit V1
 */

#include <Arduino.h>
#include <Wire.h>
#include <SimpleFOC.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <AS5600.h>
#include <Bluepad32.h>
#include <ArduinoJson.h>

#define I2C_0_SDA 21
#define I2C_0_SCL 22
#define I2C_1_SDA 18
#define I2C_1_SCL 19

// FreeRTOS Mutex for I2C Bus 0 Thread Safety
SemaphoreHandle_t i2c0Mutex = NULL;

// Hardware Objects
Adafruit_MPU6050 mpu;
bool mpuOk = false;

AS5600 encLeft(&Wire);
AS5600 encRight(&Wire1);
bool leftEncOk = false;
bool rightEncOk = false;

// SimpleFOC Motors & Drivers
MagneticSensorI2C sensorLeft = MagneticSensorI2C(AS5600_I2C);
BLDCMotor motorLeft = BLDCMotor(11);
BLDCDriver3PWM driverLeft = BLDCDriver3PWM(32, 33, 14, 13);

MagneticSensorI2C sensorRight = MagneticSensorI2C(AS5600_I2C);
BLDCMotor motorRight = BLDCMotor(11);
BLDCDriver3PWM driverRight = BLDCDriver3PWM(25, 26, 27, 12);

// System States
volatile bool leftEnabled = false;
volatile bool rightEnabled = false;
volatile bool openLoopMode = true;
volatile bool invertLeft = true;
volatile bool invertRight = false;
volatile bool balancingEnabled = false;

// Bluepad32 Gamepad Controls
ControllerPtr myControllers[BP32_MAX_GAMEPADS];
volatile float btThrottle = 0.0f;
volatile float btSteering = 0.0f;

void onConnectedController(ControllerPtr ctl) {
  for (int i = 0; i < BP32_MAX_GAMEPADS; i++) {
    if (myControllers[i] == nullptr) {
      Serial.printf("🎮 Bluepad32 Controller Connected! Index=%d\n", i);
      myControllers[i] = ctl;
      break;
    }
  }
}

void onDisconnectedController(ControllerPtr ctl) {
  for (int i = 0; i < BP32_MAX_GAMEPADS; i++) {
    if (myControllers[i] == ctl) {
      Serial.printf("🎮 Controller Disconnected from Index=%d\n", i);
      myControllers[i] = nullptr;
      break;
    }
  }
}

// Orientation & Cascaded Dual-Loop PID Controllers
volatile float currentPitch = 0.0f;
volatile float currentRoll = 0.0f;

PIDController pid_stb(80.0f, 67.0f, 0.8f, 100000.0f, 12.0f);
PIDController pid_vel(0.012f, 0.010f, 0.0f, 100000.0f, 10.0f);
LowPassFilter lpf_pitch_cmd{.Tf = 0.07f};
LowPassFilter lpf_throttle{.Tf = 0.4f};
LowPassFilter lpf_steering{.Tf = 0.1f};

volatile float pitchOffset = 1.83f;
volatile unsigned long uprightTime = 0;

// Auto Ramp state machine
struct RampState {
  volatile bool active = false;
  volatile char motor = 'L';
  volatile float maxVel = 10.0f;
  volatile unsigned long startTime = 0;
  volatile unsigned long durationMs = 3000;
};
RampState ramp;

TaskHandle_t FocTaskHandle = NULL;

void setControlMode(bool useOpenLoop) {
  openLoopMode = useOpenLoop;
  if (useOpenLoop) {
    motorLeft.controller = MotionControlType::velocity_openloop;
    motorRight.controller = MotionControlType::velocity_openloop;
    motorLeft.voltage_limit = 3.0f;
    motorRight.voltage_limit = 3.0f;
    Serial.println("🔄 Control Mode: OPEN-LOOP (Sinusoidal PWM)");
  } else {
    motorLeft.controller = balancingEnabled ? MotionControlType::torque : MotionControlType::velocity;
    motorRight.controller = balancingEnabled ? MotionControlType::torque : MotionControlType::velocity;
    motorLeft.voltage_limit = 9.0f;
    motorRight.voltage_limit = 9.0f;
    Serial.println("🔄 Control Mode: CLOSED-LOOP FOC");
  }
}

// Thread-safe FOC loop & 100Hz Synchronized IMU/PID execution on Core 1
void FocTask(void * pvParameters) {
  Serial.println("⚡ FOC Task running on Core 1");
  static unsigned long lastImuTime = 0;

  for (;;) {
    unsigned long now = millis();

    // 100Hz Rate-Limited IMU Sampling & Synchronized Cascaded PID Execution
    if (now - lastImuTime >= 10) { // 100 Hz (every 10ms)
      float dt = (now - lastImuTime) / 1000.0f;
      lastImuTime = now;

      sensors_event_t a, g, temp;
      bool readSuccess = false;

      if (xSemaphoreTake(i2c0Mutex, pdMS_TO_TICKS(2)) == pdTRUE) {
        if (mpuOk) {
          readSuccess = mpu.getEvent(&a, &g, &temp);
        }
        xSemaphoreGive(i2c0Mutex);
      }

      if (readSuccess) {
        float accelPitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * RAD_TO_DEG;
        float accelRoll  = atan2(a.acceleration.y, a.acceleration.z) * RAD_TO_DEG;
        currentPitch = 0.98f * (currentPitch + (g.gyro.y * RAD_TO_DEG) * dt) + 0.02f * accelPitch;
        currentRoll  = 0.98f * (currentRoll  + (g.gyro.x * RAD_TO_DEG) * dt) + 0.02f * accelRoll;

        float adjustedPitch = (currentPitch - pitchOffset) * DEG_TO_RAD;

        // --- AUTO-ENABLE BALANCING LOGIC ---
        // Automatically engages balancing when held upright (<3 degrees) for 1 second!
        if (!balancingEnabled && mpuOk && !openLoopMode) {
          if (abs(adjustedPitch) < (3.0f * DEG_TO_RAD)) {
            if (uprightTime == 0) uprightTime = now;
            else if (now - uprightTime > 1000) { // Held upright for 1000ms
              balancingEnabled = true;
              motorLeft.controller = MotionControlType::torque;
              motorRight.controller = MotionControlType::torque;
              motorLeft.voltage_limit = 9.0f;
              motorRight.voltage_limit = 9.0f;
              pid_stb.reset();
              pid_vel.reset();
              leftEnabled = true; rightEnabled = true;
              driverLeft.enable(); driverRight.enable();
              Serial.println("⚖️ Auto-Balancing ENGAGED!");
              uprightTime = 0;
            }
          } else {
            uprightTime = 0;
          }
        }

        // --- CASCADED DUAL-LOOP BALANCING LOGIC ---
        if (balancingEnabled && !openLoopMode) {
          // Safety cut-off if tipped over (>45 degrees)
          if (abs(adjustedPitch) > (45.0f * DEG_TO_RAD)) {
            balancingEnabled = false;
            leftEnabled = false; rightEnabled = false;
            driverLeft.disable(); driverRight.disable();
            motorLeft.target = 0; motorRight.target = 0;
            Serial.println("🚨 Safety Cutoff: Robot Tipped Over!");
            uprightTime = 0;
          } else {
            // 1. Measure physical forward wheel velocity
            float velocity_avg = (motorLeft.shaft_velocity - motorRight.shaft_velocity) / 2.0f;

            // 2. Smooth Bluetooth Gamepad Throttle & Steering Inputs
            float throttleCmd = lpf_throttle(btThrottle);
            float steeringCmd = lpf_steering(btSteering);

            // 3. Outer Velocity Loop -> Generates Target Pitch Angle
            float target_pitch = lpf_pitch_cmd(pid_vel(throttleCmd - velocity_avg));

            // Constrain max lean angle to +/- 0.15 rad (~8.6 degrees) so acceleration never exceeds recovery torque
            target_pitch = constrain(target_pitch, -0.15f, 0.15f);

            // 4. Inner Stability Loop -> Outputs Voltage/Torque Uq
            float voltage_control = -pid_stb(adjustedPitch - target_pitch);

            float targetLeft  = voltage_control + steeringCmd;
            float targetRight = voltage_control - steeringCmd;

            motorLeft.target  = invertLeft  ? -targetLeft  : targetLeft;
            motorRight.target = invertRight ? -targetRight : targetRight;
          }
        }
      }
    }

    if (!openLoopMode) {
      if (xSemaphoreTake(i2c0Mutex, pdMS_TO_TICKS(1)) == pdTRUE) {
        motorLeft.loopFOC();
        xSemaphoreGive(i2c0Mutex);
      }
      motorRight.loopFOC(); // Bus 1 - Wire1
    }
    
    motorLeft.move();
    motorRight.move();

    vTaskDelay(1);
  }
}

void parseSerialCommands() {
  while (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) continue;

    StaticJsonDocument<384> doc;
    DeserializationError err = deserializeJson(doc, input);
    if (!err) {
      const char* cmd = doc["command"] | "";

      if (String(cmd) == "motor") {
        const char* target = doc["target"] | "";
        bool en = doc["enable"] | false;
        float vel = doc["velocity"] | 0.0f;

        if (String(target) == "left") {
          leftEnabled = en;
          if (en) driverLeft.enable(); else driverLeft.disable();
          motorLeft.target = invertLeft ? -vel : vel;
        } else if (String(target) == "right") {
          rightEnabled = en;
          if (en) driverRight.enable(); else driverRight.disable();
          motorRight.target = invertRight ? -vel : vel;
        } else if (String(target) == "both") {
          leftEnabled = en; rightEnabled = en;
          if (en) { driverLeft.enable(); driverRight.enable(); }
          else { driverLeft.disable(); driverRight.disable(); }
          motorLeft.target = invertLeft ? -vel : vel;
          motorRight.target = invertRight ? -vel : vel;
        }
      } else if (String(cmd) == "mode") {
        const char* modeStr = doc["mode"] | "open_loop";
        setControlMode(String(modeStr) == "open_loop");
      } else if (String(cmd) == "invert") {
        if (doc.containsKey("left")) invertLeft = doc["left"];
        if (doc.containsKey("right")) invertRight = doc["right"];
      } else if (String(cmd) == "ramp") {
        const char* target = doc["target"] | "left";
        float targetVel = doc["velocity"] | 10.0f;

        ramp.active = true;
        ramp.motor = target[0];
        ramp.maxVel = targetVel;
        ramp.startTime = millis();

        if (String(target) == "left") { leftEnabled = true; driverLeft.enable(); }
        else if (String(target) == "right") { rightEnabled = true; driverRight.enable(); }
        else if (String(target) == "both") { leftEnabled = true; rightEnabled = true; driverLeft.enable(); driverRight.enable(); }
      } else if (String(cmd) == "pid") {
        if (doc.containsKey("stb_p")) pid_stb.P = doc["stb_p"];
        if (doc.containsKey("stb_i")) pid_stb.I = doc["stb_i"];
        if (doc.containsKey("stb_d")) pid_stb.D = doc["stb_d"];
        if (doc.containsKey("vel_p")) pid_vel.P = doc["vel_p"];
        if (doc.containsKey("vel_i")) pid_vel.I = doc["vel_i"];
        if (doc.containsKey("lpf_tf")) lpf_pitch_cmd.Tf = doc["lpf_tf"];
        if (doc.containsKey("pitch_offset")) pitchOffset = doc["pitch_offset"];
        Serial.printf("⚖️ PID Updated: STB[P=%.2f, I=%.2f, D=%.2f] VEL[P=%.3f, I=%.3f] LPF[Tf=%.3f] Offset=%.2f\n",
                      pid_stb.P, pid_stb.I, pid_stb.D, pid_vel.P, pid_vel.I, lpf_pitch_cmd.Tf, pitchOffset);
      } else if (String(cmd) == "balance") {
        balancingEnabled = doc["enable"] | false;
        if (balancingEnabled) {
          openLoopMode = false;
          motorLeft.controller = MotionControlType::torque;
          motorRight.controller = MotionControlType::torque;
          motorLeft.voltage_limit = 9.0f;
          motorRight.voltage_limit = 9.0f;
          pid_stb.reset();
          pid_vel.reset();
          leftEnabled = true; rightEnabled = true;
          driverLeft.enable(); driverRight.enable();
          Serial.println("⚖️ Balancing ON (Cascaded Dual-Loop Direct Torque Mode)");
        } else {
          leftEnabled = false; rightEnabled = false;
          driverLeft.disable(); driverRight.disable();
          motorLeft.target = 0; motorRight.target = 0;
          Serial.println("⚖️ Balancing Mode Disabled.");
        }
      } else if (String(cmd) == "stop") {
        ramp.active = false;
        balancingEnabled = false;
        leftEnabled = false; rightEnabled = false;
        driverLeft.disable(); driverRight.disable();
        motorLeft.target = 0; motorRight.target = 0;
      }
    }
  }
}

void updateRampStateMachine() {
  if (!ramp.active) return;

  unsigned long elapsed = millis() - ramp.startTime;
  if (elapsed >= ramp.durationMs) {
    ramp.active = false;
    if (ramp.motor == 'l' || ramp.motor == 'L') motorLeft.target = 0;
    if (ramp.motor == 'r' || ramp.motor == 'R') motorRight.target = 0;
    if (ramp.motor == 'b' || ramp.motor == 'B') { motorLeft.target = 0; motorRight.target = 0; }
    return;
  }

  float progress = (float)elapsed / (float)ramp.durationMs;
  float currentVel = ramp.maxVel * sin(progress * PI);

  if (ramp.motor == 'l' || ramp.motor == 'L') motorLeft.target = invertLeft ? -currentVel : currentVel;
  if (ramp.motor == 'r' || ramp.motor == 'R') motorRight.target = invertRight ? -currentVel : currentVel;
  if (ramp.motor == 'b' || ramp.motor == 'B') {
    motorLeft.target = invertLeft ? -currentVel : currentVel;
    motorRight.target = invertRight ? -currentVel : currentVel;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🚀 Starting MBt2 Dual-Core 9V High Torque Balancing Firmware...");

  i2c0Mutex = xSemaphoreCreateMutex();

  // Initialize Bluepad32 Gamepad Subsystem
  BP32.setup(&onConnectedController, &onDisconnectedController);
  BP32.forgetBluetoothKeys(); // Allows pairing any new controller easily

  SimpleFOCDebug::enable(&Serial);

  // Initialize I2C Buses
  Wire.begin(I2C_0_SDA, I2C_0_SCL);
  Wire.setClock(400000);
  Wire1.begin(I2C_1_SDA, I2C_1_SCL);
  Wire1.setClock(400000);

  // Initialize MPU6050 on Bus 0
  if (mpu.begin(0x68, &Wire)) {
    mpuOk = true;
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
    Serial.println("✅ MPU6050 IMU Initialized at 0x68");
  }

  // Initialize AS5600 Encoders
  encLeft.begin();
  if (encLeft.isConnected()) leftEncOk = true;
  encRight.begin();
  if (encRight.isConnected()) rightEncOk = true;

  sensorLeft.init(&Wire);
  sensorRight.init(&Wire1);

  // Configure Left Driver & Motor
  driverLeft.voltage_power_supply = 12.0f;
  driverLeft.voltage_limit = 9.0f;
  driverLeft.init();

  motorLeft.linkSensor(&sensorLeft);
  motorLeft.linkDriver(&driverLeft);
  motorLeft.voltage_sensor_align = 1.5f;
  motorLeft.PID_velocity.P = 0.5f; motorLeft.PID_velocity.I = 10.0f; motorLeft.PID_velocity.limit = 9.0f;
  motorLeft.LPF_velocity.Tf = 0.02f;
  motorLeft.init();
  motorLeft.initFOC();

  // Configure Right Driver & Motor
  driverRight.voltage_power_supply = 12.0f;
  driverRight.voltage_limit = 9.0f;
  driverRight.init();

  motorRight.linkSensor(&sensorRight);
  motorRight.linkDriver(&driverRight);
  motorRight.voltage_sensor_align = 1.5f;
  motorRight.PID_velocity.P = 0.5f; motorRight.PID_velocity.I = 10.0f; motorRight.PID_velocity.limit = 9.0f;
  motorRight.LPF_velocity.Tf = 0.02f;
  motorRight.init();
  motorRight.initFOC();

  // Default to Closed-Loop FOC mode so Auto-Balancing engages automatically when held upright!
  setControlMode(false);

  driverLeft.disable();
  driverRight.disable();

  // Create Dedicated Core 1 FOC Task
  xTaskCreatePinnedToCore(
    FocTask,
    "FocTask",
    4096,
    NULL,
    10,
    &FocTaskHandle,
    1
  );

  Serial.println("✅ Dual-Core 9V High Torque Balancing Firmware Ready!");
}

void loop() {
  parseSerialCommands();
  updateRampStateMachine();

  // Update Bluepad32 Bluetooth Gamepads on Core 0
  BP32.update();
  if (myControllers[0] && myControllers[0]->isConnected()) {
    float joyY = myControllers[0]->axisY() / 512.0f;   // Corrected Forward/Backward
    float joyX = myControllers[0]->axisRX() / 512.0f;  // Corrected Right/Left Steering

    if (abs(joyY) < 0.1f) joyY = 0.0f;
    if (abs(joyX) < 0.1f) joyX = 0.0f;

    btThrottle = joyY * 15.0f; // Scale to target velocity rad/s
    btSteering = joyX * 2.0f;  // Scale to steering torque voltage
  } else {
    btThrottle = 0.0f;
    btSteering = 0.0f;
  }

  // 50Hz Rate-Limited Telemetry Serial Output on Core 0
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 20) {
    lastTelemetry = millis();

    uint16_t rawL = 0;
    bool mdL = false, mlL = false, mhL = false;
    uint8_t agcL = 0;

    if (xSemaphoreTake(i2c0Mutex, pdMS_TO_TICKS(5)) == pdTRUE) {
      rawL = encLeft.readAngle();
      mdL = encLeft.detectMagnet(); mlL = encLeft.magnetTooWeak(); mhL = encLeft.magnetTooStrong();
      agcL = encLeft.readAGC();
      xSemaphoreGive(i2c0Mutex);
    }

    float degL = rawL * (360.0f / 4096.0f);

    uint16_t rawR = encRight.readAngle();
    float degR = rawR * (360.0f / 4096.0f);
    bool mdR = encRight.detectMagnet(), mlR = encRight.magnetTooWeak(), mhR = encRight.magnetTooStrong();
    uint8_t agcR = encRight.readAGC();

    float actL = openLoopMode ? motorLeft.target : motorLeft.shaft_velocity;
    float actR = openLoopMode ? motorRight.target : motorRight.shaft_velocity;
    if (invertLeft) actL = -actL;
    if (invertRight) actR = -actR;

    Serial.printf(
      "{\"type\":\"telemetry\",\"open_loop\":%s,\"balancing\":%s,\"imu\":{\"pitch\":%.2f,\"roll\":%.2f,\"ax\":0.0,\"ay\":0.0,\"az\":9.81,\"temp\":25.0,\"ok\":%s},\"left_enc\":{\"ok\":%s,\"raw\":%u,\"deg\":%.1f,\"md\":%s,\"ml\":%s,\"mh\":%s,\"agc\":%u},\"right_enc\":{\"ok\":%s,\"raw\":%u,\"deg\":%.1f,\"md\":%s,\"ml\":%s,\"mh\":%s,\"agc\":%u},\"left_mot\":{\"en\":%s,\"target\":%.2f,\"act\":%.2f,\"volts\":%.2f,\"inv\":%s},\"right_mot\":{\"en\":%s,\"target\":%.2f,\"act\":%.2f,\"volts\":%.2f,\"inv\":%s}}\n",
      openLoopMode ? "true" : "false", balancingEnabled ? "true" : "false",
      currentPitch, currentRoll, mpuOk ? "true" : "false",
      leftEncOk ? "true" : "false", rawL, degL, mdL ? "true" : "false", mlL ? "true" : "false", mhL ? "true" : "false", agcL,
      rightEncOk ? "true" : "false", rawR, degR, mdR ? "true" : "false", mlR ? "true" : "false", mhR ? "true" : "false", agcR,
      leftEnabled ? "true" : "false", motorLeft.target, actL, motorLeft.voltage.q, invertLeft ? "true" : "false",
      rightEnabled ? "true" : "false", motorRight.target, actR, motorRight.voltage.q, invertRight ? "true" : "false"
    );
  }
}
