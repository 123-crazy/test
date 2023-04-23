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
 * @module js/Psi0ProgramDiagramming
 */
import app from 'app';
import selectionService from 'js/selection.service';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * Populates the input values of properties of the object being created.
 * 
 * @param {object} data - The qualified data of the viewModel.
 */
export let populatePropsForCreate = function( data ) {

    var properties = [ "object_name", "object_desc", "revision__psi0WorkEffort" ];

    data.revision__psi0WorkEffort.dbValue = ( data.revision__psi0WorkEffort.dbValue ).toString();

    data.objCreateInfo.propNamesForCreate = properties;

    return data;
};

export let getObjectTobeDeletedName = function() {

    var objToBeDeleted;
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        if( selection[ 0 ].type === 'Psi0WorkElementPDI' //
            ||
            selection[ 0 ].type === 'Psi0PredecessorWorkElement' ) {
            objToBeDeleted = selection[ 0 ].props.primary_object.uiValues[ 0 ] + '"->"' +
                selection[ 0 ].props.secondary_object.uiValues[ 0 ];
        } else if( selection[ 0 ].type === 'Psi0WorkElementRevision' ) {
            objToBeDeleted = selection[ 0 ].props.object_name.dbValues[ 0 ];
        }
    }

    return objToBeDeleted;
};

export let getObjectToBeDeleted = function() {

    var objToBeDeleted;
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {

        if( selection[ 0 ].type === 'Psi0WorkElementRevision' ) {
            var workElementUid = selection[ 0 ].props.items_tag.dbValues[ 0 ];
            objToBeDeleted = cdm.getObject( workElementUid );
        } else {
            objToBeDeleted = selection[ 0 ];
        }
    }

    return objToBeDeleted;
};

export default exports = {
    populatePropsForCreate,
    getObjectTobeDeletedName,
    getObjectToBeDeleted
};
/**
 * This factory creates a service and returns exports
 * 
 * @memberof NgServices
 * @member Psi0ProgramDiagramming
 */
app.factory( 'Psi0ProgramDiagramming', () => exports );
