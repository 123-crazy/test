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
 * @module js/aw-walker-classificationproperties.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property.directive';

/**
 * Directive to display panel body.
 * 
 * @example <aw-walker-classificationproperties></aw-walker-classificationproperties>
 * 
 * @member aw-walker-classificationproperties
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerClassificationproperties', [
    'uwPropertyService',
    function( uwPropertySvc ) {
        return {
            restrict: 'E',
            scope: {
                classificationdata: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-walker-classificationproperties.directive.html',
            link: function( $scope ) {
                $scope.classData = [];
                _.forEach( $scope.classificationdata.classifications, function( classification ) {
                    var classTrace = uwPropertySvc.createViewModelProperty( null, null, 'STRING',
                        classification.classificationTrace, [ classification.classificationTrace ] );

                    var classProps = [];
                    _.forEach( classification.classificationProperties,
                        function( classificationProp ) {

                            var attrType = 'STRING';
                            var isArray = Array.isArray( classificationProp.value );
                            if( isArray ) {
                                attrType = 'STRINGARRAY';
                            }

                            var prop = uwPropertySvc.createViewModelProperty( classificationProp.name,
                                classificationProp.name, attrType, classificationProp.value,
                                classificationProp.value );

                            if( isArray ) {
                                uwPropertySvc.setIsArray( prop, isArray );
                            }
                            classProps.push( prop );
                        } );

                    var data = {
                        trace: classTrace,
                        props: classProps
                    };
                    $scope.classData.push( data );
                } );

            }
        };
    }
] );
