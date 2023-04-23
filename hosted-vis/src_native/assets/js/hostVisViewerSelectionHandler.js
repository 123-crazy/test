// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global define */

/* eslint-disable no-invalid-this */
/* eslint-disable class-methods-use-this */

/**
 * This service is create selection handler for hosted vis
 *
 * @module js/hostVisViewerSelectionHandler
 */

import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import csidsToObjSvc from 'js/csidsToObjectsConverterService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import appCtxService from 'js/appCtxService';
import objectsToPackedOccurrenceCSIDsService from 'js/objectsToPackedOccurrenceCSIDsService';
import _ from 'lodash';
import logger from 'js/logger';
import VisOccmgmtCommunicationService from 'js/visOccmgmtCommunicationService';
import hostVisQueryService from 'js/hostVisQueryService';
import StructureViewerService from 'js/structureViewerService';

/**
 * Class to hold the hosted viewer selection data
 */
export default class hostVisViewerSelectionHandler {
    /**
     * hostVisViewerSelectionHandler constructor
     */
    constructor() {
        this.selectionRequestToBeProcessed = null;
        this.isSelectionInProgress = false;
        this.SelectionTypes = {
            ROOT_PRODUCT_SELECTED: 'ROOT_PRODUCT_SELECTED',
            OCC_PARENT_SELECTED: 'OCC_PARENT_SELECTED',
            SAVED_BOOKMARK_SELECTED: 'SAVED_BOOKMARK_SELECTED',
            OCC_SELECTED: 'OCC_SELECTED'
        };
        this.selectionsFromVishost = [];
        this.processingVisSelection = false;
    }

    /**
     * Check if selections are equal
     *
     * @param {Array} modelObjectsArray Array of selected model objects
     *
     * @returns {Boolean} result of input comparison to last selections sent from VisHost
     */
    checkIfModelObjectSelectionsAreEqual( modelObjectsArray ) {
        let bTheyAreEqual = false;
        if( this.selectionsFromVishost.length === modelObjectsArray.length ) {
            if( this.selectionsFromVishost.length > 0 ) {
                bTheyAreEqual = _.xor( modelObjectsArray, this.selectionsFromVishost ).length === 0;
            } else {
                bTheyAreEqual = true;
            }
        }
        return bTheyAreEqual;
    }

    /**
     * Handle selection changes in ACE
     * @param  {Object} eventData event data
     */
    selectionChangeEventHandler( eventData ) {
        if( !this.isSelectionInProgress ) {
            // See if this selection is caused by handling a selection event started from  TcVis.
            if( this.processingVisSelection ) {
                this.processingVisSelection = false;
                return;
            }

            this.processSelectionEvent( eventData.selectionModel );
        } else {
            this.selectionRequestToBeProcessed = eventData.selectionModel;
        }
    }

    /**
     * Handle pack unpack changes in ACE
     * @param  {Object} eventData event data
     */
    onPackUnpackOperation( eventData ) {
        //Get the aceActiveContext to access selectionModel
        let occmgmtContext = this.getAceActiveCtx();
        let aceSelectionModel = occmgmtContext.pwaSelectionModel;
        if( aceSelectionModel ) {
            if( !this.isSelectionInProgress ) {
                this.processSelectionEvent( aceSelectionModel, true );
            } else {
                this.selectionRequestToBeProcessed = aceSelectionModel;
            }
        }
    }

    processSelectionEvent( aceSelectionModel, isPackedUnpackedActionPerformed ) {
        this.isSelectionInProgress = true;
        this.processSelectionEventInternal( aceSelectionModel, isPackedUnpackedActionPerformed ).then( function() {
            if( !_.isNull( this.selectionRequestToBeProcessed ) ) {
                this.processSelectionEvent( this.selectionRequestToBeProcessed );
                this.selectionRequestToBeProcessed = null;
            } else {
                this.isSelectionInProgress = false;
            }
        }.bind( this ) ).catch( function( errorMsg ) {
            this.isSelectionInProgress = false;
            logger.error( 'Failed to process selection event : ' + errorMsg );
        }.bind( this ) );
    }

    processSelectionEventInternal( aceSelectionModel, isPackedUnpackedActionPerformed ) {
        let returnPromise = AwPromiseService.instance.defer();
        let currentlySelectedCsids = []; //TODO: Need a mechanism to get csids of parts selected in hosted vis
        let context = appCtxService.getCtx( 'aceActiveContext.context' ); //$NON-NLS-1$
        if( _.isUndefined( context ) ) {
            returnPromise.reject( 'Active Context not available' );
            return returnPromise.promise;
        }
        let promise = csidsToObjSvc.doPerformSearchForProvidedCSIDChains( currentlySelectedCsids, 'true' );
        promise.then( function( csidModelData ) {
            let currentlySelectedModelObjs = [];
            _.forEach( csidModelData.elementsInfo, function( elementInfo ) {
                currentlySelectedModelObjs.push( elementInfo.element );
            } );
            let selectionUids = aceSelectionModel.getSelection();
            let selections = _.compact( cdm.getObjects( selectionUids ) );
            let selectionType = this.getSelectionType( selections );
            let selectedPartitions = this.getPartitionCSIDs( selections );

            if( selectionType === this.SelectionTypes.OCC_SELECTED ) {
                if( !_.isNull( currentlySelectedModelObjs ) &&
                    !_.isUndefined( currentlySelectedModelObjs ) &&
                    !_.isEmpty( currentlySelectedModelObjs ) ) {
                    let newSelectionLength = 0;
                    if( selections ) {
                        newSelectionLength = selections.length;
                    }
                    let currentSelectionLength = currentlySelectedModelObjs.length;
                    if( newSelectionLength === 0 ) {
                        // Send empty selection set to hosted vis, which is represented as [].
                        // This will be interpreted as an unselect all operation.
                        let newlySelectedCsids = [];
                        hostVisQueryService.sendSelectionsToVis( newlySelectedCsids, selectedPartitions );
                        returnPromise.resolve();
                    } else if( newSelectionLength > currentSelectionLength ) { //Something got selected
                        let modelObjListToBeSelected = _.xor( currentlySelectedModelObjs, selections );
                        let newlySelectedCsids = _.cloneDeep( currentlySelectedCsids );
                        for( let i = 0; i < modelObjListToBeSelected.length; i++ ) {
                            if( !_.includes( modelObjListToBeSelected[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( modelObjListToBeSelected[ i ] ) );
                            }
                        }
                        this.determineAndSelectPackedOccs( selections, newlySelectedCsids, selectedPartitions ).then( function() {
                            returnPromise.resolve();
                        }, function( errorMsg ) {
                            returnPromise.reject( errorMsg );
                        } );
                    } else if( currentSelectionLength > newSelectionLength ) {
                        let commonModelObjects = _.intersection( currentlySelectedModelObjs, selections );
                        let newlySelectedCsids = null;
                        if( commonModelObjects.length > 0 ) {
                            //Something got deselected
                            let modelObjListToBeDeSelected = _.xor( currentlySelectedModelObjs, selections );
                            newlySelectedCsids = _.cloneDeep( currentlySelectedCsids );
                            for( let i = 0; i < modelObjListToBeDeSelected.length; i++ ) {
                                var csid = null;
                                if( _.includes( modelObjListToBeDeSelected[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                    //uid of partition
                                } else {
                                    let csid = objectToCSIDGeneratorService.getCloneStableIdChain( modelObjListToBeDeSelected[ i ] );
                                }
                                let index = newlySelectedCsids.indexOf( csid );
                                if( index > -1 ) {
                                    newlySelectedCsids.splice( index, 1 );
                                }
                            }
                        } else {
                            //We got entirely new set of selection from ACE tree. This scenarion occurs when we multiselect parts in ACE tree
                            //using control key and ACE does not enter multiselect mode. So, now if user clicks any other part,
                            //ACE tree will deselect all previously selected parts and only select new part. So, in viewer also
                            //we have update the selection entirely.
                            newlySelectedCsids = [];
                            for( var i = 0; i < selections.length; i++ ) {
                                if( !_.includes( selections[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                    newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                                }
                            }
                        }
                        // Send selection set to hosted vis, which is represented by newlySelectedCsids.
                        hostVisQueryService.sendSelectionsToVis( newlySelectedCsids, selectedPartitions );
                        returnPromise.resolve();
                    } else { // When new and current selection length is same
                        if( newSelectionLength === 1 && currentSelectionLength - newSelectionLength === 0 ) {
                            //In case of current and new selection length is same and equals to 1, then determine and select packed occs only if
                            // 1) Packed operation is performed, hence perform packed occus selection in viewer.
                            //    OR
                            // 2) Current and new selections are not equal. This means there is some change in new selection and hence we need to determine packed ocuurences.

                            var newlySelectedModelObj = selections[ 0 ];
                            if( _.includes( newlySelectedModelObj.modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                hostVisQueryService.sendSelectionsToVis( newlySelectedCsids, selectedPartitions );
                                returnPromise.resolve();
                            } else {
                                var newlySelectedCsids = [ objectToCSIDGeneratorService.getCloneStableIdChain( newlySelectedModelObj ) ];
                                if( isPackedUnpackedActionPerformed || !_.isEqual( newlySelectedCsids, currentlySelectedCsids ) ) {
                                    this.determineAndSelectPackedOccs( selections, newlySelectedCsids ).then( function() {
                                        returnPromise.resolve();
                                    }, function( errorMsg ) {
                                        returnPromise.reject( errorMsg );
                                    } );
                                } else {
                                    returnPromise.resolve();
                                }
                            }
                        } else if( isPackedUnpackedActionPerformed ) {
                            // if current and new selections are same and if their length is grater than 1, determine packed occus if packed operation is performed.
                            var newlySelectedCsids = [];
                            for( var i = 0; i < selections.length; i++ ) {
                                if( !_.includes( selections[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                    newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                                }
                            }
                            this.determineAndSelectPackedOccs( selections, newlySelectedCsids, selectedPartitions ).then( function() {
                                returnPromise.resolve();
                            }, function( errorMsg ) {
                                returnPromise.reject( errorMsg );
                            } );
                        } else {
                            returnPromise.resolve();
                        }
                    }
                } else {
                    // Add code to handle first time selections via ACE tree
                    let newlySelectedCsids = [];
                    for( let i = 0; i < selections.length; i++ ) {
                        if( !_.includes( selections[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                        newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                    }
                }
                    this.determineAndSelectPackedOccs( selections, newlySelectedCsids, selectedPartitions ).then( function() {
                        returnPromise.resolve();
                    }, function( errorMsg ) {
                        returnPromise.reject( errorMsg );
                    } );
                }
            } else if( selectionType === this.SelectionTypes.OCC_PARENT_SELECTED ) {
                let occmgmtContext = this.getAceActiveCtx();
                let openedElement = occmgmtContext.openedElement;
                let openedElementCsid = objectToCSIDGeneratorService.getCloneStableIdChain( openedElement );
                // Send selection set to hosted vis, which is represented by openedElementCsid.
                hostVisQueryService.sendSelectionsToVis( openedElementCsid, selectedPartitions );
                returnPromise.resolve();
            } else if( selectionType === this.SelectionTypes.ROOT_PRODUCT_SELECTED || selectionType === this.SelectionTypes.SAVED_BOOKMARK_SELECTED ) {
                // Send the root element to be selected by hosted vis. This is represented by an array of ['']
                let newlySelectedCsids = [];
                if( selections.length > 0 ) {
                    newlySelectedCsids.push( '' );
                }
                hostVisQueryService.sendSelectionsToVis( newlySelectedCsids, selectedPartitions );
                returnPromise.resolve();
            }
        }.bind( this ) ).catch( function( errorMsg ) {
            logger.error( 'Failed to process selection event : ' + errorMsg );
        } );

        return returnPromise.promise;
    }

    /**
     * Determine packed occs and updates Viewer selections
     *
     * @param  {Object[]} modelObjects for which packed occs are to be determined
     * @param  {String[]} determinedCSIds already selected CSIds
     * @param  {String[]} selectedPartitions partition csids
     *
     * @returns {Promise} When packed occurrences are determined
     */
    determineAndSelectPackedOccs( modelObjects, determinedCSIds, partitionCSIds ) {
        let returnPromise = AwPromiseService.instance.defer();
        let occmgmtContext = this.getAceActiveCtx();
        let productCtx = occmgmtContext.productContextInfo;
        let packedOccPromise = objectsToPackedOccurrenceCSIDsService.getCloneStableIDsWithPackedOccurrences( productCtx, modelObjects );

        if( !_.isUndefined( packedOccPromise ) ) {
            packedOccPromise.then( function( response ) {
                if( response.csids && response.csids.length > 1 ) {
                    csidsToObjSvc.doPerformSearchForProvidedCSIDChains( response.csids ).then( function() {
                        let actualSelectedCsids = response.csids;
                        // Send the selection set to hosted vis. This is represented actualSelectedCsids
                        hostVisQueryService.sendSelectionsToVis( actualSelectedCsids, partitionCSIds );
                    } );
                } else {
                    // Send the selection set to hosted vis. This is represented determinedCSIds
                    hostVisQueryService.sendSelectionsToVis( determinedCSIds, partitionCSIds );
                }
                returnPromise.resolve();
            }, function( errorMsg ) {
                returnPromise.reject( errorMsg );
            } );

            return returnPromise.promise;
        }

        // Send the selection set to hosted vis. This is represented determinedCSIds
        hostVisQueryService.sendSelectionsToVis( determinedCSIds, partitionCSIds );
        returnPromise.resolve();
        return returnPromise.promise;
    }

    /**
     * Viewer selection changed handler
     *
     * @param  {Array} occCSIDChains Array of strings representing CS occurrence  chains
     */
    viewerSelectionChangedHandler( occCSIDChains ) {
        if( occCSIDChains && occCSIDChains.length !== 0 ) {
            let objectsToSelect = [];
            let objectsToHighlight = [];
            //Visualization selection manager returns blank string ('') for root selection
            //ACE does not understand this and does nothing in tree
            //We need to add opened element model object to list
            if( occCSIDChains.length === 1 && _.includes( occCSIDChains, '' ) ) {
                let occmgmtContext = this.getAceActiveCtx();
                objectsToSelect = [ occmgmtContext.topElement ];
                this.selectionsFromVishost = objectsToSelect;
                this.processingVisSelection = true;
                VisOccmgmtCommunicationService.instance.notifySelectionChangesToAce( objectsToSelect, objectsToHighlight, appCtxService.getCtx( 'aceActiveContext' ).key );
            } else {
                csidsToObjSvc.doPerformSearchForProvidedCSIDChains( occCSIDChains, 'true' ).then( function( csidModelData ) {
                    _.forEach( csidModelData.elementsInfo, function( elementInfo ) {
                        objectsToSelect.push( elementInfo.element );
                        objectsToHighlight.push( elementInfo.visibleElement );
                    } );
                    this.selectionsFromVishost = objectsToSelect;
                    this.processingVisSelection = true;
                    VisOccmgmtCommunicationService.instance.notifySelectionChangesToAce( objectsToSelect, objectsToHighlight, appCtxService.getCtx( 'aceActiveContext' ).key );
                }.bind( this ) ).catch( function( errorMsg ) {
                    logger.error( 'Failed to get model object data using csid : ' + errorMsg );
                } );
            }
        } else {
            this.processingVisSelection = true;
            VisOccmgmtCommunicationService.instance.notifySelectionChangesToAce( [], [], appCtxService.getCtx( 'aceActiveContext' ).key );
        }
    }

    /**
     * Get the selection type.
     *
     * @param  {Object[]} selected selected model objects
     * @returns {String} selection type string
     */
    getSelectionType( selected ) {
        let occmgmtContext = this.getAceActiveCtx();
        let currentRoot = occmgmtContext.openedElement;
        let actualRoot = occmgmtContext.topElement;
        if( _.isUndefined( selected ) || _.isNull( selected ) || _.isEmpty( selected ) ) {
            return currentRoot === actualRoot ? this.SelectionTypes.ROOT_PRODUCT_SELECTED : this.SelectionTypes.OCC_PARENT_SELECTED;
        }

        if( selected.length === 1 && currentRoot && selected[ 0 ].uid === actualRoot.uid ) {
            return this.SelectionTypes.ROOT_PRODUCT_SELECTED;
        }

        let viewModeCtx = appCtxService.getCtx( 'ViewModeContext.ViewModeContext' );
        //Parent selection if it is the parent object and the only object selected
        let isParentSelection = selected.length === 1 && currentRoot && selected[ 0 ].uid === currentRoot.uid && viewModeCtx === 'SummaryView';

        //If not parent selection must be PWA selection
        if( !isParentSelection ) {
            if( currentRoot && actualRoot && this.isSavedWorkingContext( currentRoot ) && currentRoot.uid === actualRoot.uid ) {
                if( selected.length === 1 ) {
                    let parentUidOfSelected = this.getParentUid( selected[ 0 ] );
                    if( parentUidOfSelected && parentUidOfSelected === currentRoot.uid ) {
                        return this.SelectionTypes.ROOT_PRODUCT_SELECTED;
                    }
                }
                return this.SelectionTypes.OCC_SELECTED;
            }
            //If parent is SWC selection is root, otherwise simple occ
            return this.isSavedWorkingContext( currentRoot ) ? this.SelectionTypes.ROOT_PRODUCT_SELECTED : this.SelectionTypes.OCC_SELECTED;
        }

        //otherwise return selection type for parent
        return this.isSavedWorkingContext( currentRoot ) ? this.SelectionTypes.SAVED_BOOKMARK_SELECTED : this.SelectionTypes.OCC_PARENT_SELECTED;
    }

    /**
     * Utility to check if a model object is a saved working context.
     *
     * @param {Object} modelObject model object to be tested
     * @returns {Boolean} true if it is saved working context
     */
    isSavedWorkingContext( modelObject ) {
        //If "Awb0SavedBookmark" is in the  types of the model object, it is a SWC
        if( modelObject && modelObject.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) !== -1 ) {
            return true;
        }
        return false;
    }

    /**
     * Find parent model object uid
     *
     * @param {Object} modelObject Model object whoes parent is to be found
     * @returns {String} Uid of parent model object
     */
    getParentUid( modelObject ) {
        if( modelObject && modelObject.props ) {
            let props = modelObject.props;
            let uid;
            if( props.awb0BreadcrumbAncestor && !_.isEmpty( props.awb0BreadcrumbAncestor.dbValues ) ) {
                uid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
            } else if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
                uid = props.awb0Parent.dbValues[ 0 ];
            }
            if( cdm.isValidObjectUid( uid ) ) {
                return uid;
            }
        }
        return null;
    }

    /**
     * Get viewer ACE active context
     */
    getAceActiveCtx() {
        let occmgmtActiveContext = appCtxService.getCtx( 'aceActiveContext' );
        let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
        return appCtxService.getCtx( occmgmtContextKey );
    }

    /**
     * @param  {Array} selectedMOs List of selected model objects
     * @returns {Boolean} boolean indicating if partition node is selected or not
     */
    getPartitionCSIDs( selectedMOs ) {
        let partitionCsids = [];
        if( Array.isArray( selectedMOs ) && selectedMOs.length > 0 ) {
            for( let i = 0; i < selectedMOs.length; i++ ) {
                if( _.includes( selectedMOs[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                    //let ptnObj = cdm.getObject( selectedMOs[ i ].props.awb0UnderlyingObject.dbValues[ 0 ] );
                    partitionCsids.push( StructureViewerService.instance.computePartitionChain( selectedMOs[ i ] ) );
                }
            }
        }
        return partitionCsids;
    }
}
