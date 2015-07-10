(function() {
    'use strict';

    var defaults = {
        container: null,
        wheelIncrement: 120
    },

    instances = {},

    lastInstanceId = 0,

    pointerEvents = {
        pointerdown: ('PointerEvent' in window ? 'pointerdown' : 'mspointerdown'),
        pointermove: ('PointerEvent' in window ? 'pointermove' : 'mspointermove'),
        pointerup: ('PointerEvent' in window ? 'pointerup' : 'mspointerup')
    },

    supportsClassList = 'classList' in document.documentElement,

    lastTime = 0,

    currTime,

    timeToCall,

    wheelEventName,

    requestAnimFrame = Modernizr.prefixed( 'requestAnimationFrame', window ) || function( aCallback ) {
        currTime = new Date().getTime();
        timeToCall = Math.max(0, 16 - (currTime - lastTime));
        lastTime = currTime + timeToCall;

        return setTimeout(function() {
            aCallback(lastTime);
        }, timeToCall);
    },

    cancelAnimFrame = Modernizr.prefixed( 'cancelAnimationFrame', window ) || function( aId ) {
        clearTimeout( aId );
    };

    if ('onwheel' in document.documentElement) {
        wheelEventName = 'wheel';
    } else if ('onmousewheel' in document.documentElement) {
        wheelEventName = 'mousewheel';
    } else {
        wheelEventName = 'DOMMouseScroll';
    }

    function bind(aFunction, aContext, aArg) {
        return function() {
            return aFunction.call(aContext, aArg);
        };
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
            var classes = (aElement.className || '').split(' '),
                index = classes.indexOf(aClass);

            if (index < 0) {
                classes.push(aClass);
                aElement.className = classes.join(' ');
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

    function scrollTo(aElement, aX, aY) {
        if ('scrollTo' in aElement) {
            aElement.scrollTo(aX, aY);
        } else {
            aElement.scrollLeft = aX;
            aElement.scrollTop = aY;
        }
    }

    function onWheel() {
        this.rail.style.top = Math.min(this.scrollTopMax, Math.max(0, this.rail.offsetTop + this.options.wheelIncrement)) + 'px';
        scrollTo(this.container, 0, this.container.scrollTop + this.options.wheelIncrement);
    }

    function onScroll() {
        var scrollTop = this.container.scrollTop,
            scroll = scrollTop / this.scrollTopMax;

        this.railThumb.style.top = scroll * (this.railHeight - this.railThumbHeight) + 'px';
        this.rail.style.top = scrollTop + 'px';
    }

    function onMouseMove() {
        var coord = Math.min(this.railHeight - this.railThumbHeight, Math.max(0, this.lastMoveEvent.pageY -
            this.rail.getBoundingClientRect().top - (this.currentY - this.currentTop)));
        var scroll = coord / (this.railHeight - this.railThumbHeight);
        var diff = scroll * this.scrollTopMax - this.currentScrollTop;

        this.currentScrollTop += diff;

        this.railThumb.style.top = coord + 'px';
        this.rail.style.top = Math.floor(this.currentScrollTop) + 'px';

        scrollTo(this.container, 0, scroll * this.scrollTopMax);
    }

    function onTouchMove() {
        for (var i = 0, len = this.lastMoveEvent.changedTouches.length; i < len; i++) {
            var diff = this.lastMoveEvent.changedTouches[i].pageY - this.currentY;

            this.currentScrollTop = Math.min(this.scrollTopMax, Math.max(0, this.currentScrollTop - diff));

            this.railThumb.style.top = Math.min(this.railHeight - this.railThumbHeight, Math.max(0,
                this.currentScrollTop / this.scrollTopMax * (this.railHeight - this.railThumbHeight))) + 'px';
            this.rail.style.top = Math.floor(this.currentScrollTop) + 'px';

            scrollTo(this.container, 0, this.currentScrollTop);

            this.currentY = this.lastMoveEvent.changedTouches[i].pageY;
        }
    }

    function PerfScroll(aOptions) {
        if (!(this instanceof PerfScroll)) {
            return new PerfScroll(aOptions);
        } else if (aOptions.hasAttribute('data-perfscroll-id')) {
            return PerfScroll.getInstance(aOptions);
        }

        instances[++lastInstanceId] = this;
        this.instanceId = lastInstanceId;
        this.options = extend({}, defaults, aOptions || {});
        this.frame = new Frame();
        this.rail = document.createElement('div');
        this.railThumb = document.createElement('div');
        this.container = aOptions;
        addClass(this.rail, 'PerfScroll-rail');
        addClass(this.railThumb, 'PerfScroll-rail-thumb');
        addClass(this.container, 'PerfScroll');
        this.container.setAttribute('data-perfscroll-id', lastInstanceId);
        this.rail.appendChild(this.railThumb);
        this.container.appendChild(this.rail);
        this.railHeight = this.rail.clientHeight;
        this.railThumbHeight = this.railThumb.clientHeight;
        this.containerHeight = this.container.clientHeight;
        this.scrollTopMax = this.container.scrollHeight - this.containerHeight;
        this.lastMoveEvent = null;

        this.container.addEventListener('scroll', this, false);
        this.railThumb.addEventListener('mousedown', this, false);
        this.container.addEventListener(wheelEventName, this, false);
        this.container.addEventListener('touchstart', this, false);
        this.container.addEventListener(pointerEvents.pointerdown, this, false);
    }

    PerfScroll.getInstance = function(aInstance) {
        var instance = aInstance instanceof Node ? aInstance.getAttribute('data-perfscroll-id') : aInstance;

        return instances[instance];
    };

    PerfScroll.prototype = {
        constructor: PerfScroll,

        handleEvent: function(aEvent) {
            var e = aEvent || event;

            switch (e.type) {
                case 'wheel':
                case 'mousewheel':
                case 'DOMMouseScroll':
                    stopPropagation(e);
                    preventDefault(e);
                    this.frame.request(bind(onWheel, this));

                    break;

                case 'scroll':
                    preventDefault(e);
                    stopPropagation(e);

                    this.frame.request(bind(onScroll, this));

                    break;

                case 'mousedown':
                    stopPropagation(e);
                    preventDefault(e);
                    this.currentTop = this.railThumb.getBoundingClientRect().top;
                    this.currentScrollTop = this.container.scrollTop;
                    this.currentY = e.clientY;

                    this.container.removeEventListener('scroll', this, false);
                    window.addEventListener('mousemove', this, false);
                    window.addEventListener('mouseup', this, false);

                    break;

                case 'mousemove':
                    this.lastMoveEvent = e;
                    this.frame.request(bind(onMouseMove, this));

                    break;

                case 'mouseup':

                    this.container.addEventListener('scroll', this, false);
                    window.removeEventListener('mousemove', this, false);
                    window.removeEventListener('mouseup', this, false);

                    break;

                case 'touchstart':
                    stopPropagation(e);
                    preventDefault(e);
                    this.currentTop = this.railThumb.getBoundingClientRect().top;
                    this.currentScrollTop = this.container.scrollTop;
                    this.currentY = e.changedTouches[0].pageY;

                    this.container.removeEventListener('scroll', this, false);
                    window.addEventListener('touchmove', this, false);
                    window.addEventListener('touchend', this, false);

                    break;

                case 'touchmove':
                    this.lastMoveEvent = e;
                    this.frame.request(bind(onTouchMove, this));

                    break;

                case 'touchend':
                    this.container.addEventListener('scroll', this, false);
                    window.removeEventListener('touchmove', this, false);
                    window.removeEventListener('touchend', this, false);

                    break;
            }
        },

        update: function() {
            this.railHeight = this.rail.clientHeight;
            this.railThumbHeight = this.railThumb.clientHeight;
            this.containerHeight = this.container.clientHeight;
            this.scrollTopMax = this.container.scrollHeight - this.containerHeight;
        },

        destroy: function() {
            this.container.removeEventListener('scroll', this, false);
            this.railThumb.removeEventListener('mousedown', this, false);
            this.container.removeEventListener(wheelEventName, this, false);
            this.container.removeEventListener('touchstart', this, false);
            this.container.removeEventListener(pointerEvents.pointerdown, this, false);
            this.container.removeAttribute('data-perfscroll-id');
            this.container.removeChild(this.rail);
            removeClass(this.container, 'PerfScroll');
            this.frame.destroy();
            delete this.frame;
            delete instances[this.instanceId];
            delete this.instanceId;
            delete this.contianer;
            delete this.rail;
            delete this.railThumb;
            delete this.railHeight;
            delete this.railThumbHeight;
            delete this.containerHeight;
            delete this.scrollTopMax;
            delete this.lastMoveEvent;
            delete this.lastWheelEvent;
            delete this.currentTop;
            delete this.currentScrollTop;
            delete this.currentY;
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

    window.PerfScroll = PerfScroll;
})();
