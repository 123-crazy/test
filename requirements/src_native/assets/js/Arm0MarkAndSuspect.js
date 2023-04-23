// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Arm0MarkAndSuspect
 */

import app from 'app';
import reqTracelinkService from 'js/requirementsTracelinkService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import commandsMapService from 'js/commandsMapService';
import reqUtils from 'js/requirementsUtils';
import eventBus from 'js/eventBus';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dateTimeService from 'js/dateTimeService';
import soaSvc from 'soa/kernel/soaService';
import commandPanelService from 'js/commandPanel.service';
import msgSvc from 'js/messagingService';
import dmSvc from 'soa/dataManagementService';
import propPolicySvc from 'soa/kernel/propertyPolicyService';

var exports = {};
var parentData = {};
var mapOfSelectedObjAndTracelink = {};
var selectedObjects = {};
var totalTracelinkCount = 0;
/**
 * Calls performSearchViewModel4 soa and get tracelink objects
 * @param {Object} data - data Object
 * @param {Object} ctx - ctx Object
 */
export let getTracelinksOfSelected = function( data, ctx ) {
    //ensure the ImanType objects are loaded
    var policyId = propPolicySvc.register( {
        types: [ {
            name: 'Awp0TraceLinkProxyObject',
            properties: [ {
                name: 'awp0RelatedObject',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            },
            {
                name: 'awp0SelectedObject',
                modifiers: [ {
                    name: 'withProperties',
                    Value: 'true'
                } ]
            },
            {
                name: 'awp0RelationObject'
            },
            {
                name: 'awp0Direction'
            } ]
        },
        {
            name: 'ItemRevision',
            properties: [
                {
                    name: 'owning_user',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                },
                {
                    name: 'last_mod_date',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                } ]
        } ]
    } );

    var inputData = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ''
        },
        inflateProperties: true,
        searchInput: {
            maxToLoad: 150,
            maxToReturn: 150,
            providerName: getProviderName( ctx ),
            searchCriteria: getSearchInputExistingTracelink( ctx ),
            attributesToInflate: [
                'awp0CellProperties',
                'awp0SelectedObject',
                'awp0RelatedObject',
                'awp0RelationObject',
                'awp0Direction',
                'awp0RelationTypeName'
            ],
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap6: {},
            searchSortCriteria: [],
            startIndex: 0
        }
    };

    var promise = soaSvc.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4',
        inputData );

    promise.then( function( response ) {
        if ( response ) {
            //UnRegister Policy
            if ( policyId ) {
                propPolicySvc.unregister( policyId );
            }
            var searchResults = JSON.parse( response.searchResultsJSON );
            createTracelinkMapData( data, ctx, searchResults );
        }
    } );
};

/**
 * Get search data provider to search existing Tracelinks on selected element
 *
 * @param {Object} ctx - context
 * @return {Any} search data provider
 */
export let getProviderName = function( ctx ) {
    if ( ctx.aceActiveContext && ctx.aceActiveContext.context ) {
        return 'Arm1TraceLinkProvider';
    }

    return 'Awp0TraceLinkProvider';
};

/**
 * Create tracelink map of selected object.
 *
 * @param {Object} data - The response data of performSearchViewModel4
 */
export let createTracelinkMapData = function( data, ctx, searchResults ) {
    var tracelinks = searchResults.objects;
    var tracelinkItem = [];
    var hasRevisionTracelink = 0;

    if ( tracelinks && tracelinks.length ) {
        var selectedUidsToTracelinkedObjectsMap = {};
        for ( var i = 0; i < tracelinks.length; i++ ) {
            var linkInfo = cdm.getObject( tracelinks[i].uid );
            if ( linkInfo.props.awp0Direction ) {
                var directionStr = linkInfo.props.awp0Direction.dbValues[0];
                if ( !_strEndsWith( directionStr, '-1' ) && !_strEndsWith( directionStr, '-2' ) && !_strEndsWith( directionStr, '-3' ) ) {
                    var itemP = _getTracelinkedItem( linkInfo );
                    if ( itemP ) {
                        var obj = cdm.getObject( linkInfo.props.awp0SelectedObject.dbValues[0] );
                        var selectedObj = _getRevisionObject( obj );
                        var keys = Object.keys( selectedUidsToTracelinkedObjectsMap );
                        if ( !keys || !keys.includes( selectedObj.uid ) ) {
                            selectedUidsToTracelinkedObjectsMap[selectedObj.uid] = [];
                            hasRevisionTracelink++;
                        }
                        var arr = selectedUidsToTracelinkedObjectsMap[selectedObj.uid];
                        var linkedUid = linkInfo.props.awp0RelatedObject.dbValues[0];
                        var obj = cdm.getObject( linkedUid );

                        obj.isSelected = true;
                        arr.push( obj );
                        tracelinkItem.push( itemP );
                    }
                }
            }
        }
        mapOfSelectedObjAndTracelink = selectedUidsToTracelinkedObjectsMap;
    }
    var keys = Object.keys( mapOfSelectedObjAndTracelink );

    dmSvc.getProperties( keys, [ 'owning_user' ] ).then( function() {
        if( hasRevisionTracelink === 0 ) {
            var msg = data.i18n.errorMessageForMarkAsSuspect.replace( '{0}', ctx.mselected.length );
            msg = msg.replace( '{1}', ctx.mselected.length );
            msgSvc.showInfo( msg );
        } else if( hasRevisionTracelink !== ctx.mselected.length ) {
            var countOfElementWithoutTracelink = ctx.mselected.length - hasRevisionTracelink;
            var msg = data.i18n.errorMessageForMarkAsSuspect.replace( '{0}', countOfElementWithoutTracelink );
            msg = msg.replace( '{1}', ctx.mselected.length );
            msgSvc.showInfo( msg );
            createVMOofSelected( data );
            commandPanelService.activateCommandPanel( 'Arm0MarkAndSuspectMain', 'aw_toolsAndInfo' );
        } else {
            createVMOofSelected( data );
            commandPanelService.activateCommandPanel( 'Arm0MarkAndSuspectMain', 'aw_toolsAndInfo' );
        }
    } );
};

/**
 * Create new map as per selected/deselected tracelink objects.
 *
 * @param {Object} data - data Object
 */
export let createMapAsPerSelection = function( data ) {
    var map = {};
    var keys = Object.keys( data.selectedUidsToTracelinkedObjectsMap );
    var countOfSelectedTracelinks = 0;
    var suspectToBeRaisedTracelinkCount = 0;

    for( var i = 0; i < keys.length; i++ ) {
        var temp = keys[ i ];
        var obj = cdm.getObject( temp );
        var owningUserOfSelected = obj.props.owning_user.dbValues[ 0 ];
        var displayValueOfOwingUser = obj.props.owning_user.uiValues[ 0 ];
        var tracelink = data.selectedUidsToTracelinkedObjectsMap[ temp ];
        for( var j = 0; j < tracelink.length; j++ ) {
            var owninguserOfTracelink = tracelink[ j ].props.owning_user.dbValues[ 0 ];
            if(tracelink[ j ].isSelected === true){
                if( owninguserOfTracelink !== owningUserOfSelected ) {
                    if( !map[ temp ] ) {
                        map[ temp ] = [];
                    }
                    var arr = map[ temp ];
                    arr.push( {
                        uid: tracelink[ j ].uid,
                        type: tracelink[ j ].type
                    } );
                    suspectToBeRaisedTracelinkCount ++;
                }
                countOfSelectedTracelinks ++;
            }
        }
    }
    var msg = data.i18n.notificationForSuspectRaised.replace( '{0}', suspectToBeRaisedTracelinkCount );
    msg = msg.replace( '{1}', countOfSelectedTracelinks );
    msg = msg.replace( '{2}', displayValueOfOwingUser );

    msgSvc.showInfo( msg );
    return map;
};

/**
 * Update selection to show selected tracelinks objects.
 *
 * @param {Object} data - data Object
 */
export let updateSelection = function( data ) {
    var tracelinks = data.selectedUidsToTracelinkedObjectsMap[data.selectedCell.uid];
    data.dataProviders.tracelinkObjects.selectNone();

    var objectsToSelect = [];
    for ( let index = 0; index < tracelinks.length; index++ ) {
        const object = tracelinks[index];
        if ( object.isSelected ) {
            objectsToSelect.push( object );
        }
    }
    data.dataProviders.tracelinkObjects.selectionModel.setSelection( objectsToSelect );
};

/**
 * Show tracelink objects of selected element from Map.
 *
 * @param {Object} data - data Object
 */
export let ShowTracelinks = function( data ) {
    var selectedObjUid = data.selectedCell.uid;
    var tracelinkVMO = [];
    data.arrTracelinkedItems.dbValue = null;

    var objects = data.selectedUidsToTracelinkedObjectsMap[selectedObjUid];

    //create VMO object of tracelink model object
    if ( !viewModelObjectSvc.isViewModelObject( objects[0] ) ) {
        for ( let index = 0; index < objects.length; index++ ) {
            addTracelinksCellProperties( objects[index], data );
            var object = viewModelObjectSvc.constructViewModelObjectFromModelObject( objects[index] );
            object.isSelected = true;
            tracelinkVMO.push( object );
        }
        data.selectedUidsToTracelinkedObjectsMap[selectedObjUid] = tracelinkVMO;
    }
    data.arrTracelinkedItems.dbValue = data.selectedUidsToTracelinkedObjectsMap[selectedObjUid];
    eventBus.publish( 'Arm0MarkAndSuspectMain.refreshTracelinkDataProvider' );
    eventBus.publish( 'Arm0MarkAndSuspect.showTracelinkPanel' );
};

/**
 * Add cell properties of tracelink objects.
 *
 * @param {Object} trcelinkModelObject - View model object
 */
var addTracelinksCellProperties = function( trcelinkModelObject, data ) {
    trcelinkModelObject.props.awp0CellProperties.dbValues = [];
    trcelinkModelObject.props.awp0CellProperties.uiValues = [];

    trcelinkModelObject.props.awp0CellProperties.dbValues.push( '' + '\\:' + trcelinkModelObject.props.object_string.dbValues[0] );
    trcelinkModelObject.props.awp0CellProperties.uiValues.push( '' + '\\:' + trcelinkModelObject.props.object_string.uiValues[0] );

    var owningUser = trcelinkModelObject.props.owning_user.propertyDescriptor.displayName + ': ' + trcelinkModelObject.props.owning_user.uiValues[0];
    trcelinkModelObject.props.awp0CellProperties.dbValues.push( trcelinkModelObject.props.owning_user.propertyDescriptor.displayName + '\\:' + owningUser );
    trcelinkModelObject.props.awp0CellProperties.uiValues.push( trcelinkModelObject.props.owning_user.propertyDescriptor.displayName + '\\:' + owningUser );

    trcelinkModelObject.props.awp0CellProperties.dbValues.push( trcelinkModelObject.props.last_mod_date.propertyDescriptor.displayName + '\\:' + trcelinkModelObject.props.last_mod_date.uiValues[0] );
    trcelinkModelObject.props.awp0CellProperties.uiValues.push( trcelinkModelObject.props.last_mod_date.propertyDescriptor.displayName + '\\:' + trcelinkModelObject.props.last_mod_date.uiValues[0] );
};

/**
 * Create and return the tracelinked item from proxy link object.
 * @param {Object} linkInfo - tracelink proxy object
 * @returns {Object} cell Item to display.
 */
var _getTracelinkedItem = function( linkInfo ) {
    if ( !linkInfo || !linkInfo.props || !linkInfo.props.awp0RelatedObject ) {
        return null;
    }
    var relatedElement = cdm.getObject( linkInfo.props.awp0RelatedObject.dbValues[0] );
    var cellHeader1 = relatedElement.cellHeader1;
    var cellHeader2 = relatedElement.cellHeader2;
    var elementType = 'R->R';
    var revObject = _getRevisionObject( relatedElement );
    var objIconURL = _getObjectIconURL( revObject );

    return {
        cellHeader1: cellHeader1,
        cellHeader2: cellHeader2,
        iconURL: objIconURL,
        id: revObject.uid,
        uidProxyTracelink: linkInfo.uid,
        elementType: elementType
    };
};

/**
 * Create VMO of selected object.
 *
 * @param {Object} data - data Object
 */
export let createVMOofSelected = function( data ) {
    var selectedObj = [];
    if ( mapOfSelectedObjAndTracelink ) {
        var keys = Object.keys( mapOfSelectedObjAndTracelink );
        for ( var i = 0; i < keys.length; i++ ) {
            var object = cdm.getObject( keys[i] );
            object = _.cloneDeep( object );

            totalTracelinkCount = mapOfSelectedObjAndTracelink[keys[i]].length;
            addCellProperties( object, totalTracelinkCount, totalTracelinkCount, data );

            object = viewModelObjectSvc.constructViewModelObjectFromModelObject( object );
            selectedObj.push( object );
        }
        selectedObjects = selectedObj;
    }
};

/**
 * Set data of Arm0MarkAndSuspectMain
 *
 * @param {Object} data - data Object
 */
export let setArm0MarkAndSuspectMainData = function( data ) {
    data.selectedUidsToTracelinkedObjectsMap = mapOfSelectedObjAndTracelink;
    data.selectedObj = selectedObjects;
    data.isAllTracelinksUnselected = false;
};

/**
 * Add cell properties to display on Mark as Suspect panel
 *
 * @param {Object} object - View model object
 * @param {Object} totalTracelinkCount - Count of total tracelinks of object
 * @param {Object} object - Count of selected tracelinks to be notify
 * @param {Object} data - data Object
 */
var addCellProperties = function( object, totalTracelinkCount, selectedTracelinkCount, data ) {
    object.props.awp0CellProperties.dbValues = [];
    object.props.awp0CellProperties.uiValues = [];

    object.props.awp0CellProperties.dbValues.push( '' + '\\:' + object.props.object_string.dbValues[0] );
    object.props.awp0CellProperties.uiValues.push( '' + '\\:' + object.props.object_string.uiValues[0] );

    var totalTracelinkCountLabel = data.i18n.totalTracelinkcount + ': ' + totalTracelinkCount;
    object.props.awp0CellProperties.dbValues.push( data.i18n.totalTracelinkcount + '\\:' + totalTracelinkCountLabel );
    object.props.awp0CellProperties.uiValues.push( data.i18n.totalTracelinkcount + '\\:' + totalTracelinkCountLabel );

    object.props.awp0CellProperties.dbValues.push( data.i18n.notifyLinks + '\\:' + selectedTracelinkCount + '/' + totalTracelinkCount );
    object.props.awp0CellProperties.uiValues.push( data.i18n.notifyLinks + '\\:' + selectedTracelinkCount + '/' + totalTracelinkCount );
};

/**
 * Update Notify links count as per selection
 *
 * @param {Object} object - View model object
 * @param {Object} totalTracelinkCount - Count of total tracelinks of object
 * @param {Object} object - Count of selected tracelinks to be notify
 * @param {Object} data - data Object
 */
var updateTracelinkCount = function( object, totalTracelinkCount, selectedTracelinkCount, data ) {
    object.cellProperties[data.i18n.notifyLinks].value = selectedTracelinkCount + '/' + totalTracelinkCount;
};

/**
 * Update isSelected property of tracelinks as per selection
 *
 * @param {Object} data - data Object
 */
export let updateDownstreamLinkSelection = function( data ) {
    var tracelinks = data.selectedUidsToTracelinkedObjectsMap[data.selectedCell.uid];
    var selectedObjUid = [];
    var selectedObj = data.dataProviders.tracelinkObjects.selectedObjects;
    for ( var i = 0; i < selectedObj.length; i++ ) {
        selectedObjUid.push( selectedObj[i].uid );
    }

    var selectedTracelinkCount = 0;
    for ( var j = 0; j < tracelinks.length; j++ ) {
        if ( !selectedObjUid.includes( tracelinks[j].uid ) ) {
            tracelinks[j].isSelected = false;
        } else {
            tracelinks[j].isSelected = true;
            selectedTracelinkCount++;
        }
    }
    data.selectedUidsToTracelinkedObjectsMap[data.selectedCell.uid] = tracelinks;
    updateTracelinkCount( data.selectedCell, tracelinks.length, selectedTracelinkCount, data );
    eventBus.publish( 'Arm0MarkAndSuspectMain.refreshDataProvider' );

    //Check if all the tracelinks are unselected to disable Mark as Suspect button from panel
    var keys = Object.keys( data.selectedUidsToTracelinkedObjectsMap );
    var countOfselectedTracelinks = 0;
    for ( let index = 0; index < keys.length; index++ ) {
        for ( let j = 0; j < data.selectedUidsToTracelinkedObjectsMap[keys[index]].length; j++ ) {
            if ( data.selectedUidsToTracelinkedObjectsMap[keys[index]][j].isSelected === true ) {
                countOfselectedTracelinks++;
            }
        }
    }
    if ( countOfselectedTracelinks > 0 ) {
        data.isAllTracelinksUnselected = false;
    } else {
        data.isAllTracelinksUnselected = true;
    }
    eventBus.publish( 'Arm0MarkAndSuspect.NavigateToArm0MarkAndSuspectPanelAction' );
};

/**
 * Check Is Occurence.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {boolean} true/false
 */
var _isOccurence = function( obj ) {
    if ( commandsMapService.isInstanceOf( 'Awb0Element', obj.modelType ) ) {
        return true;
    }
    return false;
};

/**
 * Return the type icon url for given type
 *
 * @param {Object} revObject - Model object
 * @returns {Any} icon URL
 */
var _getObjectIconURL = function( revObject ) {
    return reqUtils.getTypeIconURL( revObject.type, revObject.modelType.typeHierarchyArray );
};

var _strEndsWith = function( directionStr, searchValue ) {
    return directionStr.substring( directionStr.length - searchValue.length, directionStr.length ) === searchValue;
};

/**
 * get Revision Object.
 *
 * @param {Object} obj - Awb0Element or revision object
 * @return {Object} Revision Object
 */
var _getRevisionObject = function( obj ) {
    var revObject = null;

    if ( _isOccurence( obj ) ) {
        revObject = cdm.getObject( obj.props.awb0UnderlyingObject.dbValues[0] );
    } else {
        revObject = cdm.getObject( obj.uid );
    }

    return revObject;
};

/**
 * The method joins the UIDs array (values of elementToPCIMap) into a space-separated string/list.
 *
 * @return {String} Space seperated uids of all product context in context
 */
var _getProductContextUids = function() {
    var uidProductContexts;
    var aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    if ( aceActiveContext ) {
        if ( aceActiveContext.context.elementToPCIMap ) {
            uidProductContexts = _.values( aceActiveContext.context.elementToPCIMap ).join( ' ' );
        } else if ( aceActiveContext.context.productContextInfo ) {
            uidProductContexts = aceActiveContext.context.productContextInfo.uid;
        }
    } else {
        uidProductContexts = parentData.rowProductContextFromMatrix;
    }

    return uidProductContexts;
};


/**
 * Get search Input for loading existing Tracelink
 *
 * @param {Object} ctx - context
 * @param {Object} data - view model data
 * @return {Any} search Input
 */
export let getSearchInputExistingTracelink = function( ctx, data ) {
    var currentSelected = ctx.mselected[0].uid;
    if ( ctx.mselected.length > 1 ) {
        for ( let index = 1; index < ctx.mselected.length; index++ ) {
            currentSelected += ' ' + ctx.mselected[index].uid;
        }
    }
    if ( parentData.rowProductContextFromMatrix || parentData.isTraceabilityMatrixObject ) {
        currentSelected = parentData.srcObjectFromMatrix;
    }
    var inputSearch = {
        objectUids: currentSelected
    };
    if ( ctx.aceActiveContext && ctx.aceActiveContext.context || parentData.rowProductContextFromMatrix ) {
        inputSearch = {
            elementUids: currentSelected,
            rootElementUids: reqTracelinkService.getRootElementUids(),
            bookmarkObj: null,
            productContextUids: _getProductContextUids(),
            processConnections: 'false',
            processTracelinks: 'true'
        };
    }

    return inputSearch;
};
/**
 * Function to populate lov options for Date
 *
 * @param {Object} data - view model object data
 */
export let populateDateLovOptions = function( data ) {
    var date = new Date();
    // 30 days
    date.setDate( date.getDate() + 30 );
    var day30Label = dateTimeService.formatSessionDate( date );
    var dbValue30 = dateTimeService.formatUTC( date );
    var label = data.i18n.dueDate30Days.replace( '{0}', day30Label );
    var dateAfter30Days = {
        uiValue: label,
        dbValue: dbValue30
    };

    // 60 days
    date.setDate( date.getDate() + 30 );
    var day60Label;
    day60Label = dateTimeService.formatSessionDate( date );
    var dbValue60 = dateTimeService.formatUTC( date );
    label = data.i18n.dueDate60Days.replace( '{0}', day60Label );
    var dateAfter60Days = {
        uiValue: label,
        dbValue: dbValue60
    };

    data.lovDatePropOptions.dbValue =
        [
            { propDisplayValue: dateAfter60Days.uiValue, propInternalValue: dateAfter60Days.dbValue },
            { propDisplayValue: dateAfter30Days.uiValue, propInternalValue: dateAfter30Days.dbValue },
            { propDisplayValue: data.i18n.customDate, propInternalValue: 'date' },
            { propDisplayValue: data.i18n.noDueDate, propInternalValue: '' }
        ];
};

/**
 * Return selected due date
 *
 * @param {Object} data - view model object
 * @returns {String} selected date
 */
export let getDueDate = function( data ) {
    if ( data.lovDateProp.dbValue === 'date' ) {
        if ( data.customDateProp.valueUpdated ) {
            var date = new Date( data.customDateProp.dateApi.dateObject );
            return dateTimeService.formatUTC( date );
        }
        return '';
    }
    return data.lovDateProp.dbValue;
};

export default exports = {
    getProviderName,
    getSearchInputExistingTracelink,
    createTracelinkMapData,
    createVMOofSelected,
    ShowTracelinks,
    updateDownstreamLinkSelection,
    updateSelection,
    createMapAsPerSelection,
    getDueDate,
    populateDateLovOptions,
    getTracelinksOfSelected,
    setArm0MarkAndSuspectMainData
};

/**
 * Create Trace Link panel service utility
 *
 * @memberof NgServices
 * @member Arm0MarkAndSuspect
 */
app.factory( 'Arm0MarkAndSuspect', () => exports );
