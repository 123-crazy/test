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
 * @module js/qa0AuditChecklistTreeService
 */
 import app from 'app';
 import appCtxService from 'js/appCtxService';
 import AwStateService from 'js/awStateService';
 import AwPromiseService from 'js/awPromiseService';
 import awTableStateService from 'js/awTableStateService';
 import soaSvc from 'soa/kernel/soaService';
 import uwPropertySvc from 'js/uwPropertyService';
 import awColumnSvc from 'js/awColumnService';
 import awTableSvc from 'js/awTableService';
 import iconSvc from 'js/iconService';
 import viewModelObjectSvc from 'js/viewModelObjectService';
 import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
 import cdm from 'soa/kernel/clientDataModel';
 import tcViewModelObjectService from 'js/tcViewModelObjectService';
 import _ from 'lodash';
 import _t from 'js/splmTableNative';
 import parsingUtils from 'js/parsingUtils';
 import dms from 'soa/dataManagementService';
 import Apm0QualityChecklistService from 'js/Apm0QualityChecklistService';
 import treeTableDataService from 'js/treeTableDataService';
 /**
  * Cached static default AwTableColumnInfo.
  */
 var _treeTableColumnInfos = null;

 /**
  */
 var _maxTreeLevel = 3;

 /**
  * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
  */
 var _mapNodeId2ChildArray = {};

 var exports = {};

 /**
  * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
  */
 function _getTreeTableColumnInfos( data ) {
     if ( !_treeTableColumnInfos ) {
         _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
     }

     return _treeTableColumnInfos;
 }

 /**
  * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
  */
 function _buildTreeTableColumnInfos( data ) {
     /**
      * Set 1st column to special 'name' column to support tree-table.
      */

     var awColumnInfos = [];
     awColumnInfos.push( awColumnSvc.createColumnInfo( {
         name: 'object_name',
         propertyName: 'object_name',
         displayName: data.i18n.qa0TreeColumnName,
         width: 250,
         minWidth: 150,
         typeName: 'String',
         enableColumnResizing: true,
         enableColumnMoving: false,
         isTreeNavigation: true
     } ) );
     return awColumnInfos;
 }

 /**
  * @param {Array} sortCriterias - Array of fieldName and sortCriteria.
  * @param {TreeLoadInput} loadInput - TreeLoadInput
  */
 var _populateSortCriteriaParameters = function( sortCriterias, loadInput ) {
     var sortCriteria = {};
     if ( !_.isEmpty( loadInput.sortCriteria ) ) {
         sortCriteria = loadInput.sortCriteria[0];
     }
     sortCriterias.push( sortCriteria );
 };

 /**
  * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
  *            table rows.
  * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
  *            ViewModelTreeNodes.
  * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
  * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
  * @param {Boolean} hasRelation - True if node has any relation
  */
 function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled, hasRelation ) {
     var children = [];

     _mapNodeId2ChildArray[parentNode.id] = children;

     var levelNdx = parentNode.levelNdx + 1;

     for ( var childNdx = 1; childNdx <= nChildren.length; childNdx++ ) {
         /**
          * Create a new node for this level. and Create props for it
          */
         var vmNode = exports.createVmNodeUsingNewObjectInfo( nChildren[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos, hasRelation );
         /**
          * Add it to the 'parent' based on its ID
          */
         children.push( vmNode );
     }
    var filteredChildren = _.filter( children, function( vmNode ) { return vmNode.type !== 'DummyFindingsNode' && vmNode.modelType.typeHierarchyArray.indexOf( 'Psi0AbsChecklist' ) > -1; } );
    if( filteredChildren && filteredChildren.length > 0 ) {
        Apm0QualityChecklistService.setDecoratorStyles( filteredChildren, false );
    }
 }

 /**
  * @param deferred
  * @param propertyLoadRequests
  */
 function _loadProperties( deferred, propertyLoadInput ) {
     var allChildNodes = [];

     _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
         _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
             if ( !childNode.props ) {
                 childNode.props = {};
             }

             _populateColumns( true, childNode );

             allChildNodes.push( childNode );
         } );
     } );

     var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

     var resolutionObj = {
         propertyLoadResult: propertyLoadResult
     };

     deferred.resolve( resolutionObj );
 }

 /**
 * @returns {String} the opened object UID
 */
function _getOpenedObjectUid() {
    var openedObjectUid = '';
    var stateSvc = AwStateService.instance;
    if( stateSvc && stateSvc.params ) {
        var params = stateSvc.params;
        openedObjectUid = params.uid;
    }
    return openedObjectUid;
}


function _sortChildren( children, sortCriteria ) {
    var sortedChildren = children;
    if( sortCriteria && sortCriteria.length > 0 && children && children.length > 0 ) {
        var criteria = sortCriteria[0];
        if( criteria.fieldName && criteria.sortDirection ) {
             if( criteria.sortDirection === 'ASC' ) {
                sortedChildren = children.sort( ( a, b ) =>  a.props.object_name.uiValues[0] > b.props.object_name.uiValues[0] ? 1 : -1  );
             } else if( criteria.sortDirection === 'DESC' ) {
                sortedChildren = children.sort( ( a, b ) =>  a.props.object_name.uiValues[0] > b.props.object_name.uiValues[0] ? -1 : 1  );
             }
        }
    }

    return sortedChildren;
 }

 /**
  * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
  * <P>
  * Note: The paging status is maintained in the 'parent' node.
  *
  * @param {DeferredResolution} deferred -
  * @param {TreeLoadInput} treeLoadInput -
  * @return {Promise} Revolved with a TreeLoadResult object containing result/status information.
  */
 function _loadTreeTableRows( deferred, treeLoadInput ) {
     /**
      * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
      */
     var parentNode = treeLoadInput.parentNode;
     var targetNode = parentNode;
     if ( !parentNode.isLeaf ) {
         var policyJson = {
             types: [
                 {
                    name: 'Qa0QualityAudit'
                 },
                 {
                     name: 'Apm0QualityChecklist',
                     properties: [
                         {
                             name: 'apm0QualityChecklistList'
                         },
                         {
                             name: 'apm0ParentChecklist'
                         },
                         {
                             name: 'object_desc'
                         }
                     ]
                 },
                 {
                     name: 'Awp0XRTObjectSetRow',
                     properties: [
                         {
                             name: 'awp0Target'
                         }
                     ]
                 }
             ]
         };

         var selectedUID = _getOpenedObjectUid();
         var soaInput = {
             columnConfigInput: {
                 clientName: 'AWClient',
                 clientScopeURI: ''
             },
             searchInput: {
                 attributesToInflate: [],
                 maxToLoad: 110,
                 maxToReturn: 110,
                 providerName: 'Awp0ObjectSetRowProvider',
                 searchCriteria: {
                     objectSet: 'Qa0QualityAuditChecklists.Apm0QualityChecklist',
                     parentUid: selectedUID,
                     returnTargetObjs: 'true'
                 },
                 searchFilterFieldSortType: 'Alphabetical',
                 searchFilterMap6: {},
                 searchSortCriteria: treeLoadInput.sortCriteria,
                 startIndex: treeLoadInput.startChildNdx
             },
             inflateProperties: false,
             noServiceData: false
         };
         var soaInput2 = {
             columnConfigInput: {
                 clientName: 'AWClient',
                 clientScopeURI: ''
             },
             searchInput: {
                 attributesToInflate: [],
                 maxToLoad: 110,
                 maxToReturn: 110,
                 providerName: 'Awp0ReferencesProvider',
                 searchCriteria: {
                    parentUid: selectedUID
                 },
                 searchFilterFieldSortType: 'Alphabetical',
                 searchFilterMap6: {},
                 searchSortCriteria: treeLoadInput.sortCriteria,
                 startIndex: treeLoadInput.startChildNdx
             },
             inflateProperties: false,
             noServiceData: false
         };

         //_populateSortCriteriaParameters( soaInput.searchInput.searchSortCriteria, treeLoadInput );
         if ( parentNode.levelNdx < 0 ) {
            var isLoadAllEnabled = true;
            var children = [];

             // Add Quality Audit object in the root
             var rootNode = cdm.getObject( selectedUID );
             children.push( rootNode );

             var isLoadAllEnabled = true;

             var policyId = propertyPolicySvc.register( policyJson );
             // Load all checklists and findings
            loadAuditTreeData( soaInput, soaInput2, policyId )
            .then( results => {
                var checklistData = results[0];
                var checklists = checklistData.checklists;
                var findings = results[1].findings;
                var endReached = checklistData.endReached;
                var startReached = checklistData.startReached;
                var hasRelation = Boolean( findings.length > 0 || checklists.length > 0 );
                var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, hasRelation );
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            } );
        } else if ( parentNode.levelNdx === 0 ) {
            var isLoadAllEnabled = true;
            var children = [];
            policyId = propertyPolicySvc.register( policyJson );

            // Load all checklists and findings
            loadAuditTreeData( soaInput, soaInput2, policyId )
                .then( results => {
                    var checklistData = results[0];
                    var checklists = checklistData.checklists;
                    var findings = results[1].findings;
                    if ( findings.length > 0 ) {
                        children.push( getFindingsNode() );
                    }
                    children.push( ...checklists );
                    var endReached = checklistData.endReached;
                    var startReached = checklistData.startReached;
                    var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, findings.length > 0 );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                } );
         } else if ( parentNode.levelNdx < _maxTreeLevel ) {
             var isLoadAllEnabled = true;
             var children = [];

             if( parentNode.uid !== 'extFindingsAudit' ) {
                dms.getProperties( parentNode.props.apm0QualityChecklistList.dbValues, [ 'apm0QualityChecklistList', 'apm0ParentChecklist' ] )
                    .then(
                        function() {
                            if ( parentNode.props.apm0QualityChecklistList ) {
                                for ( var x = 0; x < parentNode.props.apm0QualityChecklistList.dbValues.length; ++x ) {
                                    var uid = parentNode.props.apm0QualityChecklistList.dbValues[x];
                                    var obj = cdm.getObject( uid );
                                    if ( obj ) {
                                        children.push( obj );
                                    }
                                }
                            }

                            //sort children based on sort criteria
                            var sortedChildren = _sortChildren( children, treeLoadInput.sortCriteria );

                            if ( parentNode.props.apm0QualityChecklistList.dbValues.length === 0 ) {
                                parentNode.isLeaf = true;
                                var endReached = true;
                                var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, sortedChildren, false, true,
                                    endReached, null );
                                deferred.resolve( {
                                    treeLoadResult: treeLoadResult
                                } );
                            } else {
                                var treeLoadResult = _getTreeLoadResult( parentNode, sortedChildren, isLoadAllEnabled, treeLoadInput, false, false );
                                deferred.resolve( {
                                    treeLoadResult: treeLoadResult
                                } );
                            }
                        }
                    );
            } else {
                loadFindings( soaInput2 ).then( findingData =>{
                    var findings = findingData.findings;
                    var endReached = findingData.endReached;
                    var startReached = findingData.startReached;
                    children.push( ...findings );
                    var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, findings.length > 0 );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                } );
            }
         } else {
             parentNode.isLeaf = true;
             var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
             var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
             var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
             var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true,
                 endReached, null );
             deferred.resolve( {
                 treeLoadResult: treeLoadResult
             } );
         }
     }
 }

 /**
  *
  * @param {soaInput} soaInput input for checklists
  * @param {soaInput2} soaInput2 input for findings
  * @param {policyId} policyId policyId for checklists
  */
 async function loadAuditTreeData( soaInput, soaInput2, policyId ) {
     // Start 2 "jobs" in parallel and wait for both of them to complete
     return await Promise.all( [
         ( async()=>await loadChecklists( soaInput, policyId ) )(),
         ( async()=>await loadFindings( soaInput2 ) )()
     ] );
 }

 /**
  * Loads checklists and returns a promise
  * @param {soaInput} soaInput input for checklists
  * @param {policyId} policyId policyId for checklists
  * @returns {Promise}
  */
 function loadChecklists( soaInput, policyId ) {
     var checklists = [];
     return new Promise( resolve => {
         // Load all checklists
         return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
             function( response ) {
                 if ( policyId ) {
                     propertyPolicySvc.unregister( policyId );
                 }
                 if ( response.searchResultsJSON ) {
                     var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                     if ( searchResults ) {
                         for ( var x = 0; x < searchResults.objects.length; ++x ) {
                             var uid = searchResults.objects[x].uid;
                             var obj = cdm.getObject( uid );
                             //var obj = response.ServiceData.modelObjects[uid];
                             //var underlyingObject = cdm.getObject( obj.props.awp0Target.dbValues[0] );
                             if ( obj ) {
                                 checklists.push( obj );
                             }
                         }
                     }
                 }
                 resolve( {
                     checklists: checklists,
                     startReached: response.cursor.startReached,
                     endReached: response.cursor.endReached
                 } );
             } );
     } );
 }

 /**
  *
  * @param {soaInput2} soaInput2 input for Findings
  * @param {policyId} policyId policyId for findings
  * @returns Promise
  */
 function loadFindings( soaInput2 ) {
     var findings = [];
     return new Promise( resolve => {
         return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2 ).then(
             function( response ) {
                 if ( response.searchResultsJSON ) {
                     var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                     if ( searchResults ) {
                         for ( var x = 0; x < searchResults.objects.length; ++x ) {
                             var uid = searchResults.objects[x].uid;
                             var object = response.ServiceData.modelObjects[uid];
                             if( object ) {
                                 // filter findings..
                                 if( object.type === 'C2IssueRevision' ) {
                                     findings.push( object );
                                 }
                             }
                         }
                         if( findings.length > 0 ) {
                             findings.sort( ( a, b ) => {
                                 var date1 = new Date( a.props.creation_date.dbValues[0] ).getTime();
                                 var date2 = new Date( b.props.creation_date.dbValues[0] ).getTime();
                                 if( date1 < date2 ) { return -1; }
                                 if( date1 > date2 ) { return 1; }
                                 return 0;
                             } );
                         }
                     }
                 }

                 resolve( {
                     findings: findings,
                     startReached: response.cursor.startReached,
                     endReached: response.cursor.endReached
                 } );
             } );
     } );
 }

 /**
  * Creates a static node
  * @returns static node for showing findings in the tree
  */
 function getFindingsNode( ) {
     // Add new node for External Function and External Failure if required
     var nodeName = 'Findings';
     return {
         uid: 'extFindingsAudit',
         type: 'DummyFindingsNode',
         props:{
             object_name: {
                 dbValues:[ nodeName ],
                 uiValues:[ nodeName ]
             }
         }
     };
 }

 /**
  *
  * @param {parentNode} parentNode -
  * @param {children} children -
  * @param {isLoadAllEnabled} isLoadAllEnabled -
  * @param {actionObjects} actionObjects -
  * @param {treeLoadInput} treeLoadInput -
  * @param {Boolean} hasRelation - True, if node has any relation
  * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
  *
  **/
 function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, hasRelation ) {
     _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled, hasRelation );
     if ( parentNode.children !== undefined && parentNode.children !== null ) {
         var mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[parentNode.id] );
     } else {
         var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
     }
     var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
     var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
     var tempCursorObject = {
         endReached: endReached,
         startReached: startReached
     };

     var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, startReached,
        endReached );
     treeLoadResult.parentNode.cursorObject = tempCursorObject;
     return treeLoadResult;
 }

 /**
  * @param {ObjectArray} columnInfos -
  * @param {Boolean} isLoadAllEnabled -
  * @param {ViewModelTreeNode} vmNode -
  * @param {Number} childNdx -
  */
 function _populateColumns( isLoadAllEnabled, vmNode ) {
     if ( isLoadAllEnabled ) {
         if ( !vmNode.props ) {
             vmNode.props = {};
         }

         var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
             .getObject( vmNode.uid ), 'EDIT' );

         tcViewModelObjectService.mergeObjects( vmNode, vmo );
     }
 }

 /**
  * function to evaluate if an object contains children
  * @param {objectType} objectType object type
  * @return {boolean} if node contains child
  */
function _containChildren( props, hasRelation, vmNode ) {
    var containChild = false;
    if( vmNode ) {
        if ( vmNode.modelType && vmNode.modelType.typeHierarchyArray && vmNode.modelType.typeHierarchyArray.indexOf( 'Apm0QualityChecklist' ) > -1 && props.apm0QualityChecklistList.dbValues.length > 0  ) {
            vmNode.isLeaf = containChild;
        } else if ( vmNode.modelType && vmNode.modelType.typeHierarchyArray && vmNode.modelType.typeHierarchyArray.indexOf( 'Qa0QualityAudit' ) > -1 && hasRelation ) {
            vmNode.isLeaf = false;
        } else if ( vmNode.id === 'extFindingsAudit' && hasRelation ) {
            vmNode.isLeaf = false;
        } else {
            vmNode.isLeaf = !containChild;
        }
    }
}

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos, hasRelation ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.uiValues[0];
    var iconURL;
    iconURL = iconSvc.getTypeIconURL( type );
    if( nodeId === 'extFindingsAudit' ) {
        iconURL = iconSvc.getTypeIconURL( 'Folder' );
    }

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;

    !_containChildren( modelObject.props, hasRelation, vmNode );

    vmNode.selected = true;

    _populateColumns( isLoadAllEnabled, vmNode );
    return vmNode;
};

 /**
  * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
  *            action function is invoked from.
  * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
  *
  * <pre>
  * {
  *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
  * }
  * </pre>
  */
 export let loadTreeTableColumns = function( uwDataProvider, data ) {
     var deferred = AwPromiseService.instance.defer();
     appCtxService.ctx.treeVMO = uwDataProvider;
     var awColumnInfos = _getTreeTableColumnInfos( data );

     uwDataProvider.columnConfig = {
         columns: awColumnInfos
     };

     deferred.resolve( {
         columnInfos: awColumnInfos
     } );

     return deferred.promise;
 };

 /**
  * Get a page of row data for a 'tree' table.
  *
  * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
  *            the result of processing the 'inputData' property of a DeclAction based on data from the current
  *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
  *
  * <pre>
  * {
  * Extra 'debug' Properties
  *     delayTimeTree: {Number}
  * }
  * </pre>
  *
  * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
  *         available.
  */
 export let loadTreeTableData = function() { // eslint-disable-line no-unused-vars
     /**
      * Extract action parameters from the arguments to this function.
      */
     var treeLoadInput = arguments[0];
     treeLoadInput.sortCriteria = arguments[4];
     appCtxService.updateCtx( 'treeVMO', arguments[3] );

     /**
      * Extract action parameters from the arguments to this function.
      * <P>
      * Note: The order or existence of parameters can varey when more-than-one property is specified in the
      * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
      */
     var delayTimeTree = 0;

     for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
         var arg = arguments[ndx];

         if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
             delayTimeTree = arg.dbValue;
         } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
             _maxTreeLevel = arg.dbValue;
         }
     }

     /**
      * Check the validity of the parameters
      */
     var deferred = AwPromiseService.instance.defer();

     var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

     if ( failureReason ) {
         deferred.reject( failureReason );

         return deferred.promise;
     }

     /**
      * Load the 'child' nodes for the 'parent' node.
      */
     if ( delayTimeTree > 0 ) {
         _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput );
     } else {
         _loadTreeTableRows( deferred, treeLoadInput );
     }

     return deferred.promise;
 };

 /**
  * Get a page of row data for a 'tree' table.
  *
  * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
  *            function is invoked from. The object is usually the result of processing the 'inputData' property
  *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
  *            properties on this object is used (if defined).
  */
 export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
     /**
      * Extract action parameters from the arguments to this function.
      * <P>
      * Note: The order or existence of parameters can varey when more-than-one property is specified in the
      * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
      */
     var propertyLoadInput;

     var delayTimeProperty = 0;

     for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
         var arg = arguments[ndx];

         if ( awTableSvc.isPropertyLoadInput( arg ) ) {
             propertyLoadInput = arg;
         } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeProperty' ) {
             delayTimeProperty = arg.dbValue;
         }
     }

     var deferred = AwPromiseService.instance.defer();

     /**
      * Load the 'child' nodes for the 'parent' node.
      */
     if ( delayTimeProperty > 0 ) {
         _.delay( _loadProperties, delayTimeProperty, deferred, propertyLoadInput );
     } else {
         if ( propertyLoadInput ) {
             _loadProperties( deferred, propertyLoadInput );
         }
     }

     return deferred.promise;
 };

 /**
  * This makes sure, edited object is selected
  * @param {data} data
  * @param {ArrayList} selectionModel selection model of pwa
  */
 export let processPWASelection = function( data, selectionModel ) {
     var selectedModelObject = appCtxService.ctx.qualityAuditContext.selectedNodes;
     var viewModelCollection = data.dataProviders.auditTreeDataProvider.viewModelCollection;
     if ( selectedModelObject && selectedModelObject.length > 0 ) {
         _.forEach( selectedModelObject, function( selectedObject ) {
             if ( viewModelCollection.loadedVMObjects.length > 0 ) {
                 selectionModel.setSelection( selectedObject );
                 var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
                     return vmo.uid === selectedObject.props.qc0ParentChecklistSpec.dbValues[0];
                 } );
                 if ( parentIdx > -1 ) {
                     var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
                     addNodeToExpansionState( parentVMO, data );
                 }
             }
         } );
     } else if ( !selectedModelObject || selectedModelObject && selectedModelObject.length === 0 ) {
         selectionModel.setSelection( [] );
     }
 };

 /**
  * Add local storage entry corresponding to the information sent in.
  *
  * @param node This parameter can either be the node that is to be added to local storage or it can be just the id
  *            of the node
  * @param declViewModel The declarative view model backing this tree
  */
 export let addNodeToExpansionState = function( node, declViewModel ) {
     // For now we will use id of the grid that is first in the list of grids in the view model.
     // Once we get this value in treeLoadInput we will shift to using it.
     var gridId = Object.keys( declViewModel.grids )[0];
     awTableStateService.saveRowExpanded( declViewModel, gridId, node );
 };

 export let updateFindings = function( eventData, auditTreeDataProvider ) {
    if( eventData && eventData.createChangeData ) {
        var changeObject = eventData.createChangeData;
        // insert the new treeNode in the viewModelCollection at the correct location
        var viewModelCollection = auditTreeDataProvider.viewModelCollection;
        var findings = viewModelCollection.loadedVMObjects.filter( item => item.type === 'C2IssueRevision' );
        if( findings.length === 0 ) {
            var auditVMO = viewModelCollection.loadedVMObjects[0];
            auditVMO.isLeaf = false;
            auditVMO.isExpanded = true;
            let findingsFolderNode = exports.createVmNodeUsingNewObjectInfo( getFindingsNode(), 1, 0, true, true );
            findingsFolderNode.isExpanded = true;
            viewModelCollection.loadedVMObjects.splice( 1, 0, findingsFolderNode );
        }
        let findingNode = exports.createVmNodeUsingNewObjectInfo( changeObject, 2, 1, true, true );
        // insert newly created node at the end (sortby creation date)
        viewModelCollection.loadedVMObjects.splice( 2 + findings.length, 0, findingNode );
        auditTreeDataProvider.update( viewModelCollection.loadedVMObjects );
    }
};

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * eventData : {Object} containing viewModelObjects and totalObjectsFound
 */
 export let updateDisplayNames = function( eventData ) {
    // update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if ( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, 'object_name' );
        } );
    }

    if ( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, 'object_name' );
            } );
        } );
    }
};

export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    processPWASelection,
    addNodeToExpansionState,
    updateFindings
};
//loadTreeTablePropertiesOnInitialLoad
 /**
  * @memberof NgServices
  * @member qa0AuditChecklistTreeService
  */
 app.factory( 'qa0AuditChecklistTreeService', () => exports );

