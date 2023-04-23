// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/pgp0GenerateState
 * @requires app
 */
import app from 'app';
import ppConstants from 'js/ProgramPlanningConstants';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';

var exports = {};

/*
 * @param { Object } vmo - ViewModelObject for which release status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let pgpStateRendererFn = function( vmo, containerElem, property ) {
    let cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator';
    let imagePath = app.getBaseUrlPath() + '/image/';

    let uid = vmo.uid;
    if( vmo.modelType && vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) >= 0 ) {
        uid = vmo.props.awp0Target.dbValues[ 0 ];
    }
    let object = cdm.getObject( uid );
    //For Criteria object
    if( object.modelType.typeHierarchyArray.indexOf( 'Prg0AbsCriteria' ) >= 0 ) {
        let stateName = vmo.props.fnd0State.dbValue;
        let stateToolTip = vmo.props.fnd0State.uiValue;

        cellImg.title = stateToolTip;

        if( stateName === 'In Process' ) {
            stateName = 'InProcess';
        }

        if( ppConstants.CRITERIA_STATE[ stateName ] ) {
            imagePath += ppConstants.CRITERIA_STATE[ stateName ];

            cellImg.src = imagePath;
            containerElem.appendChild( cellImg );
        }
    } else if( object.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) >= 0 ) { //For Event object
        let stateName;
        let stateToolTip;

        if( !vmo.props || !vmo.props.prg0State ) {
            stateName = object.props.prg0State.dbValues[ 0 ];
            stateToolTip = object.props.prg0State.uiValues[ 0 ];
        } else {
            stateName = vmo.props.prg0State.dbValue;
            stateToolTip = vmo.props.prg0State.uiValue;
        }

        cellImg.title = stateToolTip;

        if( stateName === 'Not Started' ) {
            stateName = 'NotStarted';
        }

        if( stateName === 'In Progress' ) {
            stateName = 'InProgress';
        }

        if( ppConstants.EVENT_STATE[ stateName ] ) {
            imagePath += ppConstants.EVENT_STATE[ stateName ];

            cellImg.src = imagePath;
            containerElem.appendChild( cellImg );
        }
    } else {
        if( cmm.isInstanceOf( 'Prg0AbsPlan', object.modelType ) && object.props.prg0State ) {
            let dbValue;
            let displayValue;

            if( !vmo.props ||  !vmo.props.prg0State ) {
                dbValue = object.props.prg0State.dbValues[0];
                displayValue = object.props.prg0State.uiValues[0];
            }else{
                dbValue = vmo.props.prg0State.dbValue;
                displayValue = vmo.props.prg0State.uiValue;
            }

            if( dbValue === 'Not Started' ) {
                dbValue = 'NotStarted';
            }
            if( dbValue === 'In Progress' ) {
                dbValue = 'InProgress';
            }
            let childElement = getContainerElement( dbValue, displayValue, ppConstants.PROGRAM_STATE );
            containerElem.appendChild( childElement );
        } else {
            let childElement = document.createElement( 'div' );
            childElement.className = 'aw-splm-tableCellText';
            let displayValue = '';
            if( property && object.props[ property ] ) {
                displayValue = object.props[ property ].uiValues;
            }
            childElement.innerHTML += displayValue;
            containerElem.appendChild( childElement );
        }
    }
};

let getContainerElement = function( internalName, dispName, constantMap ) {
    let childElement = document.createElement( 'div' );
    if( constantMap[ internalName ] ) {
        let imageElement = document.createElement( 'img' );
        imageElement.className = 'aw-visual-indicator';
        let imagePath = app.getBaseUrlPath() + '/image/';
        imageElement.title = dispName;
        imagePath += constantMap[ internalName ];
        imageElement.src = imagePath;
        imageElement.alt = dispName;
        childElement.appendChild( imageElement );
    }
    childElement.className = 'aw-splm-tableCellText';
    childElement.innerHTML += dispName;
    return childElement;
};

export default exports = {
    pgpStateRendererFn
};
app.factory( 'pgp0GenerateState', () => exports );
