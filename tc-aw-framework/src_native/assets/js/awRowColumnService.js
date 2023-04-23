// Copyright (c) 2020 Siemens

/**
 * @module js/awRowColumnService
 */
import app from 'app';
import _ from 'lodash';
import logger from 'js/logger';

let exports = {}; // eslint-disable-line no-invalid-this

export let constants = {
    gridSystemSize: 12,
    standardWidthFactor: 1,
    standardHeightFactor: 1
};

/**
 * Initialize Row or Column - every row or column element calls this method at link time to
 * initialized the flexbox attributes for all siblings. And to add elements to implement offsets
 * align-contents (start, center, end) and justification options.
 *
 * @param {object} scopeElements - The angularJS scope elements used to define the row or
 *            column.
 */
export let initRowOrColumn = function( scopeElements ) {
    // Get the container element used for the given row or column element
    var containerElement = scopeElements[ 0 ].parentElement;
    var containerClassName = scopeElements[ 0 ].className;

    // Only process the container area one time
    // All sibling areas are processed when the last
    // element for this row or column is given
    if( !exports.isLastChild( containerElement, scopeElements[ 0 ] ) ) {
        return;
    }

    // Get all sub-area in this row or column
    var areaList = exports.getAreaList( containerElement );
    if( areaList === null ) {
        return;
    }

    // Set parent container element to use flexbox
    containerElement.style.display = '-webkit-flex';
    containerElement.style.display = 'flex';
    if( areaList[ 0 ].wrapStyle ) {
        containerElement.style.flexWrap = areaList[ 0 ].wrapStyle;
    }

    containerElement.style.webkitFlexDirection = areaList[ 0 ].stackDirection;
    containerElement.style.flexDirection = areaList[ 0 ].stackDirection;

    // Variables used to captured the index for the first center justify
    // and (right or bottom) justify elements
    // Elements to implement the justification will be inserted before these elements
    var centerJustifyIndex = -1;
    var farJustifyIndex = -1;

    // Flag to control relative positions of offset elements
    var insertBefore = true;

    // Get the number of fill areas and the amount of space that is
    // NOT defined by proportional values needed to fill the grid system
    var fillData = exports.getFillData( areaList );
    var fillValue = fillData.fillSize;
    var fillAreaCount = fillData.fillAreaCount;
    var fillAreaString = '';

    // If there are fill areas then all open area will be consumed by them
    // Any justification options will be ignored
    if( fillAreaCount > 0 ) {
        // For multiple fill areas the area is split between them
        fillAreaString = ( fillValue / fillAreaCount ).toString();
        fillValue = 0;
    }

    // Process all items in the current row or column:
    // Set the flexbox size attributes
    // Capture key justification positions
    // Add elements needed to implement offsets
    _.forEach( areaList, function( area, index ) {
        // Set flexbox size attributes for this element
        exports.setAreaStyle( area.areaElement, area.sizeType, area.sizeValue, area.color,
            fillAreaString, area.alignContent, area.when, area.areaType );

        // Capture the index of the first center and (right or bottom) elements
        var justifyOption = area.justify;
        if( justifyOption === 'center' && centerJustifyIndex < 0 ) {
            centerJustifyIndex = index;
        }
        if( ( justifyOption === 'right' || justifyOption === 'bottom' ) &&
            farJustifyIndex < 0 ) {
            farJustifyIndex = index;
            insertBefore = false;
        }

        // If this element has an offset then create the offset element
        var offsetValue = area.offsetSizeValue;
        if( offsetValue > 0 ) {
            exports.addNewElement( containerClassName, area.offsetSizeType, offsetValue,
                'transparent', '', insertBefore, area.areaElement, area.areaType );
        }
    } ); // End process all items

    // Add filler elements to handle justification or to fill in undefined space at the end
    if( fillValue > 0 ) {
        fillAreaString = fillValue.toString();

        if( centerJustifyIndex >= 0 ) {
            // Two Element are needed to center - so split the remaining space
            // Note that this also handles the case of a center AND a (right or bottom) justification
            fillAreaString = ( fillValue / 2 ).toString();

            // Insert an element before the center justify element
            exports.addNewElement( containerClassName, 'P', 0, 'transparent', fillAreaString,
                true, areaList[ centerJustifyIndex ].areaElement, areaList[ 0 ].areaType );

            if( farJustifyIndex > 0 ) {
                // Also insert a new element before the far justify element
                exports.addNewElement( containerClassName, 'P', 0, 'transparent', fillAreaString,
                    true, areaList[ farJustifyIndex ].areaElement, areaList[ 0 ].areaType );
            } else {
                // There is no right or bottom justify option - so insert at the end to center
                exports.addNewElement( containerClassName, 'P', 0, 'transparent', fillAreaString,
                    false, scopeElements[ 0 ], areaList[ 0 ].areaType );
            }
        } else if( farJustifyIndex >= 0 ) {
            // Insert one new element before the far justify element
            exports.addNewElement( containerClassName, 'P', 0, 'transparent', fillAreaString,
                true, areaList[ farJustifyIndex ].areaElement, areaList[ 0 ].areaType );
        }
    }
};

/**
 * Add New Element
 *
 * Add a new element of a given size before or after a given sibling element.
 *
 * @param {string} className - The class name used for all siblings.
 * @param {string} sizeType - "P" or "F" for proportional or fixed.
 * @param {number} sizeValue - The fixed or proportional size.
 * @param {string} color - Any CSS color value.
 * @param {string} fillAreaString - when sizeValue is zero then this string is used for fill
 *            areas
 * @param {boolean} before - when true insert the new element before the sibling, otherwise
 *            insert after
 * @param {object} sibling - existing sibling element to insert before or after Note: pass in
 *            the DOM element not the JQuery/Angular scoping element
 */
export let addNewElement = function( className, sizeType, sizeValue, color, fillAreaString, before,
    sibling, areaType ) {
    // Example to get rid of ngModule.element
    /*
        ngModule.element - it is a $.element, which should be replaced by vallinaJS ( major usage )
        ngModule.isUndefined - can be vanillaJS
        ngModule.copy - simple deep copy
        ngModule.bind - similar like function.bind, not sure why we need this. But should be able to replace.
        ngModule.noop - similar like null? Anyway we can do equivalent
        ngModule.forEach - _.forEachngModule.isFunction - _.isFunction
     */
    var newElement = document.createElement( 'div' );

    _.forEach( className.split( ' ' ), function( cName ) {
        newElement.classList.add( cName );
    } );

    exports.setAreaStyle( newElement, sizeType, sizeValue, color, fillAreaString, null, null, areaType );

    sibling.parentNode.insertBefore( newElement, sibling );

    if( !before ) {
        newElement.parentNode.insertBefore( sibling, newElement );
    }
};

/**
 * Set Area Style
 *
 * Set the flexbox size attributes for Fixed and Proportional areas and set the given color.
 *
 * @param {object} areaElement - The row or column to size.
 * @param {string} sizeType - "P" or "F" for proportional or fixed.
 * @param {number} sizeValue - The fixed or proportional size.
 * @param {string} color - Any CSS color value.
 * @param {string} fillAreaString - when sizeValue is zero then this string is used for fill
 * @param {string} alignContent - "start", "center" or "end" to flex align Items/ Content
 *            areas
 * @param {string} when - "xlarge: <value>, large: <value>, medium: <value>, small: <value>, xsmall: <value>"
 *            12 column responsive grid layout
 */
export let setAreaStyle = function( areaElement, sizeType, sizeValue, color, fillAreaString, alignContent, when, areaType ) {
    var valueString = sizeValue.toString();
    var flexString;

    var areaPercent = '';

    if( sizeType === 'P' ) {
        if( sizeValue > 0 ) {
            // This is a normal proportional area
            // note that for IE performance, numeric values should not be used for the flex-basis (3rd value in flexString)
            flexString = valueString + ' ' + valueString + ' auto';
            if( valueString > 1 ) {
                areaPercent = 100 * valueString / 12 + '%';
            }
        } else {
            // This is a fill area - which will also be proportional
            flexString = fillAreaString + ' ' + fillAreaString + ' auto';
            if( fillAreaString > 1 ) {
                areaPercent = 100 * fillAreaString / 12 + '%';
            }
        }
    } else if( sizeType === 'A' ) {
        flexString = '0 0 auto';
    } else { // sizeType = "F"
        // These are areas defined with fixed values
        flexString = '0 0 ' + sizeValue.toString() + 'em';
    }

    if( when && sizeType === 'P' ) {
        var deviceModeList = when.split( ',' );
        if( deviceModeList && deviceModeList.length ) {
            deviceModeList.forEach( function( mode ) {
                var deviceMode = mode.split( ':' )[ 0 ].trim();
                var size = parseInt( mode.split( ':' )[ 1 ] );

                if( deviceMode === 'xlarge' ) {
                    areaElement.className += ' aw-xlarge-' + size + ' ';
                } else if( deviceMode === 'large' ) {
                    areaElement.className += ' aw-large-' + size + ' ';
                } else if( deviceMode === 'medium' ) {
                    areaElement.className += ' aw-medium-' + size + ' ';
                } else if( deviceMode === 'small' ) {
                    areaElement.className += ' aw-small-' + size + ' ';
                } else if( deviceMode === 'xsmall' ) {
                    areaElement.className += ' aw-xsmall-' + size + ' ';
                } else {
                    areaElement.className += ' aw-default-' + sizeValue + ' ';
                }
            } );
        }
    } else {
        // apply the flex value inline
        // Numeric flex-basis should be avoided.
        // Any change their needs to be carefully tested in IE for performance validation.
        areaElement.style.flex = flexString;
        if( areaPercent ) {
            areaType === 'column' ? areaElement.style.width = areaPercent : areaElement.style.height = areaPercent;
        }
    }

    // Add the flexbox sizing string and user given color to the current element
    areaElement.style.backgroundColor = color;
    var alignContentValue = '';
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
    }
    areaElement.style.alignItems = alignContentValue;
};

/**
 * Is Last Child
 *
 * Return true if the given child element is the last child element of the given parent element.
 *
 * @param {object} parent - container element
 * @param {object} child - a child of the container element
 *
 * @return {boolean} - true if child is the last child in parent
 */
export let isLastChild = function( parent, child ) {
    if( !parent ) {
        return false;
    }
    var children = parent.children;
    if( !children ) {
        return false;
    }
    var length = children.length;
    if( length < 1 ) {
        return false;
    }
    if( children[ length - 1 ] !== child ) {
        return false;
    }
    return true;
};

/**
 * Get Fill Data
 *
 * For the given row or column, return the number of areas defined with a size of "fill" and the
 * amount of space in the grid system that is not defined by proportional width or height or
 * offset values. This is the space to be filled by the "fill" areas or by justification
 * options.
 *
 * Note this method also verifies that all items are rows or columns and if not reports a usage
 * error.
 *
 * @param {array} areaList - Array of structures for all areas in a row or column (see
 *            getAreaData)
 *
 * @return {structure} - { fillSize:fillSize, fillAreaCount:fillAreaCount }
 */
export let getFillData = function( areaList ) {
    // Used to verify that areas are not defined with a mixture of row and column elements
    var testAreaType = areaList[ 0 ].areaType;
    var typeError = false;

    var fillSize = exports.constants.gridSystemSize;
    var fillAreaCount = 0;

    _.forEach( areaList, function( area ) {
        // Subtract proportional widths or heights
        if( area.sizeType === 'P' ) {
            fillSize -= area.sizeValue;

            // Count Fill Area
            // Fill areas are identified by having a size of zero
            if( area.sizeValue === 0 ) {
                ++fillAreaCount;
            }
        }

        // Subtract proportional offsets
        if( area.offsetSizeType === 'P' ) {
            fillSize -= area.offsetSizeValue;
        }

        // Verify all items are rows or columns (not a mixture)
        if( area.areaType !== testAreaType ) {
            typeError = true;
        }
    } );

    if( typeError ) {
        exports.reportError( 'area found that is defined with mixed rows and columns' );
    }

    if( fillSize < 0 ) {
        fillSize = 0;
        exports.reportError( 'row or column found defined with proportional areas that exceed grid system size: ' + exports.constants.gridSystemSize );
    }

    return {
        fillSize: fillSize,
        fillAreaCount: fillAreaCount
    };
};

/**
 * Get Area List
 *
 * For the given container element, return the list of sub-areas (rows or columns) that define
 * the layout for the container.
 *
 * If there are sub-elements then return an array of structures (see getAreaData) If there are
 * no sub-elements then return null.
 *
 * @param {object} containerElement - Element containing the list of row or column elements
 *
 * @return {structure} - see getAreaData
 */
export let getAreaList = function( containerElement ) {
    if( !containerElement ) {
        return null;
    }
    var childList = containerElement.children;
    if( !childList ) {
        return null;
    }
    if( childList.length < 1 ) {
        return null;
    }

    var areaList = [];

    _.forEach( childList, function( subArea ) {
        var subAreaData = exports.getAreaData( subArea );
        if( subAreaData ) {
            areaList.push( subAreaData );
        }
    } );

    if( areaList.length < 1 ) {
        return null;
    }

    return areaList;
};

/**
 * Get Area Data
 *
 * For a given row or column, create and return the data defining the size and options
 *
 * @param {object} areaElement - Row or Column element
 *
 * @return {structure} - { areaElement, areaType, stackDirection, sizeType, sizeValue,
 *         offsetSizeType, offsetSizeValue, justify, color, align-content }
 */
export let getAreaData = function( areaElement ) {
    // Set the area type based on the elements class name
    var classList = areaElement.classList;

    var areaType = 'unknown';
    var standardSizeFactor;
    var stackDirection;

    if( classList.contains( 'aw-layout-row' ) ) {
        areaType = 'row';
        stackDirection = 'column'; // flexbox direction
        standardSizeFactor = exports.constants.standardHeightFactor;
    } else if( classList.contains( 'aw-layout-column' ) ) {
        areaType = 'column';
        stackDirection = 'row'; // flexbox direction
        standardSizeFactor = exports.constants.standardWidthFactor;
    } else {
        // Ignore all other elements
        return null;
    }

    var userAttributes = exports.getAreaUserAttributes( areaElement );

    var sizeData = exports.getSizeDataFromAttribute( userAttributes.size, standardSizeFactor );
    var sizeType = sizeData.sizeType;
    var sizeValue = sizeData.sizeValue;

    sizeData = exports.getSizeDataFromAttribute( userAttributes.offset, standardSizeFactor );
    var offsetSizeType = sizeData.sizeType;
    var offsetSizeValue = sizeData.sizeValue;

    return {
        areaElement: areaElement, // row or column element
        areaType: areaType, // "row", "column"
        stackDirection: stackDirection, // "row" means stack horizontally, "column" vertically
        sizeType: sizeType, // "F" fixed, "P" proportional, "A" auto
        sizeValue: sizeValue, // value for width or height
        offsetSizeType: offsetSizeType, // "F" or "P" type of values used for offset
        offsetSizeValue: offsetSizeValue, // width or height of the desired offset
        justify: userAttributes.justify, // "left", "right", "top", "bottom", "center"
        color: userAttributes.color,
        alignContent: userAttributes.alignContent, // "start", "center", "end"
        when: userAttributes.when, // large, medium, small
        wrapStyle: userAttributes.wrapStyle // nowrap, wrap, wrap-reverse
    }; // Any CSS color string
};

/**
 * Get Area User Attributes
 *
 * For the given row or column, return a structure containing either the attribute value as
 * defined by the user or the default attribute value for all possible attributes.
 *
 * @param {object} areaElement - Row or Column element
 *
 * @return {structure} - { size, offset, justify, color, id, alignContent }
 */
export let getAreaUserAttributes = function( areaElement ) {
    var sizeAttributeName = 'width';
    var defaultJustifyString = 'left';
    if( areaElement.classList.contains( 'aw-layout-row' ) ) {
        sizeAttributeName = 'height';
        defaultJustifyString = 'top';
    }

    // Get original attributes as defined in the element by the user
    var sizeString = areaElement.getAttribute( sizeAttributeName );
    var offsetString = areaElement.getAttribute( 'offset' );
    var justifyString = areaElement.getAttribute( 'justify' );
    var colorString = areaElement.getAttribute( 'color' );
    var idString = areaElement.getAttribute( 'offset' );
    var alignContent = areaElement.getAttribute( 'align-content' );
    var when = areaElement.getAttribute( 'when' );
    var wrapStyle = areaElement.getAttribute( 'wrap-style' );

    // Set defaults for attributes that were not defined by the user
    sizeString = sizeString ? sizeString : '1';
    offsetString = offsetString ? offsetString : '0';
    justifyString = justifyString ? justifyString : defaultJustifyString;
    colorString = colorString ? colorString : '';
    idString = idString ? idString : '';
    alignContent = alignContent ? alignContent : '';
    when = when ? when : '';
    wrapStyle = wrapStyle ? wrapStyle : '';

    return {
        size: sizeString,
        offset: offsetString,
        justify: justifyString,
        color: colorString,
        id: idString,
        alignContent: alignContent,
        when: when,
        wrapStyle: wrapStyle
    };
};

/**
 * Get Size Data From Attribute
 *
 * Given a size attribute string as defined for an <aw-row> or <aw-column> element and used by
 * the width, height, or offset attribute, return the size type and value. Return a structure of
 * the form { sizeType, sizeValue } where: sizeType = "P" for proportional values OR "F" for
 * fixed values. sizeValue = the integer values times the given standard width or height for
 * fixed values OR the integer value for proportional values
 *
 * @param {string} sizeAttr - The size attribute string as defined by the user
 * @param {number} fixedSizeFactor - Number applied to fixed sized values
 *
 * @return {structure} - { sizeType, sizeValue }
 */
export let getSizeDataFromAttribute = function( sizeAttr, fixedSizeFactor ) {
    var sizeString = '1'; // Default value
    var sizeType = 'P';
    var sizeValue = '0';

    if( sizeAttr ) {
        sizeString = sizeAttr;

        /**
         * When size attribute is given as percentage, converting it in such a way to calculate
         * the number based off proportion of 12
         */
        if( _.endsWith( sizeString, '%' ) ) {
            var percentNum = _.trimEnd( sizeString, '%' );
            sizeString = ( percentNum * 12 / 100 ).toString();
        }
    }

    if( sizeString.length < 1 ) {
        sizeString = '1';
    } else if( sizeString === 'fill' ) {
        sizeString = '0';
    } else if( sizeString === 'auto' ) {
        sizeString = '0';
        sizeType = 'A';
    }

    sizeValue = parseFloat( sizeString, 10 );

    if( isNaN( sizeValue ) ) {
        exports.reportError( 'invalid row, column or offset size value (' + sizeAttr +
            ') - using default of 1' );
        sizeValue = 1;
    } else if( sizeString[ sizeString.length - 1 ] === 'f' ) { // Fixed Value
        sizeType = 'F';
        sizeValue *= fixedSizeFactor;
    }

    return {
        sizeType: sizeType,
        sizeValue: sizeValue
    };
};

/**
 * Report a usage error.
 *
 * @param {string} errorMessage - error to report.
 */
export let reportError = function( errorMessage ) {
    logger.warn( 'awRowColumnService:' + errorMessage );
};

exports = {
    constants,
    initRowOrColumn,
    addNewElement,
    setAreaStyle,
    isLastChild,
    getFillData,
    getAreaList,
    getAreaData,
    getAreaUserAttributes,
    getSizeDataFromAttribute,
    reportError
};
export default exports;
/**
 * This service is used by <aw-row> and <aw-column> to initialize the flexbox sizing attributes for all rows and
 * columns within the grid system. And to establish elements to implement offsets, align-contents (start, center, end) and justification options.
 *
 * @memberof NgServices
 * @member awRowColumnService
 */
app.factory( 'awRowColumnService', () => exports );
