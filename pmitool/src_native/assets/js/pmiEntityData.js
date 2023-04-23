// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This module holds PMI Entity data
 *
 * @module js/pmiEntityData
 */

import pmiToolUtil from 'js/pmiToolUtil';
import modelPropertySvc from 'js/modelPropertyService';
import _ from 'lodash';
import logger from 'js/logger';

export default class pmiEntityData {
    constructor( pmiEntityData ) {
        /**
         * this is to store PMI entities.
         */
        this.pmiEntityData = pmiEntityData;
        /**
         * this is to store checked value of pmi entities for next and prev
         */
        this.lastCheckedTypeViewModel = [];
        /**
         * this is to store selected value of pmi entities and model view
         */
        this.previousSelectedPmiEntity = null;
    }

    /**
     * Initialize PMI Entity
     */
    initializePmiEntity() {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.selectionHasTypesData', !_.isEmpty( this.pmiEntityData ) );
    }

    /**
     * Add checkbox widget in PMI entity data
     *
     * @returns {Object} Updated PMI entity
     */
    updatePmiEntities() {
        let widgetsProperties = {
            checkbox: {
                displayName: '',
                type: 'BOOLEAN',
                dbValue: '',
                dispValue: '',
                labelPosition: 'PROPERTY_LABEL_AT_RIGHT'

            }
        };
        _.forEach( this.pmiEntityData, function( pmiEntity ) {
            widgetsProperties.checkbox.dispValue = pmiEntity.value;
            widgetsProperties.checkbox.dbValue = pmiEntity.isVisibilityOn;
            pmiEntity.checkbox = modelPropertySvc.createViewModelProperty( widgetsProperties.checkbox );

            if( pmiEntity.children ) {
                _.forEach( pmiEntity.children, function( pmiChildren ) {
                    if( _.isUndefined( pmiChildren.checkbox ) ) {
                        widgetsProperties.checkbox.dispValue = pmiChildren.value;
                        widgetsProperties.checkbox.dbValue = pmiChildren.isVisibilityOn;
                        pmiChildren.checkbox = modelPropertySvc.createViewModelProperty( widgetsProperties.checkbox );
                    }
                } );
            }
        } );
        return this.pmiEntityData;
    }

    /**
     * Method to process when PMI Types is checked/unchecked i.e visibility is on/off. If the node is already selected  * then highlight it as soon as visbility is on
     *
     * @param  {Object} input specific node checked/unchecked
     *
     * @returns {Object} Updated PMI entity
     */

    pmiTypesEntityChecked( input ) {
        let self = this;
        let itemObjectsToProcess = [];
        let isAlreadySelected = false;
        if( input.isGroup ) {
            _.forEach( input.children, function( typeEntityViewModel ) {
                typeEntityViewModel.isVisibleInTypesTab = input.checkbox.dbValue;
                if( typeEntityViewModel.checkbox.dbValue !== input.checkbox.dbValue ) {
                    typeEntityViewModel.checkbox.dbValue = input.checkbox.dbValue;
                    //Action will be called once the dbValue is changed.Inorder to stop executing the same functionality added the flag which will be validated at the beginning of the function
                    typeEntityViewModel.isPropagatedFromParent = true;
                }
                if( typeEntityViewModel.checkbox.dbValue ) {
                    self.lastCheckedTypeViewModel.push( _.cloneDeep( typeEntityViewModel ) );
                } else {
                    self.lastCheckedTypeViewModel = _.filter( self.lastCheckedTypeViewModel, entity => entity.value !== typeEntityViewModel.value );
                }

                itemObjectsToProcess.push( {
                    id: typeEntityViewModel.index,
                    state: 'VISIBLE',
                    value: input.checkbox.dbValue
                } );
            } );
        } else {
            //prevent checked action callback multiple times
            let currentNodeObjectIndex = self.lastCheckedTypeViewModel.findIndex( obj => obj.value === input.value );
            if( currentNodeObjectIndex !== -1 && input.checkbox.dbValue === self.lastCheckedTypeViewModel[currentNodeObjectIndex  ].checkbox.dbValue ) {
                return;
            }
            if( currentNodeObjectIndex === -1 && !input.checkbox.dbValue ) {
                return;
            }
            // toggle the state
            self.parentVisibilityHandledFromChildren( input );
            itemObjectsToProcess = [ {
                id: input.index,
                state: 'VISIBLE',
                value: input.checkbox.dbValue
            } ];
        }
        if( !input.isGroup && self.previousSelectedPmiEntity === input && input.checkbox.dbValue ) {
            isAlreadySelected = true;
        }
        self.setElementsStates( itemObjectsToProcess, isAlreadySelected );
    }

    /**
     * This method is to set the elements(nodes) state visbility on/off and selected when visbility is on
     *
     * @param  {Object} itemObjectsToProcess this object contains id, state(VISIBLE/SELCTED) and value(true/false)
     *
     * @param  {boolean} isAlreadySelected by default it is false. (true/false)
     *
     */

    // eslint-disable-next-line class-methods-use-this
    setElementsStates( itemObjectsToProcess, isAlreadySelected ) {
        pmiToolUtil.setPmiElementProperty( itemObjectsToProcess ).then( function() {
            if( isAlreadySelected ) {
                itemObjectsToProcess.map( obj => obj.state = 'SELECTED' );
                pmiToolUtil.setPmiElementProperty( itemObjectsToProcess ).then( function() {}, function( error ) {
                    logger.error( 'Selection Failed' + error );
                } );
            }
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
        }, function( reason ) {
            logger.error( 'PmiToolService: requestModelViewElementsData opeartion failed: ' + reason );
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
        } );
    }

    /**
     * Method to modifies the entities’ checkboxes within one group, the state is rolled up to the group checkbox
     *
     * @param  {Object} input specific node
     *
     */
    parentVisibilityHandledFromChildren( input ) {
        let self = this;
        let pmiExtractedObject = self.pmiEntityData.filter( parent => parent.id === input.type );
        let children = pmiExtractedObject[ 0 ].children.filter( children => !children.checkbox.dbValue );
        if( children.length === 0 ) {
            pmiExtractedObject[ 0 ].checkbox.dbValue = true;
            if( input.isVisibleInTypesTab ) {
                pmiExtractedObject[ 0 ].isBubbblingFromChildren = true;
            }
        } else if( pmiExtractedObject[ 0 ].checkbox.dbValue && !input.checkbox.dbValue ) {
            pmiExtractedObject[ 0 ].checkbox.dbValue = false;
            pmiExtractedObject[ 0 ].isBubbblingFromChildren = true;
        }
        if( input.checkbox.dbValue ) {
            self.lastCheckedTypeViewModel.push( _.cloneDeep( input ) );
        } else {
            self.lastCheckedTypeViewModel = _.filter( self.lastCheckedTypeViewModel, entity => entity.value !== input.value );
        }
    }

    /**
     * Move to next type
     * @param {Object} viewModel view model
     */
    moveToNextType( viewModel ) {
        let self = this;
        if( self.pmiEntityData.length === 0 ) {
            return;
        }

        let toGoAtParentIndex = 0; // default index
        let toGoAtChildrenIndex = 0;

        if( self.lastCheckedTypeViewModel.length > 0 ) {
            let _lastCheckedChild = self.lastCheckedTypeViewModel[ self.lastCheckedTypeViewModel.length - 1 ];
            let _pmiLastCheckedParentIndex = _.findIndex( self.pmiEntityData, parent => parent.id === _lastCheckedChild.type );
            let _lastCheckedTypeChildIndex = _.findIndex( self.pmiEntityData[ _pmiLastCheckedParentIndex ].children, function( typeViewModelObj ) {
                return typeViewModelObj.id === _lastCheckedChild.id;
            } );
            let next = _lastCheckedTypeChildIndex + 1;
            if( next >= self.pmiEntityData[ _pmiLastCheckedParentIndex ].children.length ) {
                toGoAtParentIndex = ++_pmiLastCheckedParentIndex;
                if( toGoAtParentIndex === self.pmiEntityData.length ) {
                    toGoAtParentIndex %= self.pmiEntityData.length;
                }
                toGoAtChildrenIndex = 0;
            } else {
                toGoAtParentIndex = _pmiLastCheckedParentIndex;
                toGoAtChildrenIndex = next;
            }
        }

        self.focusOnType( toGoAtParentIndex, toGoAtChildrenIndex, viewModel );
    }
    /**
     * Focuses on type.
     *
     * @param {...number} toGoAtParentIndex parent pos
     * @param {...number} toGoAtChildrenIndex child pos
     * @param {Object} viewModel view model
     */
    focusOnType( toGoAtParentIndex, toGoAtChildrenIndex, viewModel ) {
        let self = this;
        for( let groupPMI = 0; groupPMI < self.pmiEntityData.length; groupPMI++ ) {
            for( let childPMI = 0; childPMI < self.pmiEntityData[ groupPMI ].children.length; childPMI++ ) {
                if( self.pmiEntityData[ groupPMI ].children[ childPMI ].checkbox.dbValue &&
                    groupPMI === toGoAtParentIndex && childPMI === toGoAtChildrenIndex ) {
                    continue;
                }
                if( self.pmiEntityData[ groupPMI ].children[ childPMI ].checkbox.dbValue ) {
                    self.pmiEntityData[ groupPMI ].children[ childPMI ].checkbox.dbValue = false;
                }
            }
        }
        //check parent
        let entityTypeToFocus = self.pmiEntityData[ toGoAtParentIndex ];
        entityTypeToFocus.children[ toGoAtChildrenIndex ].checkbox.dbValue = true;
        pmiToolUtil.treeNodeExpansion( viewModel, entityTypeToFocus.value );
    }

    /**
     * moves to previous type
     *
     * @param {Object} viewModel the view model
     */
    moveToPrevType( viewModel ) {
        let self = this;
        if( self.pmiEntityData.length === 0 ) {
            return;
        }

        let toGoAtParentIndex = self.pmiEntityData.length - 1; // default index
        let toGoAtChildrenIndex = self.pmiEntityData[ toGoAtParentIndex ].children.length - 1;

        if( self.lastCheckedTypeViewModel.length > 0 ) {
            let _lastCheckedChild = self.lastCheckedTypeViewModel[ self.lastCheckedTypeViewModel.length - 1 ];
            let _pmiLastCheckedParentIndex = _.findIndex( self.pmiEntityData, parent => parent.id === _lastCheckedChild.type );
            let _lastCheckedTypeChildIndex = _.findIndex( self.pmiEntityData[ _pmiLastCheckedParentIndex ].children, function( typeViewModelObj ) {
                return typeViewModelObj.id === _lastCheckedChild.id;
            } );

            let prev = _lastCheckedTypeChildIndex - 1;
            if( prev < 0 ) {
                toGoAtParentIndex = --_pmiLastCheckedParentIndex;
                if( toGoAtParentIndex < 0 ) {
                    toGoAtParentIndex = self.pmiEntityData.length - 1;
                }
                toGoAtChildrenIndex = self.pmiEntityData[ toGoAtParentIndex ].children.length - 1;
            } else {
                toGoAtParentIndex = _pmiLastCheckedParentIndex;
                toGoAtChildrenIndex = prev;
            }
        }

        self.focusOnType( toGoAtParentIndex, toGoAtChildrenIndex, viewModel );
    }
}
