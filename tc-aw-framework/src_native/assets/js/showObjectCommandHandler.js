// Copyright (c) 2020 Siemens

/**
 * This is the command handler for show object command which is contributed to cell list.
 *
 * @module js/showObjectCommandHandler
 */
import app from 'app';
import commandsMapSvc from 'js/commandsMapService';
import cdm from 'soa/kernel/clientDataModel';
import pasteSvc from 'js/pasteService';
import adapterSvc from 'js/adapterService';
import commandSvc from 'js/command.service';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Cached CommandsMapService
 */

/**
 * Cached AdapterService
 */

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
function _setCommandContextIn( context, $scope ) {
    if( !commandsMapSvc.isInstanceOf( 'Dataset', context.modelType ) &&
        !commandsMapSvc.isInstanceOf( 'Folder', context.modelType ) ) {
        $scope.cellCommandVisiblilty = true;
    } else {
        $scope.cellCommandVisiblilty = false;
    }
}

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
function _setCommandContextIn2( context, $scope ) {
    if( !commandsMapSvc.isInstanceOf( 'Folder', context.modelType ) ) {
        $scope.cellCommandVisiblilty = true;
    } else {
        $scope.cellCommandVisiblilty = false;
    }
}

/**
 * Internal function to execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} dataCtxNode - scope object in which isVisible and isEnabled flags needs to be set.
 * @param {Boolean} openInEditMode - Flag to indicate whether to open in edit mode.
 */
function _executeAction( vmo, dataCtxNode, openInEditMode ) {
    if( vmo && vmo.uid ) {
        if( !openInEditMode ) {
            var modelObject = cdm.getObject( vmo.uid );

            var commandContext = {
                vmo: modelObject || vmo, // vmo needed for gwt commands
                edit: false
            };

            commandSvc.executeCommand( 'Awp0ShowObjectCell', null, null, commandContext );
        } else {
            if( vmo && vmo.uid ) {
                var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                var toParams = {};
                var options = {};

                toParams.uid = vmo.uid;
                if( openInEditMode ) {
                    toParams.edit = 'true';
                }
                options.inherit = false;

                AwStateService.instance.go( showObject, toParams, options );
            }
        }
    }
}

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    if( context.type === 'Awp0XRTObjectSetRow' ) {
        var adaptedObjsPromise = adapterSvc.getAdaptedObjects( [ $scope.vmo ] );
        adaptedObjsPromise.then( function( adaptedObjs ) {
            _setCommandContextIn( adaptedObjs[ 0 ], $scope );
        } );
    } else {
        _setCommandContextIn( context, $scope );
    }
};

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext2 = function( context, $scope ) {
    if( context.type === 'Awp0XRTObjectSetRow' ) {
        var adaptedObjsPromise = adapterSvc.getAdaptedObjects( [ $scope.vmo ] );
        adaptedObjsPromise.then( function( adaptedObjs ) {
            _setCommandContextIn( adaptedObjs[ 0 ], $scope );
        } );
    } else {
        _setCommandContextIn2( context, $scope );
    }
};

/**
 * Paste the 'sourceObjects' onto the 'targetObject' with the given 'relationType' and then open the 'createdObject'
 * in edit mode.
 *
 * @param {ModelObject} targetObject - The 'target' IModelObject for the paste.
 * @param {ModelObjectArray} sourceObjects - Array of 'source' IModelObjects to paste onto the 'target'
 *            IModelObject.
 * @param {String} relationType - Relation type name (object set property name)
 * @param {ViewModelObject} createdObject - Context for the command used in evaluating isVisible, isEnabled and
 *            during execution.
 * @param {Boolean} openInEditMode - Flag to indicate whether to open in edit mode.
 */
export let addAndEdit = function( targetObject, sourceObjects, relationType, createdObject ) {
    pasteSvc.execute( targetObject, sourceObjects, relationType ).then( function() {
        exports.execute( createdObject, null, true );
    } );
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} dataCtxNode - scope object in which isVisible and isEnabled flags needs to be set.
 * @param {Boolean} openInEditMode - Flag to indicate whether to open in edit mode.
 */
export let execute = function( vmo, dataCtxNode, openInEditMode ) {
    if( vmo.type === 'Awp0XRTObjectSetRow' ) {
        var adaptedObjsPromise = adapterSvc.getAdaptedObjects( [ vmo ] );
        adaptedObjsPromise.then( function( adaptedObjs ) {
            _executeAction( adaptedObjs[ 0 ], dataCtxNode, openInEditMode );
        } );
    } else {
        _executeAction( vmo, dataCtxNode, openInEditMode );
    }
};

exports = {
    setCommandContext,
    setCommandContext2,
    addAndEdit,
    execute
};
export default exports;
/**
 * Show object command handler service which sets the visibility of the command in cell list based off object type.
 * This command is visible for all the object types except 'Dataset' and 'Folder'.
 *
 * @memberof NgServices
 * @member showObjectCommandHandler
 */
app.factory( 'showObjectCommandHandler', () => exports );
