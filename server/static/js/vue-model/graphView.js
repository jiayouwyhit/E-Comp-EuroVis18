/**
 * Created by yiding on 2017/1/1.
 */

var graph_view = new Vue({
    el: '#graphView',
    delimiters: ['{{', '}}'],
    data: {
        linkDistance: 10,
        charge: 10,
        gravity: 0.1,
        graphData: null,
        // graphRenderHandler:{} //we should not declare it here!!! Why???
    },

    methods: {
        updateForce: function (msg) {
            this.linkDistance = msg[0]['value'];
            this.charge = msg[1]['value'];
            this.gravity = msg[2]['value'];
            this.graphRenderHandler.setCharge(this.charge);
            this.graphRenderHandler.setGravity(this.gravity);
            this.graphRenderHandler.setLinkDistance(this.linkDistance);
            this.graphRenderHandler.updateForce();
        },
        getGraphData: function (graph) {
            return dataService.getGraphData();
        },
        initDrawNodeLink: function (graph) {
            var container_svg = d3.select(this.$el).select('section').append('svg').attr('width', '100%').attr('height', this.height);
            var graphRenderHandler = new NodeLink(container_svg[0][0], graph, this.$data);
            this.graphRenderHandler = graphRenderHandler;
            graphRenderHandler.run();
        }
    },
    computed: {
        width: function () {
            return d3.select(this.$el).select('section')[0][0].clientWidth;
        },
        height: function () {
            return d3.select(this.$el).select('section')[0][0].clientWidth;
        }
    },

    created: function () {
        var _this = this;

        console.log('created ---graphview');
        pipService.onForceLayoutConfigIsReady(function (msg) {
            console.log('==========onForceLayoutConfigIsReady========');
            _this.linkDistance = msg[0]['value'];
            _this.charge = msg[1]['value'];
            _this.gravity = msg[2]['value'];
        });
    },
    mounted: function () {
        console.log('mounted ---graphview');
        var _this = this;
        pipService.onChangeAttributes(function (msg) {
            // console.log('changed', msg);
            if (_this.graphRenderHandler)
                _this.updateForce(msg);
        });

        pipService.onGraphDataReady(function (graph) {
            _this.graphData = dataService.getGraphData();
            _this.initDrawNodeLink(_this.graphData);
        });

        pipService.onSocialNetworkOfBusinessVenueIsReady(function (social_network) {
            d3.select(_this.$el).select('svg').remove();//remove the whole graph
            _this.graphData = social_network;
            _this.initDrawNodeLink(_this.graphData);
        });

    }
});
