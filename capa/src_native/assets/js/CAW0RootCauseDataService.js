// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/CAW0RootCauseDataService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import cdmSvc from 'soa/kernel/clientDataModel';
import tcVmoService from 'js/tcViewModelObjectService';
import eventBus from 'js/eventBus';
import assert from 'assert';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';
import _ from 'lodash';

var _propertyLoadResult = null;

/**
 */
var _numInitialTopChildren = 147;

/**
 */
var _maxTreeLevel = 3;

var relatedWhys = [];

/**
 * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
 */
var _mapNodeId2ChildArray = {};

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos() {
    var awColumnInfos = [];
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        propertyName: 'object_name',
        displayName: 'Name',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0rootCause',
        propertyName: 'caw0rootCause',
        displayName: 'Root Cause',
        typeName: 'BOOLEAN',
        width: 100,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0WhySequence',
        propertyName: 'caw0WhySequence',
        displayName: 'Why Sequence',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0CauseGroup',
        propertyName: 'caw0CauseGroup',
        displayName: 'Ishikawa Cause Group',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_desc',
        propertyName: 'object_desc',
        displayName: 'Description',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0ProbDefinition',
        propertyName: 'caw0ProbDefinition',
        displayName: 'Problem Definition',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0category',
        propertyName: 'caw0category',
        displayName: 'Category',
        typeName: 'STRING',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'caw0reoccuring',
        propertyName: 'caw0reoccuring',
        displayName: 'Reoccuring',
        typeName: 'BOOLEAN',
        width: 300,
        pixelWidth: 100,
        enableColumnResizing: true,
        modifiable: true,
        enableColumnMoving: false
    } ) );

    return awColumnInfos;
}

/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 * @param {Array} response - Array of modelObjects to use when building the table rows.
 */
function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled, response ) {
    var children = [];
    var modelObjects = response;

    _mapNodeId2ChildArray[ parentNode.id ] = children;

    var levelNdx = parentNode.levelNdx + 1;

    for( var childNdx = 1; childNdx <= modelObjects.length; childNdx++ ) {
        var node = modelObjects[ childNdx - 1 ];
        var nodeDisplayName = node.props.object_string.dbValues[ 0 ];
        var nodeId = node.uid;
        var type = node.type;

        var iconURL = _getObjectIconUrl( node.props, type );

        var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, nodeDisplayName, levelNdx, childNdx, iconURL );
        vmNode.modelType = node.modelType;
        vmNode.isLeaf = true;
        vmNode.parentUid = nodeId;
        vmNode.isRootCause = node.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && node.props.caw0rootCause.dbValues[ 0 ] === '1';
        vmNode.is_modifiable = node.props.is_modifiable;
        if( node.leafFlag === false ) {
            vmNode.isLeaf = false;
            vmNode.selected = true;
        }
        vmNode.caw0Context = node.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? node.props.caw0Context.dbValues[ 0 ] : null;
        vmNode.caw0AnalysisDimension = ( node.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 || node.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 || node.modelType
            .typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) && appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ? node.props.caw0AnalysisDimension.dbValues[ 0 ] : null;
        _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, node.props );
        vmNode.typeIconURL = iconURL;
        /**
         * Add it to the 'parent' based on its ID
         */
        children.push( vmNode );
    }
}

/**
 * @param {props} props -
 * @param {String} type -
 * @param {String} childNumber -
 * @return {String} iconURL-
 */
function _getObjectIconUrl( props, type ) {
    var iconURL = null;

    if( props && props.awp0ThumbnailImageTicket ) {
        var ticket = props.awp0ThumbnailImageTicket.dbValues[ 0 ];

        if( ticket.length > 0 ) {
            iconURL = browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
        } else {
            iconURL = iconSvc.getTypeIconURL( type );
        }
    } else {
        iconURL = iconSvc.getTypeIconURL( type );
    }

    return iconURL;
}

/**
 * @param {Number} columnNumber -
 * @param {AwTableColumnInfo} columnInfo -
 * @param {String} nodeId -
 * @param {String} type -
 * @param {String} childNumber -
 * @param {ViewModelProperties} props -
 * @return {ViewModelProperty} vmProp-
 */
function _createViewModelProperty( columnNumber, columnInfo, vmNode, childNumber, props ) {
    var dbValues;
    var uiValues;

    if( columnInfo.isTreeNavigation && columnInfo.name === 'object_name' ) {
        dbValues = props.object_string.dbValues;
        uiValues = props.object_string.dbValues;
    } else {
        if( vmNode.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) === -1 && columnInfo.name !== 'caw0category' && columnInfo.name !== 'caw0reoccuring' && columnInfo.name !== 'caw0CauseGroup' &&
            columnInfo.name !== 'caw0WhySequence' && columnInfo.name !== 'caw0rootCause' ) {
            dbValues = props[ columnInfo.name ].dbValues;
            uiValues = props[ columnInfo.name ].uiValues;
        } else if( vmNode.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && columnInfo.name !== 'caw0ProbDefinition' ) {
            dbValues = props[ columnInfo.name ].dbValues;
            uiValues = props[ columnInfo.name ].uiValues;
        } else {
            dbValues = '';
            uiValues = '';
        }
    }

    var vmProp = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
        columnInfo.typeName, dbValues, uiValues );

    vmProp.dbValues = vmProp.dbValue;
    vmProp.uiValues = vmProp.uiValue;
    vmProp.propertyDescriptor = {
        displayName: columnInfo.displayName
    };

    if( columnInfo.isTableCommand || columnInfo.isTreeNavigation ) {
        vmProp.typeIconURL = iconSvc.getTypeIconURL( vmNode.type );
    }

    return vmProp;
}

/**
 *
 * @param {parentNode} parentNode -
 * @param {_numInitialTopChildren} _numInitialTopChildren -
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {actionObjects} actionObjects -
 * @param {treeLoadInput} treeLoadInput -
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 *
 **/
function _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, actionObjects, treeLoadInput ) {
    _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, _numInitialTopChildren, isLoadAllEnabled, actionObjects );
    var mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
    var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
    var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
    return awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true,
        endReached, null );
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 */
function _loadTreeTableRows( deferred, treeLoadInput ) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;

    var policyId = propertyPolicySvc.register( {
        types: [ {
            name: 'CAW0Defect',
            properties: [ {
                    name: 'object_name'
                },
                {
                    name: 'caw0category'
                },
                {
                    name: 'caw0reoccuring'
                },
                {
                    name: 'object_desc'
                },
                {
                    name: 'caw0CauseGroup'
                }
            ]
        } ]
    } );

    if( !parentNode.isLeaf ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;

        if( nChild === 0 ) {
            var isLoadAllEnabled = true;
            if( parentNode.levelNdx < 0 ) {
                appCtxService.ctx.parentCAPA = cdmSvc.getObject( AwStateService.instance.params.uid );
                var selected;

                if( appCtxService.ctx.parentCAPA ) {
                    selected = appCtxService.ctx.parentCAPA;
                } else {
                    selected = appCtxService.ctx.selected.modelType && appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ? appCtxService.ctx.selected : appCtxService
                        .ctx.pselected;
                }

                soaSvc.post( 'Cad-2007-01-DataManagement', 'expandGRMRelations', {
                    objects: [ selected ],
                    pref: {
                        expItemRev: true,
                        info: [ {
                            relationName: 'CPA0ProblemDescription',
                            objectTypeNames: []
                        } ]
                    }
                } ).then( function( response ) {
                    propertyPolicySvc.unregister( policyId );
                    var pdDefect = response.output[ 0 ].otherSideObjData[ 0 ].otherSideObjects;
                    if( pdDefect ) {
                        soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                            parentList: [ { uid: pdDefect[ 0 ].uid, type: pdDefect[ 0 ].type } ],
                            level: 2
                        } ).then( function( response ) {
                            if( _hasChildDefect( pdDefect[ 0 ].uid, response ) ) {
                                pdDefect[ 0 ].leafFlag = false;
                            }
                            var treeLoadResult = _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, pdDefect, treeLoadInput );
                            deferred.resolve( {
                                treeLoadResult: treeLoadResult
                            } );
                        } );
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, [], treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    }
                } );
            } else {
                var selectedObject = cdmSvc.getObject( treeLoadInput.parentNode.uid );
                if( parentNode.levelNdx < _maxTreeLevel && ( ( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ( selectedObject.props.caw0Context.dbValues[ 0 ] !== "5Why" &&
                            selectedObject.props.caw0Context.dbValues[ 0 ] !== "Why" ) ) || selectedObject.modelType.typeHierarchyArray
                        .indexOf( 'CAW0Ishikawa' ) > -1 ) ) {
                    soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                        parentList: [ { uid: treeLoadInput.parentNode.uid, type: treeLoadInput.parentNode.type } ],
                        level: 2
                    } ).then( function( response ) {
                        var childDefects = _getChildDefects( treeLoadInput.parentNode.uid, response );

                        for( var index = 0; index < childDefects.length; index++ ) {
                            if( _hasChildDefect( childDefects[ index ].uid, response ) ) {
                                childDefects[ index ].leafFlag = false;
                            }
                        }
                        var treeLoadResult = _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, childDefects, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } );
                } else
                if( parentNode.levelNdx < _maxTreeLevel && ( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ( selectedObject.props.caw0Context.dbValues[ 0 ] === "5Why" ||
                        selectedObject.props.caw0Context.dbValues[ 0 ] === "Why" ) ) ) {
                    soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                        parentList: [ { uid: treeLoadInput.parentNode.uid, type: treeLoadInput.parentNode.type } ],
                        level: -1
                    } ).then( function( response ) {
                        var childDefects = _getChildDefects( selectedObject.uid, response );
                        var parentSequenceIndex = selectedObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length;
                        var sideWhysAnd5Whys = [];
                        for( var index = 0; index < childDefects.length; index++ ) {
                            var childSequenceIndex = childDefects[ index ].modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? childDefects[ index ].props.caw0WhySequence.dbValues[ 0 ]
                                .split( '-' )[ 1 ].split( '.' ).length : 0;
                            if( _hasChildDefect( childDefects[ index ].uid, response ) && ( childDefects[ index ].modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) === -1 || ( childDefects[
                                        index ].modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && childDefects[ index ].props.caw0Context.dbValues[ 0 ] !== "Why" &&
                                    parentSequenceIndex !== childSequenceIndex ) ) ) {
                                childDefects[ index ].leafFlag = false;
                            }
                            if( childDefects[ index ].modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && childDefects[ index ].props.caw0Context.dbValues[ 0 ] === "Why" &&
                                parentSequenceIndex < childSequenceIndex ) {
                                sideWhysAnd5Whys.push( childDefects[ index ] );
                                var relatedWhys = _getRelatedChildWhyObj( childDefects[ index ], response, false );
                                sideWhysAnd5Whys = sideWhysAnd5Whys.concat( relatedWhys );
                            }
                            if( childDefects[ index ].modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                                sideWhysAnd5Whys.push( childDefects[ index ] );
                            }
                        }

                        var treeLoadResult = _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, sideWhysAnd5Whys, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } );
                } else
                if( parentNode.levelNdx < _maxTreeLevel && selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                    soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                        parentList: [ { uid: treeLoadInput.parentNode.uid, type: treeLoadInput.parentNode.type } ],
                        level: -1
                    } ).then( function( response ) {
                        var relatedWhys = _getRelatedWhyObj( treeLoadInput.parentNode.uid, response );
                        var treeLoadResult = _getTreeLoadResult( parentNode, _numInitialTopChildren, isLoadAllEnabled, relatedWhys, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } );
                } else {
                    parentNode.isLeaf = true;
                    var mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
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
    }

    /**
     *
     */
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _hasChildDefect( parentUid, response ) {
    var childs = response.parentChildren;
    var index = childs[ 0 ].findIndex( function( modelObject ) {
        return parentUid === modelObject.uid;
    } );

    return index > -1 ? childs[ 1 ][ index ].length > 0 : false;
}

/**  Function returns modelObjects
 * @param {response} response -
 * @returns {actionObjects}
 **/
function _getChildDefects( parentUid, response ) {
    var childs = response.parentChildren;
    var index = childs[ 0 ].findIndex( function( modelObject ) {
        return parentUid === modelObject.uid;
    } );
    return childs[ 1 ][ index ];
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _getRelatedWhyObj( parentUid, response ) {
    var relatedWhys = [];
    var index;
    var fiveWhyArray = [];
    while( _hasChildDefect( parentUid, response ) ) {
        var childDefect = _getChildDefects( parentUid, response );
        var maxCount = 0;

        childDefect.forEach( ( item, idx ) => {
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 && maxCount === 0 ) {
                if( relatedWhys.find( obj => obj.uid === parentUid ) ) {
                    relatedWhys.find( obj => obj.uid === parentUid ).leafFlag = false;
                }
                maxCount++;
                fiveWhyArray.push( item.uid ); // push 5why element id in array
            } else if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" ) {
                if( relatedWhys.find( obj => obj.uid === parentUid ) ) {
                    relatedWhys.find( obj => obj.uid === parentUid ).leafFlag = false;
                }
            } else if( item.props && item.props.caw0Context && item.props.caw0Context.dbValues[ 0 ] === "5Why" ) {
                // check if why having 5why as child and some whys associated with this 5why , then skip those whys to display at parent level
                // or To remove duplicate child whys to display at parent level we have added this condition
                var isParentAlreadyExist = fiveWhyArray.includes( parentUid );
                if( isParentAlreadyExist ) {
                    fiveWhyArray.push( item.uid );
                } else {
                    relatedWhys = relatedWhys.concat( childDefect[ idx ] );
                }
            }
        } );

        parentUid = childDefect[ 0 ].uid;

    }
    return relatedWhys;
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _getRelatedChildWhyObj( parentObject, response, addingFlag ) {
    var relatedWhys = [];
    var isParentUpdated = true;
    var sequenceLength = parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length;
    var parentObjectIndexlength = addingFlag ? sequenceLength + 1 : sequenceLength;
    while( _hasChildDefect( parentObject.uid, response ) && isParentUpdated ) {
        var childDefect = _getChildDefects( parentObject.uid, response );
        isParentUpdated = false;
        var updatedParentObj;
        childDefect.forEach( ( item, idx ) => {
            var childObjectIndexlength = item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? item.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length : 0;
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength === childObjectIndexlength ) {
                relatedWhys = relatedWhys.concat( childDefect[ idx ] );
                updatedParentObj = childDefect[ idx ];
                isParentUpdated = true;
                if( _hasChildDefect( item.uid, response ) ) {
                    var parentChild = item;
                    var childDefectlevel2 = _getChildDefects( parentChild.uid, response );
                    childDefectlevel2.forEach( ( item, idx ) => {
                        if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                            parentChild.leafFlag = false;
                        }
                    } );
                }
            }
            if( ( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength < childObjectIndexlength ) || item
                .modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                parentObject.leafFlag = false;
            }
        } );
        parentObject = isParentUpdated ? updatedParentObj : parentObject;
        parentObjectIndexlength = parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length;

    }
    return relatedWhys;
}

/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 * @param {ViewModelProperties} props -
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, props ) {
    if( isLoadAllEnabled ) {
        if( !vmNode.props ) {
            vmNode.props = {};
        }

        _.forEach( columnInfos, function( columnInfo, columnNdx ) {
            /**
             * Do not put any properties in the 'isTreeNavigation' column.
             */
            if( !columnInfos.isTreeNavigation ) {
                vmNode.props[ columnInfo.name ] = _createViewModelProperty( columnNdx, columnInfo, vmNode, childNdx, props );
            }
        } );
    }
}

/**
 * Load properties for Tree
 *
 * @param {PropertyLoadRequest} propertyLoadRequests - Parameters for accessing desired result.
 *
 * @param {PropertyLoadContext} propertyLoadContext - (Optional) The context to use for accessing desired
 *            result.
 * @param {declViewModel} ViewModel backing the tree table
 *
 * @returns {Promise} A Promise resolved with an object containing a 'propertyLoadResult' property set with the
 *          results of the operation.
 */
function _loadProperties( propertyLoadInput, propertyLoadContext, contextKey, declViewModel, uwDataProvider ) {
    var propertyLoadContextLcl = propertyLoadContext ? propertyLoadContext : {};
    var allChildNodes = [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props || !_.size( childNode.props ) ) {
                childNode.props = {};

                if( cdmSvc.isValidObjectUid( childNode.uid ) ) {
                    allChildNodes.push( childNode );
                }
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    // if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
    //     allChildNodes.push( uwDataProvider.topTreeNode );
    // }

    if( _.isEmpty( allChildNodes ) ) {
        if( !_.isUndefined( uwDataProvider.columnConfig ) ) {
            propertyLoadResult.columnConfig = uwDataProvider.columnConfig;
        }

        return AwPromiseService.instance.resolve( {
            propertyLoadResult: propertyLoadResult
        } );
    }

    return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl ).then(
        function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                // munge columns and include on result

                var propColumns = response.output.columnConfig.columns;

                // first column is special here
                propColumns[ 0 ].isTreeNavigation = true;
            }

            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
}

var exports = {};

export let setRootCauseContext = function( data, ctx ) {
    ctx.rootCauseContext = data.dataProviders.rootCauseDataProvider;
};

export let setParentWhyObject = function( ctx, data ) {
    //check added new 5Why if yes unregister Ctx.is5Whyadded
    appCtxService.unRegisterCtx( 'is5Whyadded' );

    soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
        parentList: [ { uid: ctx.selected.uid, type: ctx.selected.type } ],
        level: -1
    } ).then( function( response ) {
        var relatedWhys = [];
        var index;
        var parentObject = ctx.selected ? ctx.selected : response.parentChildren[ 0 ][ 0 ];
        var parentUid = parentObject.uid;
        //Check if Why is adding to Why update the sequence
        if( parentObject.modelType && parentObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
            var childDefect = _getChildDefects( parentUid, response );
            if( childDefect.length > 0 ) {
                var isIndexSet = false;
                childDefect.forEach( ( child, idx ) => {
                    if( child.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
                        relatedWhys = _getRelatedChildWhyObj( parentObject, response, true );
                        if( relatedWhys.length > 0 ) {
                            index = relatedWhys.length - 1;
                            ctx.parentWhyObj = relatedWhys[ index ];
                            var indexValues = relatedWhys[ index ].props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
                            var lastIndex = indexValues.length - 1;
                            var newIndex = ( parseInt( indexValues[ lastIndex ] ) + 1 ).toString();
                            indexValues.splice( lastIndex, 1, newIndex );
                            ctx.whyIndex = indexValues.join( '.' );
                            data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
                            isIndexSet = true;
                        } else {
                            ctx.parentWhyObj = ctx.selected;
                            var oldIndex = ctx.selected.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ];
                            ctx.whyIndex = oldIndex.concat( '.1' );
                            data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
                        }
                    } else if( !isIndexSet ) {
                        ctx.parentWhyObj = ctx.selected;
                        var oldIndex = ctx.selected.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ];
                        ctx.whyIndex = oldIndex.concat( '.1' );
                        data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
                    }
                } );

            } else {
                ctx.parentWhyObj = ctx.selected;
                var oldIndex = ctx.selected.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ];
                ctx.whyIndex = oldIndex.concat( '.1' );
                data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
            }
        } else {
            relatedWhys = _getRelatedWhyObj( parentUid, response );
            if( relatedWhys.length > 0 ) {
                index = relatedWhys.length - 1;
                ctx.parentWhyObj = relatedWhys[ index ];
                ctx.whyIndex = index + 2;
                data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
            } else {
                ctx.parentWhyObj = ctx.selected;
                ctx.whyIndex = 1;
                data.caw0WhySequence = data.whySequencePrefix + '-' + ctx.whyIndex;
            }
        }
    } );
};

export let getRelationInput = function( ctx, data ) {

    var parentObj = ctx.parentWhyObj === undefined ? ctx.selected : ctx.parentWhyObj;
    var relation;
    if( parentObj.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        relation = 'CAW0RelatedWhy';
    } else if( parentObj.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.selected && ( parentObj.uid !== ctx.selected.uid ) ) {
        relation = 'CAW0Why';
    } else if( parentObj.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.selected && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ( parentObj.uid === ctx
            .selected.uid ) ) {
        relation = 'CAW0SideWhy';
    }
    return [ {
        primaryObject: parentObj,
        secondaryObject: data.createdObject,
        relationType: relation,
        clientId: '',
        userData: {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        }
    } ];
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
export let loadTreeTableColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    appCtxService.ctx.treeVMO = uwDataProvider;

    var awColumnInfos = [ {

        name: 'object_string',
        displayName: '...',
        typeName: 'WorkspaceObject',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false
    } ];

    awColumnSvc.createColumnInfo( awColumnInfos );

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
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );

    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var delayTimeTree = 0;

    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
            delayTimeTree = arg.dbValue;
        } else if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
            _maxTreeLevel = arg.dbValue;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( delayTimeTree > 0 ) {
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput );
    }

    return deferred.promise;
};

/** To get selected object
 * @param {ctx} ctx -
 * @return {ctx.selected}
 **/
export let getPrimaryObject = function( ctx ) {
    return ctx.selected;
};

export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context ) {
    var propertyLoadContextLcl = context ? context : {};
    _propertyLoadResult = awTableSvc.createPropertyLoadResult( vmNodes );

    var allChildNodes = [];

    if( uwDataProvider && !uwDataProvider.columnConfig.columnConfigId ) {
        uwDataProvider.columnConfigLoadingInProgress = true;
        var loadVMOPropsThreshold = 0;

        _.forEach( vmNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};

                if( cdmSvc.isValidObjectUid( childNode.uid ) && loadVMOPropsThreshold <= 50 ) {
                    allChildNodes.push( childNode );
                    loadVMOPropsThreshold++;
                }
            }
        } );

        if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
            allChildNodes.push( uwDataProvider.topTreeNode );
        }

        return tcVmoService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl ).then( function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                // munge columns and include on result
                var propColumns = response.output.columnConfig.columns;
                _.forEach( propColumns, function( col ) {
                    if( !col.typeName && col.associatedTypeName ) {
                        col.typeName = col.associatedTypeName;
                    }
                } );
                // first column is special here
                propColumns[ 0 ].isTreeNavigation = true;
                uwDataProvider.columnConfig = response.output.columnConfig;
                delete uwDataProvider.columnConfigLoadingInProgress;
            }
        } );
    }
    _propertyLoadResult.columnConfig = uwDataProvider.columnConfig;

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: _propertyLoadResult
    } );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
 *            function is invoked from. The object is usually the result of processing the 'inputData' property
 *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
 *            properties on this object is used (if defined).
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].propertyLoadInput, 'Missing argument property' );

    var uwDataProvider = arguments[ 0 ].uwDataProvider;
    var declViewModel = arguments[ 0 ].declViewModel;
    var propertyLoadInput = arguments[ 0 ].propertyLoadInput;
    var contextKey = arguments[ 0 ].contextKey;
    var propLoadCtxt = arguments[ 0 ].propertyLoadContext;

    if( uwDataProvider && !_.isUndefined( uwDataProvider.columnConfigLoadingInProgress ) ) {
        return AwPromiseService.instance.resolve( {
            propertyLoadResult: _propertyLoadResult
        } );
    }

    return _loadProperties( propertyLoadInput, propLoadCtxt, contextKey, declViewModel, uwDataProvider );
};

/**
 * This method ensures that the s_uid in url is selected in the primary workarea.
 * This is required for selection sync of url and primary workarea
 *
 * @param {ArrayList} context selection model of pwa
 */
export let resetSelection = function( context ) {
    if( context.state === 'saved' && AwStateService.instance.params.s_uid || context === 'Added5Why' ) {
        appCtxService.ctx.selectedDefect = AwStateService.instance.params.s_uid;
        eventBus.publish( 'primaryWorkarea.reset' );
        eventBus.subscribe( 'primaryWorkArea.selectionChangeEvent', function( eventData ) {
            var selectedObjs = eventData.dataProvider.getSelectedObjects();
            if( selectedObjs.length > 0 ) {
                appCtxService.ctx.selectedDefect = selectedObjs[ 0 ].uid;
                return;
            }
        } );
    }
};

/**
 * This method ensures that the s_uid in url is selected in the primary workarea.
 * This is required for selection sync of url and primary workarea
 *
 * @param {ArrayList} selectionModel selection model of pwa
 * @param {Object} data list of specification objects
 */
export let processPWASelection = function( selectionModel, data ) {
    if( data.dataProviders.rootCauseDataProvider.viewModelCollection.loadedVMObjects.length > 0 && appCtxService.ctx.selectedDefect ) {
        selectionModel.setSelection( appCtxService.ctx.selectedDefect );
    } else if( data.dataProviders.rootCauseDataProvider.viewModelCollection.loadedVMObjects.length > 0 ) {
        selectionModel.setSelection( data.dataProviders.rootCauseDataProvider.viewModelCollection.loadedVMObjects[ 0 ].uid );
    }
};

/**
 * Processes the responce of expandGRMRelationsForPrimary and returns list of secondary Objects
 *
 * @param {responce}response responce of expandGRMRelationsForPrimary
 * @returns {List} availableSecondaryObject return list of secondary objects
 */
export let processSecondaryObject = function( response ) {
    var availableSecondaryObject = [];
    if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
        for( var i in response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
        }
    }
    return availableSecondaryObject;
};

export default exports = {
    setRootCauseContext,
    setParentWhyObject,
    getRelationInput,
    loadTreeTableColumns,
    loadTreeTableData,
    getPrimaryObject,
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableProperties,
    resetSelection,
    processPWASelection,
    processSecondaryObject
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService
 */
app.factory( 'CAW0RootCauseDataService', () => exports );
