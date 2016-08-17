 define(['jquery', 'underscore', 'knockout-mapping', 'views/forms/base', 'views/forms/sections/branch-list'], function ($, _, koMapping, BaseForm, BranchList) {
    return BaseForm.extend({
        initialize: function() {
            BaseForm.prototype.initialize.apply(this);
                           
            var date_picker = $('.datetimepicker').datetimepicker({pickTime: false});
            date_picker.on('dp.change', function(evt){
                $(this).find('input').trigger('change');
            });
                           
            this.addBranchList(new BranchList({
                el: this.$el.find('#threat-state-section')[0],
                data: this.data,
                dataKey: 'THREAT_STATE.E3',
                validateBranch: function (nodes) {
                    return true;
                    return this.validateHasValues(nodes);
                }
            }));
                           
            this.addBranchList(new BranchList({
                el: this.$el.find('#disturbance-state-section')[0],
                data: this.data,
                dataKey: 'DISTURBANCE_STATE.E3',
                validateBranch: function (nodes) {
                    return true;                        
                    return this.validateHasValues(nodes);
                }
            }));
                           
                           
            this.addBranchList(new BranchList({
                el: this.$el.find('#condition-type-section')[0],
                data: this.data,
                dataKey: 'CONDITION_TYPE.E55',
                validateBranch: function (nodes) {
                    return true;                        
                    return this.validateHasValues(nodes);
                }
            }));
                           
            this.addBranchList(new BranchList({
                el: this.$el.find('#disturbance-extent-section')[0],
                data: this.data,
                dataKey: 'DISTURBANCE_EXTENT_TYPE.E55',
                validateBranch: function (nodes) {
                    return true;
                    return this.validateHasValues(nodes);
                }
            }));
        }
    });
});

