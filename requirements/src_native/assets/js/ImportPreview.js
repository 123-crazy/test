// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define
 */
/**
 * Module for the Import Preview Secondary area
 *
 * @module js/ImportPreview
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import iconSvc from 'js/iconService';
import addElementTypeHandler from 'js/addElementTypeHandler';
import rmTreeDataService from 'js/Arm0ImportPreviewJsonHandlerService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import reqUtil from 'js/requirementsUtils';
import Arm0DocumentationUtil from 'js/Arm0DocumentationUtil';

var _previewElement = null;

var allowedChildTypeMap = {};
var idToObjectMap = {};

var exports = {};
var REQUIREMENT = 'Requirement';

/**
 * Onclick on Object Type Icon click listener
 * for getting Child Spec Allowed type list
 * @param {Event} event // event object
 */
function populateTypeList( event ) {
    var target = event.currentTarget || event.srcElement;
    var id = target.parentElement.parentElement.getAttribute( 'id' );
    var selectedObj = idToObjectMap[ id ];
    var parentObjId = selectedObj.parent;
    var rect = target.getBoundingClientRect();
    var iconDimension = {
        offsetHeight: rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        offsetWidth: rect.width
    };
    var parentObj = rmTreeDataService.getObjectFromId( parentObjId );
    allowedChildTypeMap = rmTreeDataService.getAllowedChildType( parentObj.internalType );
    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
    if( parentObj.internalType ) {
        if( !allowedChildTypeMap ) {
            /**
             * to get the Displatable type list from the parent of Selected Element
             */
            addElementTypeHandler._getDisplayableTypes( parentObj ).then( function( allowedTypesInfo ) {
                rmTreeDataService.createAllowedChildTypeMap( parentObj.internalType, allowedTypesInfo.objectTypesWithIcon, selectedObj.internalType );
                rmTreeDataService.setAllowedTypesInfo( allowedTypesInfo.objectTypesWithIcon );
                var eventData = {
                    sourceObject: {
                        uid: id
                    },
                    commandDimension: iconDimension
                };
                eventBus.publish( 'importPreview.registerCxtForActionsPanel', eventData );
            } );
        } else {
            /**
             * If the Selected element child type-list is already fetched in earlier clicks
             */
            rmTreeDataService.setAllowedTypesInfo( allowedChildTypeMap.allowedChildTypeList );
            var eventData = {
                sourceObject: {
                    uid: id
                },
                commandDimension: iconDimension
            };
            eventBus.publish( 'importPreview.registerCxtForActionsPanel', eventData );
        }
    } else {
        /**
         * for first level Child Use Subtype List present in Top line Element
         */
        rmTreeDataService.createAllowedChildTypeMap( parentObj[ 'Specification Type' ], parentObj.SubTypes, selectedObj.internalType );
        rmTreeDataService.setAllowedTypesInfo( allowedChildTypeMap.allowedChildTypeList );
        eventData = {
            sourceObject: {
                uid: id
            },
            commandDimension: iconDimension
        };
        eventBus.publish( 'importPreview.registerCxtForActionsPanel', eventData );
    }
}

/**
 * Onclick on Object Type Icon click listener
 * for getting Child Spec Allowed type list
 * @param {Event} event // event object
 */
function populateActionsList( event ) {
    event.preventDefault();
    var target = event.currentTarget || event.srcElement;
    var id = target.parentElement.parentElement.getAttribute( 'id' );
    var selectedObj = idToObjectMap[ id ];
    var parentObjId = selectedObj.parent;
    var rect = target.getBoundingClientRect();
    var iconDimension = {
        offsetHeight: rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        offsetWidth: rect.width
    };
    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );

    var eventData = {
            sourceObject: [ {
                uid: id
            } ],
            commandDimension: iconDimension
        };
        eventBus.publish( 'requirementDocumentation.registerCxtForActionsPanel', eventData );
}

/**
 * Function to recursively find requirement div from fiven element
 * @param {Object} element - Dom element
 * @returns {Object} - Dom element
 */
function getRequirementDiv( element ) {
    if( !element || element.classList.contains( 'requirement' ) ) {
        return element;
    }
    return getRequirementDiv( element.parentElement );
}

/**
 * On right click on Object Type Icon click listener
 * for displaying rearrange commands for preview
* @param {Event} event // event object
 * @param {Boolean} registerTargetElement - True, if target elements needs to be added in context
 */
function populateSettingList( event, registerTargetElement ) {
    var target = event.currentTarget || event.srcElement;
    // Get requirement div
    var id = getRequirementDiv( target ).getAttribute( 'id' );
    var selectedObj = idToObjectMap[ id ];
    appCtxSvc.registerCtx( 'selectedObjSet', selectedObj );
    appCtxSvc.registerCtx( 'selectedTargetElement', target );   // ctx is available in case of merge preview
    var rect = target.getBoundingClientRect();
    var iconDimension = {
        offsetHeight: rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        offsetWidth: rect.width
    };
    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
    var eventData = {
        sourceObject: {
            uid: id
        },
        commandDimension: iconDimension
    };
    if( registerTargetElement ) {
        eventData.targetElement = target;
    }
    eventBus.publish( 'importPreview.registerCxtForSettingsPanel', eventData );
}

var _getImageIconElement = function( fileName, altText ) {
    return '<img class="aw-base-icon" src="' + fileName + '" alt="' + altText + '" />';
};

/**
 * to get the Secondary area populated
 * @param {*} innerChildren // the children object of the Element
 * @param {Object} data - view model object data
 */
function renderSecondaryArea( innerChildren, data ) {
    var mainDivElement = document.createElement( 'div' );
    mainDivElement.setAttribute( 'class', 'requirement' );
    mainDivElement.setAttribute( 'id', innerChildren.uniqueId );
    var uniqueidSplit = innerChildren.uniqueId.split( '-' );
    var type = '';
    var typeIcon = iconSvc.getTypeIconURL( innerChildren.internalType );
    if( !typeIcon ) {
        typeIcon = iconSvc.getTypeIconURL( REQUIREMENT );
        type = REQUIREMENT;
    } else{
        type = innerChildren.internalType;
    }
    var typeIconElementStr = _getImageIconElement( typeIcon, type );
    var typeWrapper = document.createElement( 'div' );
    typeWrapper.innerHTML = typeIconElementStr;
    var typeIconElement = typeWrapper.firstChild;

    var markerDiv = document.createElement( 'div' );
    markerDiv.className = 'aw-requirement-marker';
    var typeIconPlaceHolder = document.createElement( 'typeIcon' );
    typeIconPlaceHolder.title = innerChildren.displayType;
    markerDiv.appendChild( typeIconPlaceHolder );

    typeIconElement && typeIconPlaceHolder.appendChild( typeIconElement );
    mainDivElement.appendChild( markerDiv );

    // For getting the allowed type in ballon popup //For Doc Compare
    if( uniqueidSplit.length > 1 ) {
        typeIconPlaceHolder.addEventListener( 'click', populateTypeList );
        typeIconPlaceHolder.removeEventListener( 'contextmenu', populateActionsList );
        typeIconPlaceHolder.addEventListener( 'contextmenu', populateActionsList );
    }
    var importCondition = appCtxSvc.getCtx( 'compareClick' );
    var deriveAndMergeClick = appCtxSvc.getCtx( 'deriveAndMergeClick' );
    var freeze_version_int = parseInt( innerChildren.freeze_version );
    if( importCondition === true ||
         deriveAndMergeClick === true && freeze_version_int === 0 ||  // if overwritten requirement
         deriveAndMergeClick === true && innerChildren.isPropertyUpdated === true ||  // if property updated
        deriveAndMergeClick === true && innerChildren.masterUId === '' && innerChildren.parent ) {    // if added/deleted objects OR not top
        var settingIconElementStr = iconSvc.getIcon( 'cmdSettings' );
        var settingWrapper = document.createElement( 'div' );
        settingWrapper.innerHTML = settingIconElementStr;
        var settingIconElement = settingWrapper.firstChild;
        var settingIconPlaceHolder = document.createElement( 'settingIcon' );
        settingIconPlaceHolder.title = data.i18n.settingLabel;
        markerDiv.appendChild( settingIconPlaceHolder );
        settingIconElement && settingIconPlaceHolder.appendChild( settingIconElement );
        mainDivElement.appendChild( markerDiv );
        // For getting the allowed setting in ballon popup
        settingIconPlaceHolder.addEventListener( 'click', populateSettingList );
    }

    // Add dotted line for freeze requirements
    if( deriveAndMergeClick === true && innerChildren.masterUId !== '' ) {
        var unFreezeReqClass = 'aw-requirements-unfreezedReqIndicator';
        var freezedReqClass = 'aw-requirements-freezedReqIndicator';
        var freezedChangedReqClass = 'aw-requirements-freezedChangedReqIndicator';
        var frozenToLatestClass = 'aw-requirements-frozenToLatestReqIndicator';
        var freezeReqDiv = document.createElement( 'div' );
        if( innerChildren.freeze_version === '' )  {  // UnFreeze Req
            freezeReqDiv.setAttribute( 'class', unFreezeReqClass );
        } else if( freeze_version_int === 0 )  {    // Overwritten Req
            freezeReqDiv.setAttribute( 'class', freezedReqClass );
        } else if( freeze_version_int > 0 )  {  // Freeze by no change in master
            freezeReqDiv.setAttribute( 'class', frozenToLatestClass );
        } else if( freeze_version_int < 0 )  {  // Freeze Req with change in master
            freezeReqDiv.setAttribute( 'class', freezedChangedReqClass );
        }
        mainDivElement.appendChild( freezeReqDiv );
    }

    var contentheaderDiv = document.createElement( 'div' );
    contentheaderDiv.setAttribute( 'class', 'aw-requirement-header aw-widgets-cellListItem' );
    var contentheader = document.createElement( 'h' + innerChildren.hierarchyNumber.split( '.' ).length );
    // contentheader.setAttribute( 'class', 'aw-widgets-cellListItem' );
    var span = document.createElement( 'span' );
    if( innerChildren.hierarchyNumber === '0' ) { // Do not add hierarchy number if zero
        span.innerText = innerChildren.name;
    } else {
        span.innerText = innerChildren.hierarchyNumber + '  ' + innerChildren.name;
    }
    contentheader.appendChild( span );
    contentheaderDiv.appendChild( contentheader );
    // For adding click event in Header of Spec element
    // contentheader.addEventListener( 'click', treeEleSelection );

    mainDivElement.appendChild( contentheaderDiv );

    if( !_previewElement ) {
        _previewElement = document.createElement( 'div' );
        _previewElement.className = 'previewElement';
    }
    _previewElement.appendChild( mainDivElement );
    var requirementContent = document.createElement( 'div' );
    requirementContent.setAttribute( 'class', 'requirement-content' );
    var para = document.createElement( 'div' );
    para.setAttribute( 'class', 'aw-requirement-bodytext' );
    para.innerHTML = innerChildren.contents;
    reqUtil.insertTypeIconToOleObjects( para );
    requirementContent.appendChild( para );
    mainDivElement.appendChild( requirementContent );
    if( innerChildren.action === 'Add' ) {
        mainDivElement.setAttribute( 'class', 'requirement diff-html-added' );
    } else if( innerChildren.action === 'Delete' ) {
        mainDivElement.setAttribute( 'class', 'requirement diff-html-removed' );
    } else {
        mainDivElement.setAttribute( 'class', 'requirement' );
    }
    // For adding click event in Spec elements
    contentheader.addEventListener( 'click', secAreaHeaderSelectForCrossProb );

    // Attach listeners to allow merge in case of derivied and mergefcase
    var deriveAndMergeCondition = appCtxSvc.getCtx( 'deriveAndMergeClick' );
    if( deriveAndMergeCondition === true ) {
        attachListenersForMerge( para );
    }
}

/**
 * register context for setting icon open Balloon popup actions
 * @param {Object} data //
 */
export let registerCxtForSettingsPanel = function( data ) {
    eventBus.publish( 'importPreview.closeExistingBalloonPopup' );
    var placeholder = data.eventData.sourceObject.uid;
    appCtxSvc.registerCtx( 'selectedRequirementObjectUID', placeholder );
    var modelObject = cdm.getObject( placeholder );
    var selectedObjects = [ modelObject ];
    appCtxSvc.registerCtx( 'rmselected', selectedObjects );
    appCtxSvc.registerCtx( 'rmselectedTargetElement', data.eventData.targetElement );
    eventBus.publish( 'importPreview.showSettingsPanel', data.eventData );
};

/**
 * to populate the Secondary area
 * @param {Object} data - view model object data
 */
export let populateSecArea = function( data ) {
    idToObjectMap = rmTreeDataService.getIdToObjectMapData();
    $( '.previewElement' ).remove();
    _.forEach( idToObjectMap, function( childNode ) {
        ( parseInt( childNode.hierarchyNumber ) ||  appCtxSvc.getCtx( 'deriveAndMergeClick' ) === true ) && renderSecondaryArea( childNode, data );
    } );
    document.getElementById( 'rmWordImportPreviewDiv' ).appendChild( _previewElement );

    // Attach and listen click event on import preview viewer
    Arm0DocumentationUtil.attachClickEventOnViewer( document.getElementById( 'rmWordImportPreviewDiv' ) );
};

/**
 * to get the Secondary area populated
 * @param {HTMLAllCollection} previewElement // the children object of the Element
 */
export let setSecondaryArea = function( previewElement ) {
    _previewElement = previewElement;
};

/**
 * register context for open Balloon popup actions
 * @param {Object} data //
 */
export let registerCxtForActionsPanel = function( data ) {
    var placeholder = data.eventData.sourceObject.uid;
    appCtxSvc.registerCtx( 'selectedRequirementObjectUID', placeholder );
    var modelObject = cdm.getObject( placeholder );
    var selectedObjects = [ modelObject ];
    appCtxSvc.registerCtx( 'rmselected', selectedObjects );
    var eventData = {
        commandDimension: data.eventData.commandDimension,
        sourceObject: data.eventData.sourceObject,
        allowedTypesInfo: data.allowedTypesInfo
    };
    eventBus.publish( 'importPreview.showActionsPanel', eventData );
};

/**
 * This method ensures that the s_uid in url is selected in the primary workarea.
 * This is required for selection sync of url and primary workarea
 *
 * @param {ArrayList} event selection model of pwa
 */
function secAreaHeaderSelectForCrossProb( event ) {
    var target = event.currentTarget || event.srcElement;
    var id = target.parentElement.parentElement.getAttribute( 'id' );
    var eventData = {
        objectsToSelect: { uid: id }
    };

    eventBus.publish( 'importPreview.secAreaHeaderSelectForCrossProb', eventData );
}

/**
 * Method to populate the data provider for specification summary
 *
 * @param {object} data
 */
export let populateSpecificationSummaryDataForPreview = function( data ) {
    var summaryMap = rmTreeDataService.getSpecificationSummaryMapData();
    var objectTypesIterator = summaryMap.keys();
    var chipDataArray = [];
    for( var i = 0; i < summaryMap.size; i++ ) {
        var key = objectTypesIterator.next().value;
        var disp = key + ':' + summaryMap.get( key ).toString();
        var chipData = {
            chipType: 'BUTTON',
            labelDisplayName: disp,
            labelInternalName: disp,
            showIcon: false
        };
        chipDataArray.push( chipData );
    }

    data.summaryChips = chipDataArray;
};

/**
 * Attach listener to updated requirement content
 * @param {Object} eventData - event data
 */
export let previewContentUpdatedForObject = function( eventData ) {
    attachListenersForMerge( eventData.reqDomElement );
};

/**
 * Listens to clicks of tooltip view
 * @param {data} data of the active view
 */
export let changeTypeIconClickListener = function( data ) {
    data.changeTypeIcon = function( row ) {
        var eventData = {
            selectedRow: row
        };
        eventBus.publish( 'requirements.handleCommandSelection', eventData );
    };
 };


 /**
 * Listens to clicks of tooltip view
 * @param {data} data of the active view
 */
export let selectActionClickListener = function( data ) {
    data.selectAction = function( row ) {
        var eventData = {
            selectedRow: row
        };
        eventBus.publish( 'requirements.handleCommandSelectionSetting', eventData );
    };
 };

 /**
 * Initailize event for dropdown element
 * @param {data} data of the active view
 */
export let setClickListenerToMappingDropdown = function( data ) {
    data.toggleDropdown = function( ) {
        eventBus.publish( 'importSpecification.resetNewGroupNameVisibilty' );
    };
 };


/**
 * Attach listener on updated contents
 * @param {Object} reqDivElement - requirement div element
 */
function attachListenersForMerge( reqDivElement ) {
    var added = reqDivElement.getElementsByClassName( 'diff-html-added' );
    addRightClickListener( added );
    var deleted = reqDivElement.getElementsByClassName( 'diff-html-removed' );
    addRightClickListener( deleted );
}

/**
 * Add right click listener to given dom elements
 * @param {Array} elements - dom elements
 */
function addRightClickListener( elements ) {
    for ( let index = 0; index < elements.length; index++ ) {
        const element = elements[index];
        element.addEventListener( 'contextmenu', function( ev ) {
            ev.preventDefault();
            // populateMergeOptionsPanel( ev );
            populateSettingList( ev, true );    // true, to register target element in context
            return false;
        }, false );
    }
}

export default exports = {
    registerCxtForSettingsPanel,
    populateSecArea,
    setSecondaryArea,
    registerCxtForActionsPanel,
    populateSpecificationSummaryDataForPreview,
    previewContentUpdatedForObject,
    changeTypeIconClickListener,
    selectActionClickListener,
    setClickListenerToMappingDropdown
};
/**
 * ImportPreview secondary area utility
 *
 * @memberof NgServices
 * @member ImportPreview
 */
app.factory( 'ImportPreview', () => exports );
