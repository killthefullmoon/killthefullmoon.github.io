import json
from collections import defaultdict

# 读取文件
input_file = "cities15000.txt"
output_dir = "./data"

# 按国家分组城市
cities_by_country = defaultdict(list)
with open(input_file, "r", encoding="utf-8") as file:
    for line in file:
        parts = line.strip().split("\t")
        country_code = parts[8]  # 国家代码
        city = {
            "name": parts[1],      # 城市名称
            "lat": float(parts[4]), # 纬度
            "lon": float(parts[5]), # 经度
            "population": int(parts[14]) if parts[14] else 0
        }
        cities_by_country[country_code].append(city)

# 保存为 JSON 文件
for country_code, cities in cities_by_country.items():
    output_file = f"{output_dir}/cities-{country_code.lower()}.json"
    with open(output_file, "w", encoding="utf-8") as json_file:
        json.dump(cities, json_file, ensure_ascii=False, indent=4)

print("城市数据已按国家生成完成！")
