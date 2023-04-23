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
 * @module js/aw-walker-classificationtrace.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/aw-property-non-edit-val.directive';

/**
 * Directive to display panel body.
 * 
 * @example <aw-walker-classificationtrace></aw-walker-classificationtrace>
 * 
 * @member aw-walker-classificationtrace
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerClassificationtrace', [
    'uwPropertyService',
    function( uwPropertySvc ) {
        return {
            restrict: 'E',
            scope: {
                classificationdata: '='
            },
            template: '<div ng-repeat="traceProp in props"> <aw-property-non-edit-val prop="traceProp" ></aw-property-non-edit-val> </div>',
            link: function( $scope ) {
                var props = [];
                _.forEach( $scope.classificationdata.classificationTraces, function( classificationTrace ) {
                    var tempProp = uwPropertySvc.createViewModelProperty( null, null, 'STRING',
                        classificationTrace, [ classificationTrace ] );
                    props.push( tempProp );
                } );
                $scope.props = props;
            }
        };
    }
] );
