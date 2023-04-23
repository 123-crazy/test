// Copyright (c) 2020 Siemens

/**
 * This service is for js based momentum scrolling for touch scrolling.
 *
 * @module js/splmTableMomentumScrolling
 */

/**
 * Momentum Scrolling.
 *
 * @constructor
 */
var SPLMTableMomentumScrolling = function() {
    var self = this;
    var _pinCanvasElement = null;
    var _scrollCanvasElement = null;
    var _referenceY;
    var _referenceX;
    var _velocityX;
    var _velocityY;
    var _timestamp;
    var _ticker;
    var _amplitudeX;
    var _amplitudeY;
    var _deltaX = 0;
    var _deltaY = 0;

    var yPosition = function( e ) {
        return e.touches[ 0 ].pageY;
    };

    var xPosition = function( e ) {
        return e.touches[ 0 ].pageX;
    };

    var scroll = function() {
       if( _scrollCanvasElement.scrollTop - _deltaY >= 0 ) {
           _scrollCanvasElement.scrollTop -= _deltaY;
       }
       if( _scrollCanvasElement.scrollLeft - _deltaX >= 0 ) {
           _scrollCanvasElement.scrollLeft -= _deltaX;
       }
    };

    var track = function() {
        var now = Date.now();
        var elapsed = now - _timestamp;
        _timestamp = now;

        var vY = 1000 * _deltaY / ( 1 + elapsed );
        var vX = 1000 * _deltaX / ( 1 + elapsed );
        _deltaY = 0;
        _deltaX = 0;
        _velocityY = Math.round( 0.4 * vY + 0.2 * _velocityY );
        _velocityX = Math.round( 0.4 * vX + 0.2 * _velocityX );
    };

    var autoScroll = function() {
         if( _amplitudeY || _amplitudeX ) {
             var elapsed = Date.now() - _timestamp;
             var timeConstant = 325;
             _deltaY = -_amplitudeY * Math.exp( -elapsed / timeConstant );
             _deltaX = -_amplitudeX * Math.exp( -elapsed / timeConstant );
             if( _deltaY > 0.5 || _deltaY < -0.5 || _deltaX > 0.5 || _deltaX < -0.5 ) {
                 scroll();
                 requestAnimationFrame( autoScroll );
             } else {
                 scroll();
             }
         }
    };

    var tap = function( e ) {
        _referenceY = yPosition( e );
        _referenceX = xPosition( e );
        _velocityY = 0;
        _velocityX = 0;
        _amplitudeY = 0;
        _amplitudeX = 0;
        _timestamp = Date.now();
        clearInterval( _ticker );
        _ticker = setInterval( track, 50 );
    };

    var drag = function( e ) {
        if( _scrollCanvasElement.scrollTop - ( _referenceY - yPosition( e ) ) <= 0 || _scrollCanvasElement.scrollLeft - ( _referenceX - xPosition( e ) ) <= 0 ) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            var y = yPosition( e );
            _deltaY = _referenceY - y;
            _referenceY = y;

            var x = xPosition( e );
            _deltaX = _referenceX - x;
            _referenceX = x;
        }
    };

    var release = function() {
         clearInterval( _ticker );
         if( _velocityY > 10 || _velocityY < -10 || _velocityX > 10 || _velocityX < -10 ) {
             _amplitudeY = 0.6 * _velocityY;
             _amplitudeX = 0.6 * _velocityX;
             _timestamp = Date.now();
             requestAnimationFrame( autoScroll );
         }
    };

    self.enable = function( pinCanvasElement, scrollCanvasElement ) {
        if( pinCanvasElement !== null ) {
            _pinCanvasElement = pinCanvasElement;
            _pinCanvasElement.addEventListener( 'touchstart', tap, { passive: true } );
            _pinCanvasElement.addEventListener( 'touchmove', drag, { passive: true }  );
            _pinCanvasElement.addEventListener( 'touchend', release, { passive: true }  );
        }

        if( scrollCanvasElement !== null ) {
            _scrollCanvasElement = scrollCanvasElement;
            _scrollCanvasElement.addEventListener( 'touchstart', tap, { passive: true } );
            _scrollCanvasElement.addEventListener( 'touchmove', drag, { passive: true }  );
            _scrollCanvasElement.addEventListener( 'touchend', release, { passive: true }  );
        }
    };

    self.disable = function() {
        if( _pinCanvasElement !== null ) {
            _pinCanvasElement.removeEventListener( 'touchstart', tap );
            _pinCanvasElement.removeEventListener( 'touchmove', drag );
            _pinCanvasElement.removeEventListener( 'touchend', release );
            _pinCanvasElement = null;
        }

        if( _scrollCanvasElement !== null ) {
            _scrollCanvasElement.removeEventListener( 'touchstart', tap );
            _scrollCanvasElement.removeEventListener( 'touchmove', drag );
            _scrollCanvasElement.removeEventListener( 'touchend', release );
            _scrollCanvasElement = null;
        }
    };
};

export default SPLMTableMomentumScrolling;
