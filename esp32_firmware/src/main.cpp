#include <Arduino.h>
#include <Wire.h>
#include <SimpleFOC.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Bluepad32.h>

ControllerPtr myControllers[BP32_MAX_GAMEPADS];

void onConnectedController(ControllerPtr ctl) {
    for (int i = 0; i < BP32_MAX_GAMEPADS; i++) {
        if (myControllers[i] == nullptr) {
            Serial.printf("CALLBACK: Controller is connected, index=%d\n", i);
            myControllers[i] = ctl;
            break;
        }
    }
}

void onDisconnectedController(ControllerPtr ctl) {
    for (int i = 0; i < BP32_MAX_GAMEPADS; i++) {
        if (myControllers[i] == ctl) {
            Serial.printf("CALLBACK: Controller disconnected from index=%d\n", i);
            myControllers[i] = nullptr;
            break;
        }
    }
}

// ─── GPIO Connections from CSV ───
#define I2C_0_SDA 21
#define I2C_0_SCL 22
#define I2C_1_SDA 18
#define I2C_1_SCL 19

#define MOT1_A 32
#define MOT1_B 33
#define MOT1_C 14
#define MOT1_EN 13

#define MOT2_A 25
#define MOT2_B 26
#define MOT2_C 27
#define MOT2_EN 12

// ─── Hardware Objects ───
MagneticSensorI2C sensorLeft = MagneticSensorI2C(AS5600_I2C);
MagneticSensorI2C sensorRight = MagneticSensorI2C(AS5600_I2C);
BLDCMotor motorLeft = BLDCMotor(11);
BLDCDriver3PWM driverLeft = BLDCDriver3PWM(MOT1_A, MOT1_B, MOT1_C, MOT1_EN);
BLDCMotor motorRight = BLDCMotor(11);
BLDCDriver3PWM driverRight = BLDCDriver3PWM(MOT2_A, MOT2_B, MOT2_C, MOT2_EN);

Adafruit_MPU6050 mpu;
bool mpuInitialized = false;

// ─── Reference Balancer Parameters ───
PIDController pid_stb(30.0, 172.0, 1.2, 100000, 12.0);
PIDController pid_vel(0.018, 0.01, 0.0, 100000, 10.0);
LowPassFilter lpf_pitch_cmd{.Tf = 0.07};
LowPassFilter lpf_throttle{.Tf = 0.5};
LowPassFilter lpf_steering{.Tf = 0.1};

// ─── Shared State (accessed by both balanceTask and loop()) ───
// Protected by a hardware spinlock for safe cross-priority access on Core 1.
static portMUX_TYPE stateMux = portMUX_INITIALIZER_UNLOCKED;

struct SharedState {
    // Inputs: written by loop(), read by balanceTask
    float throttle = 0;
    float steering = 0;
    float pitch_offset = 0;
    bool request_balance_toggle = false;

    // Outputs: written by balanceTask, read by loop()
    float current_pitch = 0;
    float vel_left = 0;
    float vel_right = 0;
    float accel_x = 0;
    float accel_y = 0;
    float accel_z = 0;
    bool balancing_enabled = false;

    // Bidirectional flag
    bool diagnostic_stream = false;
};
static SharedState shared;

// ─── SimpleFOC Commander ───
Commander commander = Commander(Serial);
void onMotorLeft(char* cmd) { commander.motor(&motorLeft, cmd); }
void onMotorRight(char* cmd) { commander.motor(&motorRight, cmd); }
void onPidStab(char* cmd) { commander.pid(&pid_stb, cmd); }
void onPidVel(char* cmd) { commander.pid(&pid_vel, cmd); }

void onPitchOffset(char* cmd) {
    portENTER_CRITICAL(&stateMux);
    shared.pitch_offset = atof(cmd) * DEG_TO_RAD;
    portEXIT_CRITICAL(&stateMux);
}

void onStreamToggle(char* cmd) {
    portENTER_CRITICAL(&stateMux);
    shared.diagnostic_stream = !shared.diagnostic_stream;
    portEXIT_CRITICAL(&stateMux);
}

void onBalanceToggle(char* cmd) {
    portENTER_CRITICAL(&stateMux);
    shared.request_balance_toggle = true;
    portEXIT_CRITICAL(&stateMux);
}

// ─── Balance Task (Core 1, Priority 5) ───
// Runs FOC, IMU, complementary filter, auto-enable, and balance PID.
// This task preempts loop() and is never starved by serial or Bluetooth work.
void balanceTask(void* parameter) {
    Serial.println("Balance task started on Core 1 (priority 5)");

    unsigned long lastImuTime = 0;
    float current_pitch_local = 0.0f;
    unsigned long upright_time = 0;
    bool balancing_local = false;

    while (true) {
        // ── 1. Read shared inputs ──
        portENTER_CRITICAL(&stateMux);
        float throttle_local = shared.throttle;
        float steering_local = shared.steering;
        float offset_local = shared.pitch_offset;
        bool toggle_requested = shared.request_balance_toggle;
        shared.request_balance_toggle = false;
        portEXIT_CRITICAL(&stateMux);

        // ── 2. Handle balance toggle request from loop() ──
        if (toggle_requested) {
            balancing_local = !balancing_local;
            if (balancing_local) {
                pid_stb.reset();
                pid_vel.reset();
                motorLeft.controller = MotionControlType::torque;
                motorRight.controller = MotionControlType::torque;
                Serial.println("Balancing ON (Torque Mode)");
            } else {
                motorLeft.controller = MotionControlType::velocity;
                motorRight.controller = MotionControlType::velocity;
                motorLeft.target = 0;
                motorRight.target = 0;
                Serial.println("Balancing OFF (Velocity Mode)");
            }
        }

        // ── 3. Run FOC (as fast as possible) ──
        motorLeft.loopFOC();
        motorRight.loopFOC();
        motorLeft.move();
        motorRight.move();

        // ── 4. 100Hz IMU & Balance Control Loop ──
        unsigned long now = millis();
        if (now - lastImuTime >= 10) {
            lastImuTime = now;

            sensors_event_t a, g, temp;
            float ax = 0, ay = 0, az = 0;
            if (mpuInitialized) {
                mpu.getEvent(&a, &g, &temp);
                ax = a.acceleration.x;
                ay = a.acceleration.y;
                az = a.acceleration.z;
            }

            // Pitch Calculation (Complementary Filter — runs ALWAYS at 100Hz)
            if (mpuInitialized) {
                float accel_pitch = atan2(-ax, sqrt(ay * ay + az * az));
                // 98% Gyro, 2% Accelerometer. dt is exactly 0.01s (100Hz).
                current_pitch_local = 0.98f * (current_pitch_local + g.gyro.y * 0.01f) + 0.02f * accel_pitch;
            }
            float adjusted_pitch = current_pitch_local - offset_local;

            // Auto-Enable Logic
            if (!balancing_local && mpuInitialized) {
                if (abs(adjusted_pitch) < 3.0f * DEG_TO_RAD) {
                    if (upright_time == 0) upright_time = now;
                    else if (now - upright_time > 1000) {
                        balancing_local = true;
                        pid_stb.reset();
                        pid_vel.reset();
                        motorLeft.controller = MotionControlType::torque;
                        motorRight.controller = MotionControlType::torque;
                        Serial.println("Auto-Balancing ENGAGED!");
                        upright_time = 0;
                    }
                } else {
                    upright_time = 0;
                }
            }

            // Balancing Logic
            if (balancing_local && mpuInitialized) {
                // Safety Cutoff
                if (adjusted_pitch > (45.0f * DEG_TO_RAD) || adjusted_pitch < (-45.0f * DEG_TO_RAD)) {
                    motorLeft.target = 0;
                    motorRight.target = 0;
                    balancing_local = false;
                    motorLeft.controller = MotionControlType::velocity;
                    motorRight.controller = MotionControlType::velocity;
                    Serial.println("Safety cut-off! Balancing disabled.");
                } else {
                    float velocity_avg = (motorLeft.shaft_velocity + (-motorRight.shaft_velocity)) / 2.0f;
                    float target_pitch = lpf_pitch_cmd(pid_vel(lpf_throttle(throttle_local) - velocity_avg));
                    float voltage_control = pid_stb(adjusted_pitch - target_pitch);
                    float steering_adj = lpf_steering(steering_local);

                    motorLeft.target = voltage_control + steering_adj;
                    motorRight.target = -(voltage_control - steering_adj);
                }
            }

            // ── 5. Write shared outputs ──
            portENTER_CRITICAL(&stateMux);
            shared.current_pitch = current_pitch_local;
            shared.vel_left = motorLeft.shaft_velocity;
            shared.vel_right = -motorRight.shaft_velocity;
            shared.accel_x = ax;
            shared.accel_y = ay;
            shared.accel_z = az;
            shared.balancing_enabled = balancing_local;
            portEXIT_CRITICAL(&stateMux);
        }

        vTaskDelay(pdMS_TO_TICKS(1)); // Yield to lower-priority tasks
    }
}

void setup() {
    Serial.begin(115200);
    BP32.setup(&onConnectedController, &onDisconnectedController);
    BP32.forgetBluetoothKeys();
    SimpleFOCDebug::enable(&Serial);
    Serial.println("Starting SimpleFOC Balancer (Bluetooth Enabled)...");
    
    // ─── I2C Setup ───
    Wire.begin(I2C_0_SDA, I2C_0_SCL);
    Wire.setClock(400000);
    Wire1.begin(I2C_1_SDA, I2C_1_SCL);
    Wire1.setClock(400000);

    sensorLeft.init(&Wire);
    sensorRight.init(&Wire1);
    Wire.setClock(400000); // Re-assert 400kHz just in case
    Wire1.setClock(400000);

    if (mpu.begin(0x68, &Wire)) {
        mpuInitialized = true;
        mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
        mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
        Serial.println("MPU6050 Ready");
    } else {
        Serial.println("MPU6050 Failed to Initialize");
    }

    // ─── Motor & Driver Setup ───
    driverLeft.voltage_power_supply = 12.0f;
    driverLeft.voltage_limit = 10.0f;
    driverLeft.init();
    driverRight.voltage_power_supply = 12.0f;
    driverRight.voltage_limit = 10.0f;
    driverRight.init();

    motorLeft.linkSensor(&sensorLeft);
    motorLeft.linkDriver(&driverLeft);
    motorRight.linkSensor(&sensorRight);
    motorRight.linkDriver(&driverRight);

    // Default internal PIDs for Velocity Mode
    motorLeft.PID_velocity.P = 0.5f; motorLeft.PID_velocity.I = 10.0f; motorLeft.PID_velocity.limit = 10.0f;
    motorRight.PID_velocity.P = 0.5f; motorRight.PID_velocity.I = 10.0f; motorRight.PID_velocity.limit = 10.0f;
    motorLeft.LPF_velocity.Tf = 0.02f;
    motorRight.LPF_velocity.Tf = 0.02f;

    // Start in Velocity Mode for safe testing
    motorLeft.controller = MotionControlType::velocity;
    motorRight.controller = MotionControlType::velocity;
    motorLeft.voltage_limit = 10.0f;
    motorRight.voltage_limit = 10.0f;

    motorLeft.init();
    motorRight.init();

    // Let SimpleFOC auto-calibrate the motors on startup for perfect torque symmetry!
    motorLeft.voltage_sensor_align = 1.5f;
    motorRight.voltage_sensor_align = 1.5f;
    
    // motorLeft.zero_electric_angle = 3.34;
    // motorLeft.sensor_direction = Direction::CW;
    motorLeft.initFOC();
    
    // motorRight.zero_electric_angle = 1.39;
    // motorRight.sensor_direction = Direction::CW;
    motorRight.initFOC();

    motorLeft.target = 0;
    motorRight.target = 0;
    
    // Commands
    commander.add('L', onMotorLeft, "Motor Left");
    commander.add('R', onMotorRight, "Motor Right");
    commander.add('B', onBalanceToggle, "Toggle Balance Mode");
    commander.add('A', onPidStab, "PID Stabilize");
    commander.add('V', onPidVel, "PID Velocity");
    commander.add('S', onStreamToggle, "Toggle Diagnostic Stream");
    commander.add('O', onPitchOffset, "Pitch Offset (deg)");

    Serial.println("System Ready.");
    Serial.println("Type 'L5' to spin left motor at 5 rad/s");
    Serial.println("Type 'B' to toggle Balancing");

    // ─── Launch Balance Task on Core 1 at Priority 5 ───
    // This runs FOC + IMU + PID at the highest user-level priority.
    // Arduino loop() continues on Core 1 at priority 1 for serial/BT/diagnostics.
    BaseType_t res = xTaskCreatePinnedToCore(
        balanceTask,       // Task function
        "BalanceControl",  // Task name
        8192,              // Stack size (8KB)
        NULL,              // Parameters
        5,                 // Priority (highest user task)
        NULL,              // Task handle
        1                  // Core 1
    );
    if (res != pdPASS) {
        Serial.println("CRITICAL: Failed to create balance task!");
    }
}

void loop() {
    // ── Serial Commander (lightweight serial listener) ──
    commander.run();
    
    // ── Update Gamepads ──
    BP32.update();
    float throttle_val = 0;
    float steering_val = 0;
    if (myControllers[0] && myControllers[0]->isConnected()) {
        float joy_y = -myControllers[0]->axisY() / 512.0f; 
        float joy_x = -myControllers[0]->axisX() / 512.0f; // Inverted
        
        if (abs(joy_y) < 0.1f) joy_y = 0;
        if (abs(joy_x) < 0.1f) joy_x = 0;
        
        throttle_val = joy_y * 10.0f; 
        steering_val = joy_x * 1.5f;  // Reduced sensitivity
    }

    // Write gamepad inputs to shared state
    portENTER_CRITICAL(&stateMux);
    shared.throttle = throttle_val;
    shared.steering = steering_val;
    portEXIT_CRITICAL(&stateMux);

    // ── Diagnostic Streaming (reads shared state, no longer blocks FOC) ──
    // Check diagnostic_stream without lock — a torn bool read is harmless here
    if (shared.diagnostic_stream) {
        portENTER_CRITICAL(&stateMux);
        float vl = shared.vel_left;
        float vr = shared.vel_right;
        float ax = shared.accel_x;
        float ay = shared.accel_y;
        float az = shared.accel_z;
        portEXIT_CRITICAL(&stateMux);

        unsigned long now = millis();
        Serial.print("DATA,");
        Serial.print(now); Serial.print(",");
        Serial.print(vl, 2); Serial.print(",");
        Serial.print(vr, 2); Serial.print(",");
        Serial.print(ax, 2); Serial.print(",");
        Serial.print(ay, 2); Serial.print(",");
        Serial.println(az, 2);
    }
}
