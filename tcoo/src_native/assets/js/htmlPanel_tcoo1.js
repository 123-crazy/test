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
 * This module contains a controller that handles everything that is required by Office online.
 *
 * @module js/htmlPanel_tcoo1
 */
import * as app from 'app';
import 'soa/kernel/soaService';

app.controller( "tcooController", [ '$scope', '$sce', 'soa_kernel_soaService', function( $scope, $sce, soaService ) {
    //Initialize to null
    var launchInfoInput = {
        inputs: [ {
            clientId: "",
            obj: "",
            action: "",
            extraInfo: ""
        } ]
    };

    //Prepare container
    launchInfoInput.inputs[ 0 ].action = "view";
    launchInfoInput.inputs[ 0 ].obj = $scope.$parent.$parent.selected;
    launchInfoInput.inputs[ 0 ].clientId = launchInfoInput.inputs[ 0 ].action + launchInfoInput.inputs[ 0 ].obj.properties.object_string.dbValue;
    launchInfoInput.inputs[ 0 ].extraInfo = "";
    //Call service
    soaService.post( 'OfficeOnline-2017-11-OfficeOnline', 'getLaunchInfo', launchInfoInput ).then( function( response ) {
        return response;
    }, function( data ) {
        console.log( 'getLaunchInfo Whoops' + data );
    } ).then( function( response2 ) {
        $scope.url = $sce.trustAsResourceUrl( response2.outputs[ 0 ].oosUrlString );
    } );
} ] );
