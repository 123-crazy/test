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
 * Directive to display walker view
 * 
 * @module js/aw-walker-label.directive
 */
import * as app from 'app';
import 'js/aw-property-non-edit-val.directive';

/**
 * Directive to display panel body.
 * 
 * @example <aw-walker-label></aw-walker-label>
 * 
 * @member aw-walker-label
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerLabel', [
    'uwPropertyService',
    function( uwPropertySvc ) {
        return {
            restrict: 'E',
            scope: {
                labeldata: '='
            },
            template: '<aw-property-non-edit-val prop="prop" ></aw-property-non-edit-val>',
            link: function( $scope ) {
                $scope.prop = uwPropertySvc.createViewModelProperty( null, null, 'STRING',
                    $scope.labeldata.displayText, [ $scope.labeldata.displayText ] );
            }
        };
    }
] );
