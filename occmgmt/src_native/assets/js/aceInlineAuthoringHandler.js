// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/aceInlineAuthoringHandler
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import editHandlerSvc from 'js/editHandlerService';
import soaSvc from 'soa/kernel/soaService';
import aceEditService from 'js/aceEditService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import viewModelSvc from 'js/viewModelService';
import AwRootScopeService from 'js/awRootScopeService';
import panelContentSvc from 'js/panelContentService';
import occmgmtVMTNodeCreateService from 'js/occmgmtViewModelTreeNodeCreateService';
import addObjectUtils from 'js/addObjectUtils';
import addElementService from 'js/addElementService';
import uwPropertyService from 'js/uwPropertyService';
import aceInlineAuthoringUtils from 'js/aceInlineAuthoringUtils';
import localeService from 'js/localeService';
import occmgmtStructureEditService from 'js/occmgmtStructureEditService';
import occmgmtIconService from 'js/occmgmtIconService';
import aceInlineAuthoringRenderingService from 'js/aceInlineAuthoringRenderingService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var inlineAuthoringHandlerContext = 'INLINE_AUTHORING_HANDLER_CONTEXT';
var isInlineAuthoringMode = 'isInlineAuthoringMode';
var isInlineAddChildMode = 'isInlineAddChildMode';
var currentScope = null;
var _dataProvider = null;
var _treeNodesLoaded = null;
var _eventSubDefs = [];
var _usageTypeChangedProp = null;
var _allowedTypesInfo = null;
var rowCounter = 0;

/**
 * List of SOA server response of getViewModelForCreate for each of Editable inline authoring ROW
 * This is required during the SAVE action on each row.
 */
var _jsonInlineRowsSvrResp = [];

/**
 * UID to indicate the identity of an object representing Inline Authoring VMO.
 */
var _inlineRowUids = [];

/**
 * get Server VMO
 * @param {Object} parentElement - parent element
 * @return {Object} returns deferred promise
 */
var getServerVMO = function( parentElement ) {
    var deferred = AwPromiseService.instance.defer();
    var propertyNames = [ 'object_string', 'awb0Parent' ];
    _.forEach( _dataProvider.columnConfig.columns, function( column ) {
        if( !propertyNames.includes( column.propertyName ) && column.hiddenFlag !== undefined && column.hiddenFlag === false ) {
            propertyNames.push( column.propertyName );
        }
    } );

    // call getInfoForAddElement SOA  and getViewModelForCreate SOA to get server VMO
    var occType = appCtxSvc.ctx.aceActiveContext.context.supportedFeatures && appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0RevisibleOccurrenceFeature;
    if( !currentScope ) {
        var promise = panelContentSvc.getViewModelById( 'AceInlineAuthOperation' );
        if( promise ) {
            promise.then(
                function( response ) {
                    viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                        function( declarativeViewModel ) {
                            currentScope = AwRootScopeService.instance.$new();
                            viewModelSvc.setupLifeCycle( currentScope, declarativeViewModel );
                            declarativeViewModel.parentElement = parentElement;
                            declarativeViewModel.propertyNames = propertyNames;
                            declarativeViewModel.fetchAllowedOccRevTypes = occType;
                            viewModelSvc.executeCommand( declarativeViewModel, 'getInfoForAddElementAction', currentScope ).then( function() {
                                return deferred.resolve();
                            }, function() {
                                deferred.reject();
                            } );
                        } );
                } );
        }
    } else {
        currentScope.data.parentElement = parentElement;
        currentScope.data.propertyNames = propertyNames;
        currentScope.data.fetchAllowedOccRevTypes = occType;
        viewModelSvc.executeCommand( currentScope.data, 'getInfoForAddElementAction', currentScope ).then( function() {
            return deferred.resolve();
        }, function() {
            deferred.reject();
        } );
    }
    return deferred.promise;
};

/**
 * Method to set the editing mode
 *
 * @param {Boolean} editMode True, to get into edit mode. False otherwise
 */
var setInlineEditingMode = function( editMode ) {
    var stateName = 'starting';
    if( !editMode ) {
        stateName = 'reset';
    }
    aceEditService._notifySaveStateChanged( stateName );
};

/**
 * Update the display for inline authoring editable view model object.
 * @param {Object} inlineRowVmo View model object of editable row.
 */

var setInitialDisplayText = function( inlineRowVmo ) {
    var resource = 'OccmgmtInlineAuthConstants';
    var inlineLocalTextBundle = localeService.getLoadedText( resource );

    var i18n_inlineDisplayText;
    if( inlineLocalTextBundle ) {
        i18n_inlineDisplayText = inlineLocalTextBundle.inlineDisplayText;
    } else {
        var asyncFun = function( localTextBundle ) {
            i18n_inlineDisplayText = localTextBundle.inlineDisplayText;
        };
        localeService.getTextPromise( resource ).then( asyncFun );
    }

    // Update text with counter number.
    rowCounter += 1;
    i18n_inlineDisplayText = i18n_inlineDisplayText + ' ' + rowCounter;
    inlineRowVmo.props.object_string.uiValue = i18n_inlineDisplayText;
    inlineRowVmo.props.object_string.uiValues[ 0 ] = i18n_inlineDisplayText;
};

/**
 * Give inline row by the give UID
 * @param {Object} rowUid UID of the VMO to get from View Model Collection.
 * @return {Object} - Returns inline row object for given rowUid.
 */
var getInlineRowByUid = function( rowUid ) {
    var viewModelCollection = _dataProvider.getViewModelCollection();
    var inlineRowobjectIdx = viewModelCollection.findViewModelObjectById( rowUid );
    return viewModelCollection.getViewModelObject( inlineRowobjectIdx );
};

var insertElement = function( viewModelCollection, parentVMO, childVMOtoInsert ) {
    if( _treeNodesLoaded ) {
        eventBus.unsubscribe( _treeNodesLoaded );
        _treeNodesLoaded = null;
    }
    var childlevelIndex = 0;
    if( parentVMO ) {
        childlevelIndex = parentVMO.levelNdx + 1;
    }

    // Initialize child index to add as first element for Add Child case.
    var childNdx = 0;

    // Get child index for the sibling case. Consider the expanded state case.
    if( !appCtxSvc.getCtx( isInlineAddChildMode ) ) {
        var siblingVmo = _dataProvider.selectedObjects[ 0 ];
        // Insert the new row above the selected Sibling Row.
        childNdx = siblingVmo.childNdx;
    }

    // Create the viewModelTreeNode from the child ModelObject, child index and level index
    var childVMO = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( childVMOtoInsert, childNdx, childlevelIndex );
    _.merge( childVMO, childVMOtoInsert );
    childVMO.typeIconURL = occmgmtIconService.getTypeIconURL( childVMO, childVMO.underlyingObjectType );

    childVMO.getId = function() {
        return this.uid;
    };
    childVMO.parentUid = parentVMO.uid;
    childVMO.props.awb0Parent.dbValues = [ parentVMO.uid ];
    childVMO.isInlineRow = true;
    // Current TABLE logic renders the newly added VMO/ROW only if the TABLE MODE is not EDIT.
    // Disable the EDIT mode before adding the new ROW to viewModelCollection
    // The mode will be restored to EDIT later as a part of notification.
    if( _inlineRowUids.length > 1 ) {
        setInlineEditingMode( false );
    }

    // insert the new treeNode in the viewModelCollection at the correct location
    var parentNodeIndex = viewModelCollection.loadedVMObjects.indexOf( parentVMO );
    var expectedChildVmcIndex = occmgmtStructureEditService.getVmcIndexForParentsNthChildIndex( viewModelCollection, parentNodeIndex, childNdx );
    viewModelCollection.loadedVMObjects.splice( expectedChildVmcIndex, 0, childVMO );
    viewModelCollection.totalObjectsLoaded = viewModelCollection.loadedVMObjects.length;

    //Add the new treeNode to the parentVMO (if one exists) children array
    occmgmtStructureEditService.addChildToParentsChildrenArray( parentVMO, childVMO, childNdx );
};

/**
 * Adds row in Tree
 * @param {Object} data - data
 * @param {Object} updatedVMO - VMO to be added
 */
var addRowInTree = function( data, updatedVMO ) {
    var viewModelCollection = appCtxSvc.ctx.aceActiveContext.context.vmc;
    var parentIdx = _.findLastIndex( appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects, function( vmo ) {
        return vmo.uid === data.parentElement.uid;
    } );

    var parentVMO = appCtxSvc.ctx.aceActiveContext.context.vmc.getViewModelObject( parentIdx );

    // If node has expand/collapse command
    if( parseInt( parentVMO.props.awb0NumberOfChildren.dbValues[ 0 ] ) > 0 ) {
        // Use case 1:-Add child row under unexpanded parent having 0 or more children
        // in this case we expand parent and then adds children
        if( !parentVMO.isExpanded ) {
            eventBus.publish( _dataProvider.name + '.expandTreeNode', {
                parentNode: parentVMO
            } );
            if( parentVMO.children !== undefined ) {
                insertElement( viewModelCollection, parentVMO, updatedVMO );
            } else {
                _treeNodesLoaded = eventBus.subscribe( 'occDataProvider.treeNodesLoaded', function() {
                    insertElement( viewModelCollection, parentVMO, updatedVMO );
                } );
            }
        } else {
            // Use case 2:-Add child row under expanded parent having 0 or more childrens
            insertElement( viewModelCollection, parentVMO, updatedVMO );
        }
    } else {
        // Use case 3:-Add child row under parent having 0 children
        insertElement( viewModelCollection, parentVMO, updatedVMO );
    }
};

var _addRow = function( eventData ) {
    var deferred = AwPromiseService.instance.defer();
    if( eventData.getViewModelForCreateResponse ) {
        _jsonInlineRowsSvrResp.push( eventData.getViewModelForCreateResponse );
        var serverVMO = null;
        var viewModelCreateInObjsJsonStrings = eventData.getViewModelForCreateResponse.viewModelCreateInObjsJsonStrings;
        _.forEach( viewModelCreateInObjsJsonStrings, function( viewModelCreateInObjsJsonString ) {
            var responseObject = parsingUtils.parseJsonString( viewModelCreateInObjsJsonString );
            if( responseObject && responseObject.objects && responseObject.objects.length > 0 ) {
                serverVMO = responseObject.objects[ 0 ];
                serverVMO.uid = serverVMO.creinfo.uid;
                _inlineRowUids.push( serverVMO.uid );
            }
        } );

        //Temporary code to show required placeholder
        for( var prop in serverVMO.props ) {
            var property = serverVMO.props[ prop ];
            if( property.isRequired && property.isRequired === true ) {
                property.required = true;
            }
        }

        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( serverVMO, 'EDIT' );
        var updatedVMO = viewModelObjectSvc.createViewModelObject( vmo, 'EDIT', null, serverVMO );
        updatedVMO.setEditableStates( true, true, true );
        updatedVMO.occurrenceId = updatedVMO.uid;
        setInitialDisplayText( updatedVMO );

        var allowedTypeLOV = aceInlineAuthoringUtils.addLOVValuesForAllowedUsageTypeDropDown( updatedVMO, eventData );

        aceInlineAuthoringUtils.setSearchWidget( _dataProvider, allowedTypeLOV, eventData.data );

        aceInlineAuthoringUtils.initPropsLovApi( allowedTypeLOV, eventData.getViewModelForCreateResponse.columnPropToCreateInPropMap );

        if( _usageTypeChangedProp === null ) {
            // new inline row is being added
            addRowInTree( eventData.data, allowedTypeLOV );

            // Scroll to new row
            var scrollEventData = {
                gridId: 'gridView',
                rowUids: [ allowedTypeLOV.uid ]
            };
            eventBus.publish( 'plTable.scrollToRow', scrollEventData );
        } else {
            //Usage type has been changed, and exsisting row is replaced with new row of selected type.
            var currentVmo = getInlineRowByUid( _usageTypeChangedProp.parentUid );
            var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
            var srcIndex = vmc.findViewModelObjectById( currentVmo.uid );
            if( srcIndex > -1 ) {
                var srcNode = vmc.getViewModelObject( srcIndex );
                // remove previous inline row response and inline row uid
                _jsonInlineRowsSvrResp.splice( _inlineRowUids.indexOf( currentVmo.uid ), 1 );
                _inlineRowUids.splice( _inlineRowUids.indexOf( currentVmo.uid ), 1 );

                // create a new row
                var replaceingInlinerow = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( allowedTypeLOV, srcNode.childNdx, srcNode.levelNdx );
                // get a tree information from currnet row
                _.merge( replaceingInlinerow, currentVmo );
                // get the new row information from updatedVMO row
                _.merge( replaceingInlinerow, allowedTypeLOV );
                replaceingInlinerow.displayName = replaceingInlinerow.props.object_string.uiValues[ 0 ];
                vmc.loadedVMObjects.splice( srcIndex, 1 );
                vmc.loadedVMObjects.splice( srcIndex, 0, replaceingInlinerow );
                _usageTypeChangedProp = null;
            }
        }
    }
    return deferred.resolve();
};

/**
 * Subscribe the events required to achieve inline authoring capability
 * @param {Object} dataSource Data source.
 */
var _initSubscribeEventsForInlineAuthoring = function( dataSource ) {
    var gridId = 'occTreeTable';

    // Event published on the addition of inline authoring row to ViewModelCollection
    _eventSubDefs.push( eventBus.subscribe( gridId + '.plTable.loadMorePages', function() {
        // For tree view call default implementation to register leave handler.
        if( !aceEditService.editInProgress() && appCtxSvc.ctx.aceActiveContext.inlineAuthoringContext !== undefined ) {
            if( _inlineRowUids.length === 1 ) {
                aceEditService.startEdit( dataSource );
            } else {
                setInlineEditingMode( true );
            }
        }
    } ) );

    // Ace Replace case:- This will come out of inline authoring mode in case of replace in ace
    _eventSubDefs.push( eventBus.subscribe( 'ace.replaceRowsInTree', function() {
        exports.removeRow();
    } ) );

    // Post processing to render the Editable row
    _eventSubDefs.push( eventBus.subscribe( 'aceInlineAuth.processAddRow', _addRow ) );
};

/**
 * To start edit.
 * @param {Object} dataSource - dataSource instance
 * @param {Object} isChild - Add as child
 */
var startEdit = function( dataSource, isChild ) {
    _initSubscribeEventsForInlineAuthoring( dataSource );
    var parentElement = null;
    if( appCtxSvc.ctx.selected.props.awb0Parent && appCtxSvc.ctx.selected.props.awb0Parent.dbValues.length > 0 ) {
        parentElement = viewModelObjectSvc.createViewModelObject( appCtxSvc.ctx.selected.props.awb0Parent.dbValues[ 0 ] );
    }

    if( isChild ) {
        parentElement = appCtxSvc.ctx.selected;
        addElementService.setCtxAddElementInputParentElementToSelectedElement();
    } else {
        addElementService.updateCtxForAceAddSiblingPanel();
    }
    appCtxSvc.ctx.aceActiveContext.context.addElementInput.fetchPagedOccurrences = true;

    if( parentElement ) {
        getServerVMO( parentElement );
        aceInlineAuthoringUtils.updateParentElementOnCtx( parentElement );
    }
    appCtxSvc.registerCtx( isInlineAuthoringMode, true );
    appCtxSvc.registerCtx( isInlineAddChildMode, isChild );
    _dataProvider.setSelectionEnabled( false );
};

/**
 * Gives inline row
 * @param {Object} allRows Boolean to return all rows or if false return recent / last added row or
 * @return {Object} - Returns inline row object for allRows == false otherwise a list of all inline rows.
 */
var getInlineRow = function( allRows ) {
    var inlineRowobjects = [];
    var viewModelCollection = _dataProvider.getViewModelCollection();
    if( !allRows ) {
        var inlineRowobjectIdx = viewModelCollection.findViewModelObjectById( _.last( _inlineRowUids ) );
        inlineRowobjects = viewModelCollection.getViewModelObject( inlineRowobjectIdx );
    } else {
        _.forEach( _inlineRowUids, function( inlineRowUid ) {
            var inlineRowobjectIdx = viewModelCollection.findViewModelObjectById( inlineRowUid );
            var inlineRowobject = viewModelCollection.getViewModelObject( inlineRowobjectIdx );
            if( inlineRowobject ) {
                inlineRowobjects.push( inlineRowobject );
            }
        } );
    }
    return inlineRowobjects;
};

/**
 * Removes the given inline rows.
 * @param {[Object]} targetObjects -target rows to be removed
 * @param {[Boolean]} removeSingle - Removes single line
 */
var _removeInlineEditableRows = function( targetObjects, removeSingle ) {
    var viewModelCollection = _dataProvider.getViewModelCollection();
    if( viewModelCollection ) {
        var objsToRemove = null;
        // Removes single row using cell commands
        if( removeSingle && removeSingle === true ) {
            objsToRemove = [ getInlineRowByUid( targetObjects[ 0 ].uid ) ];
            _jsonInlineRowsSvrResp.splice( _inlineRowUids.indexOf( targetObjects[ 0 ].uid ), 1 );
            _inlineRowUids.splice( _inlineRowUids.indexOf( targetObjects[ 0 ].uid ), 1 );
        } // Remove row using other flow like cancel edits or save edits
        else {
            objsToRemove = getInlineRow( true );
        }

        if( objsToRemove && objsToRemove.length > 0 ) {
            viewModelCollection.removeLoadedObjects( objsToRemove );

            viewModelCollection = appCtxSvc.ctx.aceActiveContext.context.vmc;
            if( viewModelCollection ) {
                _.forEach( objsToRemove, function( objToRemove ) {
                    var parentVmcNdx = viewModelCollection.findViewModelObjectById( objToRemove.parentUid );
                    var parentVMO = viewModelCollection.getViewModelObject( parentVmcNdx );
                    occmgmtStructureEditService.removeChildFromParentChildrenArray( parentVMO, objToRemove );
                } );
            }
        }
    }
};

/**
 * Un-Register inline authoring handler
 */
var unRegisterInlineAuthoringHandler = function() {
    appCtxSvc.unRegisterCtx( 'aceActiveContext.context.aceEditService.startEdit' );
    appCtxSvc.unRegisterCtx( 'aceActiveContext.context.aceEditService.cancelEdits' );
    appCtxSvc.unRegisterCtx( 'aceActiveContext.context.aceEditService.saveEdits' );
    appCtxSvc.unRegisterCtx( 'aceActiveContext.inlineAuthoringContext' );
};

/**
 * To cancel edits
 */
var cancelEdits = function() {
    if( _inlineRowUids.length > 0 ) {
        //Discard case
        _removeInlineEditableRows();
    }

    unRegisterInlineAuthoringHandler();
    appCtxSvc.updateCtx( isInlineAuthoringMode, false );
    appCtxSvc.unRegisterCtx( isInlineAddChildMode, false );
    var editHandler = editHandlerSvc.getEditHandler( inlineAuthoringHandlerContext );
    if( editHandler ) {
        editHandlerSvc.removeEditHandler( inlineAuthoringHandlerContext );
    }
    if( _eventSubDefs.length > 0 ) {
        _.forEach( _eventSubDefs, function( subDef ) {
            eventBus.unsubscribe( subDef );
        } );
    }
    if( _dataProvider.selectionModel ) {
        _dataProvider.setSelectionEnabled( true );
    }
    _usageTypeChangedProp = null;
    _jsonInlineRowsSvrResp.splice( 0 );
    _inlineRowUids.splice( 0 );

    // call default implementation to un-register leave handler.
    if( aceEditService.editInProgress() ) {
        aceEditService.cancelEdits();
    }
    rowCounter = 0;
};

/**
 * To save edits
 * @return {Object} returns save row
 */
var saveEdits = function() {
    // Save called from save/discard dialog
    editHandlerSvc.removeEditHandler( inlineAuthoringHandlerContext );
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
    _eventSubDefs.splice( 0 );
    _dataProvider.setSelectionEnabled( true );

    return exports.saveRow().then(
        function( response ) {
            aceEditService.cancelEdits();
        } ).catch( function( error ) {
        // Save is unsuccessful from save/discard dialog

        cancelEdits();
        aceEditService.cancelEdits();
    } );
};

/**
 * get data provider based on tree or table
 * @param {Object} dataProviders - dataProviders instance
 * @return {Object} - returns tree data provider
 */
var getDataProvider = function( dataProviders ) {
    return dataProviders.occDataProvider;
};

/**
 * Add new inline empty row consdiering multiple row case.
 * @param {Object} parentVmo Parent VMO
 */
var addNextNewEmptyRow = function( parentVmo ) {
    getServerVMO( parentVmo );
};

/**
 * Register inline authoring handler
 */
var registerInlineAuthoringHandler = function() {
    appCtxSvc.ctx.aceActiveContext.context.aceEditService = {};
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.aceEditService.startEdit', startEdit );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.aceEditService.cancelEdits', cancelEdits );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.aceEditService.saveEdits', saveEdits );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.inlineAuthoringContext', {} );
};

/**
 * Adds empty row in table
 * @param {Object} dataProviders - dataProviders instance
 * @param {Object} isChild - Add as child
 */
export let addRow = function( dataProviders, isChild ) {
    // Identify if already in inline auhtoring mode.
    if( !appCtxSvc.ctx.isInlineAuthoringMode ) {
        registerInlineAuthoringHandler();
        _dataProvider = getDataProvider( dataProviders );
        var colDefs = _dataProvider.cols;
        var colConfColumns = _dataProvider.columnConfig.columns;
        if( _dataProvider.cols[ 0 ].name === 'icon' ) {
            colDefs = _dataProvider.cols.slice( 1, _dataProvider.cols.length );
        }
        if( _dataProvider.columnConfig.columns[ 0 ].name === 'icon' ) {
            colConfColumns = _dataProvider.columnConfig.columns.slice( 1, _dataProvider.columnConfig.columns.length );
        }
        aceInlineAuthoringRenderingService.setInlineAuthoringRenderers( colDefs );
        aceInlineAuthoringRenderingService.setInlineAuthoringRenderers( colConfColumns );

        if( _dataProvider ) {
            editHandlerSvc.setEditHandler( aceEditService, inlineAuthoringHandlerContext );
            editHandlerSvc.setActiveEditHandlerContext( inlineAuthoringHandlerContext );
            var dataSource = aceInlineAuthoringUtils.createDatasource( dataProviders );
            appCtxSvc.ctx.aceActiveContext.context.aceEditService.startEdit( dataSource, isChild );
        }
    } else {
        addNextNewEmptyRow( appCtxSvc.ctx.aceActiveContext.context.addElement.parent );
    }
};

/**
 * Remove the inline VMO/empty rows
 * @param {[Object]} targetObjects -target rows to be removed
 * @param {[Boolean]} removeSingle - Removes single line
 */
export let removeRow = function( targetObjects, removeSingle ) {
    var callCancelEdits = true;

    if( targetObjects && targetObjects.length !== _inlineRowUids.length ) {
        // do not call cancelEdits, this will be done during post rendering with declarative event chain defintion
        callCancelEdits = false;
    }

    if( _dataProvider.selectionModel ) {
        var editHandler = editHandlerSvc.getEditHandler( inlineAuthoringHandlerContext );
        editHandlerSvc.setActiveEditHandlerContext( inlineAuthoringHandlerContext );
        if( !editHandler ) {
            callCancelEdits = false;
        }
        _removeInlineEditableRows( targetObjects, removeSingle );
    }

    if( callCancelEdits ) {
        appCtxSvc.ctx.aceActiveContext.context.aceEditService.cancelEdits();
    }
};

/**
 * To clean Inline Edits, invoked from declarative Action handler. Need to keep as separate function
 * to avoid collision with cancelEdits being registered in context.
 */
export let clearInlineEdits = function() {
    cancelEdits();
};

/**
 * Extract allowed types from the response
 * @param {Object} response - Add element SOA response
 * @return {Object} - returns allowed types information
 */
export let extractAllowedTypesInfoFromResponse = function( response ) {
    _allowedTypesInfo = addElementService.extractAllowedTypesInfoFromResponse( response );
    return _allowedTypesInfo;
};

/**
 * Validates selected type for types column in tree table.
 * @param {Object} prop - type property
 */
export let validateSelectedType = function( prop ) {
    var vmo = getInlineRowByUid( prop.parentUid );
    _usageTypeChangedProp = prop;
    let typePropertyOnInlineRow = aceInlineAuthoringUtils.getTypePropertyNameForInlineRow();
    eventBus.publish( 'aceInlineAuth.getViewModelForCreate', {
        preferredType: vmo.props[typePropertyOnInlineRow].dbValue
    } );
};

/**
 * Validates reference object.
 * @param {Object} prop - reference object property
 */
export let validateRefObject = function( prop ) {
    var vmo = getInlineRowByUid( prop.parentUid );
    var objectUid = prop.dbValue;
    var modelObject = soa_kernel_clientDataModel.getObject( objectUid );
    aceInlineAuthoringUtils.populateObjectProps( _dataProvider, vmo, modelObject );
};

/**
 * Loads allowed types for types column in tree
 * @param {property}  property on row
 * @return {Promise}  returns promise with allowed objects type.
 */
export let loadAllowedTypesJs = function( property ) {
    var deferred = AwPromiseService.instance.defer();
    var listOfIncludeObjectTypes = _allowedTypesInfo.objectTypeName;
    var userEnteredText = property.uiValue;
    var decl = property.getViewModel();
    var startIndex = decl.dataProviders.getAllowedTypesLOV.startIndex;

    var soaInput = {
        searchInput: {
            internalPropertyName: '',
            maxToLoad: 25,
            maxToReturn: 25,
            providerName: 'Awp0TypeSearchProvider',
            attributesToInflate: [
                'parent_types',
                'type_name'
            ],
            searchCriteria: {
                searchString: userEnteredText,
                typeSelectorId: '',
                listOfIncludeObjectTypes: listOfIncludeObjectTypes,
                loadSubTypes: 'true'
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},
            searchSortCriteria: [],
            startIndex: startIndex
        }
    };

    return soaSvc.postUnchecked( 'Internal-AWS2-2016-03-Finder', 'performSearch', soaInput ).then(
        function( response ) {
            deferred.resolve( response );
            return deferred.promise;
        },
        function( error ) {
            deferred.reject( error );
            return deferred.promise;
        } );
};

/**
 * The function will parse performSearch results in to LOV drop downs.
 *
 * @param {Object} searchResultsResponse - perform search response
 * @returns {Object} lovEntries
 */
export let convertObjSearchResponseToLovEntries = function( searchResultsResponse ) {
    var lovEntries = [];
    if( searchResultsResponse.searchResults ) {
        var searchResults = searchResultsResponse.searchResults;
        if( searchResults ) {
            _.forEach( searchResults, function( obj ) {
                var lovEntry = {
                    propInternalValue: obj.props.type_name.dbValues[ 0 ],
                    propDisplayValue: obj.props.type_name.uiValues[ 0 ]
                };
                lovEntries.push( lovEntry );
            } );
        }
    }
    return lovEntries;
};

/**
 * Update the user modified dirty properties on Row to the declarative view model definition being consumed by createInput.
 * @param {*} inlineRowVmoUid Uid of Row/View Mode Object
 * @param {*} declViewModel   Declarative view model definition
 * @param {*} inlinePropMapping Column property name to Create Input property mapping
 */
var _updateDirtyPropertiesOnDeclViewModel = function( inlineRowVmoUid, declViewModel, inlinePropMapping ) {
    var inlineRowVmo = getInlineRowByUid( inlineRowVmoUid );
    var rowDirtyProps = inlineRowVmo.getSaveableDirtyProps();
    if( rowDirtyProps && rowDirtyProps.length > 0 ) {
        for( var prop in rowDirtyProps ) {
            if( rowDirtyProps.hasOwnProperty( prop ) ) {
                var modifiedPropName = rowDirtyProps[ prop ].name;
                modifiedPropName = inlinePropMapping[ modifiedPropName ];
                if( modifiedPropName ) {
                    var vmProp = _.get( declViewModel, modifiedPropName );
                    if( vmProp ) {
                        uwPropertyService.setValue( vmProp, rowDirtyProps[ prop ].values );
                    }
                }
            }
        }
    }
};

/**
 * Calls createAndAddElement SOA for non-collaborative structures,
 * where revision is created first and then addObject is invoked.
 * For collaborative structures, revision is already created/set in searchWidget and here we just call addObject with occurrence createInput.
 * @param {Object} creatIn - Create Input for SOA.
 * @return {Object} - returns promise.
 */
var createAndAddElement = function( creatIn ) {
    var deferred = AwPromiseService.instance.defer();

    currentScope.data.creatIn = creatIn;
    var createdObjects = [];
    //Check if Revision to add is already set in the searchWidget (in case of RO)
    for( var inx = 0; inx < _inlineRowUids.length; ++inx ) {
        var row = getInlineRowByUid( _inlineRowUids[ inx ] );
        //check awb0Archetype property is populated, if yes, then populate the createdObjects
        if( row.props.awb0Archetype && row.props.awb0Archetype.dbValue !== undefined ) {
            var modelObject = soa_kernel_clientDataModel.getObject( row.props.awb0Archetype.dbValue );
            createdObjects.push( modelObject );
        }
    }
    currentScope.data.createdObject = createdObjects;
    var actionName = 'addElements';

    if( currentScope.data.createdObject.length === 0 ) {
        //BVR case. We need to call createAttachAndSubmitObjects SOA first and then addObject
        actionName = 'createAndAddElement';
        currentScope.data.elementCreateInputs = [];
    } else {
        //For RO ,Part Revision is already created/set via searchWidget. Populate createInput and call addObject.
        var createInputs = [];
        for( var inx = 0; inx < creatIn.length; ++inx ) {
            createInputs.push( creatIn[ inx ].createData );
        }
        currentScope.data.elementCreateInputs = createInputs;
    }

    return viewModelSvc.executeCommand( currentScope.data, actionName, currentScope ).then( function() {
        deferred.resolve();
        return deferred.promise;
    }, function( error ) {
        deferred.reject( error );
        return deferred.promise;
    } );
};

/**
 * Populates properties from columnPropToCreateInPropMap
 * @param {Object} declViewModel - declarative view model
 */
var _populatePropsOndeclViewModel = function( declViewModel ) {
    var orgJsonData = declViewModel._internal.origDeclViewModelJson;
    var columnPropToCreateInPropMap = orgJsonData.columnPropToCreateInPropMap;
    var xrtViewElementProperties = Object.values( columnPropToCreateInPropMap );
    if( declViewModel.type === 'CREATE' ) {
        declViewModel.objCreateInfo = {
            createType: orgJsonData.data.createType,
            propNamesForCreate: xrtViewElementProperties
        };
    }

    _.forEach( xrtViewElementProperties, function( xrtViewElementProp ) {
        var propNameToMatch = xrtViewElementProp;
        if( xrtViewElementProp.includes( '__' ) > 0 ) { // compound prop
            var temp = xrtViewElementProp.split( '__' );
            propNameToMatch = temp[ 1 ];
        }
        if( orgJsonData && orgJsonData.data[ propNameToMatch ] ) {
            var rhs = orgJsonData.data[ propNameToMatch ];
            if( declViewModel[ xrtViewElementProp ] ) {
                Object.keys( rhs ).forEach( function( key ) {
                    declViewModel[ xrtViewElementProp ][ key ] = _.cloneDeep( rhs[ key ] );
                } );
            }
        }
    } );
};

/**
 * Once the custom panel properties are loaded, this function reloads the VM Props from JSON and
 * populates the custom panel properties on the declarative view model to prepare the input for CreateIn.
 * @param {*} response Declarative view model definition
 * @param {*} declViewModel Declarative view model definition
 * @param {*} customPanel   Name of the Custom Panel
 * @param {*} jsonDataDUI Json data of properties to populate
 * @param {*} createData Create Input objects
 * @param {*} deferred Promise
 * @returns {Promise} A promise that calls
 */
let _populateViewModelProperties = function( response, declViewModel, customPanel, jsonDataDUI, createData, deferred ) {
    // If we have executed the onMount/ onInit action, the data values have now been updated.
    // We still need to re-load the view model with the updated property values from JSON.
    return viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
        function( updatedCustomDeclViewModel ) {
            // Populate properties from custom panel provider to declarative view model's custom panel info.
            declViewModel.customPanelInfo[ customPanel ] = updatedCustomDeclViewModel;
            var found = false;
            // Iterate all custom panels to verify they are populated.
            for( var k = 0; k < jsonDataDUI.createHtmlProviders.length; k++ ) {
                if( !declViewModel.customPanelInfo[ jsonDataDUI.createHtmlProviders[ k ] ] ) {
                    found = false;
                    break;
                }
                // All properties from custom panel are populated.
                found = true;
            }
            if( found ) {
                // Update properties on Custom Panel declarative model with dirty properties.
                _updateDirtyPropertiesOnDeclViewModel( declViewModel.uid, updatedCustomDeclViewModel, jsonDataDUI.columnPropToCreateInPropMap );
                createData.createInObjs = createData.createInObjs.concat( addObjectUtils.getCreateInput( declViewModel ) );
            }
            if( createData.createInObjs.length === _inlineRowUids.length ) {
                deferred.resolve( createData.createInObjs );
            }
        } );
};

/**
 * Calls createAndAddElement and addOject SOA.
 * @returns {Promise} A promise that calls
 *                      {@link deferred~resolve} if Object Create is initiated successfully,
 *                      {@link deferred~reject} otherwise.
 */
export let saveRow = function() {
    var deferred = AwPromiseService.instance.defer();
    var operationName = 'CREATE';
    var type = 'CREATE';
    var createData = {
        createInObjs: []
    };
    let typePropertyOnInlineRow;
    for( var idx in _jsonInlineRowsSvrResp ) {
        var inlineServerResponse = _jsonInlineRowsSvrResp[ idx ];
        var jsonDataDUI = JSON.parse( inlineServerResponse.viewModelCreateInObjsJsonStrings[ 0 ] );
        jsonDataDUI.columnPropToCreateInPropMap = inlineServerResponse.columnPropToCreateInPropMap;
        jsonDataDUI.createHtmlProviders = inlineServerResponse.createHtmlProviders;
        jsonDataDUI._viewModelId = operationName + ':' + type;
        var svrRespJsObj = jsonDataDUI.objects[ 0 ];
        svrRespJsObj.uid = svrRespJsObj.creinfo.uid;
        jsonDataDUI.data = {};
        jsonDataDUI.data.customPanelInfo = {};
        if( !typePropertyOnInlineRow ) {
            typePropertyOnInlineRow = aceInlineAuthoringUtils.getTypePropertyNameForInlineRow();
        }

        if( svrRespJsObj.props[typePropertyOnInlineRow] && svrRespJsObj.props[typePropertyOnInlineRow].dbValues ) {
            currentScope.data.createType = svrRespJsObj.props[typePropertyOnInlineRow].dbValues[ 0 ];
        } else {
            currentScope.data.createType = currentScope.data.allowedTypeInfo.preferredType;
        }
        jsonDataDUI.data.operationName = operationName;
        jsonDataDUI.data.type = type;
        jsonDataDUI.data.createType = currentScope.data.createType;
        jsonDataDUI.data.uid = svrRespJsObj.creinfo.uid;
        jsonDataDUI.skipClone = false;
        // populate compound properties
        // fasadtocreateInmap contains properties in following format
        // awb0ArchetypeRevId: "wso_thread:fnd0ThreadId",
        // It needs compound property in following format on declarative view model.
        // name: ‘wsoThread__fnd0ThreadId’:
        // {
        // dbValue: ‘wsoThread:fnd0ThreadId’
        // }
        // ‘awb0ArcheType:’ wsothread:fnd0Child’
        _.forEach( Object.keys( jsonDataDUI.columnPropToCreateInPropMap ), function( key ) {
            var value = jsonDataDUI.columnPropToCreateInPropMap[ key ];
            if( value.includes( ':' ) > 0 && value.split( ':' ).length === 2 ) {
                var replacedValue = value.replace( /:/g, '__' );
                jsonDataDUI.data[ replacedValue ] = {
                    dbValue: value
                };
                jsonDataDUI.columnPropToCreateInPropMap[ key ] = replacedValue;
            }
        } );

        viewModelSvc.populateViewModelPropertiesFromJson( jsonDataDUI ).then( function( declViewModel ) {
            _populatePropsOndeclViewModel( declViewModel );
            // Update user edited propertis on to dataSource going to CreateInput
            _updateDirtyPropertiesOnDeclViewModel( declViewModel.uid, declViewModel, jsonDataDUI.columnPropToCreateInPropMap );
            var orgJsonData = declViewModel._internal.origDeclViewModelJson;
            if( orgJsonData.createHtmlProviders ) {
                // Custom panel consideration. There can be multiple custom panels so here we are iterating all custom panels
                // and calling getCreateInput after that.
                for( var cpIdx in orgJsonData.createHtmlProviders ) {
                    var customPanel = orgJsonData.createHtmlProviders[ cpIdx ];
                    // Read provider one by one.
                    panelContentSvc.getViewModelById( customPanel ).then( function( response ) {
                        viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                            function( customViewModel ) {
                                // Some custom panels rely on lifecycle hooks to populate the custom panel's data values.
                                // We should provide the provision to call the actions associated to onInit
                                // and onMount hooks so that the values can be popoulated on runtime.
                                let onInitAction = _.get( customViewModel, '_internal.lifecycleHooks.onInit' );
                                let onMountAction = _.get( customViewModel, '_internal.lifecycleHooks.onMount' );
                                if( onInitAction ) {
                                    return viewModelSvc.executeCommand( customViewModel, onInitAction, currentScope ).then( () => {
                                        if( onMountAction ) {
                                            return viewModelSvc.executeCommand( customViewModel, onMountAction, currentScope ).then( () => {
                                                _populateViewModelProperties( response, declViewModel, response.viewModel._viewModelId, jsonDataDUI, createData, deferred );
                                            } );
                                        }
                                        _populateViewModelProperties( response, declViewModel, response.viewModel._viewModelId, jsonDataDUI, createData, deferred );
                                    } );
                                }
                                if( onMountAction ) {
                                    return viewModelSvc.executeCommand( customViewModel, onMountAction, currentScope ).then( () => {
                                        _populateViewModelProperties( response, declViewModel, response.viewModel._viewModelId, jsonDataDUI, createData, deferred );
                                    } );
                                }
                                // If there are no onMount and onInit actions, we still want to populate the custom
                                // panel with the pre-populated data values.
                                 _populateViewModelProperties( response, declViewModel, response.viewModel._viewModelId, jsonDataDUI, createData, deferred );
                            } );
                    } );
                }
            } else {
                createData.createInObjs = createData.createInObjs.concat( addObjectUtils.getCreateInput( declViewModel ) );
                if( createData.createInObjs.length === _inlineRowUids.length ) {
                    deferred.resolve( createData.createInObjs );
                }
            }
        } );
    } // end for loop createin objects

    var deferredCreate = AwPromiseService.instance.defer();
    return deferred.promise.then( function( createIns ) {
        if( createIns.length > 0 ) {
            createAndAddElement( createIns ).then( function( res ) {
                deferredCreate.resolve( res );
            } ).catch( function( error ) {
                deferredCreate.reject( error );
            } );
        }
    } );
};
/**
 * Adds empty row in table
 * @param {Object} data - data instance
 * @returns {Object} returns newly added element
 */
export let getNewlyAddedChildElements = function( data ) {
    return addElementService.getNewlyAddedChildElements( data );
};

/**
 * Gets the occurrence type
 * @param {Object} commandContext - command context of inline row from which add is invoked
 * @returns {String} occurrenceType - type of the occurrence
 */
export let getOccType = function( commandContext ) {
    var occurrenceType = '';
    var uid = commandContext.parentUid;
    var inlineRowobject = getInlineRowByUid( uid );
    let typePropertyOnInlineRow = aceInlineAuthoringUtils.getTypePropertyNameForInlineRow();
    if( inlineRowobject.props[typePropertyOnInlineRow] && inlineRowobject.props[typePropertyOnInlineRow].dbValues !== 0 ) {
        occurrenceType = inlineRowobject.props[typePropertyOnInlineRow].dbValues[ 0 ];
    } else {
        occurrenceType = currentScope.data.allowedTypeInfo.preferredType;
    }
    return occurrenceType;
};

export default exports = {
    addRow,
    removeRow,
    clearInlineEdits,
    extractAllowedTypesInfoFromResponse,
    validateSelectedType,
    validateRefObject,
    loadAllowedTypesJs,
    convertObjSearchResponseToLovEntries,
    saveRow,
    getNewlyAddedChildElements,
    getOccType
};
/**
 * @memberof NgServices
 * @member aceInlineAuthoringHandler
 * @param {Object} $q - $q
 * @param {Object} appCtxSvc - appCtxSvc
 * @param {Object} editHandlerSvc - editHandlerSvc
 * @param {Object} soa_kernel_soaService - soaService
 * @param {Object} aceEditService - aceEditService
 * @param {Object} viewModelObjectSvc - viewModelObjectSvc instance
 * @param {Object} viewModelSvc - view model service
 * @param {Object} rootScope - root scope
 * @param {Object} panelContentSvc - panel content service
 * @param {Object} occmgmtVMTNodeCreateService - occmgmt VM tree node creation service
 * @param {Object} addObjectUtils - Add object utils
 * @param {Object} addElementService - Add element service
 * @param {Object} uwPropertyService - Property service
 * @param {Object} aceInlineAuthoringUtils - inline authoring utils
 * @param {Object} localeService - localeService
 * @param {Object} occmgmtStructureEditService - occmgmtStructureEditService
 * @param {Object} occmgmtIconService - occmgmt icon service
 * @param {Object} aceInlineAuthoringRenderingService - occmgmt inline authoring rendering service
 * @param {Object} soa_kernel_clientDataModel -client data model
 * @return {Object} - Service instance
 */
app.factory( 'aceInlineAuthoringHandler', () => exports );
