import json
import uuid

def gen_id():
    return "gge" + uuid.uuid4().hex[:8]

# ----------------------------------------------------
# 1. SCHEMATIC GENERATION
# ----------------------------------------------------
sch_shapes = []

# Frame / Header Text
sch_shapes.append(
    f"LIB~0~-806~package`NONE`Manufacturer Part`?`spicePre`.`~~0~frame_lib_1~~~0~~yes~yes~~~#@$T~N~570.75~-809~0~#000080~Arial~~~~~comment~A~0~start~{gen_id()}~0~"
)

# Text / Title
sch_shapes.append(
    f"TEXT~L~100~-750~0~#000080~~14pt~~~~comment~ESP32 + Dual SimpleFOC Mini + MPU6050 + AS5600 Carrier Board~1~start~{gen_id()}~0"
)

# --------------------------
# Net Labels / Ports Helper
# --------------------------
def add_net_port(x, y, net_name, rot=0):
    sch_shapes.append(
        f"F~part_netLabel_netPort~{x}~{y}~{rot}~{gen_id()}~~0^^{x}~{y}^^{net_name}~#0000FF~{x+10}~{y}~0~start~"
    )

def add_vcc_port(x, y, net_name="3.3V", rot=0):
    sch_shapes.append(
        f"F~part_netLabel_VCC~{x}~{y}~{rot}~{gen_id()}~~0^^{x}~{y}^^{net_name}~#000000~{x}~{y-10}~0~start~"
    )

def add_gnd_port(x, y, rot=0):
    sch_shapes.append(
        f"F~part_netLabel_gnD~{x}~{y}~{rot}~{gen_id()}~~0^^{x}~{y}^^GND~#000000~{x}~{y+10}~0~start~"
    )

# ESP32 Header Left (Pins 1..15) & Right (Pins 16..30)
# SimpleFOC Driver 1 Header (10P) & Driver 2 Header (10P)
# MPU6050 Header (6P)
# AS5600 Encoder Headers (4P x 2)
# Power Terminal (2P)

# ESP32 Left Pins
esp32_left_pins = [
    ("EN", "EN"), ("VP", "NC"), ("VN", "NC"), ("D34", "NC"), ("D35", "NC"),
    ("D32", "MOT1_A"), ("D33", "MOT1_B"), ("D25", "MOT2_A"), ("D26", "MOT2_B"),
    ("D27", "MOT2_C"), ("D14", "MOT1_C"), ("D12", "MOT2_EN"), ("D13", "MOT1_EN"),
    ("GND", "GND"), ("VIN", "VM")
]

esp32_right_pins = [
    ("3V3", "3.3V"), ("GND", "GND"), ("D15", "NC"), ("D2", "NC"), ("D4", "NC"),
    ("RX2", "NC"), ("TX2", "NC"), ("D5", "NC"), ("D18", "I2C_1_SDA"), ("D19", "I2C_1_SCL"),
    ("D21", "I2C_0_SDA"), ("RX0", "NC"), ("TX0", "NC"), ("D22", "I2C_0_SCL"), ("D23", "NC")
]

# Write Schematic connections
x_esp = 400
y_start = -600

# ESP32 Left Header
sch_shapes.append(f"LIB~{x_esp}~{y_start}~package`HDR-TH_1x15-P2.54-V-F`nameAlias`ESP32_DevKit_Left~0~0~{gen_id()}~0~#@$T~N~{x_esp}~{y_start-20}~0~#000080~Arial~~~~~comment~ESP32_LEFT~1~start~{gen_id()}~0")
for i, (pin_label, net_name) in enumerate(esp32_left_pins):
    yp = y_start + i * 20
    if net_name == "GND":
        add_gnd_port(x_esp - 40, yp)
    elif net_name == "VM":
        add_vcc_port(x_esp - 40, yp, "VM")
    elif net_name == "3.3V":
        add_vcc_port(x_esp - 40, yp, "3.3V")
    elif net_name != "NC":
        add_net_port(x_esp - 40, yp, net_name, 180)

# ESP32 Right Header
x_esp_r = 600
sch_shapes.append(f"LIB~{x_esp_r}~{y_start}~package`HDR-TH_1x15-P2.54-V-F`nameAlias`ESP32_DevKit_Right~0~0~{gen_id()}~0~#@$T~N~{x_esp_r}~{y_start-20}~0~#000080~Arial~~~~~comment~ESP32_RIGHT~1~start~{gen_id()}~0")
for i, (pin_label, net_name) in enumerate(esp32_right_pins):
    yp = y_start + i * 20
    if net_name == "GND":
        add_gnd_port(x_esp_r + 40, yp)
    elif net_name == "3.3V":
        add_vcc_port(x_esp_r + 40, yp, "3.3V")
    elif net_name != "NC":
        add_net_port(x_esp_r + 40, yp, net_name, 0)

# Left SimpleFOC Driver Socket (10-Pin Header)
x_m1 = 200
y_m1 = -600
sch_shapes.append(f"LIB~{x_m1}~{y_m1}~package`HDR-TH_10P-P2.54-V-F-R2-C5-S2.54`nameAlias`SimpleFOC_Left~0~0~{gen_id()}~0~#@$T~N~{x_m1}~{y_m1-20}~0~#000080~Arial~~~~~comment~DRIVER_1_LEFT~1~start~{gen_id()}~0")
m1_nets = [("IN1", "MOT1_A"), ("IN2", "MOT1_B"), ("IN3", "MOT1_C"), ("EN", "MOT1_EN"), ("nFLT", "NC"), ("nSLP", "3.3V"), ("nRES", "3.3V"), ("GND", "GND"), ("GND", "GND"), ("3V3", "3.3V")]
for i, (p_lbl, n_name) in enumerate(m1_nets):
    yp = y_m1 + i * 20
    if n_name == "GND":
        add_gnd_port(x_m1 - 40, yp)
    elif n_name == "3.3V":
        add_vcc_port(x_m1 - 40, yp, "3.3V")
    elif n_name != "NC":
        add_net_port(x_m1 - 40, yp, n_name, 180)

# Right SimpleFOC Driver Socket (10-Pin Header)
x_m2 = 800
y_m2 = -600
sch_shapes.append(f"LIB~{x_m2}~{y_m2}~package`HDR-TH_10P-P2.54-V-F-R2-C5-S2.54`nameAlias`SimpleFOC_Right~0~0~{gen_id()}~0~#@$T~N~{x_m2}~{y_m2-20}~0~#000080~Arial~~~~~comment~DRIVER_2_RIGHT~1~start~{gen_id()}~0")
m2_nets = [("IN1", "MOT2_A"), ("IN2", "MOT2_B"), ("IN3", "MOT2_C"), ("EN", "MOT2_EN"), ("nFLT", "NC"), ("nSLP", "3.3V"), ("nRES", "3.3V"), ("GND", "GND"), ("GND", "GND"), ("3V3", "3.3V")]
for i, (p_lbl, n_name) in enumerate(m2_nets):
    yp = y_m2 + i * 20
    if n_name == "GND":
        add_gnd_port(x_m2 + 40, yp)
    elif n_name == "3.3V":
        add_vcc_port(x_m2 + 40, yp, "3.3V")
    elif n_name != "NC":
        add_net_port(x_m2 + 40, yp, n_name, 0)

# MPU6050 Module Header (6-Pin Header)
x_imu = 200
y_imu = -300
sch_shapes.append(f"LIB~{x_imu}~{y_imu}~package`HDR-TH_1x6-P2.54-V-F`nameAlias`MPU6050_IMU~0~0~{gen_id()}~0~#@$T~N~{x_imu}~{y_imu-20}~0~#000080~Arial~~~~~comment~MPU6050~1~start~{gen_id()}~0")
imu_nets = [("VCC", "3.3V"), ("GND", "GND"), ("SCL", "I2C_0_SCL"), ("SDA", "I2C_0_SDA"), ("XDA", "NC"), ("XCL", "NC")]
for i, (p_lbl, n_name) in enumerate(imu_nets):
    yp = y_imu + i * 20
    if n_name == "GND":
        add_gnd_port(x_imu - 40, yp)
    elif n_name == "3.3V":
        add_vcc_port(x_imu - 40, yp, "3.3V")
    elif n_name != "NC":
        add_net_port(x_imu - 40, yp, n_name, 180)

# Left & Right Encoder Headers (4-Pin Headers)
x_e1 = 450
y_e1 = -300
sch_shapes.append(f"LIB~{x_e1}~{y_e1}~package`HDR-TH_1x4-P2.54-V-F`nameAlias`AS5600_Left~0~0~{gen_id()}~0~#@$T~N~{x_e1}~{y_e1-20}~0~#000080~Arial~~~~~comment~ENC_LEFT~1~start~{gen_id()}~0")
e1_nets = [("VCC", "3.3V"), ("GND", "GND"), ("SDA", "I2C_0_SDA"), ("SCL", "I2C_0_SCL")]
for i, (p_lbl, n_name) in enumerate(e1_nets):
    yp = y_e1 + i * 20
    if n_name == "GND":
        add_gnd_port(x_e1 - 40, yp)
    elif n_name == "3.3V":
        add_vcc_port(x_e1 - 40, yp, "3.3V")
    elif n_name != "NC":
        add_net_port(x_e1 - 40, yp, n_name, 180)

x_e2 = 600
y_e2 = -300
sch_shapes.append(f"LIB~{x_e2}~{y_e2}~package`HDR-TH_1x4-P2.54-V-F`nameAlias`AS5600_Right~0~0~{gen_id()}~0~#@$T~N~{x_e2}~{y_e2-20}~0~#000080~Arial~~~~~comment~ENC_RIGHT~1~start~{gen_id()}~0")
e2_nets = [("VCC", "3.3V"), ("GND", "GND"), ("SDA", "I2C_1_SDA"), ("SCL", "I2C_1_SCL")]
for i, (p_lbl, n_name) in enumerate(e2_nets):
    yp = y_e2 + i * 20
    if n_name == "GND":
        add_gnd_port(x_e2 + 40, yp)
    elif n_name == "3.3V":
        add_vcc_port(x_e2 + 40, yp, "3.3V")
    elif n_name != "NC":
        add_net_port(x_e2 + 40, yp, n_name, 0)

# Main Power Input Screw Terminal
x_pwr = 800
y_pwr = -300
sch_shapes.append(f"LIB~{x_pwr}~{y_pwr}~package`TB002-500-02BE`nameAlias`Power_Terminal~0~0~{gen_id()}~0~#@$T~N~{x_pwr}~{y_pwr-20}~0~#000080~Arial~~~~~comment~J_PWR~1~start~{gen_id()}~0")
add_vcc_port(x_pwr + 40, y_pwr, "VM")
add_gnd_port(x_pwr + 40, y_pwr + 20)

sch_doc = {
  "editorVersion": "6.5.42",
  "docType": "5",
  "title": "MBt2_Self_Balancing_Carrier_Board_Schematic",
  "description": "Carrier PCB for ESP32 DevKit V1 + 2x SimpleFOC Mini + MPU6050 + 2x AS5600 Encoders",
  "colors": {},
  "schematics": [
    {
      "docType": "1",
      "title": "Main Schematic",
      "description": "",
      "dataStr": {
        "head": {
          "docType": "1",
          "editorVersion": "6.5.42",
          "newgId": True,
          "c_para": {"Prefix Start": "1"},
          "c_spiceCmd": "null",
          "hasIdFlag": True,
          "uuid": "7a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
          "x": "0",
          "y": "0",
          "importFlag": 0
        },
        "canvas": "CA~1000~1000~#FFFFFF~yes~#CCCCCC~5~1000~1000~line~5~pixel~5~0~0",
        "shape": sch_shapes
      }
    }
  ]
}

with open("MBt2_Carrier_Board_SCH.json", "w") as f:
    json.dump(sch_doc, f, indent=2)

print("Saved MBt2_Carrier_Board_SCH.json")

# ----------------------------------------------------
# 2. PCB GENERATION
# ----------------------------------------------------
pcb_shapes = []

# Board Outline (Layer 10, rectangle 100mm x 80mm = 3937mil x 3150mil)
# Center around (4000, 3000)
x_min, x_max = 3500, 4500
y_min, y_max = 2600, 3400

# Board Outline Tracks
pcb_shapes.append(f"TRACK~1~10~BOARD_OUTLINE~{x_min} {y_min} {x_max} {y_min}~{gen_id()}~0")
pcb_shapes.append(f"TRACK~1~10~BOARD_OUTLINE~{x_max} {y_min} {x_max} {y_max}~{gen_id()}~0")
pcb_shapes.append(f"TRACK~1~10~BOARD_OUTLINE~{x_max} {y_max} {x_min} {y_max}~{gen_id()}~0")
pcb_shapes.append(f"TRACK~1~10~BOARD_OUTLINE~{x_min} {y_max} {x_min} {y_min}~{gen_id()}~0")

# Mounting Holes (4 corners, M3 = 3.2mm hole / 126mil, 6mm pad / 236mil)
mounting_holes = [
    (x_min + 200, y_min + 200),
    (x_max - 200, y_min + 200),
    (x_min + 200, y_max - 200),
    (x_max - 200, y_max - 200)
]
for mx, my in mounting_holes:
    pcb_shapes.append(f"PAD~ELLIPSE~{mx}~{my}~236~236~11~GND~1~126~~0~{gen_id()}~0~~Y~0~0~0.2~{mx},{my}")

# Silk Screen Title
pcb_shapes.append(f"TEXT~3~{x_min+300}~{y_min+150}~80~0~1~4~~3.937~MBt2 BALANCING ROBOT CARRIER BOARD~M0 0~{gen_id()}~0~pinpart")

# Footprint Helper: DIP / Header Pin Rows
def add_header_socket(prefix, ref_designator, x_c, y_c, pin_count, row_spacing_mil, pin_pitch_mil, net_list, rot=0):
    # Footprint LIB shape
    pcb_shapes.append(f"LIB~{x_c}~{y_c}~package`HDR-TH_1x{pin_count}-P2.54-V-F`nameAlias`{ref_designator}~0~{rot}~{gen_id()}~0~#@$T~N~{x_c}~{y_c-30}~0~#FFCC00~Arial~~~~~comment~{ref_designator}~1~start~{gen_id()}~0")
    
    # Pads
    half_pins = pin_count // 2
    for i in range(pin_count):
        if row_spacing_mil > 0:
            # Dual row (e.g. ESP32 DevKit)
            row = 0 if i < half_pins else 1
            idx = i if row == 0 else (pin_count - 1 - i)
            px = x_c - (row_spacing_mil / 2) if row == 0 else x_c + (row_spacing_mil / 2)
            py = y_c - ((half_pins - 1) / 2 * pin_pitch_mil) + (idx * pin_pitch_mil)
        else:
            # Single row header
            px = x_c
            py = y_c - ((pin_count - 1) / 2 * pin_pitch_mil) + (i * pin_pitch_mil)
        
        net_name = net_list[i] if i < len(net_list) else "NC"
        pad_type = "RECT" if i == 0 else "OVAL"
        pcb_shapes.append(f"PAD~{pad_type}~{px}~{py}~60~90~11~{net_name}~{i+1}~35~~0~{gen_id()}~0~~Y~0~0~0.2~{px},{py}")

# 1. ESP32 DevKit V1 Socket (Dual 1x15, 0.9" / 900mil row spacing, 100mil pin pitch)
esp32_all_nets = [p[1] for p in esp32_left_pins] + [p[1] for p in esp32_right_pins]
add_header_socket("ESP32", "U1_ESP32", 4000, 2900, 30, 900, 100, esp32_all_nets)

# 2. Driver 1 (Left SimpleFOC Mini) 10-pin Socket
m1_nets_list = [n[1] for n in m1_nets]
add_header_socket("M1", "M1_DRIVER_LEFT", 3700, 2900, 10, 0, 100, m1_nets_list)

# 3. Driver 2 (Right SimpleFOC Mini) 10-pin Socket
m2_nets_list = [n[1] for n in m2_nets]
add_header_socket("M2", "M2_DRIVER_RIGHT", 4300, 2900, 10, 0, 100, m2_nets_list)

# 4. MPU6050 6-pin Header Socket
imu_nets_list = [n[1] for n in imu_nets]
add_header_socket("IMU", "S1_MPU6050", 3700, 3250, 6, 0, 100, imu_nets_list)

# 5. AS5600 Encoder 1 Header (Left)
e1_nets_list = [n[1] for n in e1_nets]
add_header_socket("ENC1", "E1_ENC_LEFT", 3950, 3250, 4, 0, 100, e1_nets_list)

# 6. AS5600 Encoder 2 Header (Right)
e2_nets_list = [n[1] for n in e2_nets]
add_header_socket("ENC2", "E2_ENC_RIGHT", 4050, 3250, 4, 0, 100, e2_nets_list)

# 7. Main Power Screw Terminal (2-pin 5.08mm / 200mil pitch)
add_header_socket("PWR", "J_PWR", 4300, 3250, 2, 0, 200, ["VM", "GND"])

# 8. Left & Right Motor Phase Terminals (3-pin 3.5mm / 138mil pitch)
add_header_socket("MOT1", "J_MOT1_LEFT", 3600, 2680, 3, 0, 138, ["U1", "V1", "W1"])
add_header_socket("MOT2", "J_MOT2_RIGHT", 4400, 2680, 3, 0, 138, ["U2", "V2", "W2"])

# Add Copper Pour Ground Plane on Top (Layer 1) & Bottom (Layer 2)
copper_poly = f"M {x_min} {y_min} L {x_max} {y_min} L {x_max} {y_max} L {x_min} {y_max} Z"
pcb_shapes.append(f"COPPERAREA~1~2~GND~{copper_poly}~1~solid~{gen_id()}~direct~none~[]~0")
pcb_shapes.append(f"COPPERAREA~2~2~GND~{copper_poly}~1~solid~{gen_id()}~direct~none~[]~0")

pcb_doc = {
  "head": {
    "docType": "3",
    "editorVersion": "6.5.42",
    "newgId": True,
    "c_para": {},
    "x": "4000",
    "y": "3000",
    "hasIdFlag": True,
    "importFlag": 0,
    "transformList": ""
  },
  "canvas": "CA~1000~1000~#000000~yes~#FFFFFF~10~1000~1000~line~0.5~mm~1~45~visible~0.5~4000~3000~1~yes",
  "shape": pcb_shapes,
  "layers": [
    "1~TopLayer~#FF0000~true~true~true~",
    "2~BottomLayer~#0000FF~true~false~true~",
    "3~TopSilkLayer~#FFCC00~true~false~true~",
    "4~BottomSilkLayer~#66CC33~true~false~true~",
    "7~TopSolderMaskLayer~#808080~true~false~true~0.3",
    "8~BottomSolderMaskLayer~#AA00FF~true~false~true~0.3",
    "9~Ratlines~#6464FF~true~false~true~",
    "10~BoardOutLine~#FF00FF~true~false~true~",
    "11~Multi-Layer~#C0C0C0~true~false~true~"
  ],
  "objects": ["Component~true~true", "Track~true~true", "Pad~true~true", "Via~true~true", "Copper_Area~true~true"],
  "BBox": {"x": x_min, "y": y_min, "width": x_max - x_min, "height": y_max - y_min},
  "DRCRULE": {"Default": {"trackWidth": 10, "clearance": 8, "viaHoleDiameter": 24, "viaHoleD": 12}, "isRealtime": True}
}

with open("MBt2_Carrier_Board_PCB.json", "w") as f:
    json.dump(pcb_doc, f, indent=2)

print("Saved MBt2_Carrier_Board_PCB.json")
