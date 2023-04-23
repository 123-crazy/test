// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/psi0GenerateState
 * @requires app
 */
import app from 'app';
import psmConstants from 'js/ProgramScheduleManagerConstants';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * @param { Object } vmo - ViewModelObject for which release status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let psiStateRendererFn = function( vmo, containerElem ) {

    let uid = null;
    uid = vmo.uid;
    let object = cdm.getObject( uid );

    if ( vmo.modelType.typeHierarchyArray.indexOf( "Awp0XRTObjectSetRow" ) >= 0 ) {
        uid = vmo.props.awp0Target.dbValues[ 0 ];
        object = cdm.getObject( uid );
    }

    //For CheckList and CheckListQuestion objects
    if( object.modelType.typeHierarchyArray.indexOf( "Psi0Checklist" ) >= 0 || object.modelType.typeHierarchyArray.indexOf( "Psi0ChecklistQuestion" ) >= 0 )
     {
        let stateName = vmo.props.psi0State.dbValue;
        let stateToolTip = vmo.props.psi0State.uiValue;

        if( stateName === "In Progress" ) {
            stateName = "InProgress";
        }

        let childElement = getContainerElement( stateName, stateToolTip,  psmConstants.RIO_CHECKLIST_CHECKLISTQUESTION_STATE[ stateName ] );
        containerElem.appendChild( childElement );

    } else {
        //For RIO object
        if( object.modelType.typeHierarchyArray.indexOf( "Psi0ProgramRisk" ) >= 0 || object.modelType.typeHierarchyArray.indexOf( "Psi0ProgramIssue" ) >= 0 || object.modelType.typeHierarchyArray.indexOf( "Psi0ProgramOpp" ) >= 0 )
        {
            let stateName = vmo.props.psi0State.dbValue;
            let stateToolTip = vmo.props.psi0State.uiValue;

            if( stateName === "In Progress" ) {
                stateName = "InProgress";
            }
            let childElement = getContainerElement( stateName, stateToolTip,  psmConstants.RIO_CHECKLIST_CHECKLISTQUESTION_STATE[ stateName ] );
            containerElem.appendChild( childElement );
        }

     }
};

var getContainerElement = function( internalName, dispName, state ) {
    let childElement = document.createElement( 'div' );
    if( state) {
        let imageElement = document.createElement( 'img' );
        imageElement.className = 'aw-visual-indicator';
        let imagePath = app.getBaseUrlPath() + '/image/';
        imageElement.title = dispName;
        imagePath += state;
        imageElement.src = imagePath;
        imageElement.alt = dispName;
        childElement.appendChild( imageElement );
    }
    childElement.className = 'aw-splm-tableCellText';
    childElement.innerHTML += dispName;
    return childElement;
};

export default exports = {
    psiStateRendererFn
};
app.factory( 'psi0GenerateState', () => exports );
