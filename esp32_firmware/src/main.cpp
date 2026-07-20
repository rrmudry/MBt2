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

float throttle = 0;
float steering = 0;
bool balancing_enabled = false;

float current_pitch = 0.0f;
unsigned long lastImuTime = 0;

float pitch_offset = 0.0f * DEG_TO_RAD; // Start with measured offset from user

bool diagnostic_stream = false;

// ─── SimpleFOC Commander ───
Commander commander = Commander(Serial);
void onMotorLeft(char* cmd) { commander.motor(&motorLeft, cmd); }
void onMotorRight(char* cmd) { commander.motor(&motorRight, cmd); }
void onPidStab(char* cmd) { commander.pid(&pid_stb, cmd); }
void onPidVel(char* cmd) { commander.pid(&pid_vel, cmd); }
void onPitchOffset(char* cmd) { pitch_offset = atof(cmd) * DEG_TO_RAD; }
void onStreamToggle(char* cmd) { diagnostic_stream = !diagnostic_stream; }
void onBalanceToggle(char* cmd) { 
    balancing_enabled = !balancing_enabled; 
    if (balancing_enabled) {
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
}

void loop() {
    commander.run(); // Extremely lightweight serial listener
    
    // Update Gamepads
    BP32.update();
    if (myControllers[0] && myControllers[0]->isConnected()) {
        float joy_y = -myControllers[0]->axisY() / 512.0f; 
        float joy_x = -myControllers[0]->axisX() / 512.0f; // Inverted
        
        if (abs(joy_y) < 0.1f) joy_y = 0;
        if (abs(joy_x) < 0.1f) joy_x = 0;
        
        throttle = joy_y * 10.0f; 
        steering = joy_x * 1.5f;  // Reduced sensitivity
    } else {
        throttle = 0;
        steering = 0;
    }

    motorLeft.loopFOC();
    motorRight.loopFOC();
    motorLeft.move();
    motorRight.move();

    // ─── 100Hz IMU & Control Loop ───
    unsigned long now = millis();
    if (now - lastImuTime >= 10) { 
        lastImuTime = now;
        sensors_event_t a, g, temp;
        if (mpuInitialized) {
            mpu.getEvent(&a, &g, &temp);
        }
        
        // Stream diagnostic data
        if (diagnostic_stream) {
            Serial.print("DATA,");
            Serial.print(now); Serial.print(",");
            Serial.print(motorLeft.shaft_velocity, 2); Serial.print(",");
            Serial.print(-motorRight.shaft_velocity, 2); Serial.print(",");
            Serial.print(a.acceleration.x, 2); Serial.print(",");
            Serial.print(a.acceleration.y, 2); Serial.print(",");
            Serial.println(a.acceleration.z, 2);
        }

        // ─── Pitch Calculation (Runs ALWAYS at 100Hz) ───
        if (mpuInitialized) {
            float accel_pitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z));
            // Complementary filter: 98% Gyro, 2% Accelerometer
            // dt is exactly 0.01s (100Hz).
            current_pitch = 0.98f * (current_pitch + g.gyro.y * 0.01f) + 0.02f * accel_pitch;
        }
        float adjusted_pitch = current_pitch - pitch_offset;

        // ─── Auto-Enable Logic ───
        static unsigned long upright_time = 0;
        if (!balancing_enabled && mpuInitialized) {
            if (abs(adjusted_pitch) < 3.0f * DEG_TO_RAD) { // Held within 3 degrees of perfect balance
                if (upright_time == 0) upright_time = now;
                else if (now - upright_time > 1000) { // Must hold it steady for 1 full second
                    balancing_enabled = true;
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

        // ─── Balancing Logic (Strict Reference Implementation) ───
        if (balancing_enabled && mpuInitialized) {
            // Safety Cutoff
            if (adjusted_pitch > (45.0f * DEG_TO_RAD) || adjusted_pitch < (-45.0f * DEG_TO_RAD)) {
                motorLeft.target = 0;
                motorRight.target = 0;
                balancing_enabled = false;
                motorLeft.controller = MotionControlType::velocity;
                motorRight.controller = MotionControlType::velocity;
                Serial.println("Safety cut-off! Balancing disabled.");
            } else {
                // Velocity is positive when moving forward
                // motorRight needs its velocity negated because +target moves it backward physically
                float velocity_avg = (motorLeft.shaft_velocity + (-motorRight.shaft_velocity)) / 2.0f;
                
                // If moving forward (+vel), we must lean backward (-pitch) to slow down. 
                // So error is (throttle - velocity)
                float target_pitch = lpf_pitch_cmd(pid_vel(lpf_throttle(throttle) - velocity_avg));
                
                // If leaning forward (+pitch), we must accelerate forward (+voltage) to catch it.
                // So error is (pitch - target)
                float voltage_control = pid_stb(adjusted_pitch - target_pitch);
                
                float steering_adj = lpf_steering(steering);

                // motorRight is negated to match the physical forward direction
                motorLeft.target = voltage_control + steering_adj;
                motorRight.target = -(voltage_control - steering_adj);
            }
        }
    }
}
