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
 * This file is used as services file for Checklist Specification structure edit for quality module
 *
 * @module js/Aqc0ChecklistSpecEditStructureService
 */
import eventBus from 'js/eventBus';
import _ from 'lodash';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import Aqc0ChecklistSpecTreeTableService from 'js/Aqc0ChecklistSpecTreeTableService';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import parsingUtils from 'js/parsingUtils';
import dms from 'soa/dataManagementService';

import 'soa/kernel/clientDataModel';
import 'soa/kernel/clientMetaModel';
import 'js/messagingService';

import 'js/commandPanel.service';
import 'soa/dataManagementService';

var exports = {};

/**
 * Add newly added element to the tree and update the selection to this node.
 *@param {ModelObject} addElementInput Created object response from SOA
 */
export let addNewElement = function (addElementInput) {
var remp = addElementInput;
    dms.getProperties([addElementInput.uid], ['qc0ParentChecklistSpec'])
        .then(
            function () {
                var updatedParentElement = addElementInput && addElementInput.props.qc0ParentChecklistSpec ? addElementInput.props.qc0ParentChecklistSpec.dbValues[0] : null;
                _insertAddedElementIntoVMOForSelectedParent(appCtxService.ctx.treeVMO.viewModelCollection, appCtxService.ctx.treeVMO.topTreeNode, updatedParentElement, addElementInput)
                    .then(
                        function () {
                            var ctxSearch = appCtxService.getCtx("search");
                            ctxSearch.totalFound = appCtxService.ctx.treeVMO.viewModelCollection.loadedVMObjects.length + 1;
                            var eventData = {
                                objectsToSelect: [addElementInput]
                            };
                            eventBus.publish('aqc0ChecklistSpecSelectionUpdateEvent', eventData);
                        }
                    );
            }
        );
};

/**
 * Inserts objects added under selected parent(contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} ViewModelTreeNode Top tree node.
 * @param {Object} inputParentElement The input parent element on which addd is initiated.
 * @param {Object} newElements List of new elements to add
 *
 */
function _insertAddedElementIntoVMOForSelectedParent(viewModelCollection, topTreeNode, inputParentElement,
    newElements) {
    var deferred = AwPromiseService.instance.defer();
    //First find if the parent exists in the viewModelCollection
    var parentIdx = _.findLastIndex(viewModelCollection.loadedVMObjects, function (vmo) {
        return vmo.uid === inputParentElement;
    });

    if (parentIdx > -1) {
        var parentVMO = viewModelCollection.getViewModelObject(parentIdx);
        // First add the children for selected parent node.
        if (parentVMO) {
            _updateParentNodeState(deferred, viewModelCollection, parentVMO.uid, parentIdx, newElements); //.then( function() {
        }
    } else {
        // Add root Checklist specification.
        _updateParentNodeState(deferred, viewModelCollection, null, parentIdx, newElements, topTreeNode);
    }
    return deferred.promise;
}

/**
 * Inserts objects added (contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} parentVMO (null if no parentVMO)
 * @param {Number} parentIdx - index of the parentVMO in the viewModelCollection (-1 if no parentVMO)
 * @param {Object} ModelObject List of model objects in SOA response
 * @param {Number} newChildIdx - index of the newchild in the SOA response (-1 if not found)
 * @param {Number} childOccRespIdx Index of new element in SOA response
 * @param {Object} childOccurrence - child occurrence to add
 * @param {ViewModelTreeNode} topTreeNode top tree node.
 */
function _insertSingleAddedElementIntoParentVMOAndViewModelCollection(viewModelCollection,
    parentVMO, children, newChildIdx, childOccRespIdx, childOccurrence, topTreeNode) {
    var childlevelIndex = 0;
    if (parentVMO) {
        childlevelIndex = parentVMO.levelNdx + 1;
    }

    if (childOccRespIdx !== 0) {
        var elementBeforeNewEle = children[childOccRespIdx - 1];

        var elementBeforeNewEleInVmoIdx = _.findLastIndex(viewModelCollection.loadedVMObjects, function (vmo) {
            return vmo.uid === elementBeforeNewEle.uid;
        });

        var elementBeforeNewEleVmo = _.find(viewModelCollection.loadedVMObjects, function (vmo) {
            return vmo.uid === elementBeforeNewEle.uid;
        });

        //Find the childIndex in the childOccurences (if we can)
        var childIdx = -1;
        if (newChildIdx > -1) {
            childIdx = newChildIdx;
        } else {
            childIdx = elementBeforeNewEleVmo ? elementBeforeNewEleVmo.childNdx + 1 : 1;
        }

        //corner case not in pagedChildOccs and has no length it is truly empty
        if (childIdx < 0) {
            childIdx = 0;
        }

        //Create the viewModelTreeNode from the child ModelObject, child index and level index
        var childVMO = Aqc0ChecklistSpecTreeTableService.createVmNodeUsingNewObjectInfo(childOccurrence, childlevelIndex, childIdx, true);
        childVMO.selected = false;
        //Add the new treeNode to the parentVMO (if one exists) children array
        if (parentVMO && parentVMO.children) {
            parentVMO.isLeaf = false;
            _addTreeNodeVMO(parentVMO, elementBeforeNewEle, childVMO);
        }
        // Add new treeNode to top tree node
        else {
            if (topTreeNode && topTreeNode.children) {
                _addTreeNodeVMO(topTreeNode, elementBeforeNewEle, childVMO);
            }
        }

        for (var i = elementBeforeNewEleInVmoIdx + 1; i < viewModelCollection.loadedVMObjects.length; i++) {
            if (viewModelCollection.loadedVMObjects[i].levelNdx <= viewModelCollection.loadedVMObjects[elementBeforeNewEleInVmoIdx].levelNdx) {
                break;
            }
        }

        var newIndex = i;
        viewModelCollection.loadedVMObjects.splice(newIndex, 0, childVMO);
    } else {
        //Find the childIndex in the childOccurences (if we can)
        var childIdx = -1;
        if (newChildIdx > -1) {
            childIdx = newChildIdx;
        } else {
            childIdx = 1;
        }

        //corner case not in pagedChildOccs and has no length it is truly empty
        if (childIdx < 0) {
            childIdx = 0;
        }

        //Create the viewModelTreeNode from the child ModelObject, child index and level index
        var childVMO = Aqc0ChecklistSpecTreeTableService.createVmNodeUsingNewObjectInfo(childOccurrence, childlevelIndex, childIdx, true);

        if (parentVMO) {
            var newIndex = _.findLastIndex(viewModelCollection.loadedVMObjects, function (vmo) {
                return vmo.uid === parentVMO.uid;
            });

            viewModelCollection.loadedVMObjects.splice(newIndex + 1, 0, childVMO);
        } else {
            viewModelCollection.loadedVMObjects.push(childVMO);
        }
    }
}
/**
 * Update tree node
 * @param {ViewModelTreeNode} treeNodeVMO parent or top tree node.
 * @param {ModelObject} elementBeforeNewEle element before new element.
 * @param {ViewModelTreeNode} childVMO new child node.
 */
function _addTreeNodeVMO(treeNodeVMO, elementBeforeNewEle, childVMO) {
    var elementBeforeNewChildExistingIdx = _.findLastIndex(treeNodeVMO.children, function (child) {
        return child.uid === elementBeforeNewEle.uid;
    });
    for (var i = elementBeforeNewChildExistingIdx + 1; i < treeNodeVMO.children.length; i++) {
        treeNodeVMO.children[i].childNdx = treeNodeVMO.children[i].childNdx + 1;
    }
    treeNodeVMO.children.splice(elementBeforeNewChildExistingIdx + 1, 0, childVMO);
    treeNodeVMO.totalChildCount = treeNodeVMO.children.length;
}
/**
 * Update parentVMO state ( mark as expanded=true, isLeaf=false)
 * @param deferred
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {String} parentUid parent uid
 * @param {Number} parent index in current tree view model
 * @param {ModelObject} newElements new object that is to be inserted in tree
 * @param {ViewModelTreeNode} topTreeNode top tree node.
 */
function _updateParentNodeState(deferred, viewModelCollection, parentUid, parentIdx, newElements, topTreeNode) {
    //Now get the exact viewModelTreeNode for the parent Occ in the viewModelCollection
    var policyId = policySvc.register({
        types: [{
            name: 'Qc0ChecklistSpecification',
            properties: [{
                name: 'qc0ChecklistSpecList'
            }]
        }]
    });
    var soaInput2 = {
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
                searchStatus: 'true',
                catalogueObjectType: ''
            },
            startIndex: 0,
            searchSortCriteria: []
        }
    };
    if (parentIdx > -1) {
        var parentVMO = viewModelCollection.getViewModelObject(parentIdx);

        if (parentVMO) {
            //the parent exists in the VMO lets make sure it is now marked as parent and expanded
            soaInput2.searchInput.searchCriteria.parentGUID = parentUid;
            soaInput2.searchInput.maxToLoad = parentVMO.children && parentVMO.children.length > soaInput2.searchInput.maxToLoad ? parentVMO.children.length : soaInput2.searchInput.maxToLoad;
            soaInput2.searchInput.maxToReturn = parentVMO.children && parentVMO.children.length > soaInput2.searchInput.maxToLoad ? parentVMO.children.length : soaInput2.searchInput.maxToReturn;
            parentVMO.expanded = true;
            parentVMO.isExpanded = true;
            parentVMO.isLeaf = false;
        }
    } else {
        soaInput2.searchInput.searchCriteria.catalogueObjectType = 'Qc0ChecklistSpecification';
        soaInput2.searchInput.maxToLoad = topTreeNode.children && topTreeNode.children.length > soaInput2.searchInput.maxToLoad ? topTreeNode.children.length : soaInput2.searchInput.maxToLoad;
        soaInput2.searchInput.maxToReturn = topTreeNode.children && topTreeNode.children.length > soaInput2.searchInput.maxToLoad ? topTreeNode.children.length : soaInput2.searchInput.maxToReturn;
    }

    soaSvc.postUnchecked('Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2).then(
        function (response) {
            var children = [];
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

            if (policyId) {
                policySvc.unregister(policyId);
            }
            if (children.length > 0) {
                var newlyAddedEleInResponseIdx = _.findLastIndex(children, function (child) {
                    return child.uid === newElements.uid;
                });

                if (newlyAddedEleInResponseIdx > -1) {
                    _insertSingleAddedElementIntoParentVMOAndViewModelCollection(viewModelCollection,
                        parentVMO, children, -1, newlyAddedEleInResponseIdx, children[newlyAddedEleInResponseIdx], topTreeNode);

                    deferred.resolve();
                } else {
                    deferred.resolve();
                }
            }
        });
        
    return deferred.promise;
}

export default exports = {
    addNewElement
};

app.factory('Aqc0ChecklistSpecEditStructureService', () => exports);
