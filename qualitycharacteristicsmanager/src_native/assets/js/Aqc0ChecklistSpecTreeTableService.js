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
 * @module js/Aqc0ChecklistSpecTreeTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
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
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import parsingUtils from 'js/parsingUtils';


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

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos(data) {
    if (!_treeTableColumnInfos) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos(data);
    }

    return _treeTableColumnInfos;
}

/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos(data) {

    /**
     * Set 1st column to special 'name' column to support tree-table.
     */

    var awColumnInfos = [];
    awColumnInfos.push(awColumnSvc.createColumnInfo({
        name: 'object_name',
        displayName: data.i18n.Aqc0ElementName,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    }));
    for (var index = 0; index < awColumnInfos.length; index++) {
        var column = awColumnInfos[index];
        column.cellRenderers = [];
        column.cellRenderers.push(_treeCmdCellRender());
    }
    var sortCriteria = appCtxService.ctx.checklistSpecManagerContext.sortCriteria;
    if (!_.isEmpty(sortCriteria)) {
        if (sortCriteria[0].fieldName && _.eq(awColumnInfos[0].name, sortCriteria[0].fieldName)) {
            awColumnInfos[0].sort = {};
            awColumnInfos[0].sort.direction = sortCriteria[0].sortDirection.toLowerCase();
            awColumnInfos[0].sort.priority = 0;
        }
    }
    return awColumnInfos;
}

/**
 * Table Command Cell Renderer for PL Table
 */
var _treeCmdCellRender = function () {
    return {
        action: function (column, vmo, tableElem) {
            var cellContent = awSPLMTableCellRendererFactory.createTreeCellCommandElement(column, vmo, tableElem);

            // add event for cell image visibility
            var gridCellImageElement = cellContent.getElementsByClassName(_t.Const.CLASS_GRID_CELL_IMAGE)[0];
            if (gridCellImageElement) {
                togglePartialVisibility(gridCellImageElement, vmo.visible);
            }

            return cellContent;
        },
        condition: function (column) {
            return column.isTreeNavigation === true;
        }
    };
};

/**
 * Adds/removes partialVisibility class to element.
 *
 * @param {DOMElement} element DOM element for classes
 * @param {Boolean} isVisible for adding/removing class
 */
var togglePartialVisibility = function (element, isVisible) {
    if (!isVisible) {
        element.classList.add('aw-widgets-partialVisibility');
    } else {
        element.classList.remove('aw-widgets-partialVisibility');
    }
};

/**
 * @param {Array} sortCriterias - Array of fieldName and sortCriteria.
 * @param {TreeLoadInput} loadInput - TreeLoadInput
 */
var _populateSortCriteriaParameters = function (sortCriterias, loadInput) {
    var sortCriteria = {};
    if (!_.isEmpty(loadInput.sortCriteria)) {
        sortCriteria = loadInput.sortCriteria[0];
    }
    sortCriterias.push(sortCriteria);
};

/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 */
function _buildTreeTableStructure(columnInfos, parentNode, nChildren, isLoadAllEnabled) {
    var children = [];

    _mapNodeId2ChildArray[parentNode.id] = children;

    var levelNdx = parentNode.levelNdx + 1;

    for (var childNdx = 1; childNdx <= nChildren.length; childNdx++) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var vmNode = exports.createVmNodeUsingNewObjectInfo(nChildren[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos);
        /**
         * Add it to the 'parent' based on its ID
         */
        children.push(vmNode);
    }
}

/**
 * @param deferred
 * @param propertyLoadRequests
 */
function _loadProperties(deferred, propertyLoadInput) {
    var allChildNodes = [];

    _.forEach(propertyLoadInput.propertyLoadRequests, function (propertyLoadRequest) {
        _.forEach(propertyLoadRequest.childNodes, function (childNode) {
            if (!childNode.props) {
                childNode.props = {};
            }

            _populateColumns(true, childNode);

            allChildNodes.push(childNode);
        });
    });

    var propertyLoadResult = awTableSvc.createPropertyLoadResult(allChildNodes);

    var resolutionObj = {
        propertyLoadResult: propertyLoadResult
    };

    deferred.resolve(resolutionObj);
}

/**
 * function to evaluate if an object contains children
 * @param {objectType} objectType object type
 * @return {boolean} if node contains child
 */
function containChildren(props, vmNode) {
    var containChild = false;
    if (props.qc0ChecklistSpecList.dbValues.length > 0) {
        vmNode.isLeaf = containChild;
    } else {
        vmNode.isLeaf = !containChild;
    }
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
function _loadTreeTableRows(deferred, treeLoadInput) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;
    var targetNode = parentNode;

    if (!parentNode.isLeaf) {
        var policyJson = {
            types: [{
                name: 'Qc0ChecklistSpecification',
                properties: [{
                    name: 'qc0ChecklistSpecList'
                },
                {
                    name: 'qc0ParentChecklistSpec'
                }
                ]
            }]
        };

        // get props with intial tree for now. In future, should set this to false and populate
        // the props seperately.
        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: ''
            },
            searchInput: {
                maxToLoad: 110,
                maxToReturn: 110,
                providerName: 'Aqc0QualityBaseProvider',
                searchFilterMap6: {
                    'WorkspaceObject.object_type': [{
                        searchFilterType: 'StringFilter',
                        stringValue: 'Qc0ChecklistSpecification'
                    }]
                },
                searchCriteria: {
                    parentGUID: '',
                    searchStatus: "false",
                    catalogueObjectType: ''
                },
                startIndex: treeLoadInput.startChildNdx,
                searchSortCriteria: []
            }
        };

        _populateSortCriteriaParameters(soaInput.searchInput.searchSortCriteria, treeLoadInput);
        if (parentNode.levelNdx < 0) {
            soaInput.searchInput.searchCriteria.catalogueObjectType = 'Qc0ChecklistSpecification';
        }
        else if (parentNode.levelNdx < _maxTreeLevel) {
            soaInput.searchInput.searchCriteria.parentGUID = targetNode.uid;
        }
        else {
            parentNode.isLeaf = true;
            var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
            var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
            var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
            var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, mockChildNodes, false, true,
                endReached, null);
            deferred.resolve({
                treeLoadResult: treeLoadResult
            });
        }
        var isLoadAllEnabled = true;
        var children = [];

        var policyId = propertyPolicySvc.register(policyJson);
        return soaSvc.postUnchecked('Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput).then(
            function (response) {
                if (policyId) {
                    propertyPolicySvc.unregister(policyId);
                }
                if (response.searchResultsJSON) {
                    var searchResults = parsingUtils.parseJsonString(response.searchResultsJSON);
                    if (searchResults) {
                        for (var x = 0; x < searchResults.objects.length; ++x) {
                            var uid = searchResults.objects[x].uid;
                            var obj = response.ServiceData.modelObjects[uid];
                            if (obj) {
                                children.push(obj);
                            }
                        }
                    }
                }
                if (response.totalFound === 0) {
                    parentNode.isLeaf = true;
                    var endReached = true;
                    var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, children, false, true,
                        endReached, null);
                    deferred.resolve({
                        treeLoadResult: treeLoadResult
                    });
                } else {
                    var treeLoadResult = _getTreeLoadResult(parentNode, children, isLoadAllEnabled, treeLoadInput);
                    deferred.resolve({
                        treeLoadResult: treeLoadResult
                    });
                }

                appCtxService.ctx.search.totalFound = response.searchFilterMap6.Qc0ChecklistSpecification[0].count;
                appCtxService.ctx.search.filterMap = response.searchFilterMap6;
            });

    }
}

/**
 *
 * @param {parentNode} parentNode -
 * @param {children} children -
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {actionObjects} actionObjects -
 * @param {treeLoadInput} treeLoadInput -
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 *
 **/
function _getTreeLoadResult(parentNode, children, isLoadAllEnabled, treeLoadInput) {
    _buildTreeTableStructure(_getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled);
    if (parentNode.children !== undefined && parentNode.children !== null) {
        var mockChildNodes = parentNode.children.concat(_mapNodeId2ChildArray[parentNode.id]);
    } else {
        var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
    }
    var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
    var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
    var tempCursorObject = {
        endReached: endReached,
        startReached: true
    };

    var treeLoadResult = awTableSvc.buildTreeLoadResult(treeLoadInput, mockChildNodes, false, true,
        endReached, null);
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    return treeLoadResult;
}

/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns(isLoadAllEnabled, vmNode) {
    if (isLoadAllEnabled) {
        if (!vmNode.props) {
            vmNode.props = {};
        }

        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject(cdm
            .getObject(vmNode.uid), 'EDIT');

        tcViewModelObjectService.mergeObjects(vmNode, vmo);
    }
}

var exports = {};

export let createVmNodeUsingNewObjectInfo = function (modelObject, levelNdx, childNdx, isLoadAllEnabled) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.uiValues[0];

    var iconURL = iconSvc.getTypeIconURL(type);

    var vmNode = awTableSvc.createViewModelTreeNode(nodeId, type, displayName, levelNdx, childNdx, iconURL);
    vmNode.modelType = modelObject.modelType;

    !containChildren(modelObject.props, vmNode);

    vmNode.selected = true;

    _populateColumns(isLoadAllEnabled, vmNode);
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
export let loadTreeTableColumns = function (uwDataProvider, data) {
    var deferred = AwPromiseService.instance.defer();
    appCtxService.ctx.treeVMO = uwDataProvider;
    var awColumnInfos = _getTreeTableColumnInfos(data);

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve({
        columnInfos: awColumnInfos
    });

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
export let loadTreeTableData = function () { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = arguments[0];
    var sortCriteria = appCtxService.getCtx('checklistSpecManagerContext').sortCriteria;

    if (arguments[4]) {
        if (!_.eq(arguments[4], sortCriteria)) {
            appCtxService.updatePartialCtx('checklistSpecManagerContext.sortCriteria', arguments[4]);
            treeLoadInput.retainTreeExpansionStates = true;
        }
    }

    treeLoadInput.sortCriteria = appCtxService.getCtx('checklistSpecManagerContext').sortCriteria;

    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var delayTimeTree = 0;

    for (var ndx = 0; ndx < arguments.length; ndx++) {
        var arg = arguments[ndx];

        if (uwPropertySvc.isViewModelProperty(arg) && arg.propertyName === 'delayTimeTree') {
            delayTimeTree = arg.dbValue;
        } else if (uwPropertySvc.isViewModelProperty(arg) && arg.propertyName === 'maxTreeLevel') {
            _maxTreeLevel = arg.dbValue;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput(treeLoadInput);

    if (failureReason) {
        deferred.reject(failureReason);

        return deferred.promise;
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if (delayTimeTree > 0) {
        _.delay(_loadTreeTableRows, delayTimeTree, deferred, treeLoadInput);
    } else {
        _loadTreeTableRows(deferred, treeLoadInput);
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
export let loadTreeTableProperties = function () { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var propertyLoadInput;

    var delayTimeProperty = 0;

    for (var ndx = 0; ndx < arguments.length; ndx++) {
        var arg = arguments[ndx];

        if (awTableSvc.isPropertyLoadInput(arg)) {
            propertyLoadInput = arg;
        } else if (uwPropertySvc.isViewModelProperty(arg) && arg.propertyName === 'delayTimeProperty') {
            delayTimeProperty = arg.dbValue;
        }
    }

    var deferred = AwPromiseService.instance.defer();

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if (delayTimeProperty > 0) {
        _.delay(_loadProperties, delayTimeProperty, deferred, propertyLoadInput);
    } else {
        if (propertyLoadInput) {
            _loadProperties(deferred, propertyLoadInput);
        }
    }

    return deferred.promise;
};

/**
 * This makes sure, edited object is selected
 * @param {data} data
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function (data, selectionModel) {
    var selectedModelObject = appCtxService.ctx.checklistSpecManagerContext.selectedNodes;
    var viewModelCollection = data.dataProviders.checklistSpecDataProvider.viewModelCollection;
    if (selectedModelObject && selectedModelObject.length > 0) {
        _.forEach(selectedModelObject, function (selectedObject) {
            if (viewModelCollection.loadedVMObjects.length > 0) {
                selectionModel.setSelection(selectedObject);
                var parentIdx = _.findLastIndex(viewModelCollection.loadedVMObjects, function (vmo) {
                    return vmo.uid === selectedObject.props.qc0ParentChecklistSpec.dbValues[0];
                });
                if (parentIdx > -1) {
                    var parentVMO = viewModelCollection.getViewModelObject(parentIdx);
                    addNodeToExpansionState(parentVMO, data);
                }
            }
        });
    } else if (!selectedModelObject || selectedModelObject && selectedModelObject.length === 0) {
        selectionModel.setSelection([]);
    }
};

/**
 * Add local storage entry corresponding to the information sent in.
 *
 * @param node This parameter can either be the node that is to be added to local storage or it can be just the id
 *            of the node
 * @param declViewModel The declarative view model backing this tree
 */
export let addNodeToExpansionState = function (node, declViewModel) {
    // For now we will use id of the grid that is first in the list of grids in the view model.
    // Once we get this value in treeLoadInput we will shift to using it.
    var gridId = Object.keys(declViewModel.grids)[0];
    awTableStateService.saveRowExpanded(declViewModel, gridId, node);
};

/**
 * Update selected nodes in context based on pin value
 * selected node set as new object if pinnedToForm is true
 * selected node set as current selection if pinnedToForm is false
 * @param {DeclViewModel} data
 */
export let selectNewlyAddedElement = function (data) {
    appCtxService.ctx.checklistSpecManagerContext = {};
    appCtxService.ctx.checklistSpecManagerContext.selectedNodes = [];
    if (data.pinnedToForm.dbValue) {
        appCtxService.ctx.checklistSpecManagerContext.selectedNodes = data.selectedNodes;
    } else {
        if (appCtxService.ctx.selected) {
            appCtxService.ctx.checklistSpecManagerContext.selectedNodes.push(appCtxService.ctx.selected);
        }
    }
};

export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    processPWASelection,
    selectNewlyAddedElement,
    addNodeToExpansionState
};
/**
 * @memberof NgServices
 * @member Aqc0ChecklistSpecTreeTableService
 */
app.factory('Aqc0ChecklistSpecTreeTableService', () => exports);
