define(['jquery', 
    'underscore', 
    'knockout-mapping', 
    'views/forms/base', 
    'views/forms/sections/branch-list',
    'bootstrap-datetimepicker',], 
    function ($, _, koMapping, BaseForm, BranchList) {
        return BaseForm.extend({
            initialize: function() {
                BaseForm.prototype.initialize.apply(this);                
                
                var self = this;
                var date_picker = $('.datetimepicker').datetimepicker({pickTime: false});
                date_picker.on('dp.change', function(evt){
                    $(this).find('input').trigger('change'); 
                });
                
                this.addBranchList(new BranchList({
                    el: this.$el.find('#overall-site-condition')[0],
                    data: this.data,
                    dataKey: 'OVERALL_CONDITION_STATE_TYPE.E55',
                    rules: true,
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);
                    }
                }));
                
                this.addBranchList(new BranchList({
                    el: this.$el.find('#damage-overall-extent')[0],
                    data: this.data,
                    dataKey: 'DAMAGE_EXTENT_TYPE.E55',
                    rules: true,
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);
                    }
                }));
                
                this.addBranchList(new BranchList({
                    el: this.$el.find('#disturbances')[0],
                    data: this.data,
                    dataKey: 'DAMAGE_STATE.E3',
                    rules: true,
                    validateBranch: function (nodes) {
                        return true
                        // return this.validateHasValues(nodes);
                    }
                }));
                
                this.addBranchList(new BranchList({
                    el: this.$el.find('#threats')[0],
                    data: this.data,
                    dataKey: 'THREAT_INFERENCE_MAKING.I5',
                    rules: true,
                    validateBranch: function (nodes) {
                        return this.validateHasValues(nodes);
                    }
                }));
                this.listenTo(this,'change', this.dateEdit)
            },
            
            toggleEditActor: function (e) {
                if ($(e.target).hasClass("show-box")) {
                    $(".show-box").addClass('hidden');
                    $(".hide-box").removeClass('hidden');
                    $(".edit-actors-row").removeClass('hidden');
                } else {
                    $(".show-box").removeClass('hidden');
                    $(".hide-box").addClass('hidden');
                    $(".edit-actors-row").addClass('hidden');
                }
            },
            
            dateEdit: function (e, b) {
                _.each(b.nodes(), function (node) {
                    console.log("a", node.entitytypeid(), node.value());
                    if (node.entitytypeid() == 'DISTURBANCE_DATE_FROM.E61' && node.value() && node.value() != '') {
                        $('.div-date').addClass('hidden')
                        $('.div-date-from-to').removeClass('hidden')
                        $('.disturbance-date-value').html('From-To')
                    } else if (node.entitytypeid() == 'DISTURBANCE_DATE_OCCURRED_ON.E61' && node.value() && node.value() != '') {
                        $('.div-date').addClass('hidden')
                        $('.div-date-on').removeClass('hidden')
                        $('.disturbance-date-value').html('On')
                    } else if (node.entitytypeid() == 'DISTURBANCE_DATE_OCCURRED_BEFORE.E61' && node.value() && node.value() != '') {
                        $('.div-date').addClass('hidden')
                        $('.div-date-before').removeClass('hidden')
                        $('.disturbance-date-value').html('Before')
                    }
                })
            },
            
            showDate: function (e) {
                $('.div-date').addClass('hidden')
                $('.disturbance-date-value').html($(e.target).html())
                if ($(e.target).hasClass("disturbance-date-from-to")) {
                    $('.div-date-from-to').removeClass('hidden')
                } else if ($(e.target).hasClass("disturbance-date-on")) {
                    $('.div-date-on').removeClass('hidden')
                } else if ($(e.target).hasClass("disturbance-date-before")) {
                    $('.div-date-before').removeClass('hidden')
                }
            },
            
            events: function(){
                var events = BaseForm.prototype.events.apply(this);
                events['click .edit-actor'] = 'toggleEditActor';
                events['click .disturbance-date-item'] = 'showDate';
                events['click .disturbance-date-edit'] = 'dateEdit';
                return events;
            },

        });
    }
);