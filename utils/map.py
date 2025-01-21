import json

# 读取 countryInfo.txt 文件
input_file = "countryInfo.txt"
output_file = "id-to-country-code.json"

id_to_code = {}
with open(input_file, "r", encoding="utf-8") as file:
    for line in file:
        if line.strip():
            parts = line.strip().split("\t")
            country_id = parts[2]
            country_code = parts[1]
            id_to_code[country_id] = country_code

# 保存为 JSON 文件
with open(output_file, "w", encoding="utf-8") as json_file:
    json.dump(id_to_code, json_file, ensure_ascii=False, indent=4)

print(f"ID 到国家代码的映射已保存到 {output_file}")
