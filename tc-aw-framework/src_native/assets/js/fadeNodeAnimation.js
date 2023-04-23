// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines fadeNodeAnimation
 *
 * @module js/fadeNodeAnimation
 */
import _ from 'lodash';

'use strict';

var exports = {};

/**
 * Internal method to run animation
 *
 * @param duration the total animation time in ms.
 * @param draw the function to draw the animation.
 * @param timing the function to calculate animation progress. Gets a time fraction from 0 to 1, returns the
 *            animation progress, usually from 0 to 1.
 * @param state the animate state
 * @param finishCb the finish call back when current animation was done. Optional
 * @param revertAnimation the animation used to revert back to original status when user cancelled the current animation. Optional
 */
var animate = function( duration, draw, timing, state, finishCb, revertAnimation ) {
    var start = performance.now();
    state.animationId = window.requestAnimationFrame( function run( time ) {
        var elapsed = time - start;
        var timeFraction = state.progress + elapsed / duration;
        if( timeFraction < 0 ) {
            timeFraction = 0;
        }
        if( timeFraction > 1 ) {
            timeFraction = 1;
            if( finishCb ) {
                finishCb();
            }
        }

        var progress = timing( timeFraction );
        draw( progress );

        if( state.stop ) {
            // cancel current animation
            if( state.animationId ) {
                window.cancelAnimationFrame( state.animationId );
                state.animationId = null;
            }
            state.stop = true;
            // revert back
            if( revertAnimation ) {
                revertAnimation( elapsed, draw, { progress: progress } );
            } else {
                draw( 1 );
            }
            return;
        }

        if( timeFraction < 1 && !state.stop ) {
            state.animationId = window.requestAnimationFrame( run );
        }
    } );
};

var fadeInAnimation = function( duration, draw, state ) {
    var timing = function( progress ) {
        return progress;
    };
    animate( duration, draw, timing, state );
};

var fadeOutAnimation = function( duration, draw, state, finishCb ) {
    var timing = function( progress ) {
        return 1 - progress;
    };
    animate( duration, draw, timing, state, finishCb, fadeInAnimation );
};

/**
 * update the element in animation
 *
 * @param element the element need to update
 */
var update = function( element ) {
    var baseOpacity = element.style.opacity ? element.style.opacity : 1;
    return function( opacityProgress ) {
        element.style.opacity = baseOpacity * opacityProgress;
    };
};

/**
 * Fade out animation for node
 *
 * @param node the node to animate
 * @param duration the total animation time in ms.
 * @param finishCallback the callback function when animation was finished.
 * @return object the cancelObject which user can cancel the animation
 */
export let fadeNode = function( node, duration, finishCallback ) {
    if( !node ) {
        return;
    }
    var element = node.getSVGDom();
    var state = {
        stop: false,
        progress: 0
    };
    fadeOutAnimation( duration, update( element ), state, finishCallback );
    return {
        cancel: function() {
            state.stop = true;
        }
    };
};

export default exports = {
    fadeNode
};
