(function () {
    d3.json('temp.json', function (data) {
        var svg_size = 400;
        var svg = d3.select('body')
            .append('svg')
            .attr("width", svg_size)
            .attr("height", svg_size);
        var dataA = data[data['business_es'][0]];
        var dataB = data[data['business_es'][1]];
        drawWordCloud(svg, svg_size, svg_size, dataA);
    });
    function drawWordCloud(svg, w, h, data) {
        var dataList = [];
        // dataList.push(data.food);
        // dataList.push(data.price);
        dataList.push(data.place);
        // dataList.push(data.service);
        var fill = d3.scale.category20();
        var fontRatio = 15;
        var width = w * 0.8;
        var height = h * 1;
        var xRatio = 2.3;
        var yRatio = 1.45;
        var childrenLayoutWidth = xRatio * 300;
        var childrenLayoutHeight = yRatio * 300;
        for (var i = 0; i < dataList.length; i++) {
            var words = dataList[i].map(function (d) {
                return {text: "mm " + d.noun, size: d.count, children: d.objects};
            });
            var layout = d3.layout.cloud()
                .size([width, height])
                // .spiral('rectangular')
                .words(words)
                .padding(0)
                // .rotate(function() { return ~~(Math.random() * 2) * 90; })
                .rotate(function () {
                    return 0
                })
                .font("Impact")
                // .font("Serif")
                // .fontSize(function(d) { return Math.log(d.size) * 30; })
                .fontSize(function (d) {
                    return Math.sqrt(d.size) * fontRatio;
                })
                .on("end", function () {
                    // var scaleStr = 'scale(0.5, 0.5)';
                    var translateX = (i % 2) * width / 2;
                    var translateY = (Math.floor(i / 2)) * height / 2;
                    var group = svg.append('g')
                        .attr('transform', function () {
                            return 'translate(' + translateX + ', ' + translateY + ')' // + scaleStr;
                        });
                    return draw(words, group);
                });

            layout.start();
        }

        function draw(words, svg) {
            svg.append('g')
                .attr('transform', function (d) { //put the current group of words near the center
                    return 'translate(' + layout.size()[0] / 2 + ', ' + layout.size()[1] / 2 + ')';
                })
                .selectAll("text")
                .data(words)
                .enter()
                .append("text")
                .attr('text-anchor', 'middle')
                .attr('class', function (d) {
                    return 'text-' + d['text'].split(' ')[1];
                })
                .style("font-size", function (d) {
                    return d.size + "px";
                })
                // .style("font-family", "Serif")
                .style("font-family", "Impact")
                .style("fill", function (d, i) {
                    // d.fill = fill(i);
                    // return '#555555'; 
                    var wordChildren = d.children.map(function (dd) {
                        return {
                            'fs': dd.noun_frequency,
                            'polarity': dd.polarity
                        };
                    });
                    var avgPolarity = wordChildren.reduce(function (a, b) {
                        return a + b.polarity * b.fs;
                    }, 0);
                    avgPolarity /= wordChildren.reduce(function (a, b) {
                        return a + b.fs;
                    }, 0);
                    var colorScale = d3.scale.linear()
                        .domain([-1.0, -0.8, -0.6, -0.1, 0, 0.1, 0.6, 0.8, 1.0])
                        .range(['#a50026', '#d73027', '#f46d43', '#fdae61', '#555555', '#abd9e9', '#74add1', '#4575b4', '#313695']);
                    return colorScale(avgPolarity);
                })
                .attr('x', function (d) {
                    return d.x;
                })
                .attr('y', function (d) {
                    return d.y;
                })
                .text(function (d) {
                    return d.text;
                });

            for (var i = 0; i < words.length; i += 1) {
                var word = words[i];
                var color = word.fill;
                var textElement = svg.select('.text-' + word['text'].split(' ')[1]);
                var fontSize = textElement.style('font-size');
                fontSize = +fontSize.split('px')[0];
                var bbox = textElement.node().getBBox();
                var childrenWidth = fontSize / yRatio * xRatio;
                var childrenHeight = fontSize / yRatio;
                var translateX = layout.size()[0] / 2 + word.x - bbox.width / 2;
                var translateY = layout.size()[1] / 2 + word.y - fontSize / yRatio;
                svg.append('rect')
                    .attr('width', function () {
                        return childrenWidth;
                    })
                    .attr('height', function () {
                        return childrenHeight + 1;
                    })
                    .style('fill', function (d) {
                        return 'white';
                    })
                    .attr('transform', function (d) {
                        return "translate(" + [translateX, translateY] + ")";
                    })
                var children = word.children.map(function (d) {
                    return {
                        'text': d.word_pairs.split(' ')[0],
                        'fs': d.noun_frequency,
                        'polarity': d.polarity
                    };
                });
                children = children.slice(0, Math.min(5, children.length));
                var drawObj = {
                    'name': word.text.split(' ')[1],
                    'children': children,
                    'width': childrenWidth,
                    'height': childrenHeight,
                    'layoutHeight': childrenLayoutHeight,
                    'layoutWidth': childrenLayoutWidth,
                    'translateX': translateX,
                    'translateY': translateY,
                    'color': color
                }
                drawChildren2(drawObj);
            }

            function drawChildren2(obj) {
                var colorScale = d3.scale.linear()
                    .domain([-1.0, -0.8, -0.6, -0.1, 0, 0.1, 0.6, 0.8, 1.0])
                    .range(['#a50026', '#d73027', '#f46d43', '#fdae61', '#555555', '#abd9e9', '#74add1', '#4575b4', '#313695']);
                svg.append('g')
                    .attr('class', 'class-' + obj.name)
                    .attr('transform', function (d) {
                        var scaleX = obj.width * 1.0 / childrenLayoutWidth * 1.2;
                        var scaleY = obj.height * 1.0 / childrenLayoutHeight * 1.2;
                        var childrenTranslateX = obj.translateX;
                        var childrenTranslateY = obj.translateY;
                        return 'translate(' + childrenTranslateX + ', ' + childrenTranslateY + ')scale(' + scaleX + ', ' + scaleY + ')';
                    })
                    .selectAll('.textChild')
                    .data(obj.children)
                    .enter()
                    .append('text')
                    .attr('text-anchor', 'end')
                    // .style('font-family', 'Serif')
                    .style('font-family', 'Impact')
                    .style('font-size', function (dd, i) {
                        var fontScale = d3.scale.linear()
                            .domain([1, 5])
                            .range([200, 80]);
                        return fontScale(children.length) + 'px';
                    })
                    .style('fill', function (dd) {
                        return colorScale(dd.polarity);
                    })
                    .attr('x', function (dd) {
                        return obj.layoutWidth / 5 * 4;
                    })
                    .attr('y', function (dd, i) {
                        var len = obj.children.length;
                        return obj.layoutHeight * 1.0 / (len + 1) * (i + 1);
                    })
                    .text(function (dd) {
                        return dd.text;
                    });
                svg.select('.class-' + obj.name)
                    .append('line')
                    .attr('x1', function (dd) {
                        return obj.layoutWidth / 20 * 17;
                    })
                    .attr('x2', function (dd) {
                        return obj.layoutWidth / 20 * 17;
                    })
                    .attr('y1', function (dd) {
                        return 0;
                    })
                    .attr('y2', function (dd) {
                        return obj.layoutHeight / obj.children.length * (obj.children.length - 1);
                    })
                    .style('stroke', '#555555')
                    .style('stroke-width', '10px');
            }

        }
    }
})();
