# PerfScroll
Many of the different scrollbar libraries that I have tried offered very poor performance or too many unnecessary features.  I needed a simple solution that provided a scrollbar on the Y-axis and performed well, so I made PerfScroll.  PerfScroll aims to adapt to your CSS styles rather than having to set fixed values in JavaScript.

<a href="http://playground.trowbotham.com/PerfScroll">Demo</a>

## Supported Browsers
- IE8+
- Chrome
- Firefox 3.6+
- Safari 5.1+
- Opera 12+

## Usage
Uses the default options, which makes the body scrollable:
```javascript
var scrollbar = new PerfScroll();
```

Setting a different element to be scrolled:
```javascript
var scrollbar = new PerfScroll({
    container: document.querySelector("#myBox")
});
```

Use the old scrolling methods instead of CSS3 transforms:
```javascript
var scrollbar = new PerfScroll({
    useCSSTransforms: false
});
```

Scroll to a specific location:
```javascript
var scrollbar = new PerfScroll();

scrollbar.scrollTo(375);
```

Did you insert or remove elements from the scrollbox?  Did you dynamically change the size of the scroll box?  Simply call the update method!
```javascript
var myBox = document.getElementById("myBox");

myBox.appendChild(document.createElement("div"));
scrollbar.update();
```

Get the PerfScroll object associated with an element:
```javascript
var scrollbar = new PerfScroll({
    container: document.body
});

PerfScroll.getInstance(document.body); // Returns scrollbar
```

## Public Methods
### getInstance()
This is a static method and takes either a positive integer representing a valid instance id or an element which has been transformed by PerfScroll and it will return the PerfScroll object associated with that id or element.

### scrollTo()
This takes a positive integer that represents a position, in pixels, to scroll the element to.

### update()
This does not take any arguments.  This will recalulate all the sizes of elements and update the scrollbox accordingly.

### destroy()
When you are done for the day, destroy everything!  Calling this method will destroy the instance, cleanup after itself, and put things back how they were found.

## Options
### container
This is the DOM element that will become transformed by PerfScroll.  The default value for this setting is the body element.  Note:  Using html or body elements as a value is busted in Firefox mobile until <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=886969">Bug 886969</a> is fixed.

### wheelIncrement
This accepts a positive integer and controls how many lines will be scrolled when the user uses their mouse wheel to scroll the container.  The default value for this setting is 120.

### useCSSTransforms
This accepts a boolean that specifies whether or not to use CSS3 transforms to scroll the element rather than traditional scroll methods.  The default setting of this option is true.  It is known to have poor performance in versions of Opera based on the Presto engine.  A caveat of this approach is that the scroll position is not remembered if the user refreshes the page or navigates backwards and forwards.
