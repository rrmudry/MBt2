# MBt2 PCB Carrier Board Design (Multibot_2 Version 1.0)

This directory contains the complete hardware design files, schematics, PCB layout, and manufacturing files for the **MBt2 ESP32 SimpleFOC Dual-Core Self-Balancing Robot Carrier Board**.

---

## 🛠️ Hardware Files Included

- 📦 **`MBt2_PCB.zip`**: Standard Gerber & NC Drill manufacturing file. **Ready for 1-click ordering from JLCPCB, PCBWay, or OSH Park!**
- 📄 **`MBt2_PCB.pdf`**: High-resolution PCB Layout PDF drawing for quick inspection.
- 🎨 **`MBt2_PCB.epro2`**: Native EasyEDA Pro Project source file.
- 📐 **`MBt2_Carrier_Board_PCB.json` & `MBt2_Carrier_Board_SCH.json`**: EasyEDA / Web-CAD JSON PCB layout & schematic definitions.
- ⚙️ **`PCB_simplefocmini_2024-04-26.json` & `SCH_simplefocmini_2024-04-26.json`**: SimpleFOC Mini driver footprint definitions.

---

## 🔌 Carrier Board Pinout & Interconnect Map

### 1. ESP32 DevKit V1 Header
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
3. Select **`hardware/MBt2_PCB.zip`** (or `PCB_Design/MBt2_PCB.zip`).
4. Keep standard options (2 Layers, 1.6mm thickness, FR4).
5. Click **Save to Cart & Order**!
