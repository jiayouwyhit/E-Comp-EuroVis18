/**
 * Created by wangyong on 23/3/2017.
 */

var detailedReviewContentView = new Vue({
    el: '#detailedReviewContentView',
    delimiters: ["{{", "}}"],
    data: {
        curent_review_content: '',

    },
    methods: {

    },
    created: function () {

    },
    mounted: function () {
        var _this = this;

        pipService.onLoadDetailedReviewContent(function (one_review_content) {
            console.log('one review content:', one_review_content);
            _this.curent_review_content = one_review_content;
        });

        pipService.onRemoveCommonCustomerCompView(function (cur_review_content) {
            _this.curent_review_content = '';
        });
    }
});