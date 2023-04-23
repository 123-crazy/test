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
 * @module js/aw-xrteditor-cancelEditUtils.service
 */

'use strict';

var self = {};

var exports = {};

export let initialize = function( cmd, $scope, $injector ) {
    self.cmd = cmd;
    self.$scope = $scope;
    self.$injector = $injector;

    if( $scope ) {
        $scope.$watch( 'editing', function( newVal, oldVal ) {
            if( newVal ) {
                cmd.visible = true;
            } else {
                cmd.visible = false;
            }
        } );
    }
};

export let execute = function() {
    self.$injector.invoke( [ 'xrtDOMService', '$timeout', function( xrtDOMService, $timeout ) {
        self.$scope.editing = false;
        self.$scope.editor.setReadOnly( true );
        if( self.$scope.previousDataSetName ) {
            self.$scope.initialData.stylesheetContext.datasetName = self.$scope.previousDataSetName;
        }
        self.$scope.setupNewEditorPage( self.$scope.initialData );
    } ] );

};

export default exports = {
    initialize,
    execute
};
