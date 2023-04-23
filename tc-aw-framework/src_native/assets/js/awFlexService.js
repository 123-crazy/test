// Copyright (c) 2020 Siemens

/**
 * @module js/awFlexService
 */
import app from 'app';
import _ from 'lodash';
import 'js/logger';

let exports = {}; // eslint-disable-line no-invalid-this

export let getJustifyValue = function( justify ) {
    var justifyValue = '';
    if( justify ) {
        switch ( justify ) {
            case 'left':
            case 'top':
                justifyValue = 'flex-start';
                break;
            case 'center':
                justifyValue = 'center';
                break;
            case 'right':
            case 'bottom':
                justifyValue = 'flex-end';
                break;
            case 'space-between':
                justifyValue = 'space-between';
                break;
            case 'space-around':
                justifyValue = 'space-around';
                break;
            case 'space-evenly':
                justifyValue = 'space-evenly';
                break;
        }
    }

    return justifyValue;
};

export let getAlignContentValue = function( alignContent ) {
    var alignContentValue = '';
    if( alignContent ) {
        switch ( alignContent ) {
            case 'start':
                alignContentValue = 'flex-start';
                break;
            case 'center':
                alignContentValue = 'center';
                break;
            case 'end':
                alignContentValue = 'flex-end';
                break;
            case 'stretch':
                alignContentValue = 'stretch';
                break;
        }
    }

    return alignContentValue;
};

export let getDimensionClass = function( attrs, elements, dimension ) {
    var dimensionClass = 'afx-fill';

    if( attrs[ dimension ] ) {
        if( _.endsWith( attrs[ dimension ], 'f' ) ) {
            elements[ 0 ].style[ dimension ] = attrs[ dimension ].substring( 0, attrs[ dimension ].length - 1 ) + 'em';
            dimensionClass = 'afx-static-size';
        } else if( attrs[ dimension ] === 'auto' ) {
            dimensionClass = 'afx-static-size';
        } else if( attrs[ dimension ] !== 'fill' ) {
            dimensionClass = dimension + '-' + attrs[ dimension ];
        }
    }
    return dimensionClass;
};

export let getClasses = function( config ) {
    var offsetFixed;
    var classArray = [];
    _.forEach( config, function( value, key ) {
        if( value ) {
            if( _.includes( key, 'offset' ) && _.endsWith( value, 'f' ) ) {
                offsetFixed = value.substring( 0, value.length - 1 );
                classArray.push( key + 'Fixed-' + offsetFixed );
            } else if( _.includes( key, 'wrap' ) ) {
                classArray.push( 'aw-layout-' + value );
            } else {
                classArray.push( key + '-' + value );
            }
        }
    } );

    return classArray;
};

export let setResponsiveClasses = function( responsiveValues, elements ) {
    var values = responsiveValues.split( ',' );
    values.forEach( function( mode ) {
        var deviceMode = mode.split( ':' )[ 0 ].trim();
        var size = parseInt( mode.split( ':' )[ 1 ] );
        elements.addClass( 'aw-' + deviceMode + '-' + size );
        elements.removeClass( 'afx-fill' );
    } );
};

export let setStyles = function( config, attrs, elements, dimension ) {
    if( attrs.color ) {
        elements[ 0 ].style.backgroundColor = attrs.color;
    }

    config.justify = exports.getJustifyValue( attrs.justify );
    config.align = exports.getAlignContentValue( attrs.alignContent );
    var dimensionClass = exports.getDimensionClass( attrs, elements, dimension );

    if( attrs.wrapStyle ) {
        config.wrap = attrs.wrapStyle;
    }

    var classes = exports.getClasses( config );
    classes.push( dimensionClass );
    elements.addClass( classes.join( ' ' ) );
};

exports = {
    getJustifyValue,
    getAlignContentValue,
    getDimensionClass,
    getClasses,
    setResponsiveClasses,
    setStyles
};
export default exports;
/**
 * This service is used by <aw-flex-row> and <aw-flex-column> to get the justification and align-content values
 *
 * @memberof NgServices
 * @member awFlexService
 */
app.factory( 'awFlexService', () => exports );
