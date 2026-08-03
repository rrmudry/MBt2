import json, re, uuid

def gen_id():
    return "gge" + uuid.uuid4().hex[:8]

# -------------------------------------------------------------------
# 1. LOAD SOURCE SCHEMATIC & PCB OF SIMPLEFOC MINI
# -------------------------------------------------------------------
with open('SCH_simplefocmini_2024-04-26.json') as f:
    src_sch = json.load(f)

with open('PCB_simplefocmini_2024-04-26.json') as f:
    src_pcb = json.load(f)

src_sch_shapes = src_sch['schematics'][0]['dataStr']['shape']
src_pcb_shapes = src_pcb['shape']

# -------------------------------------------------------------------
# 2. SCHEMATIC TRANSFORMATION HELPER
# -------------------------------------------------------------------
def transform_sch_shape(shape_str, dx, dy, net_map={}, suffix=""):
    parts = shape_str.split('~')
    stype = parts[0]
    
    if stype == 'LIB':
        parts[1] = f"{float(parts[1]) + dx:.2f}"
        parts[2] = f"{float(parts[2]) + dy:.2f}"
        res = '~'.join(parts)
        if suffix:
            # Append suffix to designators (e.g. U1 -> U1_M1)
            res = re.sub(r'comment~([A-Z]+[0-9]+)~', r'comment~\1' + suffix + '~', res)
        return res
    elif stype == 'W':
        coords = parts[1].split(' ')
        new_c = []
        for i in range(0, len(coords), 2):
            if i+1 < len(coords):
                new_c.extend([f"{float(coords[i])+dx:.2f}", f"{float(coords[i+1])+dy:.2f}"])
        parts[1] = ' '.join(new_c)
        return '~'.join(parts)
    elif stype in ['F', 'J', 'TEXT']:
        parts[2] = f"{float(parts[2]) + dx:.2f}"
        parts[3] = f"{float(parts[3]) + dy:.2f}"
        res = '~'.join(parts)
        for old_net, new_net in net_map.items():
            res = res.replace(f"^^{old_net}^^", f"^^{new_net}^^")
        return res
    return shape_str

# Driver 1 SCH (Left Motor) - placed at dx=0, dy=0
m1_net_map = {
    "IN1": "MOT1_A", "IN2": "MOT1_B", "IN3": "MOT1_C", "EN": "MOT1_EN",
    "nSlp": "3.3V", "nRes": "3.3V", "nFlt": "MOT1_FLT"
}
m1_sch = [transform_sch_shape(s, 0, 0, m1_net_map, "_LEFT") for s in src_sch_shapes]

# Driver 2 SCH (Right Motor) - shifted right dx=600, dy=0
m2_net_map = {
    "IN1": "MOT2_A", "IN2": "MOT2_B", "IN3": "MOT2_C", "EN": "MOT2_EN",
    "nSlp": "3.3V", "nRes": "3.3V", "nFlt": "MOT2_FLT"
}
m2_sch = [transform_sch_shape(s, 600, 0, m2_net_map, "_RIGHT") for s in src_sch_shapes]

# Combine all SCH shapes
combined_sch_shapes = []
combined_sch_shapes.extend(m1_sch)
combined_sch_shapes.extend(m2_sch)

# Add Carrier Board Schematic Title Text
combined_sch_shapes.append(
    f"TEXT~L~100~-850~0~#000080~~16pt~~~~comment~MBt2 DUAL SIMPLEFOC MINI + ESP32 BALANCING ROBOT MOTHERBOARD~1~start~{gen_id()}~0"
)

sch_doc = {
  "editorVersion": "6.5.42",
  "docType": "5",
  "title": "MBt2_Carrier_Board_Schematic",
  "description": "Carrier PCB for ESP32 DevKit V1 + 2x SimpleFOC Mini + MPU6050 + 2x AS5600 Encoders",
  "colors": {},
  "schematics": [
    {
      "docType": "1",
      "title": "Main Schematic",
      "description": "",
      "dataStr": {
        "head": src_sch['schematics'][0]['dataStr']['head'],
        "canvas": src_sch['schematics'][0]['dataStr']['canvas'],
        "shape": combined_sch_shapes
      }
    }
  ]
}

with open("MBt2_Carrier_Board_SCH.json", "w") as f:
    json.dump(sch_doc, f, indent=2)

print("Created combined schematic: MBt2_Carrier_Board_SCH.json")

# -------------------------------------------------------------------
# 3. PCB TRANSFORMATION HELPER
# -------------------------------------------------------------------
def transform_pcb_shape(shape_str, dx, dy, net_map={}, suffix=""):
    parts = shape_str.split('~')
    stype = parts[0]

    def map_net(n):
        return net_map.get(n, n)

    if stype == 'TRACK':
        parts[3] = map_net(parts[3])
        coords = parts[4].split(' ')
        new_c = []
        for i in range(0, len(coords), 2):
            if i+1 < len(coords):
                new_c.extend([f"{float(coords[i])+dx:.2f}", f"{float(coords[i+1])+dy:.2f}"])
        parts[4] = ' '.join(new_c)
        return '~'.join(parts)

    elif stype == 'PAD':
        parts[2] = f"{float(parts[2])+dx:.2f}"
        parts[3] = f"{float(parts[3])+dy:.2f}"
        parts[7] = map_net(parts[7])
        if len(parts) > 17 and ',' in parts[17]:
            try:
                tx, ty = parts[17].split(',')
                parts[17] = f"{float(tx)+dx:.2f},{float(ty)+dy:.2f}"
            except:
                pass
        return '~'.join(parts)

    elif stype == 'VIA':
        parts[1] = f"{float(parts[1])+dx:.2f}"
        parts[2] = f"{float(parts[2])+dy:.2f}"
        parts[4] = map_net(parts[4])
        return '~'.join(parts)

    elif stype == 'LIB':
        parts[1] = f"{float(parts[1])+dx:.2f}"
        parts[2] = f"{float(parts[2])+dy:.2f}"
        
        sub_elements = shape_str.split('#@$')
        new_subs = []
        for idx, sub in enumerate(sub_elements):
            if idx == 0:
                lp = sub.split('~')
                lp[1] = f"{float(lp[1])+dx:.2f}"
                lp[2] = f"{float(lp[2])+dy:.2f}"
                new_subs.append('~'.join(lp))
            else:
                sp = sub.split('~')
                subtype = sp[0]
                if subtype in ['T', 'TEXT', 'P']:
                    if len(sp) > 3:
                        try:
                            sp[2] = f"{float(sp[2])+dx:.2f}"
                            sp[3] = f"{float(sp[3])+dy:.2f}"
                        except:
                            pass
                    new_subs.append('~'.join(sp))
                elif subtype in ['PAD', 'TRACK', 'PL']:
                    sub_str = '~'.join(sp)
                    def repl_coords(m):
                        c_str = m.group(0)
                        nums = c_str.split(' ')
                        nc = []
                        for i in range(0, len(nums), 2):
                            if i+1 < len(nums):
                                nc.extend([f"{float(nums[i])+dx:.2f}", f"{float(nums[i+1])+dy:.2f}"])
                        return ' '.join(nc)
                    sub_str = re.sub(r'(\d+\.?\d*\s+\d+\.?\d*(\s+\d+\.?\d*\s+\d+\.?\d*)*)', repl_coords, sub_str)
                    new_subs.append(sub_str)
                else:
                    new_subs.append(sub)
        return '#@$'.join(new_subs)

    elif stype in ['SOLIDREGION', 'COPPERAREA']:
        parts[3] = map_net(parts[3])
        path_str = parts[4]
        # Shift coordinate numbers inside path string M x y L x y Z
        def repl_path_nums(m):
            nums = m.group(0).split()
            nc = []
            for i in range(0, len(nums), 2):
                if i+1 < len(nums):
                    nc.extend([f"{float(nums[i])+dx:.2f}", f"{float(nums[i+1])+dy:.2f}"])
            return ' '.join(nc)
        parts[4] = re.sub(r'(\d+\.?\d*\s+\d+\.?\d*)', repl_path_nums, path_str)
        return '~'.join(parts)

    return shape_str

# Driver 1 PCB (Left Motor) - placed at dx=0, dy=0
m1_pcb = [transform_pcb_shape(s, 0, 0, m1_net_map, "_LEFT") for s in src_pcb_shapes]

# Driver 2 PCB (Right Motor) - shifted right by 120mm / 4724mil (dx=120)
m2_pcb = [transform_pcb_shape(s, 120, 0, m2_net_map, "_RIGHT") for s in src_pcb_shapes]

combined_pcb_shapes = []
combined_pcb_shapes.extend(m1_pcb)
combined_pcb_shapes.extend(m2_pcb)

# Construct PCB Document
pcb_doc = {
  "head": src_pcb["head"],
  "canvas": src_pcb["canvas"],
  "shape": combined_pcb_shapes,
  "layers": src_pcb["layers"],
  "objects": src_pcb["objects"],
  "BBox": src_pcb["BBox"],
  "DRCRULE": src_pcb["DRCRULE"],
  "routerRule": src_pcb.get("routerRule", {}),
  "netColors": {}
}

with open("MBt2_Carrier_Board_PCB.json", "w") as f:
    json.dump(pcb_doc, f, indent=2)

print("Created combined PCB: MBt2_Carrier_Board_PCB.json")
