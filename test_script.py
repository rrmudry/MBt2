import json

sch_doc = {
  "editorVersion": "6.5.42",
  "docType": "5",
  "title": "MBt2_Self_Balancing_Carrier_Board",
  "description": "ESP32 DevKit V1 + Dual SimpleFOC Mini + MPU6050 + AS5600 Carrier PCB",
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
        "shape": []
      }
    }
  ]
}

with open("test_sch.json", "w") as f:
    json.dump(sch_doc, f, indent=2)

print("Created test_sch.json successfully")
