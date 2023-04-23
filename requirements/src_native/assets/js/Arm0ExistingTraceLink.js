// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Arm0ExistingTraceLink
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import _ from 'lodash';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import uwPropertySvc from 'js/uwPropertyService';
import reqACEUtils from 'js/requirementsACEUtils';
import commandSvc from 'js/command.service';
import { popupService } from 'js/popupService';
import popupUtils from 'js/popupUtils';
import localeSvc from 'js/localeService';
import notyService from 'js/NotyModule';


var exports = {};

var idToChildrenMap = {};
var idToObjectMap = {};
var _data;
var _maxTreeLevel = 3;
var rootID = null;
var reloadTable;
var _popupRef;
var _sideNavEventSub;

/**
 * To create Map from the JSON data
 *
 * @param {json} tlTreeData - the json at each node
 * @param {Object} data - the page view model object
 */
var populateChildren = function( tlTreeData, data ) {
    var children = tlTreeData.children;
    idToChildrenMap[tlTreeData.uniqueid] = children;
    idToObjectMap[tlTreeData.uniqueid] = tlTreeData;
    for ( var i = 0; i < children.length; i++ ) {
        var innerChildren = children[i];
        idToObjectMap[innerChildren.uniqueid] = innerChildren;
        idToObjectMap[innerChildren.uniqueid].parent = tlTreeData;

        if ( innerChildren.children && innerChildren.children.length > 0 ) {
            populateChildren( innerChildren, data );
        }
    }
};

/**
 * To populate tree in Secondary area
 *
 * @param {Object} data - the page view model object
 */
var populateTreeTableData = function( data ) {
    rootID = data.treeData.uniqueid;
    populateChildren( data.treeData, data );
};

/**
 * Calls the soa to get the tree data
 *
 * @returns {object}  soa response
 */
export let callSoaService = async function() {
    var selected = appCtxService.getCtx( 'mselected' )[0];

    if( reloadTable &&  _data.treeData && _data.treeData.primaryObjectUid && idToObjectMap[selected.uid] !== undefined ) {
        selected = cdm.getObject( _data.treeData.primaryObjectUid );
        reloadTable = false;
    }
    var matrixCtx = appCtxService.getCtx( 'rowProductContextFromMatrix' );
    if( matrixCtx ) {
        var matrixSelection = appCtxService.getCtx( 'Arm0TraceabilityMatrixSelectedCell' );
        if( matrixSelection ) {
            selected = cdm.getObject( matrixSelection.rowUid[0] );
        }
    }
    var selectedObjUidCtx = appCtxService.getCtx( 'ExistingTraceLinkPopupSelectedObjUid' );
    if( selectedObjUidCtx ) {
        selected = selectedObjUidCtx;
        appCtxService.unRegisterCtx( 'ExistingTraceLinkPopupSelectedObjUid' );
    }
    var selectedUid = selected.uid;
    var aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    if ( aceActiveContext || matrixCtx ) {
        var inputCtxt = reqACEUtils.getInputContext();
        var bookmarkUid = reqACEUtils.getWorkingContextUid();
        var options = bookmarkUid ? [ 'bookmarkUid=' + reqACEUtils.getWorkingContextUid() ] : [];
        var inputData = {
            input: {
                selectedObjects: [
                    selected
                ],
                inputCtxt: inputCtxt,
                options: options,
                isRunInBackground: false,
                mode: 'TRACETREE'
            }
        };
        return await soaSvc.postUnchecked( 'Internal-AwReqMgmtSe-2019-12-SpecNavigation', 'exportSpecifications', inputData );
    }

    var inputData = {
        inputs: [ {
            objectsToExport: [ { uid: selectedUid, type: selected.type } ],
            attributesToExport: [],
            applicationFormat: 'TRACETREE',
            templateId: ''
        } ]
    };
    return await soaSvc.postUnchecked( 'Internal-AWS2-2012-10-RequirementsManagement', 'exportToApplication', inputData );
};

/**
 * Initialize existing tl data
 */
export let getTreeData = async function() {
    if ( _data && _data.fileTickets && _data.fileTickets.length > 0 ) {
        return JSON.parse( _data.fileTickets[0] );
    }
    var response = await exports.callSoaService();
    if ( !response.ServiceData.partialErrors && response.fileTickets && response.fileTickets.length > 0 ) {
        _data.fileTickets = response.fileTickets;
        return JSON.parse( response.fileTickets[0] );
    }
    if ( !response.ServiceData.partialErrors && response.transientFileReadTickets && response.transientFileReadTickets.length > 0 ) {
        _data.fileTickets = response.transientFileReadTickets;
        return JSON.parse( response.transientFileReadTickets[0] );
    }
    return null;
};

/**
 * Set and return the properties of a tree node
 *
 * @return {Object} - node properties.
 */
var _createProp = function( propName, propValue, type, propDisplayName ) {
    return {
        type: type,
        hasLov: false,
        isArray: false,
        displayValue: propValue,
        uiValue: propValue,
        value: propValue,
        propertyName: propName,
        propertyDisplayName: propDisplayName,
        isEnabled: true
    };
};

/**
 * Creates the properties of a tree node
 *
 * @return {Array} - array of node properties.
 */
var createPropertiesForVMNode = function( revisionNameWithID, tracelinkType, tracelinkDirection, linkedItemTypes ) {
    var properties = [];
    properties.name = _createProp( 'name', revisionNameWithID, 'STRING', _data.i18n.revisionNameColumn );
    properties.tracelinkType = _createProp( 'tracelinkType', tracelinkType, 'STRING', _data.i18n.TracelinkType );

    var linkDir = '';
    if( tracelinkDirection === _data.i18n.complyingTracelinkTitle ) {
        linkDir = _data.i18n.complyingTracelinkTitle;
    } else {
        linkDir = _data.i18n.definingTracelinkTitle;
    }
    properties.direction = _createProp( 'direction', linkDir, 'STRING', _data.i18n.TracelinkDirection );

    var linkTitle = '';
    if ( linkedItemTypes === 'Occ2Occ' ) {
        linkTitle = _data.i18n.occurrenceToOccurrenceTypeTitle;
    } else if ( linkedItemTypes === 'Occ2Rev' ) {
        linkTitle = _data.i18n.occurrenceToRevisionTypeTitle;
    } else if ( linkedItemTypes === 'Rev2Occ' ) {
        linkTitle = _data.i18n.revisionToOccurrenceTypeTitle;
    } else if ( linkedItemTypes === 'Rev2Rev' ) {
        linkTitle = _data.i18n.revisionToRevisionTypeTitle;
    }
    properties.linkedItemTypes = _createProp( 'linkedItemTypes', linkTitle, 'STRING', _data.i18n.linkedItemTypes );

    return properties;
};

/**
 * Creates the tree node with the given attributes
 *
 * @return {ViewModelTreeNode} - a node of the hierarchy.
 */
var createVMNodeUsingObjectInfo = function( objUid, objType, displayName, levelNdx, childNdx, iconURL, hasChildren ) {
    var vmNode = awTableSvc.createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );
    vmNode.isLeaf = !hasChildren;
    return vmNode;
};

/**
 * Builds the tree table structure
 *
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child' ViewModelTreeNodes.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 */
function _buildTreeTableStructure( parentNode, isLoadAllEnabled ) {
    var children;
    var key;
    var vmNodes = [];
    var primaryObjectUid = '';
    if ( parentNode.id === 'top' ) {
        key = rootID;
        primaryObjectUid = _data.treeData.primaryObjectUid;
    } else {
        key = parentNode.id;
        primaryObjectUid = parentNode.relatedObjectUid;
    }
    children = idToChildrenMap[key];
    var levelNdx = parentNode.levelNdx + 1;

    for ( var i = 0; i < children.length; i++ ) {
        var node = children[i];
        var childNdx = i + 1;
        var revisionNameWithID = node.relatedObject;
        var objType = node.relatedObjectType;
        var iconURL = iconSvc.getTypeIconURL( objType );
        var hasChildren = node.children.length > 0;
        var vmNode = createVMNodeUsingObjectInfo( node.uniqueid, objType, revisionNameWithID, levelNdx, childNdx, iconURL, hasChildren );
        vmNode.relatedObjectUid = node.relatedObjectUid;
        vmNode.tracelinkUid = node.tracelinkUid;
        vmNode.primaryObjectUid = primaryObjectUid;
        var tracelinkType = node.tracelinkType;
        if ( tracelinkType === '' ) {
            tracelinkType = node.internalType;
        }
        var tracelinkDirection = node.direction;
        var linkedItemTypes = node.information;
        if ( isLoadAllEnabled ) {
            if ( !vmNode.props ) {
                vmNode.props = [];
            }
            var properties = createPropertiesForVMNode( revisionNameWithID, tracelinkType, tracelinkDirection, linkedItemTypes );
            vmNode.props = properties;
        }
        vmNodes[i] = vmNode;
    }
    idToChildrenMap[key].vmnodes = vmNodes;
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred - Resolved with a resulting TreeLoadResult object.
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 */
function _loadTreeTableRows( deferred, treeLoadInput ) {
    //Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
    var parentNode = treeLoadInput.parentNode;

    if ( !parentNode.isLeaf ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;

        if ( nChild === 0 ) {
            // get props with intial tree for now. In future, should set this to false and populate the props seperately.
            _buildTreeTableStructure( parentNode, true );
        }
    }
    var childNodes;
    var key;
    if ( parentNode.id === 'top' ) {
        key = rootID;
        childNodes = idToChildrenMap[rootID];
    } else {
        key = parentNode.id;
    }
    childNodes = idToChildrenMap[key].vmnodes;

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, childNodes, false, true, true, null );
    deferred.resolve( {
        treeLoadResult: treeLoadResult
    } );
}

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {Object} data - The page's view model object
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let getAllExistingTraceLinks = async function( treeLoadInput, data ) {
    _data = data;
    if( _data.eventMap && ( Object.keys( _data.eventMap ).indexOf( 'Arm0ExistingTracelinkTree.reloadTable' ) !== -1 || Object.keys( _data.eventMap ).indexOf(
            'primaryWorkArea.selectionChangeEvent' ) !== -1 || Object.keys( _data.eventMap ).indexOf( 'Arm0Traceability.showTracelinksPopup' ) !== -1 ) ) {
        _data.fileTickets = [];
        reloadTable = true;
        data.eventMap = [];
    }
    var treeData = await exports.getTreeData();

    if ( treeData ) {
        _data.treeData = treeData;
        idToObjectMap = {};
        idToChildrenMap = {};

        if ( idToObjectMap && $.isEmptyObject( idToObjectMap ) ) {
            if( _popupRef ) {
                data.selectedObj = treeData.primaryObject;
            }
            populateTreeTableData( data );
        }
    }
    var delayTimeTree = 0;

    for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ndx];
        if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
            delayTimeTree = arg.dbValue;
        } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
            _maxTreeLevel = arg.dbValue;
        }
    }

    //Check the validity of the parameters
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if ( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    if ( treeData ) {
        //Load the 'child' nodes for the 'parent' node.
        if ( delayTimeTree > 0 ) {
            _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput );
        } else {
            _loadTreeTableRows( deferred, treeLoadInput );
        }
    }
    return deferred.promise;
};

/**
 * Execute the command.
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let executeOpenReqInTree = function( vmo ) {
    if( vmo && vmo.relatedObjectUid ) {
        var modelObject = cdm.getObject( vmo.relatedObjectUid );
        var commandContext = {
            vmo: modelObject || { uid:vmo.relatedObjectUid }, // vmo needed for gwt commands
            edit: false
        };
        commandSvc.executeCommand( 'Awp0ShowObjectCell', null, null, commandContext );
    }
};

/**
 * Get input data for trace link Deletion
 *
 * @param {Object} data - The panel's view model object
 * @param {ctx} ctx - ctx instance Object
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @return {Any} input data for trace link deletion
 */
export let getInputDeleteTraceLinkInTree = function( data, ctx, vmo ) {
    var selectedObjects = vmo.getSelectedObjects();
    var elementsToRemove = [];
    if ( selectedObjects ) {
        data.refreshObjects = [];
        data.elementsInDeleteTracelink = [];
        var irList = [];
        for( var i in selectedObjects ) {
            irList.push(
                 selectedObjects[i].relatedObjectUid
             );
             irList.push(
                selectedObjects[i].primaryObjectUid
            );
            elementsToRemove.push( {
                uid: selectedObjects[i].tracelinkUid
            } );
            data.elementsInDeleteTracelink.push( {
                relation: selectedObjects[i].tracelinkUid,
                relatedObjectUid : selectedObjects[i].relatedObjectUid,
                primaryObjectUid : selectedObjects[i].primaryObjectUid
            } );
        }
        let uniqueIrList = Array.from( new Set( irList ) );

        for( var i in uniqueIrList ) {
            data.refreshObjects.push( {
                uid: uniqueIrList[i]
            } );
        }
    }
    return elementsToRemove;
};

/**
 * Update Popup position
 */
export let updatePopupPosition = function() {
    var ref = '#aw_toolsAndInfo';
    var referenceEl = popupUtils.getElement( popupUtils.extendSelector( ref ) );
    if ( !referenceEl ) {
        return;
    }
    if ( referenceEl.offsetHeight <= 0 ) {
        ref = '.aw-layout-infoCommandbar';
        referenceEl = popupUtils.getElement( popupUtils.extendSelector( '.aw-layout-infoCommandbar' ) );
    }
    if ( referenceEl ) {
        var options = _popupRef.options;
        options.userOptions.reference = ref;
        options.reference = referenceEl;
        popupService.update( _popupRef );
    }
};

/**
 * resize popup after window resize
 *
 * @returns {Object} popup height & width value
 */
var _reCalcPanelHeightWidth = function() {
    var popupHeight = 800;
    var popupWidth = 600;
    // Get the popup panel hright based on aw_toolsAndInfo div present in DOM as normal
    // commands panel will also have the similar height.
    var toolInfoElement = $( '#aw_toolsAndInfo' );
    if( toolInfoElement && toolInfoElement.parent() && toolInfoElement.parent().height() ) {
        popupHeight = toolInfoElement.parent().height();
        popupWidth = toolInfoElement.parent().width();
    }

    // If height is not valid then use hard coded height.
    if( !popupHeight || popupHeight <= 0 ) {
        popupHeight = 800;
    }
    // If width is not valid then use hard coded width.
    if( !popupWidth || popupWidth <= 0 ) {
        popupWidth = 600;
    }else{
        popupWidth -= 0.60 * popupWidth;
    }
    popupHeight += 'px';
    popupWidth += 'px';
    return { popupHeight: popupHeight, popupWidth: popupWidth };
};

/**
 * To activate existing trace link popup
 *
 * @param {Object} popupData - the popup data
 */
export let activateExistingTraceLinkPanel = function( popupData, calcHeight ) {
    if( !_popupRef ) {
        var resource = 'RequirementsCommandPanelsMessages';
        var localTextBundle = localeSvc.getLoadedText( resource );
    if( calcHeight ) {
        var scaleObj = _reCalcPanelHeightWidth();
        popupData.options.height = scaleObj.popupHeight;
        popupData.options.width = scaleObj.popupWidth;
    }
        popupData.locals.caption = localTextBundle.existingTraceLinkLabel;

        popupService.show( popupData ).then( function( popupRef ) {
            _popupRef = popupRef;
            _sideNavEventSub = eventBus.subscribe( 'awsidenav.openClose', function( eventData ) {
                if ( eventData && eventData.id === 'aw_toolsAndInfo' ) {
                    setTimeout( function() {
                        exports.updatePopupPosition();
                    }, 300 );
                }
            } );
        } );
    } else{
        exports.closeExistingTraceLinkPopup();
    }
};

/**
 * To activate existing trace link popup
 */
export let closeExistingTraceLinkPopup = function() {
    _.defer( function() {
        eventBus.unsubscribe( _sideNavEventSub );
        _popupRef.options.disableClose = false;
        popupService.hide( _popupRef );
        _popupRef = null;
    } );
};

/**
 * Show delete trace link warning message
 *
 * @param {Object} data - The view model data
 * @param {Object} vmo - vmo
 */
export let showDeleteTracelinkWarning = function( data, vmo ) {
    var selectedObjects = vmo.getSelectedObjects()[ 0 ];
    var msg = vmo.getSelectedObjects().length === 1 ? data.i18n.deleteTracelinkConfirmation.replace( '{0}', selectedObjects.displayName ) : data.i18n.deleteMultipleTracelinkConfirmation;
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.delete,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'Arm0ExistingTracelinkTree.deleteExistingTracelinkInTree' );
        }
    } ];

    notyService.showWarning( msg, buttons );
};


export default exports = {
    getAllExistingTraceLinks,
    getTreeData,
    callSoaService,
    executeOpenReqInTree,
    getInputDeleteTraceLinkInTree,
    activateExistingTraceLinkPanel,
    closeExistingTraceLinkPopup,
    updatePopupPosition,
    showDeleteTracelinkWarning
};

/**
 * Existing Trace Link popup service utility
 *
 * @memberof NgServices
 * @member Arm0ExistingTraceLink
 */
app.factory( 'Arm0ExistingTraceLink', () => exports );
