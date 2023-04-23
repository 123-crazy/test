// Copyright (c) 2020 Siemens

/**
 * This is the 'base' module for Universal Widgets. Loading this module results in the loading of most of the basic
 * AngularJS widget directives plus any related &#42;.controller, &#42;Service and &#42;Utils modules, specifically:
 *
 * <pre>
 * 'js/aw-autofocus.directive'
 * 'js/aw-parse-html.directive'
 * 'js/aw-property-array-edit-val.directive'
 * 'js/aw-property-array-val.directive'
 * 'js/aw-property-boolean.directive'
 * 'js/aw-property-checkbox-val.directive'
 *  'js/aw-checkbox-list.directive'
 * 'js/aw-property-error.directive'
 * 'js/aw-property-image.directive'
 * 'js/aw-property-label.directive'
 * 'js/aw-property-native-table-prop-val.directive'
 * 'js/aw-property-non-edit-array-val.directive'
 * 'js/aw-property-non-edit-val.directive'
 * 'js/aw-property-integer-val.directive'
 * 'js/aw-property-double-val.directive'
 * 'js/aw-property-numeric.directive'
 * 'js/aw-property-object-val.directive'
 * 'js/aw-property-radio-button-val.directive'
 * 'js/aw-property-rendering-hint.directive'
 * 'js/aw-property-rich-text-area-val.directive'
 * 'js/aw-property-string-val.directive'
 * 'js/aw-property-string.directive'
 * 'js/aw-property-text-area-val.directive'
 * 'js/aw-property-text-box-val.directive'
 * 'js/aw-property-tri-state-val.directive'
 * 'js/aw-property-toggle-button-val.directive'
 * 'js/aw-property-val.directive'
 * 'js/aw-validator.directive'
 * 'js/aw-widget-initialize.directive'
 * //
 * 'js/aw.property.controller'
 * //
 * 'js/uwDirectiveDateTimeService'
 * 'js/uwDirectiveLovUtils'
 * </pre>
 *
 * @module js/uwDirectiveBaseUtils
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import ngUtils from 'js/ngUtils';
import 'js/aw-autofocus.directive';
import 'js/aw-parse-html.directive';
import 'js/aw-property-array-edit-val.directive';
import 'js/aw-property-array-val.directive';
import 'js/aw-property-boolean.directive';
import 'js/aw-property-checkbox-val.directive';
import 'js/aw-checkbox-list.directive';
import 'js/aw-property-error.directive';
import 'js/aw-property-image.directive';
import 'js/aw-property-label.directive';
import 'js/aw-property-native-table-prop-val.directive';
import 'js/aw-property-non-edit-array-val.directive';
import 'js/aw-property-non-edit-overflow-array-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-integer-val.directive';
import 'js/aw-property-double-val.directive';
import 'js/aw-property-numeric.directive';
import 'js/aw-property-object-val.directive';
import 'js/aw-property-radio-button-val.directive';
import 'js/aw-property-rendering-hint.directive';
import 'js/aw-property-rich-text-area-val.directive';
import 'js/aw-property-string-val.directive';
import 'js/aw-lov-edit.directive';
import 'js/aw-property-string.directive';
import 'js/aw-property-text-area-val.directive';
import 'js/aw-property-text-box-val.directive';
import 'js/aw-property-tri-state-val.directive';
import 'js/aw-property-toggle-button-val.directive';
import 'js/aw-property-date-time.directive';
import 'js/aw-property-date-val.directive';
import 'js/aw-property-date-time-val.directive';
import 'js/aw-property-time-val.directive';
import 'js/aw-datebox.directive';
import 'js/aw-property-val.directive';
import 'js/aw-validator.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw.property.controller';
import 'js/uwDirectiveDateTimeService';
import 'js/uwDirectiveLovUtils';

var exports = {};

/**
 * Initialize ('bootstrap') the angular system and create an angular controller on a new 'child' of the given
 * 'parent' element.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {String} innerHtml - String that defines the exact HTML content that will be added to the 'parent'
 *            element.
 *
 * @param {Object} cellData - Arbitrary object to be set as the primary 'scope' of the new angular controller.
 *            <P>
 *            Note: This object will have the 'rootScopeElement' property set on this object with the new AngularJS
 *            Element created to hold the compiled given 'innerHtml' and attached as a child to the given
 *            'parentElement'.
 *
 * @return {Void}
 */
export let insertNgPropVal = function( parentElement, innerHtml, cellData ) {
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     */
    var ctrlElement = ngModule
        .element( '<div class="aw-jswidgets-propertyVal" ng-controller="awPropertyController"></div>' );

    ctrlElement.html( innerHtml );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    var ctrlFn = ngUtils.include( parentElement, ctrlElement );

    if( ctrlFn ) {
        ctrlFn.setData( cellData );
    }
};

/**
 * Update error property of the related controller.
 *
 * @param {DOMElement} parentElement - The element above the element the controller was created on.
 *
 * @param {ViewModelProperty} uiProperty - UI Property Overlay object that will be updated in the context of the
 *            scope,
 *
 * @param {Object} error - boolean flag to isRequired.
 *
 * @return {Void}
 */
export let setError = function( parentElement, uiProperty, error ) {
    var ctrlElement = null;
    var ngScope = null;

    if( parentElement ) {
        ctrlElement = ngModule.element( parentElement.querySelector( '.aw-jswidgets-propertyVal' ) );
    }
    if( ctrlElement !== null ) {
        ngScope = ngModule.element( ctrlElement ).scope();
    }
    if( ngScope !== null && ngScope !== undefined ) {
        ngScope.$evalAsync( function() {
            var errors = ngModule.element( parentElement ).find( 'aw-property-error' );
            if( error !== '' && errors.length > 0 ) {
                var alreadySet = false;
                errors.each( function() {
                    if( ngModule.element( this ).scope().errorApi.errorMsg === error ) {
                        alreadySet = true;
                    }
                } );
                if( !alreadySet ) {
                    ngModule.element( errors ).scope().errorApi.errorMsg = error;
                }
            } else if( ngModule.element( errors ).scope() ) {
                ngModule.element( errors ).scope().errorApi.errorMsg = error;
            }
        } );
    }
};

/**
 * @param {Element} parentElement - The DOM element to retrieve scope.
 *
 * @return TRUE if the 'first child' of the given 'parent' element has currently
 */
export let hasScope = function( parentElement ) {
    if( parentElement && parentElement.firstChild ) {
        var contrScope = ngModule.element( parentElement.firstChild ).scope();
        if( contrScope && !contrScope.$$destroyed ) {
            return true;
        }
    }

    return false;
};

/**
 * Called when the hosting GWT PropertyWidget is 'unLoaded'. This method will call $destroy on the AngularJS 'scope'
 * associated with the property container's ng-controller.
 * <P>
 * Note: *** No further use of this controller is allowed (or wise) ***
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 *
 * @return {Void}
 */
export let destroyPropertyScope = function( parentElement ) {
    if( parentElement && parentElement.firstChild ) {
        var contrScope = ngModule.element( parentElement.firstChild ).scope();
        if( contrScope ) {
            contrScope.$destroy();
        }
    }
};

// data context getter functions...
var getIsRichText = function() {
    return this.nativeProp.propertyDescriptor.constantsMap.Fnd0RichText;
};

var getType = function() {
    var type;
    switch ( this.nativeProp.propertyDescriptor.propertyType ) {
        case 2:
            type = 'OBJECT';
            break;
        default:
            type = 'STRING';
    }
    return type;
};

var getUiValue = function() {
    if( this.nativeProp.uiValues ) {
        return this.nativeProp.uiValues.join( ', ' );
    }
};

var getDbValue = function() {
    if( this.nativeProp.dbValues ) {
        return this.nativeProp.dbValues.join( ', ' );
    }
};

var getIsNull = function() {
    return !this.nativeProp.uiValues;
};

//  TODO - remove for later Phase 1 UIGrid migration testing
//        var longString = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris volutpat nec dolor id"
//            + " ornare. Donec venenatis arcu lacus, quis tincidunt mauris dignissim sit amet. Mauris tempus luctus "
//            + "congue. Quisque velit lacus, faucibus eget lacus et, pellentesque rhoncus turpis. Donec condimentum "
//            + "dignissim fringilla. Nulla at pretium ipsum. Etiam nisl arcu, mattis non condimentum ac, finibus id "
//            + "urna. Mauris ac lectus porta metus placerat posuere. Donec vehicula eget purus eget commodo. Ut "
//            + "suscipit ex eget libero hendrerit efficitur. Nam elementum rhoncus sollicitudin. Phasellus fermentum "
//            + "neque nisl, a interdum quam dictum a.";

/**
 * Constructor for a JS data context Object. We create an entityDC and attach it the parent. The eDC then contains
 * all of the propDCs which are used to hold the Teamcenter prop, propDesc, and view state for HtmlPanel/AngularJS
 * data binding used by Universal Widgets.
 *
 * The propDC is the 3.1 replacement for the UICellValueOverlayJS.
 *
 * @constructor createDCJS
 *
 * <P>
 *
 * @param {Object} parentVM - parent view-model - represents the object
 * @param {String} uid - unique id
 * @param {Object} mo - model object data
 *
 * @return {Void}
 */
export let createDCJS = function( parentVM, uid, mo ) {
    parentVM.entityDC = {
        uid: uid,
        isSelected: false,
        propDCs: {}
    };

    if( mo && mo.props ) {
        for( var name in mo.props ) {
            var prop = mo.props[ name ];

            var propDC = {
                name: name,
                autofocus: '',
                editLayoutSide: '',
                error: '',
                isEditing: false,
                renderingHint: '',
                lovApi: {},
                propApi: {},
                nativeProp: prop,
                staticType: prop.propertyDescriptor.propertyType,
                whatAmI: 'propDC'
            };

            // move these prop defs to a prototype?
            Object.defineProperty( propDC, 'type', {
                get: getType
            } );

            Object.defineProperty( propDC, 'isRichText', {
                get: getIsRichText
            } );

            // temp - put lorem ipsum long text in description Phase 1 UIGrid migration testing
            // if( name === "object_desc" ) {
            // Object.defineProperty( propDC, 'uiValue', {
            // get: function() {
            // return longString;
            // }
            // } );
            // } else {
            // Object.defineProperty( propDC, 'uiValue', {
            // get: getUiValue
            // } );
            // }
            Object.defineProperty( propDC, 'uiValue', {
                get: getUiValue
            } );

            Object.defineProperty( propDC, 'isNull', {
                get: getIsNull
            } );

            Object.defineProperty( propDC, 'dbValue', {
                get: getDbValue
            } );

            parentVM.entityDC.propDCs[ name ] = propDC;
        }
    }
};

exports = {
    insertNgPropVal,
    setError,
    hasScope,
    destroyPropertyScope,
    createDCJS
};
export default exports;
