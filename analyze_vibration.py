import serial, time, statistics, math

print("Connecting to ESP32...")
try:
    s = serial.Serial()
    s.port = '/dev/ttyUSB0'
    s.baudrate = 230400
    s.timeout = 0.5
    s.setDTR(False)
    s.setRTS(False)
    s.open()
except Exception as e:
    print("Failed to open port:", e)
    exit(1)

# Stop any existing motion/stream just in case
s.write(b"L0\n")
s.write(b"R0\n")
s.flushInput()
time.sleep(0.1)

streaming = False
start_time = time.time()
while time.time() - start_time < 2.0:
    s.write(b"S\n")
    time.sleep(0.1)
    # read all available lines
    while s.in_waiting:
        line = s.readline().decode('utf-8', 'ignore').strip()
        if line.startswith("DATA"):
            streaming = True
            break
    if streaming:
        break
        
if not streaming:
    print("Could not start stream!")
    exit(1)

print("Starting motors at 5 rad/s...")
s.write(b"L5\n")
s.write(b"R5\n")

print("Collecting data for 3 seconds...")
data = []
start_time = time.time()
while time.time() - start_time < 3.0:
    line = s.readline().decode('utf-8', 'ignore').strip()
    if line.startswith("DATA,"):
        parts = line.split(',')
        if len(parts) == 7:
            try:
                t = int(parts[1])
                vl = float(parts[2])
                vr = float(parts[3])
                ax = float(parts[4])
                ay = float(parts[5])
                az = float(parts[6])
                data.append((t, vl, vr, ax, ay, az))
            except:
                pass

print("Stopping motors...")
s.write(b"L0\n")
s.write(b"R0\n")
s.write(b"S\n") # toggle stream off

# Analyze
if len(data) < 2:
    print("Not enough data collected!")
    exit(1)

vls = [d[1] for d in data]
vrs = [d[2] for d in data]
axs = [d[3] for d in data]
ays = [d[4] for d in data]
azs = [d[5] for d in data]

print("\n=== VIBRATION & VELOCITY ANALYSIS ===")
print(f"Samples collected: {len(data)} (approx {len(data)/3.0:.1f} Hz)")
print(f"Left Motor Vel : avg={statistics.mean(vls):.3f} rad/s, stddev={statistics.stdev(vls):.3f}")
print(f"Right Motor Vel: avg={statistics.mean(vrs):.3f} rad/s, stddev={statistics.stdev(vrs):.3f}")

# Overall G magnitude
g_mags = [math.sqrt(x*x + y*y + z*z) for x, y, z in zip(axs, ays, azs)]
g_mean = statistics.mean(g_mags)
g_std = statistics.stdev(g_mags)

print(f"\nVibration (MPU6050):")
print(f"  Accel Magnitude Avg: {g_mean:.3f} g (Gravity)")
print(f"  Accel Magnitude StdDev: {g_std:.3f} g (Vibration/Jitter)")

print("\n--- RESULTS ---")
if g_std < 0.1:
    print("CONCLUSION: VERY SMOOTH. Minimal vibration detected.")
elif g_std < 0.3:
    print("CONCLUSION: MODERATE VIBRATION. Some jitter present.")
else:
    print("CONCLUSION: HIGH VIBRATION. Motors are jittering significantly.")

if statistics.stdev(vls) > 1.0 or statistics.stdev(vrs) > 1.0:
    print("WARNING: High velocity variance! FOC loop might be failing to track target speed smoothly.")
else:
    print("Velocity tracking is extremely stable.")
