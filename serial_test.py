import serial, time

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

print("Waiting for boot...")
ready = False
start_time = time.time()
while time.time() - start_time < 10:
    line = s.readline().decode('utf-8', 'ignore').strip()
    if line:
        print("ESP32:", line)
        if "System Ready" in line:
            ready = True
            break

if not ready:
    print("Did not see System Ready, but proceeding anyway...")

print("\n--> Sending 'L5' (Left Motor 5 rad/s)")
s.write(b"L5\n")
time.sleep(0.5)
while s.in_waiting:
    print("ESP32:", s.readline().decode('utf-8', 'ignore').strip())

print("\n--> Sending 'R5' (Right Motor 5 rad/s)")
s.write(b"R5\n")
time.sleep(3.0)
while s.in_waiting:
    print("ESP32:", s.readline().decode('utf-8', 'ignore').strip())

print("\n--> Stopping motors ('L0' and 'R0')")
s.write(b"L0\n")
s.write(b"R0\n")
time.sleep(0.5)
while s.in_waiting:
    print("ESP32:", s.readline().decode('utf-8', 'ignore').strip())
