# MBt2 PCB Carrier Board Design (Multibot_2 Version 1.0)

This directory contains the complete hardware design files, schematics, PCB layout, manufacturing files, and Bill of Materials (BOM) for the **MBt2 ESP32 SimpleFOC Dual-Core Self-Balancing Robot Carrier Board**.

---

## 🛠️ Hardware Files Included

- 📦 **`MBt2_PCB.zip`**: Standard Gerber & NC Drill manufacturing file. **Ready for 1-click ordering from JLCPCB, PCBWay, or OSH Park!**
- 📄 **`MBt2_PCB.pdf`**: High-resolution PCB Layout PDF drawing for quick inspection.
- 📋 **`BOM_MBt2_Carrier_Board.csv`**: Complete CSV Bill of Materials with designators and descriptions.
- 🎨 **`MBt2_PCB.epro2`**: Native EasyEDA Pro Project source file.
- 📐 **`MBt2_Carrier_Board_PCB.json` & `MBt2_Carrier_Board_SCH.json`**: EasyEDA / Web-CAD JSON PCB layout & schematic definitions.
- ⚙️ **`PCB_simplefocmini_2024-04-26.json` & `SCH_simplefocmini_2024-04-26.json`**: SimpleFOC Mini driver footprint definitions.

---

## 📋 Bill of Materials (BOM)

| Item | Designator | Qty | Component Name | Description | Power / Voltage Rating |
|---|---|---|---|---|---|
| 1 | `U1` | 1 | **ESP32 DevKit V1** | 30-Pin, 240MHz Dual-Core Microcontroller | 3.3V Logic / 5V Vin |
| 2 | `L_Driver`, `R_Driver` | 2 | **SimpleFOC Mini Driver** | 3-Phase BLDC Motor Driver Board (DRV8313/L6234) | 8-12V Power Supply |
| 3 | `MOT_L`, `MOT_R` | 2 | **BLDC Brushless Motor** | 11 Pole Pair Low-KV Brushless Gimbal Motor | 12V Nominal |
| 4 | `L_Encoder`, `R_Encoder` | 2 | **AS5600 Magnetic Encoder** | 12-Bit Angle Sensor Board (I2C Bus 0 & 1) | 3.3V VCC |
| 5 | `IMU` | 1 | **MPU6050 Module** | 6-DOF Accelerometer & Gyroscope Board (`0x68`) | 3.3V VCC |
| 6 | `5V_Boost` | 1 | **5V Step-Up Converter** | 1S LiPo to 5V DC Boost Regulator Module | 3.7V In $\rightarrow$ 5.0V Out |
| 7 | `1s_BAT` | 1 | **1S Battery Supply** | 3.7V High-Discharge LiPo or 18650 Battery | 3.7V Nominal |
| 8 | `PCB` | 1 | **MBt2 Carrier PCB** | Custom 2-Layer FR4 1.6mm Printed Circuit Board | 12V Max Power Rail |

---

## 🔌 Carrier Board Pinout & Interconnect Map

### ESP32 DevKit V1 Header Pinout
| Pin | Function | Target Device |
|---|---|---|
| **D21** | I2C 0 SDA | MPU6050 IMU (`0x68`) + Left AS5600 Encoder (`0x36`) |
| **D22** | I2C 0 SCL | MPU6050 IMU (`0x68`) + Left AS5600 Encoder (`0x36`) |
| **D18** | I2C 1 SDA | Right AS5600 Encoder (`0x36`) |
| **D19** | I2C 1 SCL | Right AS5600 Encoder (`0x36`) |
| **D32** | PWM IN1 | Left Motor Driver (Phase A) |
| **D33** | PWM IN2 | Left Motor Driver (Phase B) |
| **D14** | PWM IN3 | Left Motor Driver (Phase C) |
| **D13** | EN | Left Motor Driver Enable |
| **D25** | PWM IN1 | Right Motor Driver (Phase A) |
| **D26** | PWM IN2 | Right Motor Driver (Phase B) |
| **D27** | PWM IN3 | Right Motor Driver (Phase C) |
| **D12** | EN | Right Motor Driver Enable |
| **3V3** | 3.3V Power | Sensor VCC Rail (MPU6050 + AS5600 Encoders) |
| **VIN** | 5V / Batt | Power Supply Rail |
| **GND** | Ground | Common Ground |

---

## 🏭 How to Order PCBs (1-Click Manufacturing)

1. Go to [JLCPCB.com](https://jlcpcb.com) or [PCBWay.com](https://pcbway.com).
2. Click **Upload Gerber File**.
3. Select **`PCB_Design/MBt2_PCB.zip`**.
4. Keep standard options (2 Layers, 1.6mm thickness, FR4).
5. Click **Save to Cart & Order**!
