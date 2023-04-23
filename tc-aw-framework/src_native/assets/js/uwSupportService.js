// Copyright (c) 2020 Siemens

/**
 * This module provides access to service APIs that help various UW directives and controllers insert and manipulate DOM
 * elements.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module are
 * injected by AngularJS.
 *
 * @module js/uwSupportService
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import ngUtils from 'js/ngUtils';

var exports = {};

/**
 * Retrieves directive template string based on the type and hint provided.
 *
 * @param {ViewModelProperty} prop - property overlay
 * @param {String} hint - property rendering hint
 *
 * @return {String} Returns directive template
 */
export let getTemplateBasedOnType = function( vmProp, hint ) {
    var innerHtml = '';
    switch ( vmProp.type ) {
        case 'CHAR':
        case 'STRING':
            if( hint === 'editLov' ) {
                innerHtml = '<aw-lov-edit prop="prop"></aw-lov-edit>';
                break;
            }

            if( hint === 'password' ) {
                vmProp.inputType = hint;
            }
            innerHtml = '<aw-property-string-val prop="prop"></aw-property-string-val>';
            break;

        case 'STRINGARRAY':
            innerHtml = '<aw-property-string-val prop="prop"></aw-property-string-val>';
            break;

        case 'OBJECT':
        case 'OBJECTARRAY':
            innerHtml = '<aw-property-object-val prop="prop"></aw-property-object-val>';
            break;

        case 'DATE':
        case 'DATEARRAY':
            innerHtml = '<aw-property-date-time-val prop="prop"></aw-property-date-time-val>';
            break;

        case 'INTEGER':
        case 'INTEGERARRAY':
            innerHtml = '<aw-property-integer-val prop="prop"></aw-property-integer-val>';
            break;

        case 'DOUBLE':
        case 'DOUBLEARRAY':
            innerHtml = '<aw-property-double-val prop="prop"></aw-property-double-val>';
            break;

        case 'BOOLEAN':
        case 'BOOLEANARRAY':
            switch ( hint ) {
                case 'radiobutton':
                    innerHtml = '<aw-property-radio-button-val prop="prop"></aw-property-radio-button-val>';
                    break;

                case 'togglebutton':
                    innerHtml = '<aw-property-toggle-button-val prop="prop"></aw-property-toggle-button-val>';
                    break;

                case 'triState':
                    innerHtml = '<aw-property-tri-state-val prop="prop"></aw-property-tri-state-val>';
                    break;

                default:
                    innerHtml = '<aw-property-checkbox-val prop="prop"></aw-property-checkbox-val>';
                    break;
            }
            break;

        default:
            innerHtml = '<aw-property-non-edit-val prop="prop"></aw-property-non-edit-val>';
            break;
    }

    return innerHtml;
};

/**
 * Set initialize property of the related controller.
 *
 * @param {Element} jqParentElement - The element above the element the controller was created on.
 *
 * @param {Element} element - The element above the element the controller was created on.
 *
 * @param {ViewModelProperty} vmProp - The ViewModelProperty containing the data to base the inserted structure
 *            upon.
 *
 * @return {Void}
 */
export let includeArrayPropertyValue = function( jqParentElement, element, vmProp ) {
    var previousScopeElement = '';
    var renderingHint = null;

    if( vmProp.renderingHint ) {
        renderingHint = vmProp.renderingHint;
    } else if( vmProp.hint ) {
        renderingHint = vmProp.hint;
    }

    previousScopeElement = $( element ).find( '.aw-jswidgets-property' );

    var innerHtml = exports.getTemplateBasedOnType( vmProp, renderingHint );

    // destroying scope of previous element
    if( previousScopeElement ) {
        var contrScope = previousScopeElement.scope();
        if( contrScope ) {
            contrScope.$destroy();
            previousScopeElement.remove();
        }
    }

    exports.insertNgProp( jqParentElement, innerHtml, vmProp );
};

/**
 * Set initialize property of the related controller.
 *
 * @param {Boolean} isEditable - boolean flag to isEditable.
 *
 * @param {Element} jqParentElement - The element above the element the controller was created on.
 *
 * @param {Element} element - The element above the element the controller was created on.
 *
 * @param {ViewModelProperty} vmProp - The ViewModelProperty containing the data to base the inserted structure
 *            upon.
 * @param {Boolean} inTableCell - boolean flag to inTableCell Context.
 *
 * @param {Boolean} modifiable - Modifiable flag - false if property should never enter edit mode
 *
 * @param {Boolean} inTableCell - The inTableCell is used to show the popup nad edit in table cell for array
 */
export let includePropertyValue = function( isEditable, jqParentElement, element, vmProp, modifiable, inTableCell ) { // eslint-disable-line complexity
    var previousScopeElement = '';
    var innerHtml = '';
    var propertyContainer = $( element ).closest( '.aw-widgets-propertyContainer' );

    // non editable case
    if( !isEditable || vmProp.renderingHint === 'label' || vmProp.renderingHint === 'overflow' || modifiable === false ) {
        if( vmProp.isArray ) {
            if( vmProp.renderingHint === 'overflow' ) {
                innerHtml = '<aw-property-non-edit-overflow-array-val prop="prop"></aw-property-non-edit-overflow-array-val>';
            } else {
                innerHtml = '<aw-property-non-edit-array-val prop="prop"></aw-property-non-edit-array-val>';
            }
        } else {
            innerHtml = '<aw-property-non-edit-val prop="prop"></aw-property-non-edit-val>';
        }

        previousScopeElement = $( element ).find( '.aw-jswidgets-property' );

        if( vmProp.propertyLabelDisplay === 'PROPERTY_LABEL_AT_TOP' ) {
            if( propertyContainer.hasClass( 'aw-layout-flexRow' ) ) {
                propertyContainer.removeClass( 'aw-layout-flexRow' );
            }
        } else {
            if( !propertyContainer.hasClass( 'aw-layout-flexRow' ) ) {
                propertyContainer.addClass( 'aw-layout-flexRow' );
            }
        }
    } else {
        // edit case
        if( vmProp.editLayoutSide ) {
            // override for cases where edit property is horizontal
            if( !propertyContainer.hasClass( 'aw-layout-flexRow' ) ) {
                propertyContainer.addClass( 'aw-layout-flexRow' );
            }
        } else {
            if( propertyContainer.hasClass( 'aw-layout-flexRow' ) ) {
                propertyContainer.removeClass( 'aw-layout-flexRow' );
            }
        }

        previousScopeElement = $( element ).find( '.aw-widgets-propertyNonEditValue' );
        if( !previousScopeElement.scope() ) {
            previousScopeElement = $( element ).find( '.aw-jswidgets-property' );
        }

        var renderingHint = null;
        if( vmProp.renderingHint ) {
            renderingHint = vmProp.renderingHint;
        } else if( vmProp.hint ) {
            renderingHint = vmProp.hint;
        }

        if( vmProp.isArray ) {
            if( vmProp.renderingHint === 'checkboxoptionlov' ) {
                innerHtml = '<aw-checkbox-list prop="prop"></aw-checkbox-list>';
            } else {
                if( inTableCell ) {
                    innerHtml = '<aw-property-array-val prop="prop" in-table-cell="true"></aw-property-array-val>';
                } else {
                    innerHtml = '<aw-property-array-val prop="prop"></aw-property-array-val>';
                }
            }
        } else {
            innerHtml = exports.getTemplateBasedOnType( vmProp, renderingHint );
        }
    }

    // destroying scope of previous element
    if( previousScopeElement ) {
        var contrScope = previousScopeElement.scope();
        if( contrScope ) {
            contrScope.$destroy();
            previousScopeElement.remove();
        }
    }

    exports.insertNgProp( jqParentElement, innerHtml, vmProp );
};

/**
 * Creates and includes (i.e. 'compiles') an AngularJS directive on a new 'child' of the given 'parent' element.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {String} innerHtml - String that defines the exact HTML content that will be added to the 'parent'
 *            element.
 *
 * @param {Object} vmProp - Arbitrary object to be set as the primary 'scope' of the new AngularJS controller.
 *            <P>
 *            Note: This object will have the 'rootScopeElement' property set on this object with the new AngularJS
 *            Element created to hold the given (now compiled) 'innerHtml' and attached as a child to the given
 *            'parentElement'.
 *
 * @return {Void}
 */
export let insertNgProp = function( parentElement, innerHtml, vmProp ) { // eslint-disable-line no-unused-vars
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     */
    var ctrlElement = ngModule.element( '<div class="aw-jswidgets-property" ></div>' );

    ctrlElement.html( innerHtml );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    ngUtils.include( parentElement, ctrlElement );

    // /**
    //  * Note: We do not want to set data on this 'child' element since we want that data to be inherited from its
    //  * parent. The following line is kept for reference since the 'parent' insert code looks so similar this
    //  * might be mistaken as a bug.
    //  */
    // if (ctrlFn) {
    //    ctrlFn.setData(vmProp);
    // }
};

/**
 * Retrieve property label display based off rendering style parameter
 *
 * @param {String} renderingStyle - rendering style titled/headless
 * @return {String} label display to side/top/no property label
 */
export let retrievePropertyLabelDisplay = function( renderingStyle ) {
    var labelDisplay = 'PROPERTY_LABEL_AT_SIDE';

    if( renderingStyle ) {
        if( renderingStyle.toLowerCase() === 'titled' ) {
            labelDisplay = 'PROPERTY_LABEL_AT_TOP';
        } else if( renderingStyle.toLowerCase() === 'headless' ) {
            labelDisplay = 'NO_PROPERTY_LABEL';
        }
    }

    return labelDisplay;
};

exports = {
    getTemplateBasedOnType,
    includeArrayPropertyValue,
    includePropertyValue,
    insertNgProp,
    retrievePropertyLabelDisplay
};
export default exports;
/**
 * This service provides access to APIs that help various UW directives and controllers insert and manipulate DOM
 * elements.
 *
 * @member uwSupportService
 * @memberof NgServices
 */
app.factory( 'uwSupportService', () => exports );
