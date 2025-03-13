document.addEventListener("DOMContentLoaded", () => {
    const worldMapContainer = d3.select("#world-map");
    const backToWorldButton = document.getElementById("back-to-world");

    const width = worldMapContainer.node().clientWidth;
    const height = 800;
    
    // 已访问区域的缓存
    let visitedRegions = new Set();

    // 加载已访问的区域列表
    function loadVisitedRegions() {
        return fetch('../data/visited_regions.json')
            .then(response => response.json())
            .then(data => {
                visitedRegions = new Set(data);
                console.log("Loaded visited regions:", Array.from(visitedRegions));
                return visitedRegions;
            })
            .catch(error => {
                console.error('Error loading visited regions:', error);
                return new Set(); // 返回空集合
            });
    }

    // 创建一个统一的 zoom 行为
    const zoom = d3.zoom()
        .scaleExtent([1, 40])
        .on("zoom", zoomed);

    // 创建基础 SVG 元素，并保持其引用不变
    const basesvg = worldMapContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    // 创建并保持对 g 元素的引用
    const svg = basesvg.append("g");

    // 缩放按钮
    document.getElementById("zoom-in").addEventListener("click", () => {
        basesvg.transition().call(zoom.scaleBy, 1.2);
    });

    document.getElementById("zoom-out").addEventListener("click", () => {
        basesvg.transition().call(zoom.scaleBy, 0.8);
    });

    // 统一的缩放函数
    function zoomed(event) {
        svg.attr("transform", event.transform);
    }

    const projection = d3.geoMercator()
        .scale(120)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath()
        .projection(projection)
        .pointRadius(0.1);

    const fixedRegionLabel = document.getElementById("fixedRegionLabel");

    function showRegionLabel(regionName, isVisited) {
        let labelText = `Region: ${regionName}`;
        if (isVisited) {
            labelText += " (✓ Visited)";
        }
        fixedRegionLabel.textContent = labelText;
        fixedRegionLabel.classList.remove("d-none");
        
        // 如果是已访问区域，可以添加一个特殊的样式
        if (isVisited) {
            fixedRegionLabel.classList.add("visited-label");
        } else {
            fixedRegionLabel.classList.remove("visited-label");
        }
    }

    function hideRegionLabel() {
        fixedRegionLabel.classList.add("d-none");
        fixedRegionLabel.classList.remove("visited-label");
    }

    // 颜色配置
    const COLORS = {
        DEFAULT: "#ccc",
        HOVER: "#90caf9",
        VISITED: "#7cb342",  // 绿色表示已访问
        VISITED_HOVER: "#aed581"  // 较浅的绿色表示已访问且鼠标悬停
    };

    // 获取已访问的国家列表
    function getVisitedCountries() {
        const visitedCountries = new Set();
        visitedRegions.forEach(regionKey => {
            // 假设格式为 "XXX" 或 "XXX_region"
            const parts = regionKey.split('_');
            const countryCode = parts[0];
            if (countryCode) {
                visitedCountries.add(countryCode);
            }
        });
        return visitedCountries;
    }

    // 检查国家是否已访问（世界地图级别）
    function isCountryVisited(countryCode) {
        if (!countryCode) return false;
        
        // 1. 检查是否直接有国家级的旅行笔记
        if (visitedRegions.has(countryCode)) return true;
        
        // 2. 检查是否有任何以该国家代码开头的区域
        for (const regionKey of visitedRegions) {
            if (regionKey.startsWith(countryCode + "_")) {
                return true;
            }
        }
        
        return false;
    }

    // 检查具体区域是否已访问
    function isRegionVisited(countryCode, regionName) {
        return visitedRegions.has(`${countryCode}_${regionName.toLowerCase()}`);
    }

    // 添加图例
    function addLegend() {
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(20, 20)");
            
        // 添加白色背景以提高可读性
        legend.append("rect")
            .attr("width", 120)
            .attr("height", 65)
            .attr("fill", "white")
            .attr("opacity", 0.7)
            .attr("rx", 5);
            
        // 已访问区域图例
        // legend.append("rect")
        //     .attr("x", 10)
        //     .attr("y", 10)
        //     .attr("width", 20)
        //     .attr("height", 20)
        //     .attr("fill", COLORS.VISITED);
            
        // legend.append("text")
        //     .attr("x", 40)
        //     .attr("y", 25)
        //     .text("已访问地区")
        //     .attr("font-family", "Lato")
        //     .attr("font-size", "12px");
            
        // 未访问区域图例
        // legend.append("rect")
        //     .attr("x", 10)
        //     .attr("y", 35)
        //     .attr("width", 20)
        //     .attr("height", 20)
        //     .attr("fill", COLORS.DEFAULT);
            
        // legend.append("text")
        //     .attr("x", 40)
        //     .attr("y", 50)
        //     .text("未访问地区")
        //     .attr("font-family", "Lato")
        //     .attr("font-size", "12px");
    }

    // 加载世界地图的函数
    function loadWorldMap() {
        d3.json("../data/world-map.json").then(world => {
            const countries = topojson.feature(world, world.objects.countries);
            
            // 获取已访问的国家列表
            const visitedCountries = getVisitedCountries();
            console.log("Visited countries:", Array.from(visitedCountries));

            svg.selectAll(".country")
                .data(countries.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class", function(d) {
                    const countryId = d.id;
                    const countryCode = idToCountryCode[countryId];
                    return isCountryVisited(countryCode) ? "country visited" : "country";
                })
                .attr("fill", function(d) {
                    const countryId = d.id;
                    const countryCode = idToCountryCode[countryId];
                    console.log("isCountryVisited", countryCode, isCountryVisited(countryCode));
                    return isCountryVisited(countryCode) ? COLORS.VISITED : COLORS.DEFAULT;
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)
                .on("mouseover", function (event, d) {
                    const countryId = d.id;
                    const countryCode = idToCountryCode[countryId];
                    const visited = isCountryVisited(countryCode);
                    
                    d3.select(this).attr("fill", visited ? COLORS.VISITED_HOVER : COLORS.HOVER);

                    const regionName = d.properties.name; 
                    showRegionLabel(regionName, visited);
                })
                .on("mouseout", function (event, d) {
                    const countryId = d.id;
                    const countryCode = idToCountryCode[countryId];
                    const visited = isCountryVisited(countryCode);
                    
                    d3.select(this).attr("fill", visited ? COLORS.VISITED : COLORS.DEFAULT);
                    hideRegionLabel();
                })
                .on("click", function (event, d) {
                    const countryId = d.id;
                    const countryCode = idToCountryCode[countryId];
                    const countryName = d.properties.name;
                    if (countryCode) {
                        const bounds = path.bounds(d);
                        const dx = bounds[1][0] - bounds[0][0];
                        const dy = bounds[1][1] - bounds[0][1];
                        const x = (bounds[0][0] + bounds[1][0]) / 2;
                        const y = (bounds[0][1] + bounds[1][1]) / 2;
                        const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
                        const translate = [width / 2 - scale * x, height / 2 - scale * y];

                        basesvg.transition()
                            .duration(750)
                            .call(
                                zoom.transform,
                                d3.zoomIdentity
                                    .translate(translate[0], translate[1])
                                    .scale(scale)
                            )
                            .on("end", () => loadCountryMap(countryCode, countryName));
                    }
                });
                
            // 添加图例
            addLegend();
        });
    }

    // 加载数字 ID 到字母代码的映射
    let idToCountryCode = {};
    
    // 主函数 - 加载数据并初始化地图
    loadVisitedRegions()
        .then(() => {
            return fetch('../data/id-to-country-code.json');
        })
        .then(response => response.json())
        .then(data => {
            idToCountryCode = data;
            loadWorldMap(); // 初始加载世界地图
        })
        .catch(error => {
            console.error('Error loading ID to country code map:', error);
        });

    // 计算区域面积并返回适当的字体大小
    function calculateFontSize(feature) {
        // 计算区域的面积
        const area = path.area(feature);
        
        // 将面积映射到字体大小范围（2px 到 14px）
        // 使用对数比例，因为面积差异可能很大
        const fontSize = Math.max(0.5, Math.min(1.5, Math.log(area) * 0.8));
        
        return fontSize;
    }

    function loadCountryMap(countryCode, countryName) {
        svg.selectAll("*").remove();

        const loadingText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .text(`Loading ${countryName}...`);

        fetch(`../data/countries/${countryCode}.json`)
            .then(response => response.json())
            .then(countryBoundaryData => {
                loadingText.remove();

                svg.selectAll(".boundary")
                    .data(countryBoundaryData.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("class", function(d) {
                        const regionName = d.properties.NAME_1;
                        return isRegionVisited(countryCode, regionName) ? "boundary visited" : "boundary";
                    })
                    .attr("fill", function(d) {
                        const regionName = d.properties.NAME_1;
                        return isRegionVisited(countryCode, regionName) ? COLORS.VISITED : COLORS.DEFAULT;
                    })
                    .attr("stroke", "black")
                    .attr("stroke-width", 0.1)
                    .on("mouseover", function (event, d) {
                        const regionName = d.properties.NAME_1;
                        const visited = isRegionVisited(countryCode, regionName);
                        
                        // 鼠标悬停时改变颜色
                        d3.select(this).attr("fill", visited ? COLORS.VISITED_HOVER : COLORS.HOVER);
                
                        // 动态显示 region-label
                        svg.append("text")
                            .attr("class", "region-label")
                            .attr("x", path.centroid(d)[0])
                            .attr("y", path.centroid(d)[1])
                            .attr("text-anchor", "middle")
                            .attr("font-family", "Lato")
                            .attr("font-weight", "bold")
                            .attr("fill", "#333")
                            .style("font-size", `${calculateFontSize(d)}px`)
                            .text(regionName || "");
                        
                        showRegionLabel(regionName, visited);
                    })
                    .on("mouseout", function (event, d) {
                        const regionName = d.properties.NAME_1;
                        const visited = isRegionVisited(countryCode, regionName);
                        
                        d3.select(this).attr("fill", visited ? COLORS.VISITED : COLORS.DEFAULT);

                        // 移除 region-label
                        svg.selectAll(".region-label").remove();

                        // 隐藏固定位置的 label
                        hideRegionLabel();
                    })
                    .on("click", function (event, d) {
                        const regionName = d.properties.NAME_1;
                        const regionKey = `${countryCode}_${regionName.toLowerCase()}`;
                        const regionUrl = `../travel_notes/${regionKey}.html`;
                        
                        if (visitedRegions.has(regionKey)) {
                            // 如果已访问，导航到旅行笔记
                            window.location.href = regionUrl;
                        } else {
                            // 如果未访问，显示提示
                            alert(`你还没有去过${regionName}或没有为此地区创建旅行笔记。`);
                        }
                    });
                    
                // 添加国家地图的图例
                addLegend();
            })
            .catch(error => {
                console.error("Error loading country boundaries:", error);
                loadingText.text(`Failed to load ${countryName} boundaries`);
            });

        backToWorldButton.style.display = "block";
    }

    backToWorldButton.addEventListener("click", () => {
        basesvg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity)
            .on("end", () => {
                svg.selectAll("*").remove();
                backToWorldButton.style.display = "none";

                projection
                    .scale(120)
                    .translate([width / 2, height / 1.5]);

                loadWorldMap();
            });
    });
});