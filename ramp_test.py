import serial, time, statistics, math

print("Connecting to ESP32...")
try:
    s = serial.Serial()
    s.port = '/dev/ttyUSB0'
    s.baudrate = 230400
    s.timeout = 0.05
    s.setDTR(False)
    s.setRTS(False)
    s.open()
except Exception as e:
    print("Failed to open port:", e)
    exit(1)

# Stop and reset
s.write(b"L0\nR0\n")
s.flushInput()
time.sleep(0.1)

streaming = False
start_time = time.time()
# Check if already streaming
while time.time() - start_time < 0.5:
    if b"DATA" in s.readline():
        streaming = True
        break

if not streaming:
    s.write(b"S\n")
    time.sleep(0.1)
    start_time = time.time()
    while time.time() - start_time < 1.0:
        if b"DATA" in s.readline():
            streaming = True
            break
            
if not streaming:
    print("Could not start stream!")
    exit(1)

print("Starting ramp from 0 to 20 rad/s over 10 seconds...")
data = []
start_time = time.time()
ramp_duration = 10.0
max_speed = 20.0

last_cmd_time = 0
current_target = 0.0

while True:
    now = time.time()
    elapsed = now - start_time
    if elapsed > ramp_duration:
        break
        
    # Send updated speed every 0.1 seconds
    if now - last_cmd_time > 0.1:
        current_target = (elapsed / ramp_duration) * max_speed
        cmd = f"L{current_target:.2f}\nR{current_target:.2f}\n"
        s.write(cmd.encode('utf-8'))
        last_cmd_time = now
        
    # Read stream
    while s.in_waiting:
        try:
            line = s.readline().decode('utf-8', 'ignore').strip()
            if line.startswith("DATA,"):
                parts = line.split(',')
                if len(parts) == 7:
                    t = int(parts[1])
                    vl = float(parts[2])
                    vr = float(parts[3])
                    ax = float(parts[4])
                    ay = float(parts[5])
                    az = float(parts[6])
                    data.append((elapsed, vl, vr, ax, ay, az, current_target))
        except:
            pass

print("Ramp complete. Stopping motors...")
s.write(b"L0\nR0\nS\n")

if len(data) < 10:
    print("Not enough data collected!")
    exit(1)

print(f"\nCollected {len(data)} samples.")

# Bin the data by speed to analyze vibration at different speeds
bins = {
    "00-05 rad/s": [],
    "05-10 rad/s": [],
    "10-15 rad/s": [],
    "15-20 rad/s": []
}

for d in data:
    target = d[6]
    g_mag = math.sqrt(d[3]**2 + d[4]**2 + d[5]**2)
    if target < 5: bins["00-05 rad/s"].append(g_mag)
    elif target < 10: bins["05-10 rad/s"].append(g_mag)
    elif target < 15: bins["10-15 rad/s"].append(g_mag)
    else: bins["15-20 rad/s"].append(g_mag)

print("\n=== VIBRATION ANALYSIS BY SPEED ===")
for b in sorted(bins.keys()):
    mags = bins[b]
    if len(mags) > 0:
        g_std = statistics.stdev(mags) if len(mags)>1 else 0
        print(f"[{b}]: {len(mags):4d} samples -> Vibration StdDev = {g_std:.4f} g")
    else:
        print(f"[{b}]: No data")

overall_mags = [math.sqrt(d[3]**2 + d[4]**2 + d[5]**2) for d in data]
overall_std = statistics.stdev(overall_mags)
print(f"\nOVERALL VIBRATION (StdDev): {overall_std:.4f} g")

if overall_std < 0.1:
    print("CONCLUSION: EXTREMELY SMOOTH across entire ramp.")
elif overall_std < 0.3:
    print("CONCLUSION: MODERATELY SMOOTH. Slight resonances detected.")
else:
    print("CONCLUSION: VIBRATION DETECTED. The motors are struggling at certain speeds.")
