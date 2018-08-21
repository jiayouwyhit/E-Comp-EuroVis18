/**
 * Created by wangyong on 26/3/2017.
 */

var drawAugmentedWordCloud = function () {
    // //yanhong
    // var colorScale = d3.scale.linear()
    //     .domain([-1.0, -0.8, -0.6, -0.1, 0, 0.1, 0.6, 0.8, 1.0])
    //     .range(['#a50026', '#d73027', '#f46d43', '#fdae61', '#555555', '#abd9e9', '#74add1', '#4575b4', '#313695']);

    // try two
    var colorScale = d3.scale.linear()
        .domain([-1.0, -0.8, -0.6, -0.1, 0, 0.1, 0.6, 0.8, 1.0])
        .range(['#a50026', '#d73027', '#f46d43', '#fdae61', '#797979', '#abd9e9', '#74add1', '#4575b4', '#313695']);

    // //try 1
    // var colorScale = d3.scale.linear()
    //     .domain([-1.0, -0.8, -0.6, -0.1, 0, 0.1, 0.6, 0.8, 1.0])
    //     .range(['#d73027', '#f46d43', '#fdae61', '#fee090', '#d9d9d9', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4'])

    var adj_num = 4;

    var drawWordCloud = function (svg, w, h, data) {
        var dataList = data;
        // dataList.push(data.food);
        // dataList.push(data.price);
        // dataList.push(data.place);
        // dataList.push(data.service);
        var fill = d3.scale.category20();
        var fontRatio = 15;
        var width = w * 1;
        var height = h * 1;
        var xRatio = 2.3;
        var yRatio = 1.45;
        var childrenLayoutWidth = xRatio * 300;
        var childrenLayoutHeight = yRatio * 300;
        var words = dataList.map(function (d) {
            return {text: "mm " + d.noun, size: d.count, children: d.objects};
        });

        var layout = d3.layout.cloud()
            .size([width, height])
            // .spiral('rectangular')
            .words(words)
            .padding(0)
            // .rotate(function() { return ~~(Math.random() * 2) * 90; })
            .rotate(function () {
                return 0;
            })
            .font("Impact")
            // .font("Serif")
            // .fontSize(function(d) { return Math.log(d.size) * 30; })
            .fontSize(function (d) {
                return Math.sqrt(d.size) * fontRatio;
            })
            .on("end", function () {
                // var scaleStr = 'scale(0.5, 0.5)';
                var translateX = 0; //(i % 2) * width / 2;
                var translateY = 0; //(Math.floor(i / 2)) * height / 2;
                var group = svg.append('g')
                    .attr('transform', function () {
                        return 'translate(' + translateX + ', ' + translateY + ')' // + scaleStr;
                    });
                return draw(words, group);
            });

        layout.start();


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
                children = children.slice(0, Math.min(adj_num, children.length));
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
                var total_len = obj.children.length;

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
                        var ch_len = obj.children.length;

                        if (ch_len >= 2) {
                            var fontScale = d3.scale.linear()
                                .domain([1, adj_num])
                                .range([200, 80]);
                            return fontScale(ch_len) + 'px';
                        }
                        else {
                            return '300px';
                        }

                    })
                    .style('fill', function (dd) {
                        return colorScale(dd.polarity);
                    })
                    .attr('x', function (dd) {
                        return obj.layoutWidth / 5 * 4;
                    })
                    .attr('y', function (dd, i) {
                        var len = obj.children.length;
                        if (len >= 2) {
                            return obj.layoutHeight * 1.0 / (len + 1) * (i + 1);
                        }
                        else {
                            return obj.layoutHeight * 0.7;
                        }
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
                        return obj.layoutHeight * 0.05;
                    })
                    .attr('y2', function (dd) {
                        var ch_len = obj.children.length;
                        if (ch_len >= 1) {
                            // return obj.layoutHeight / obj.children.length * (obj.children.length - 1);
                            return obj.layoutHeight * 0.75;// / obj.children.length * (obj.children.length - 1);
                        }

                    })
                    .style('stroke', '#555555')
                    .style('stroke-width', '10px');
            }

        }
    };

    return drawWordCloud;
};