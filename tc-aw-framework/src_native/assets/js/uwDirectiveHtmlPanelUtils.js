// Copyright (c) 2020 Siemens

/**
 * @module js/uwDirectiveHtmlPanelUtils
 */
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';
import logger from 'js/logger';
import uwPropertySvc from 'js/uwPropertyService';
import vmoSvc from 'js/viewModelObjectService';
import declUtils from 'js/declUtils';

import 'js/aw.html.panel.controller';
import 'js/aw-property.directive';
import 'js/aw-sortable.directive';
import 'js/aw-frame.directive';

/**
 * Setup to listen for changes in the CDM object set as the 'selected' object on the $scope of the htmlPanel
 * controller. When changes are detected, the 'selected' object's properties are updated with the up-to-date values.
 *
 * @param {Element} ctrlElement - The DOM Element where the htmlPanel controller is attached.
 */
function _setupUpdate( ctrlElement ) {
    if( ctrlElement ) {
        var $scope = ctrlElement.scope();

        if( $scope ) {
            /**
             * Subscribe to CDM modification events.
             */
            $scope.subDef = eventBus.subscribe( 'cdm.modified', function( eventData ) {
                /**
                 * Locate the $scope and 'selected' objects on the htmlPanel controller.
                 */
                var htmlPanelScope = $scope.$parent;

                if( htmlPanelScope && htmlPanelScope.selected ) {
                    var selectedObj = htmlPanelScope.selected;
                    var selectedUid = selectedObj.uid;

                    /**
                     * Look throught the modified oebjects to see if one of them is for the 'selected' object.
                     */
                    _.forEach( eventData.modifiedObjects, function( modObj ) {
                        if( modObj.uid === selectedUid ) {
                            /**
                             * Create a new ViewModelObject for the CDM object and copy all of its
                             * ViewModelProerties to the htmlPanel's 'selected' object.
                             */

                            var modVMO = vmoSvc.createViewModelObject( modObj );

                            _.forEach( modVMO.props, function( modProp, propName ) {
                                var selProp = selectedObj.properties[ propName ];

                                if( selProp ) {
                                    uwPropertySvc.copyModelData( selProp, modProp );
                                    /**
                                     * copyModelData doesn't set isEditable flag and that is the reason we have to
                                     * set it explicitly
                                     */
                                    selProp.isEditable = selProp.isEditable && modProp.editable &&
                                        modProp.isPropertyModifiable;
                                } else {
                                    modProp.isEditable = false;
                                    modProp.editable = false;

                                    selectedObj.properties[ propName ] = modProp;
                                }
                            } );

                            return false;
                        }
                    } );
                }
            } );

            /**
             * Setup to remove the eventBus subscription when the $scope is destroyed.
             */
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( $scope.subDef );
            } );
        }
    }
}

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
 * @param {String} depModule - Relative path to a JavaScrict module resource to be loaded before the contents of the
 *            'innerHtml' have been added to the 'parent' element. If this module exports any object (e.g. with API
 *            or data), that object will be added as the 'depModule' property to the '$scope' object. This object is
 *            passed to the 'setData' method on the new 'awHtmlPanelController'. This controller is added as a
 *            'child' element to the 'parent'.
 *
 * @param {Object} jsObject - Arbitrary object to be set as the primary 'scope' (i.e. 'context') of the new
 *            AngularJS controller.
 *
 * @return {Void}
 */
export let insertPanel = function( parentElement, innerHtml, depModule, jsObject ) {
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     */
    var ctrlElement = ngModule
        .element( '<div class="aw-jswidgets-htmlPanel" ng-controller="awHtmlPanelController"></div>' );

    ctrlElement.html( innerHtml );

    var jqParentElement = $( parentElement );

    jqParentElement.empty();
    jqParentElement.append( ctrlElement );

    /**
     * Check if we are being asked to load a dependent module before we actually include the HTML into the DOM using
     * AngularJS' compile feature.<BR>
     * If so: Load the module and then 'include' the contents.<BR>
     * If not: Immediately 'include' the contents.
     */
    if( depModule && depModule.length > 0 ) {
        declUtils.loadDependentModule( depModule ).then( function( depModuleObj ) {
            /**
             * Check if the dependent module exported something.<BR>
             * If so: Pass that along as a 'decoration' to the given (or locally new) $scope object.
             */
            var jsObjectFinal = jsObject;

            if( depModuleObj ) {
                if( !jsObjectFinal ) {
                    jsObjectFinal = {};
                }

                jsObjectFinal.depModule = depModuleObj;
            }

            ngUtils.include( parentElement, ctrlElement, null, null, jsObjectFinal );

            _setupUpdate( ctrlElement );
        } );
    } else {
        ngUtils.include( parentElement, ctrlElement, null, null, jsObject );

        _setupUpdate( ctrlElement );
    }
};

/**
 * Called when the hosting GWT XRTHtmlPanelView is 'hidden'. This method will call $destroy on the AngularJS 'scope'
 * associated with the ng-controller.
 * <P>
 * Note: *** No further use of this controller is allowed (or wise) ***
 *
 * @param {Element} parentElement - The element above the element the controller was created on.
 */
export let unLoadHtmlPanel = function( parentElement ) {
    var ctrlElement = ngModule.element( parentElement.querySelector( '.aw-jswidgets-htmlPanel' ) );

    if( ctrlElement ) {
        var ngScope = ngModule.element( ctrlElement ).scope();

        if( ngScope ) {
            ngScope.$destroy();
        }
    }
};

/**
 * Update editLayoutSide property of the related controller.
 *
 * @param {Element} parentElement - The element above the element the controller was created on.
 *
 * @param {UIPropertyOverlayJS} uiProperty - UI Property Overlay object that will be updated in the context of the
 *            scope,
 *
 * @param {boolean} editLayoutSide -Boolean value of property editLayoutSide.
 *
 * @return {Void}
 */
export let setEditLayoutSide = function( parentElement, uiProperty, editLayoutSide ) {
    var ctrlElement = ngModule.element( parentElement.querySelector( '.aw-jswidgets-htmlPanel' ) );

    if( ctrlElement ) {
        var ngScope = ngModule.element( ctrlElement ).scope();

        if( ngScope !== null && ngScope !== undefined ) {
            ngScope.$evalAsync( function() {
                uiProperty.editLayoutSide = editLayoutSide;
            } );
        }
    } else {
        logger.error( 'Unable to relocate angular controller on \'parent\' element' );
    }
};

exports = {
    insertPanel,
    unLoadHtmlPanel,
    setEditLayoutSide
};
export default exports;
