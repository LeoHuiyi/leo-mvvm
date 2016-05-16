/**
 * LeoSortableModel组件
 * Created by Leo on 2016/4/22.
 * dependencies: jquery, jquery-ui-sortable, ko, ko.mapping.
 */

;(function ($, ko, undefined) {
    function LeoSortableModel(params, componentInfo) {
        var defaultOp = {
            sortableOp: {},//jquery.ui.sortable的配置
            koModelOp: {
                //sortableItems: [],//ko.observable,排序item
                //setSortable: '',//ko.observable, 多值传数组进来
            },
            leoSortableOp: {
                //beforeInit: $.noop,
                //sortableStart: $.noop,
                //sortableStop: $.noop,
            }
        }
        this.componentInfo = componentInfo
        this.$el = $(this.componentInfo.element)
        this.options = $.extend(true, {}, defaultOp, params.options)
        this.callbackWrap(this.options.leoSortableOp.beforeInit, this.$el)
        this.model = params.viewModel
        this.init()
    }
    $.extend(LeoSortableModel.prototype, {
        init: function () {
            ko.setTemplateEngine(new ko.nativeTemplateEngine())
            this.sortableInit()
        },
        sortableInit: function () {
            this.$el.sortable(this.setSortableOption())
            this.setKoModelOp()
        },
        setSortableOption: function () {
            var This = this, $el = This.$el, options = This.options, targetIndex,
                leoSortableOp = options.leoSortableOp, koModelOp = options.koModelOp
            return $.extend({
                start: function (event, ui) {
                    targetIndex = ui.item.index()
                    This.callbackWrap(leoSortableOp.sortableStart, event, ui, targetIndex)
                },
                stop: function (event, ui) {
                    var dropIndex = ui.item.index(), data = ko.unwrap(koModelOp.sortableItems) || [],
                        targetItem = data[targetIndex], dropItem = data[dropIndex]
                    This.callbackWrap(leoSortableOp.sortableStop, event, ui, targetItem, dropItem, $el, This.sortableKoItemsWrap(targetIndex, dropIndex, targetItem, dropItem, data))
                    targetItem = null
                    dropItem = null
                    data = null
                }
            }, options.sortableOp)
        },
        setKoModelOp: function () {
            var koModelOp = this.options.koModelOp, $el = this.$el
            if (ko.isObservable(koModelOp.setSortable)) {
                this._setSortableSubscription = koModelOp.setSortable.subscribe(function (newVal) {
                    if (newVal === 'init') {
                        this.sortableInit()
                    } else if (newVal === 'destroy') {
                        this.dispose()
                    } else {
                        !$.isArray(newVal) && (newVal = [newVal])
                        $el.sortable.apply($el, newVal)
                    }
                }, this)
                koModelOp.setSortable.extend({notify: 'always'})
            }
        },
        sortableKoItemsWrap: function (targetIndex, dropIndex, targetItem, dropItem, data) {
            return function () {
                if ((targetItem !== undefined) && (dropItem !== undefined) && (targetIndex !== dropIndex)) {
                    data.splice(targetIndex, 1)
                    data.splice(dropIndex, 0, targetItem)
                    return true
                }
                return false
            }
        },
        callbackWrap: function (fn) {
            if ($.type(fn) === 'function') {
                var arg = $.makeArray(arguments)
                arg.shift()
                fn.apply(this, arg)
            }
        },
        dispose: function () {
            this._setSortableSubscription && this._setSortableSubscription.dispose()
            this.$el.sortable("destroy")
            this.$el = null
        }
    })
    ko.components.register('leo-sortable', {
        viewModel: {
            createViewModel: function (params, componentInfo) {
                return new LeoSortableModel(params, componentInfo);
            }
        },
        synchronous: true,
        template: '<!-- ko template: { nodes: $componentTemplateNodes }--><!-- /ko -->'
    })
})(jQuery, ko)