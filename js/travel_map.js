document.addEventListener("DOMContentLoaded", () => {
    const worldMapContainer = d3.select("#world-map");
    const backToWorldButton = document.getElementById("back-to-world");
  
    const width = worldMapContainer.node().clientWidth;
    const height = 500;

    // 创建一个统一的 zoom 行为
    const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);
  
    const svg = worldMapContainer.append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .append("g");


    // 缩放按钮
    document.getElementById("zoom-in").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 1.2); // 放大 1.2 倍
    });

    document.getElementById("zoom-out").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 0.8); // 缩小 0.8 倍
    });
  
    // 统一的缩放函数
    function zoomed(event) {
        svg.attr("transform", event.transform);
    }

    // 统一的缩放动画函数
    function smoothZoom(transform, duration = 750) {
        svg.transition()
            .duration(duration)
            .call(zoom.transform, transform);
    }

    const projection = d3.geoMercator()
      .scale(120)
      .translate([width / 2, height / 1.5]);
  
    const path = d3.geoPath()
    .projection(projection)
    .pointRadius(0.1); 
  
    // 加载数字 ID 到字母代码的映射
    let idToCountryCode = {};
    fetch('../data/id-to-country-code.json')
      .then(response => response.json())
      .then(data => {
        idToCountryCode = data;
  
        // 加载世界地图数据（TopoJSON 格式）
        d3.json("../data/world-map.json").then(world => {
          const countries = topojson.feature(world, world.objects.countries);
  
          svg.selectAll(".country")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "country")
            .attr("fill", "#ccc")
            .on("mouseover", function () {
              d3.select(this).attr("fill", "#90caf9");
            })
            .on("mouseout", function () {
              d3.select(this).attr("fill", "#ccc");
            })
            .on("click", function (event, d) {
              const countryId = d.id; // 获取国家的数字 ID
              const countryCode = idToCountryCode[countryId]; // 获取对应的字母代码
              const countryName = d.properties.name;
              if (countryCode) {
                // 获取当前国家的边界框
                const bounds = path.bounds(d);
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];
                const x = (bounds[0][0] + bounds[1][0]) / 2;
                const y = (bounds[0][1] + bounds[1][1]) / 2;
                const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
                const translate = [width / 2 - scale * x, height / 2 - scale * y];

                // 应用平滑过渡动画
                svg.transition()
                  .duration(750)
                  .call(
                    zoom.transform,
                    d3.zoomIdentity
                      .translate(translate[0], translate[1])
                      .scale(scale)
                  )
                  .on("end", () => loadCountryMap(countryCode, countryName));
              } else {
                console.log(`找不到国家代码: ${countryId}`);
              }
            });
        });
      })
      .catch(error => {
        console.error('Error loading ID to country code map:', error);
      });
  
    // Zoom 功能
    function zoomed(event) {
      svg.attr("transform", event.transform);
    }
  
    // 加载指定国家的区域（划分）数据
    function loadCountryMap(countryCode, countryName) {
      // 清除世界地图
      svg.selectAll("*").remove();
  
      // 显示加载指示
      const loadingText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text(`Loading ${countryName}...`);
  
      // 加载该国家的区域数据
      fetch(`../data/countries/${countryCode}.json`)  // 根据 ISO 3166-1 alpha-3 代码加载对应的文件
        .then(response => response.json())
        .then(countryBoundaryData => {
          loadingText.remove(); // 移除加载指示
  
          // 绘制国家边界
            svg.selectAll(".boundary")
            .data(countryBoundaryData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "boundary")
            .attr("fill", "#ccc")
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .on("mouseover", function () {
                d3.select(this).attr("fill", "#90caf9");
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", "#ccc");
            })
            .on("click", function(event, d) {
                // 构建或获取该区域的URL
                const regionName = d.properties.NAME_1;
                const regionUrl = `../travel_notes/${countryCode}_${regionName.toLowerCase()}.html`;
                // 在新窗口打开链接
                window.location.href = regionUrl;
            });

            // 添加区域名称标签
            svg.selectAll(".region-label")
            .data(countryBoundaryData.features)
            .enter()
            .append("text")
            .attr("class", "region-label")
            .attr("x", function(d) {
              return path.centroid(d)[0];
            })
            .attr("y", function(d) {
              return path.centroid(d)[1];
            })
            .attr("text-anchor", "middle")
            .attr("font-size", "1px")
            .attr("font-family", "Lato")
            .attr("font-weight", "bold")   
            .attr("fill", "#333")
            .text(function(d) {
              // 使用 NAME_1 属性作为标签文本
              return d.properties.NAME_1 || "";
            })
            .style("pointer-events", "none");
        })
        .catch(error => {
          console.error("Error loading country boundaries:", error);
          loadingText.text(`Failed to load ${countryName} boundaries`);
        });
  
      // 显示返回按钮
      backToWorldButton.style.display = "block";
    }
  
    // 返回世界地图功能
    backToWorldButton.addEventListener("click", () => {
      // 平滑过渡回世界地图视图
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity
        )
        .on("end", () => {
          svg.selectAll("*").remove();
          backToWorldButton.style.display = "none";
          
          // 重置投影
          projection
            .scale(120)
            .translate([width / 2, height / 1.5]);
          
          // 重新加载世界地图
          d3.json("../data/world-map.json").then(world => {
            const countries = topojson.feature(world, world.objects.countries);
            
            svg.selectAll(".country")
              .data(countries.features)
              .enter()
              .append("path")
              .attr("d", path)
              .attr("class", "country")
              .attr("fill", "#ccc")
              .attr("stroke", "#fff")
              .attr("stroke-width", 0.5)
              .on("mouseover", function () {
                d3.select(this).attr("fill", "#90caf9");
              })
              .on("mouseout", function () {
                d3.select(this).attr("fill", "#ccc");
              })
              .on("click", function (event, d) {
                const countryId = d.id;
                const countryCode = idToCountryCode[countryId];
                const countryName = d.properties.name;
                if (countryCode) {
                  loadCountryMap(countryCode, countryName);
                }
              });
          });
      });
    });
  });
  