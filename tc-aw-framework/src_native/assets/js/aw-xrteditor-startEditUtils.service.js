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
 * @module js/aw-xrteditor-startEditUtils.service
 * @class angular_module.myApp_summaryui
 * @memberOf angular_module
 */
import * as app from 'app';
import ngModule from 'angular';
import propertyPolicyCache from 'js/aw-xrteditor-propertyPolicyCacheUtils.service';
import 'js/aw-xrteditor-commandsUtils.service';
import 'js/messagingService';
import 'soa/dataManagementService';
import 'soa/kernel/propertyPolicyService';
import 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';

var self = {};

/**
 * updateOrCreateEditPolicyForType
 *
 * @param {Object} typePolicy -
 *
 * @return {String} ID of the policy just registered
 */
self.updateOrCreateEditPolicyForType = function( propertyPolicyService, typePolicy ) {
    for( var i = 0; i < propertyPolicyCache.summaryEdit.types.length; i++ ) {
        if( propertyPolicyCache.summaryEdit.types[ i ].name === typePolicy.name ) {
            propertyPolicyCache.summaryEdit.types.splice( i, 1 );
            break;
        }
    }

    propertyPolicyCache.summaryEdit.types.push( typePolicy );

    return propertyPolicyService.register( propertyPolicyCache.summaryEdit );
};

var exports = {};

export let initialize = function( cmd, $scope, $injector ) {
    self.cmd = cmd;
    self.$scope = $scope;
    self.$injector = $injector;
    cmd.visible = true;

    if( $scope ) {
        $scope.$watch( 'editing', function( newVal ) {
            cmd.visible = !newVal;
            appCtxService.updateCtx( 'XRTEditor.edit', { editing: newVal } );
        } );
    }
};

export let execute = function() {
    self.$injector.invoke( [
        'soa_dataManagementService',
        'soa_kernel_propertyPolicyService',
        'messagingService',
        'soa_kernel_clientDataModel',
        function( dataManagementService, propertyPolicyService, messagingService, cdm ) {
            self.$scope.previousTreeData = ngModule.copy( self.$scope.dataForTheTree );
            var groupName = cdm.getUserSession().props.group_name.dbValues[ '0' ];
            var user = cdm.getUserSession().props.user_id.uiValues[ '0' ];
            var userSuffix = '_' + user;
            self.$scope.previousDataSetName = self.$scope.stylesheetContext.datasetName;
            self.$scope.editing = true;

            self.$scope.$broadcast( 'editChanged', { editing: true } );

            self.$scope.editor.setReadOnly( false );
            if( self.$scope.matchedNode ) {
                self.$scope.previousEditorLineNumber = self.$scope.matchedNode.editorLineNumber;
            }
            self.$scope.previousStylesheetContext = self.$scope
                .copyStylesheetContext( self.$scope.stylesheetContext );
            if( groupName !== 'dba' ) {
                self.$scope.stylesheetContext.preferenceLocation = 'User';
                if( !self.$scope.stylesheetContext.datasetName.includes( userSuffix ) ) {
                    self.$scope.stylesheetContext.datasetName += userSuffix;
                }
            }

            self.$scope.setBreadcrumbsFromStylesheetContext( self.$scope.stylesheetContext );

            self.$scope.$evalAsync();
        }
    ] );
};

export default exports = {
    initialize,
    execute
};
