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
 * Directive to extract object name information from partial error.
 * 
 * @module js/aw-partial-error.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'soa/kernel/clientDataModel';
import 'js/messagingService';

/**
 * Directive to extract object name information from partial error and renders an element with a string combined
 * with objectName and message information passed
 * 
 * @example <aw-partial-error partialError="partError" message="msg"></aw-partial-error>
 * 
 * @member aw-partial-error
 * @memberof NgElementDirectives
 */
app.directive( 'awPartialError', [
    'soa_kernel_clientDataModel',
    'messagingService',
    function( cdm, messagingSvc ) {
        return {
            restrict: 'E',
            scope: {
                partialError: '=',
                message: '@'
            },
            template: '<div>{{localizedMessage}}</div>',
            link: function( $scope ) {
                if( $scope.partialError && $scope.partialError.uid ) {
                    var modelObject = cdm.getObject( $scope.partialError.uid );
                    if( modelObject.props ) {
                        var objectName = modelObject.props.object_string.uiValues[ 0 ];
                        var errorMsgs = [];
                        var reason = '';
                        _.forEach( $scope.partialError.errorValues, function( errorValue ) {
                            if( errorValue ) {
                                errorMsgs.push( errorValue.message );
                            }
                        } );

                        if( !_.isEmpty( errorMsgs ) ) {
                            reason = errorMsgs.join( '' );
                        }

                        $scope.localizedMessage = messagingSvc.applyMessageParams( $scope.message, [
                            "{{objectName}}", "{{reason}}"
                        ], {
                            'objectName': objectName,
                            'reason': reason
                        } );
                    }
                }
            }
        };
    }
] );
