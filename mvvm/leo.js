/**
 * Created by Leo on 2016/5/13.
 */
;(function (win) {
    var util = (function util(){
        var hasOwnProp = Object.prototype.hasOwnProperty
        return {
            hasOwn: function hasOwn(obj, key) {
                return hasOwnProp.call(obj, key)
            },
            isPlainObject: function isPlainObject(obj) {
                return toString.call(obj) === '[object Object]'
            },
            extend: function extend(to, from) {
                var keys = Object.keys(from)
                var i = keys.length
                while (i--) {
                    to[keys[i]] = from[keys[i]]
                }
                return to
            },
            toArray: function toArray(list, start) {
                start = start || 0
                var i = list.length - start
                var ret = new Array(i)
                while (i--) {
                    ret[i] = list[i + start]
                }
                return ret
            },
            remove: function remove(arr, item){
                if(Array.isArray(arr)){
                    var index = arr.indexOf(item)
                    if(index > -1){
                        arr.splice(index, 1)
                    }
                }
            },
            def: function def(obj, key, val, enumerable) {
                Object.defineProperty(obj, key, {
                    value: val,
                    enumerable: !!enumerable,
                    writable: true,
                    configurable: true
                })
            },
            Set: (function Set(){
                var _Set
                if (typeof Set !== 'undefined' && Set.toString().match(/native code/)) {
                    _Set = Set
                } else {
                    _Set = function () {
                        this.set = Object.create(null)
                    }
                    _Set.prototype.has = function (key) {
                        return this.set[key] !== undefined
                    }
                    _Set.prototype.add = function (key) {
                        this.set[key] = 1
                    }
                    _Set.prototype.clear = function () {
                        this.set = Object.create(null)
                    }
                }
                return function Set() {
                    return _Set
                }
            }()),
            noop: function noop() {}
        }
    }())
    var Dep = (function Dep(util) {
        var uid = 0
        function Dep(name) {
            this.id = uid++
            this.subs = []
            this.name = name
        }
        Dep.prototype.depend = function () {
            Dep.target.addDep(this)
        }
        Dep.prototype.addSub = function (sub) {
            this.subs.push(sub)
        }
        Dep.prototype.removeSub = function (sub) {
            util.remove(this.subs, sub)
        }
        Dep.prototype.notify = function () {
            var subs = util.toArray(this.subs)
            for (var i = 0, l = subs.length; i < l; i++) {
                subs[i].update()
            }
        }
        Dep.target = null
        return Dep
    }(util))
    var Watcher = (function Watcher(util, Dep) {
        var uid = 0
        function Watcher(vm, expOrFn, cb, options) {
            if (options) {
                util.extend(this, options)
            }
            this.vm = vm
            this.cb = cb
            this.id = ++uid
            this.dirty = this.lazy
            this.deps = []
            this.depIds = Object.create(null)
            this.newDeps = []
            this.newDepIds = null
            this.getter = expOrFn
            this.value = this.lazy ? undefined : this.get()
        }
        Watcher.prototype.get = function () {
            this.beforeGet()
            var scope = this.scope || this.vm
            var value = this.getter.call(scope, scope)
            if (this.deep) {
                traverse(value)
            }
            this.afterGet()
            return value
        }
        Watcher.prototype.beforeGet = function () {
            Dep.target = this
            this.newDepIds = Object.create(null)
            this.newDeps.length = 0
        }
        Watcher.prototype.afterGet = function () {
            Dep.target = null
            var i = this.deps.length
            while (i--) {
                var dep = this.deps[i]
                if (!this.newDepIds[dep.id]) {
                    dep.removeSub(this)
                }
            }
            this.depIds = this.newDepIds
            var tmp = this.deps
            this.deps = this.newDeps
            this.newDeps = tmp
        }
        var seenObjects = new util.Set()
        function traverse (val, seen) {
            let i, keys
            if (!seen) {
                seen = seenObjects
                seen.clear()
            }
            const isA = isArray(val)
            const isO = isObject(val)
            if (isA || isO) {
                if (val.__ob__) {
                    var depId = val.__ob__.dep.id
                    if (seen.has(depId)) {
                        return
                    } else {
                        seen.add(depId)
                    }
                }
                if (isA) {
                    i = val.length
                    while (i--) traverse(val[i], seen)
                } else if (isO) {
                    keys = Object.keys(val)
                    i = keys.length
                    while (i--) traverse(val[keys[i]], seen)
                }
            }
        }
        Watcher.prototype.addDep = function (dep) {
            var id = dep.id
            if (!this.newDepIds[id]) {
                this.newDepIds[id] = true
                this.newDeps.push(dep)
                if (!this.depIds[id]) {
                    dep.addSub(this)
                }
            }
        }
        Watcher.prototype.update = function () {
            if (this.lazy) {
                this.dirty = true
            }else{
                this.run()
            }
        }
        Watcher.prototype.run = function () {
            var value = this.get()
            if (value !== this.value) {
                var oldValue = this.value
                this.value = value
                this.cb && this.cb.call(this.vm, value, oldValue)
            }
        }
        Watcher.prototype.evaluate = function () {
            var current = Dep.target
            this.value = this.get()
            this.dirty = false
            Dep.target = current
        }
        Watcher.prototype.depend = function () {
            var i = this.deps.length
            while (i--) {
                this.deps[i].depend()
            }
        }
        return Watcher
    }(util, Dep))
    var observe = (function observe(util, Dep) {
        var arrayObserve = (function arrayObserve(util){
            var arrayProto = Array.prototype
            var arrayMethods = Object.create(arrayProto)
            var arrayKeys = Object.getOwnPropertyNames(arrayMethods)
            ;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function (method){
                var original = arrayProto[method]
                util.def(arrayMethods, method, function mutator () {
                    var i = arguments.length
                    var args = new Array(i)
                    while (i--) {
                        args[i] = arguments[i]
                    }
                    var result = original.apply(this, args)
                    var ob = this.__ob__
                    var inserted
                    switch (method) {
                        case 'push':
                            inserted = args
                            break
                        case 'unshift':
                            inserted = args
                            break
                        case 'splice':
                            inserted = args.slice(2)
                            break
                    }
                    if (inserted) ob.observeArray(inserted)
                    ob.dep.notify()
                    return result
                })
            })
            util.def(arrayProto, '$set', function $set (index, val) {
                if (index >= this.length) {
                    this.length = Number(index) + 1
                }
                return this.splice(index, 1, val)[0]
            })
            util.def(arrayProto, '$remove', function $remove (item) {
                if (!this.length) return
                var index = this.indexOf(item)
                if (index > -1) {
                    return this.splice(index, 1)
                }
            })
            return {
                arrayProto: arrayProto,
                arrayMethods: arrayMethods,
                arrayKeys: arrayKeys
            }
        }(util))
        function observe(value, vm) {
            if (!value || typeof value !== 'object') {
                return
            }
            var ob
            if (util.hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
                ob = value.__ob__
            } else if (Array.isArray(value) || util.isPlainObject(value) && Object.isExtensible(value)) {
                ob = new Observer(value)
            }
            return ob
        }
        function protoAugment(target, src) {
            target.__proto__ = src
        }
        function copyAugment(target, src, keys) {
            for(var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i]
                util.def(target, key, src[key])
            }
        }
        var hasProto = '__proto__' in {}
        function Observer(value) {
            this.value = value
            this.dep = new Dep()
            util.def(value, '__ob__', this)
            if(Array.isArray(value)) {
                var augment = hasProto ? protoAugment : copyAugment
                augment(value, arrayObserve.arrayMethods, arrayObserve.arrayKeys)
                this.observeArray(value)
            }else {
                this.walk(value)
            }
        }
        Observer.prototype.observeArray = function(items) {
            for(var i = 0, l = items.length; i < l; i++) {
                observe(items[i])
            }
        }
        Observer.prototype.walk = function (obj) {
            var keys = Object.keys(obj)
            for (var i = 0, l = keys.length; i < l; i++) {
                this.convert(keys[i], obj[keys[i]])
            }
        }
        Observer.prototype.convert = function (key, val) {
            defineReactive(this.value, key, val)
        }
        function defineReactive(obj, key, val) {
            var dep = new Dep(key)
            var property = Object.getOwnPropertyDescriptor(obj, key)
            var getter = property && property.get
            var setter = property && property.set
            var childOb = observe(val)
            Object.defineProperty(obj, key, {
                enumerable: true,
                configurable: true,
                get: function reactiveGetter() {
                    var value = getter ? getter.call(obj) : val
                    if(Dep.target) {
                        dep.depend()
                        if(childOb) {
                            childOb.dep.depend()
                        }
                        if(Array.isArray(value)) {
                            for(var e, i = 0, l = value.length; i < l; i++) {
                                e = value[i]
                                e && e.__ob__ && e.__ob__.dep.depend()
                            }
                        }
                    }
                    return value
                },
                set: function reactiveSetter(newVal) {
                    var value = getter ? getter.call(obj) : val
                    if(newVal === value) {
                        return
                    }
                    if(setter) {
                        setter.call(obj, newVal)
                    }else {
                        val = newVal
                    }
                    childOb = observe(newVal)
                    dep.notify()
                }
            })
        }
        return observe
    }(util, Dep))
    var Leo = (function Leo(util, observe, Watcher, win){
        var prevLeo = win.Leo
        function Leo(option) {
            this.option = option
            this._data
            this._initData()
            this._initComputed()
        }
        Leo.prototype._initData = function () {
            var data = this._data = this.option.data || {}
            var keys = Object.keys(data)
            var i = keys.length
            while (i--) {
                this._proxy(keys[i])
            }
            observe(data, this)
        }
        Leo.prototype._proxy = function (key) {
            var self = this
            Object.defineProperty(self, key, {
                get: function proxyGetter() {
                    return self._data[key]
                },
                set: function proxySetter(val) {
                    self._data[key] = val
                }
            })
        }
        Leo.prototype._initComputed = function () {
            var computed = this.option.computed
            if (computed) {
                for (var key in computed) {
                    var userDef = computed[key]
                    var def = {
                        enumerable: true,
                        configurable: true
                    }
                    if (typeof userDef === 'function') {
                        def.get = makeComputedGetter(userDef, this, key)
                        def.set = util.noop
                    } else {
                        def.get = makeComputedGetter(userDef.get, this, key)
                        def.set = userDef.set ? bind(userDef.set, this) : util.noop
                    }
                    Object.defineProperty(this, key, def)
                }
            }
        }
        Leo.prototype.$watch = function (expOrFn, cb, options) {
            var vm = this;
            var watcher = new Watcher(vm, expOrFn, cb, options);
            if (options && options.immediate) {
                cb && cb.call(vm, watcher.value);
            }
        }
        function makeComputedGetter(getter, owner, key) {
            var watcher = new Watcher(owner, getter, null, {
                lazy: true,
                name: key
            })
            return function computedGetter() {
                if (watcher.dirty) {
                    watcher.evaluate()
                }
                if (Dep.target) {
                    watcher.depend()
                }
                return watcher.value
            }
        }
        Leo.noConflict = function () {
            if(prevLeo !== undefined){
                return win.Leo = prevLeo
            }
        }
        return Leo
    }(util, observe, Watcher, win))
    win.Leo = Leo
}(window));