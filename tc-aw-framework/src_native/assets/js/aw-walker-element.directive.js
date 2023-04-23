// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to display walker element
 * 
 * @module js/aw-walker-element.directive
 */
import * as app from 'app';
import 'js/viewModelObjectService';
import 'js/aw-walker-property.directive';
import 'js/aw-walker-objectset.directive';
import 'js/aw-walker-label.directive';
import 'js/aw-walker-image.directive';
import 'js/aw-panel-section.directive';
import 'js/aw-column.directive';
import 'js/aw-walker-htmlpanel.directive';
import 'js/aw-walker-tableproperty.directive';
import 'js/aw-walker-namevalueproperty.directive';
import 'js/aw-break.directive';
import 'js/aw-separator.directive';
import 'js/exist-when.directive';
import 'js/aw-repeat.directive';
import 'js/aw-walker-command.directive';
import 'js/aw-walker-classificationproperties.directive';
import 'js/aw-walker-classificationtrace.directive';

/**
 * Directive to display walker element
 * 
 * @example <aw-walker-element></aw-walker-element>
 * 
 * @member aw-walker-element
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerElement', [ function() {
    /**
     * Controller used for prop update or pass in using &?
     * 
     * @param {Object} $scope - The allocated scope for this controller
     */
    function myController( $scope, viewModelObjectSvc ) {
        if( $scope.viewModel && $scope.viewModel._vmo ) {
            viewModelObjectSvc.updateViewModelObject( $scope.viewModel._vmo );
        }
    }

    myController.$inject = [ '$scope', 'viewModelObjectService' ];

    return {
        restrict: 'E',
        scope: {
            elemdata: '=',
            viewModel: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-element.directive.html',
        controller: myController
    };
} ] );
