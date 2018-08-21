/**
 * Created by wangyong on 21/3/2017.
 */

var augmentedWordCloudView = new Vue({
    el: '#wordCloudView',
    delimiters: ["{{", "}}"],
    data: {
        svg_h: 400,
        svg_w: 756,
        // svg_w: 1600,
        // svg_h: 800,
        bs1_review_ids: [], //bs1
        bs2_review_ids: [], //bs2
        bs1_id: undefined,  //bs1_id
        bs2_id: undefined,  //bs2_id
        word_pairs_list: [], //the word pair list of two business venues

        feature_mode: 'food', //food, price, place, service

    },
    methods: {
        mergeReviewIdsOfTwoBusiness: function () {
            var tmp = this.bs1_review_ids.concat(this.bs2_review_ids);
            return tmp;
        },
        drawTwoWordCloudOfTheSameFeatures: function () {
            var _this = this;
            var word_pairs_list = this.word_pairs_list;

            if (word_pairs_list['business_es'].length != 2) { //error in the data!
                this.word_pairs_list = [];
                alert('Word pairs data is not correct!');
                return;
            }
            var flag = (word_pairs_list['business_es'][0] != this.bs1_id && word_pairs_list['business_es'][0] != this.bs2_id) ||
                (word_pairs_list['business_es'][1] != this.bs1_id && word_pairs_list['business_es'][1] != this.bs2_id);
            if (flag) {
                this.word_pairs_list = [];
                alert('Word pairs data is not correct!');
                return;
            }

            var bs_ids = word_pairs_list['business_es'];
            var bs1_word_pairs = word_pairs_list[this.bs1_id],
                bs2_word_pairs = word_pairs_list[this.bs2_id];
            var bs1_word_pairs_one_type = bs1_word_pairs[this.feature_mode],
                bs2_word_pairs_one_type = bs2_word_pairs[this.feature_mode];

            //remove
            d3.select(this.$el).select('svg').select('g.bs1_augmented_word_cloud').remove();
            d3.select(this.$el).select('svg').select('g.bs2_augmented_word_cloud').remove();
            d3.select(this.$el).select('svg').select('g.bs_middle_dividing_line').remove();

            //draw line
            var line_attributes = {
                'x1': this.svg_w / 2,
                'y1': 0,
                'x2': this.svg_w / 2,
                'y2': (this.svg_h - 2)
            };
            d3.select(this.$el).select('svg').append('g')
                .attr('class', 'bs_middle_dividing_line')
                .append('line')
                .attr(line_attributes)
                .style('stroke', '#969696')
                .style('opacity', 0.5)
                .style('stroke-width', 2);

            var bs1_word_cloud = d3.select(this.$el).select('svg')
                .append('g')
                .attr('class', 'bs1_augmented_word_cloud')
                .attr('transform', function () {
                    return 'translate(0,0)';
                });
            var bs2_word_cloud = d3.select(this.$el).select('svg')
                .append('g')
                .attr('class', 'bs2_augmented_word_cloud')
                .attr('transform', function () {
                    return 'translate(' + (_this.svg_w / 2) + ',0)';
                });

            var drawSingleWordCloud = drawAugmentedWordCloud();
            drawSingleWordCloud(bs1_word_cloud, this.svg_w / 2, this.svg_h, bs1_word_pairs_one_type);
            drawSingleWordCloud(bs2_word_cloud, this.svg_w / 2, this.svg_h, bs2_word_pairs_one_type);

        },

    },
    created: function () {

    },
    mounted: function () {
        // var width = d3.select(this.$el).node().parentNode.getBoundingClientRect()['width'];
        var _this = this;
        d3.select(this.$el).append('svg')
            .attr('width', this.svg_w)
            .attr('height', this.svg_h);

        pipService.onUpdateWordCloudViewData(function (review_id_list) {
            console.log('new review ids:', review_id_list);
            _this.bs1_review_ids = review_id_list['bs1_review_ids'];
            _this.bs2_review_ids = review_id_list['bs2_review_ids'];
            _this.bs1_id = review_id_list['business_ids'][0];
            _this.bs2_id = review_id_list['business_ids'][1];

            var all_review_ids = _this.mergeReviewIdsOfTwoBusiness(_this.bs1_review_ids, _this.bs2_review_ids);
            dataService.getGroupedWordPairsFromReviewList(all_review_ids);
        });

        pipService.onGroupedWordPairsAreReady(function (word_pairs_list) {
            console.log('word pairs: ', word_pairs_list);

            _this.word_pairs_list = word_pairs_list;
            _this.drawTwoWordCloudOfTheSameFeatures();
        });

        pipService.onTextFeatureIsChanged(function (new_feature_mode) {
            _this.feature_mode = new_feature_mode;
            _this.drawTwoWordCloudOfTheSameFeatures();
        });

        //remove the whole view when the venue is small
        pipService.onRemoveCommonCustomerCompView(function (cur_venues) {
            console.log('Need to remove augmented word cloud view!');
            //remove
            d3.select(_this.$el).select('svg').select('g.bs1_augmented_word_cloud').remove();
            d3.select(_this.$el).select('svg').select('g.bs2_augmented_word_cloud').remove();
            d3.select(_this.$el).select('svg').select('g.bs_middle_dividing_line').remove();
        });

    }
});
