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
            def: function def(obj, key, val, enumerable) {
                Object.defineProperty(obj, key, {
                    value: val,
                    enumerable: !!enumerable,
                    writable: true,
                    configurable: true
                })
            },
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
        Dep.prototype.notify = function () {
            var subs = util.toArray(this.subs)
            for (var i = 0, l = subs.length; i < l; i++) {
                subs[i].update()
            }
        }
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
            }
        }
        Watcher.prototype.run = function () {
            var value = this.get()
            if (value !== this.value) {
                var oldValue = this.value
                this.value = value
                this.cb.call(this.vm, value, oldValue)
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
        function Observer(value) {
            this.value = value
            util.def(value, '__ob__', this)
            this.walk(value)
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
            if (property && property.configurable === false) {
                return
            }
            Object.defineProperty(obj, key, {
                enumerable: true,
                configurable: true,
                get: function reactiveGetter() {
                    var value = val
                    if (Dep.target) {
                        dep.depend()
                    }
                    return value
                },
                set: function reactiveSetter(newVal) {
                    var value = val
                    if (newVal === value) {
                        return
                    }
                    val = newVal
                    dep.notify()
                }
            })
        }
        return observe
    }(util, Dep))
    var Leo = (function Leo(util, observe, Watcher){
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
        return Leo
    }(util, observe, Watcher))
    win.Leo = Leo
}(window));