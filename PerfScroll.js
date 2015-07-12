(function() {
    'use strict';

    var defaults = {
        container: null,
        wheelIncrement: 120
    },

    decay = 325,

    instances = {},

    lastInstanceId = 0,

    supportsTouchEvents = 'ontouchstart' in window,

    supportsMSPointerEvents = 'MSPointerEvent' in window,

    supportsPointerEvents = 'PointerEvent' in window || supportsMSPointerEvents,

    supportsClassList = 'classList' in document.documentElement,

    pointerEvents = {
        pointerdown: (supportsMSPointerEvents ? 'mspointerdown' : (supportsPointerEvents ? 'pointerdown' : '')),
        pointermove: (supportsMSPointerEvents ? 'mspointermove' : (supportsPointerEvents ? 'pointermove' : '')),
        pointerup:  (supportsMSPointerEvents ? 'mspointerup' : (supportsPointerEvents ? 'pointerup' : ''))
    },

    wheelEventName, requestAnimFrame, cancelAnimFrame;

    (function() {
        if ('requestAnimationFrame' in window) {
            requestAnimFrame = window.requestAnimationFrame;
            cancelAnimFrame = window.cancelAnimationFrame;
            return;
        }

        var prefixes = ['webkit', 'moz'],
            lastTime = 0, currTime, timeToCall, prefix;

        for (var i = 0, len = prefixes.length; i < len; i++) {
            var prop = prefixes[i] + 'RequestAnimationFrame';

            if (prop in window) {
                prefix = prefixes[i];
                break;
            }
        }

        requestAnimFrame = window[prefix + 'RequestAnimationFrame'] || function(aCallback) {
            currTime = new Date().getTime();
            timeToCall = Math.max(0, 16 - (currTime - lastTime));
            lastTime = currTime + timeToCall;

            return setTimeout(function() {
                aCallback(lastTime);
            }, timeToCall);
        };

        cancelAnimFrame = window[prefix + 'CancelAnimationFrame'] || function(aId) {
            clearTimeout(aId);
        };
    })();

    if ('onwheel' in document.documentElement) {
        wheelEventName = 'wheel';
    } else if ('onmousewheel' in document.documentElement) {
        wheelEventName = 'mousewheel';
    } else {
        wheelEventName = 'DOMMouseScroll';
    }

    function extend(aTarget) {
        if ('assign' in Object) {
            return Object.assign.apply(null, arguments);
        } else {
            var len = arguments.length;

            for (var i = 1; i < len; i++) {
                for (var name in arguments[i]) {
                    if (arguments[i].hasOwnProperty(name)) {
                        aTarget[name] = arguments[i][name];
                    }
                }
            }

            return aTarget;
        }
    }

    function trim(aString) {
        return aString.replace(/^\s+|\s+$/g, '');
    }

    function addClass(aElement, aClass) {
        if (supportsClassList) {
            aElement.classList.add(aClass);
        } else {
            var classStr = trim(aElement.className.replace(/[\t\r\n\f]/g, ' ')),
                finalVal;

            classStr = ' ' + classStr + ' ';

            if (classStr.indexOf(' ' + aClass + ' ') < 0) {
                classStr += aClass + ' ';
            }

            finalVal = trim(classStr) || '';

            if (finalVal !== aElement.className) {
                aElement.className = finalVal;
            }
        }
    }

    function removeClass(aElement, aClass) {
        if (supportsClassList) {
            aElement.classList.remove(aClass);
        } else {
            if (!aElement.className) {
                return;
            }

            var classStr = trim(aElement.className.replace(/[\t\r\n\f]/g, ' '));
            var classes = classStr.split(' ');
            var len;

            classStr = ' ' + classStr + ' ';

            if ((len = classes.length)) {
                for (var i = 0; i < len; i++) {
                    while (classStr.indexOf(' ' + aClass + ' ') >= 0) {
                        classStr = classStr.replace(' ' + aClass + ' ', ' ');
                    }
                }
            }

            var finalVal = trim(classStr) || '';

            if (classStr !== finalVal) {
                aElement.className = finalVal;
            }
        }
    }

    function preventDefault(aEvent) {
        if ('preventDefault' in aEvent) {
            aEvent.preventDefault();
        } else {
            aEvent.returnValue = false;
        }
    }

    function stopPropagation(aEvent) {
        if ('stopPropagation' in aEvent) {
            aEvent.stopPropagation();
        } else {
            aEvent.cancelBubble = true;
        }
    }

    function PerfScroll(aOptions) {
        if (!(this instanceof PerfScroll)) {
            return new PerfScroll(aOptions);
        }

        var options = extend({}, defaults, aOptions || {});

        if (options.container.hasAttribute('data-perfscroll-id')) {
            return PerfScroll.getInstance(aOptions);
        }

        instances[++lastInstanceId] = this;
        this.instanceId = lastInstanceId;
        this.options = options;
        this.event = new Events();
        this.frame = new Frame();
        this.rail = document.createElement('div');
        this.thumb = document.createElement('div');
        this.container = this.options.container;
        addClass(this.rail, 'PerfScroll-rail');
        addClass(this.thumb, 'PerfScroll-thumb');
        addClass(this.container, 'PerfScroll');
        addClass(this.container, 'PerfScroll-overflow');
        this.container.setAttribute('data-perfscroll-id', lastInstanceId);
        this.rail.appendChild(this.thumb);
        this.container.appendChild(this.rail);
        this.railHeight = this.rail.clientHeight;
        this.thumbHeight = this.thumb.clientHeight;
        this.containerHeight = this.container.clientHeight;
        this.scrollTopMax = this.container.scrollHeight - this.containerHeight;
        this.offset = 0;

        if (supportsPointerEvents) {
            this.event.addListener(this.container, pointerEvents.pointerdown, this, false);
        } else {
            this.event.addListener(this.thumb, 'mousedown', this, false);

            if (supportsTouchEvents) {
                this.event.addListener(this.container, 'touchstart', this, false);
            }
        }

        this.event.addListener(this.container, 'scroll', this, false);
        this.event.addListener(this.container, wheelEventName, this, false);
    }

    PerfScroll.getInstance = function(aInstance) {
        var instance = aInstance instanceof Node ? aInstance.getAttribute('data-perfscroll-id') : aInstance;

        return instances[instance];
    };

    PerfScroll.prototype = {
        constructor: PerfScroll,

        _autoScroll: function() {
            var delta, elapsed,
                self = this;

            if (this.velocity && this.offset < this.scrollTopMax) {
                elapsed = Date.now() - this.timestamp;
                delta = -(this.velocity) * Math.exp(-(elapsed) / decay);

                if (delta > 0.5 || delta < -0.5) {
                    this._scrollTo(this.offset - delta);
                    this.autoScrollRaf = requestAnimFrame(function() {
                        self._autoScroll();
                    });
                }
            }
        },

        _handleMouseDown: function(aEvent) {
            var target = 'target' in aEvent ? aEvent.target : aEvent.srcElement;

            this.frame.stop();

            if (target == this.thumb) {
                this.grabDelta = aEvent.clientY - (this.thumb.getBoundingClientRect().top - this.rail.getBoundingClientRect().top);
                this.event.addListener(document, (supportsPointerEvents ? pointerEvents.pointermove : 'mousemove'), this, false);
                this.event.addListener(document, (supportsPointerEvents ? pointerEvents.pointerup : 'mouseup'), this, false);
            } else if (target == this.rail) {
                this.scrollTo((aEvent.clientY - this.rail.getBoundingClientRect().top) / this.railHeight * this.scrollTopMax);
            }

            stopPropagation(aEvent);
            preventDefault(aEvent);
        },

        _handleMouseMove: function() {
            this._scrollTo((this.lastY - this.grabDelta) / (this.railHeight - this.thumbHeight) * this.scrollTopMax);
        },

        _handleMouseUp: function() {
            this.event.removeListener(document, (supportsPointerEvents ? pointerEvents.pointermove : 'mousemove'), this, false);
            this.event.removeListener(document, (supportsPointerEvents ? pointerEvents.pointerup : 'mouseup'), this, false);
        },

        _handleTouchStart: function(aEvent) {
            this.frame.stop();
            this.reference = supportsPointerEvents ? aEvent.clientY : aEvent.changedTouches[0].clientY;
            this.timestamp = Date.now();
            this.velocity = 0;
            this.distance = 0;
            this.count = 0;
            this.event.addListener(window, (supportsPointerEvents ? pointerEvents.pointermove : 'touchmove'), this, false);
            this.event.addListener(window, (supportsPointerEvents ? pointerEvents.pointerup : 'touchend'), this, false);
        },

        _handleTouchMove: function() {
            this._scrollTo(this.offset + (this.reference - this.lastY));
            this.distance += this.reference - this.lastY;
            this.reference = this.lastY;
            this.count++;
        },

        _handleTouchEnd: function() {
            var now = Date.now(),
                self = this;

            this.velocity = decay * (this.distance / this.count) / (now - this.timestamp);

            if (this.velocity > 10 || this.velocity < -10) {
                this.timestamp = now;
                this.autoScrollRaf = requestAnimFrame(function() {
                    self._autoScroll();
                });
            }

            this.event.removeListener(window, (supportsPointerEvents ? pointerEvents.pointermove : 'touchmove'), this, false);
            this.event.removeListener(window, (supportsPointerEvents ? pointerEvents.pointerup : 'touchend'), this, false);
        },

        _scrollTo: function(aY) {
            var offset = Math.min(this.scrollTopMax, Math.max(0, aY)),
                thumbY = (offset / this.scrollTopMax) * (this.railHeight - this.thumbHeight);

            this.offset = offset;
            this.thumb.style.top = thumbY + 'px';
            this.container.scrollTop = offset;
        },

        handleEvent: function(aEvent) {
            var e = aEvent || event,
                self = this;

            switch (e.type) {
                case pointerEvents.pointerdown:
                    switch (e.pointerType) {
                        case 'mouse':
                            this._handleMouseDown(e);

                            break;

                        default:
                            this._handleTouchDown(e);
                    }

                    break;

                case pointerEvents.pointermove:
                    this.lastY = e.clientY;
                    this.frame.request(function() {
                        switch (e.pointerType) {
                            case 'mouse':
                                self._handleMouseMove();

                                break;

                            default:
                                self._handleTouchMove();
                        }
                    });
                    preventDefault(e);
                    stopPropagation(e);

                    break;

                case pointerEvents.pointerup:
                    switch (e.pointerType) {
                        case 'mouse':
                            this._handleMouseUp();

                            break;

                        default:
                            this._handleTouchEnd();
                    }

                    break;

                case wheelEventName:
                    if ('deltaY' in e) {
                        this.lastY = e.deltaY > 0 ? this.options.wheelIncrement : -(this.options.wheelIncrement);
                    } else if ('wheelDelta' in e) {
                        this.lastY = e.wheelDelta > 0 ? -(this.options.wheelIncrement) : this.options.wheelIncrement;
                    } else {
                        this.lastY = e.detail > 0 ? this.options.wheelIncrement : -(this.options.wheelIncrement);
                    }

                    this.frame.request(function() {
                        self._scrollTo(self.offset + self.lastY);
                    });
                    stopPropagation(e);
                    preventDefault(e);

                    break;

                case 'scroll':
                    this._scrollTo(this.container.scrollTop);
                    this.event.removeListener(this.container, 'scroll', this, false);
                    stopPropagation(e);

                    break;

                case 'mousedown':
                    this._handleMouseDown(e);

                    break;

                case 'mousemove':
                    this.lastY = e.clientY;
                    this.frame.request(function() {
                        self._handleMouseMove();
                    });
                    preventDefault(e);
                    stopPropagation(e);

                    break;

                case 'mouseup':
                    this._handleMouseUp(e);

                    break;

                case 'touchstart':
                    this._handleTouchStart(e);

                    break;

                case 'touchmove':
                    this.lastY = e.changedTouches[0].clientY;
                    this.frame.request(function() {
                        self._handleTouchMove();
                    });
                    preventDefault(e);
                    stopPropagation(e);

                    break;

                case 'touchend':
                    this._handleTouchEnd();

                    break;
            }
        },

        scrollTo: function(aY) {
            var self = this;

            this.frame.request(function() {
                self._scrollTo(aY);
            });
        },

        update: function() {
            this.railHeight = this.rail.clientHeight;
            this.thumbHeight = this.thumb.clientHeight;
            this.containerHeight = this.container.clientHeight;
            this.scrollTopMax = this.container.scrollHeight - this.containerHeight;
        },

        destroy: function() {
            this.event.removeListener(this.container, 'scroll', this, false);
            this.event.removeListener(this.thumb, 'mousedown', this, false);
            this.event.removeListener(this.container, wheelEventName, this, false);
            this.event.removeListener(this.container, 'touchstart', this, false);
            this.event.removeListener(this.container, pointerEvents.pointerdown, this, false);
            this.container.removeAttribute('data-perfscroll-id');
            this.container.removeChild(this.rail);
            removeClass(this.container, 'PerfScroll');
            this.frame.destroy();
            this.event.destroy();
            delete this.frame;
            delete instances[this.instanceId];
            delete this.instanceId;
            delete this.contianer;
            delete this.rail;
            delete this.thumb;
            delete this.railHeight;
            delete this.thumbHeight;
            delete this.containerHeight;
            delete this.scrollTopMax;
        }
    };

    function Frame() {
        this.frame = null;
        this.isLocked = false;
    }

    Frame.prototype.request = function(aCallback) {
        var self = this;

        if (!this.isLocked) {
            this.isLocked = true;
            this.frame = requestAnimFrame(function() {
                aCallback();
                self.isLocked = false;
            });
        }
    };

    Frame.prototype.stop = function() {
        cancelAnimFrame(this.frame);
        this.isLocked = false;
    };

    Frame.prototype.destroy = function() {
        this.stop();
        delete this.frame;
    };

    function Events() {
        this.callbackMap = {};
        this.supportsModernEvents = 'addEventListener' in window;
    }

    Events.prototype.addListener = function(aElement, aEvent, aCallback, aBubbles) {
        var bubbles = aBubbles || false;

        if (this.supportsModernEvents) {
            aElement.addEventListener(aEvent, aCallback, bubbles);
        } else {
            if (typeof aCallback == 'object' && aCallback.handleEvent) {
                if (aEvent in this.callbackMap) {
                    this.removeListener(aElement, aEvent, this.callbackMap[aEvent], bubbles);
                }

                this.callbackMap[aEvent] = function() {
                    aCallback.handleEvent.call(aCallback);
                };

                aElement.attachEvent('on' + aEvent, this.callbackMap[aEvent]);
            } else {
                aElement.attachEvent('on' + aEvent, aCallback);
            }
        }
    };

    Events.prototype.removeListener = function(aElement, aEvent, aCallback, aBubbles) {
        var bubbles = aBubbles || false;

        if (this.supportsModernEvents) {
            aElement.removeEventListener(aEvent, aCallback, bubbles);
        } else {
            if (typeof aCallback == 'object' && aCallback.handleEvent) {
                if (aEvent in this.callbackMap) {
                    aElement.detachEvent('on' + aEvent, this.callbackMap[aEvent]);
                    delete this.callbackMap[aEvent];
                }
            } else {
                aElement.detachEvent('on' + aEvent, aCallback);
            }
        }
    };

    Events.prototype.destroy = function() {
        delete this.callbackMap;
    };

    window.PerfScroll = PerfScroll;
})();
