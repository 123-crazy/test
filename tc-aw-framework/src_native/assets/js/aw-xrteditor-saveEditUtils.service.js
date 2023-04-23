// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 window,
 define
 */

/**
 * This module contains a controller that handles 'summary' location UI functions.
 *
 * @module js/aw-xrteditor-saveEditUtils.service
 * @class angular_module.myApp_summaryui
 * @memberOf angular_module
 */
import * as app from 'app';
import localStrg from 'js/localStorage';
import soaSvc from 'soa/kernel/soaService';
import 'js/aw-xrteditor-commandsUtils.service';

var self = {};

var exports = {};

export let initialize = function( cmd, $scope, $injector ) {
    self.cmd = cmd;
    self.$scope = $scope;
    self.$injector = $injector;

    if( $scope ) {
        $scope.$watch( 'editing', function( newVal ) {
            cmd.visible = newVal;
        } );
    }
};

export let execute = function() {
    self.$injector.invoke( [ 'messagingService', function( messagingService ) {
        var datasetObjectValue;
        if( self.$scope.stylesheetContext.datasetName === self.$scope.previousDataSetName ) {
            datasetObjectValue = self.$scope.datasetObject;
        }
        var request = {
            dsInfo: {
                datasetObject: datasetObjectValue,
                stylesheetContext: self.$scope.getStylesheetContextFromBreadcrumbs(),
                xrt: self.$scope.aceModel
            }
        };

        //Save the XRT unless the syntax is not valid
        if( !self.$scope.editor.session.$annotations || self.$scope.editor.session.$annotations.length === 0 ) {
            soaSvc.post( 'Internal-AWS2-2016-03-DataManagement', 'saveXRT', request ).then(
                function() {
                    messagingService.showInfo( 'Saved' );
                    localStrg.publish( 'saveXRT', JSON.stringify( request.dsInfo.stylesheetContext ) );

                    self.$scope.editing = false;
                    self.$scope.editor.setReadOnly( true );
                },
                function( errObj ) {
                    var msg = errObj;
                    // default to the full Error object, but if there is a message prop, use that.
                    if( errObj && errObj.message ) {
                        msg = errObj.message;
                    }
                    messagingService.showError( msg );
                } );
            self.$scope.$evalAsync();
        } else {
            messagingService.showError( 'Invalid XRT' );
        }
    } ] );
};

export default exports = {
    initialize,
    execute
};
