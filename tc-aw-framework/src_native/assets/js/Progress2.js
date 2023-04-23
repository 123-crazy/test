// Copyright (c) 2020 Siemens

/**
 * @module js/Progress2
 */

/**
 * Javascript way of progress bar animation is only used for IE9, For other browsers we use CSS3 animations
 */
var progressBarUpperSpeed = 6; // Set upper speed in pixels per frame
var progressBarLowerSpeed = 1; // Set lower speed in pixels per frame
var progressBarSpeed = 0;
var progressBarLeft = 0;
var progressBarWidth = 0;
var progressNumber = 0;
var itv = 0; // id to setinterval

/**
 * set progress bar width and margin left
 */
var setProgressBarLeftAndWidth = function() {
    var progressBarElements = document.getElementsByClassName( 'aw-layout-progressBarIE9' );
    for( var i = 0; i < progressBarElements.length; i++ ) {
        var element = progressBarElements[ i ];
        var pElement = element.parentNode.parentNode;
        var pElementCss = pElement.getAttribute( 'class' );
        if( element && pElementCss.indexOf( 'hidden' ) === -1 ) {
            element.style.marginLeft = progressBarLeft + 'px';
            element.style.width = progressBarWidth + 'px';
        }
    }
};

/**
 * This function animates the progress indicator bar
 */
var animateProgressBar = function() {
    // Find the width of the display and set the progress bar width
    var overallWidth = window.innerWidth;
    var progressBarMaxWidth = overallWidth / 10;

    var progressBarCenter = progressBarLeft + progressBarWidth / 2;

    var temp = 0;
    if( overallWidth > 0 ) {
        if( progressBarCenter > overallWidth * 0.5 ) {
            temp = ( overallWidth - progressBarCenter ) / overallWidth;
        } else {
            temp = progressBarCenter / overallWidth;
        }
    }

    progressBarSpeed = progressBarLowerSpeed + progressBarUpperSpeed * ( 1 - 2 * temp );
    progressBarSpeed *= progressBarSpeed;

    if( progressNumber > overallWidth + progressBarMaxWidth ) {
        // START OVER on left once completely off right
        progressNumber = 0;
    }

    if( progressNumber <= progressBarMaxWidth ) {
        // Progress Bar Off LEFT Side
        progressBarWidth = progressNumber;
        progressBarLeft = 0;
    } else {
        progressBarLeft = progressNumber - progressBarMaxWidth;
        if( progressNumber >= overallWidth ) {
            // Progress Bar Off RIGHT Side
            progressBarWidth = overallWidth - progressBarLeft;
        } else {
            // Progress Bar in MIDDLE
            progressBarWidth = progressBarMaxWidth;
        }
    }

    setProgressBarLeftAndWidth();

    progressNumber += progressBarSpeed;
};

var exports = {};

/**
 * Sets progress interval for animation
 */
export let setProgressInterval = function() {
    if( itv === 0 ) {
        itv = setInterval( function() {
            animateProgressBar();
        }, 25 );
    }
};

/**
 * Clears progress interval
 */
export let clearProgressInterval = function() {
    clearInterval( itv );

    // setting back all the values to default
    progressBarUpperSpeed = 6;
    progressBarLowerSpeed = 1;
    progressBarSpeed = 0;
    progressBarLeft = 0;
    progressBarWidth = 0;
    progressNumber = 0;
    itv = 0;
    setProgressBarLeftAndWidth();
};

export default exports = {
    setProgressInterval,
    clearProgressInterval
};
