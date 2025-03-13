document.addEventListener("DOMContentLoaded", () => {
    const worldMapContainer = d3.select("#world-map");
    const backToWorldButton = document.getElementById("back-to-world");

    const width = worldMapContainer.node().clientWidth;
    const height = 800;

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

    function showRegionLabel(regionName) {
        fixedRegionLabel.textContent = `Region: ${regionName}`;
        fixedRegionLabel.classList.remove("d-none");
    }

    function hideRegionLabel() {
        fixedRegionLabel.classList.add("d-none");
    }

    // 加载世界地图的函数
    function loadWorldMap() {
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
                .on("mouseover", function (event, d) {
                    d3.select(this).attr("fill", "#90caf9");

                    const regionName = d.properties.name; 
                    showRegionLabel(regionName);
                })
                .on("mouseout", function () {
                    d3.select(this).attr("fill", "#ccc");

                    hideRegionLabel()
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
        });
    }

    // 加载数字 ID 到字母代码的映射
    let idToCountryCode = {};
    fetch('../data/id-to-country-code.json')
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
                    .attr("class", "boundary")
                    .attr("fill", "#ccc")
                    .attr("stroke", "black")
                    .attr("stroke-width", 0.1)
                    .on("mouseover", function (event, d) {
                        // 鼠标悬停时改变颜色
                        d3.select(this).attr("fill", "#90caf9");
                
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
                            .text(d.properties.NAME_1 || "");
                        
                            const regionName = d.properties.NAME_1; 
                            showRegionLabel(regionName);
                    })
                    .on("mouseout", function () {
                        d3.select(this).attr("fill", "#ccc");

                        // 移除 region-label
                        svg.selectAll(".region-label").remove();

                        // 隐藏固定位置的 label
                        hideRegionLabel()
                    })
                    .on("click", function (event, d) {
                        const regionName = d.properties.NAME_1;
                        const regionUrl = `../travel_notes/${countryCode}_${regionName.toLowerCase()}.html`;
                        window.location.href = regionUrl;
                    });

                    // // 创建标签分层显示系统
                    // svg.selectAll(".region-label")
                    //     .data(countryBoundaryData.features)
                    //     .enter()
                    //     .append("text")
                    //     .attr("class", "region-label")
                    //     .attr("data-id", d => d.properties.ID_1)
                    //     .attr("x", d => path.centroid(d)[0])
                    //     .attr("y", d => path.centroid(d)[1])
                    //     .attr("text-anchor", "middle")
                    //     .attr("font-family", "Lato")
                    //     .attr("font-weight", "bold")
                    //     .attr("fill", "#333")
                    //     .attr("opacity", function(d) {
                    //         const fontSize = calculateFontSize(d);
                    //         // // 太小的标签设置为透明
                    //         // return fontSize < 0.8 ? 0 : 1;
                    //     })
                    //     .style("font-size", d => `${calculateFontSize(d)}px`)
                    //     .text(d => d.properties.NAME_1 || "")
                    //     .each(function(d) {
                    //         const label = d3.select(this);
                    //         const fontSize = calculateFontSize(d);
                            
                    //         // 如果文本长度超过区域宽度，尝试换行或缩短
                    //         const bbox = this.getBBox();
                    //         const regionBounds = path.bounds(d);
                    //         const regionWidth = regionBounds[1][0] - regionBounds[0][0];
                            
                    //         if (bbox.width > regionWidth * 0.8) {  // 如果文本宽度超过区域宽度的80%
                    //             const text = d.properties.NAME_1;
                    //             if (text.includes(" ")) {
                    //                 // 如果有空格，尝试换行
                    //                 const words = text.split(" ");
                    //                 const middle = Math.floor(words.length / 2);
                    //                 label.text("")  // 清除原有文本
                    //                     .append("tspan")
                    //                     .attr("x", path.centroid(d)[0])
                    //                     .attr("dy", `-${fontSize/2}px`)
                    //                     .text(words.slice(0, middle).join(" "));
                    //                 label.append("tspan")
                    //                     .attr("x", path.centroid(d)[0])
                    //                     .attr("dy", `${fontSize}px`)
                    //                     .text(words.slice(middle).join(" "));
                    //             } else if (text.length > 6) {
                    //                 // 如果文本太长，截断并添加省略号
                    //                 label.text(text.slice(0, 4) + "..");
                    //             }
                    //         }
                    //     })
                    //     .style("pointer-events", "none");

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