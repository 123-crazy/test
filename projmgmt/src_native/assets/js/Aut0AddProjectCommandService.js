// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * A service that has util methods which can be use in other js files
 *
 * @module js/Aut0AddProjectCommandService
 */

import app from 'app';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import uwPropSvc from 'js/uwPropertyService';

var exports = {};
/**
 * This method is used to get the LOV values of Project Categories for the add project panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getProjectCategoryList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );
};

/**
 * This function will add the newly created project in project list.
 * And add it on top in primary work area and selects.
 * @param {Object} eventData event data which contains the newly created project & flag if the panel is unpinned
 * @param {Object} dataProvider dataProvider which needs to be updated
 */
export let addProjectToProvider = function( eventData, dataProvider ) {
    var newProjects = [ eventData.project ];
    if( newProjects.length > 0 ) {
        dataProvider.viewModelCollection.setTotalObjectsFound( newProjects.length );
        dataProvider.viewModelCollection.updateModelObjects( newProjects, null, true, true );
        if( eventData.isUnPinned ) {
            dataProvider.selectionModel.setSelection( newProjects[0] );
        }
        dataProvider.noResults = dataProvider.viewModelCollection.loadedVMObjects === 0;
    }
};

/**
 * Return true if the Program is selected else false.
 */
export let isProgram = function( projectSelected ) {
    if( projectSelected ) {
        return false;
    }
    return true;
};

/**
 * Return the newly created project from the SOA response.
 */
export let getCreatedProject = function( response ) {
    var createdProject;
    if( response.created && response.created[0] ) {
        createdProject = cdm.getObject( response.created[0] );
    }
    return createdProject;
};

export let setSelectedProjectAndProperty = function( ctx, data ) {
    var selectedProject;
    if( ctx.pselected ) {
        selectedProject = ctx.pselected;
    } else {
        selectedProject = ctx.selected;
    }
    uwPropSvc.setValue( data.ProjectId, selectedProject.props.project_id.dbValue );
    uwPropSvc.setValue( data.ProjectName, selectedProject.props.project_name.dbValue );
    uwPropSvc.setValue( data.ProjectDesc, selectedProject.props.project_desc.dbValue );
    //Here the data.useProgramSecurity is having propertyRadioTrueText = Project & propertyRadioFalseText=Program
    uwPropSvc.setValue( data.useProgramSecurity, !selectedProject.props.use_program_security.dbValue );
    uwPropSvc.setDisplayValue( data.ProjectCategory, selectedProject.props.fnd0ProjectCategory.uiValues );
    return selectedProject;
};

export default exports = {
    getProjectCategoryList,
    addProjectToProvider,
    isProgram,
    getCreatedProject,
    setSelectedProjectAndProperty

};
/**
 * Register the service
 *
 * @memberof NgServices
 * @member Aut0AddProjectCommandService
 *
 * @returns {Object} export functions
 */
app.factory( 'Aut0AddProjectCommandService', () => exports );
