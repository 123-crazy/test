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
 * @module js/pmiModelViewData
 */

import pmiToolUtil from 'js/pmiToolUtil';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import viewerPreferenceService from 'js/viewerPreference.service';
import modelPropertySvc from 'js/modelPropertyService';
import _ from 'lodash';
import logger from 'js/logger';

export default class pmiModelViewData {
    constructor( mvData ) {
        /**
         * this is to store Model View data.
         */
        this.pmiModelViewData = mvData;
        /**
         * this is to store checked value of model view for next and prev
         */
        this.previousCheckedModelView = null;
        this.operationInProgressFlag = false;
    }

    /**
     * Initialize Model view
     */
    initializeModelView() {
        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.selectionHasMVData', !_.isEmpty( this.pmiModelViewData ) );
    }

    /**
     * Add checkbox widget in Model View data
     *
     * @returns {Object} Updated Model View data
     */
    updateMVData() {
        let self = this;
        let widgetsProperties = {
            checkbox: {
                displayName: '',
                type: 'BOOLEAN',
                dbValue: '',
                dispValue: '',
                labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
            }
        };
        _.forEach( self.pmiModelViewData, function( modelViewEntity ) {
            widgetsProperties.checkbox.dispValue = modelViewEntity.value;
            widgetsProperties.checkbox.dbValue = modelViewEntity.isVisibilityOn;
            modelViewEntity.checkbox = modelPropertySvc.createViewModelProperty( widgetsProperties.checkbox );
            if( modelViewEntity.isVisibilityOn ) {
                self.previousCheckedModelView = modelViewEntity;
            }
            if( modelViewEntity.children ) {
                _.forEach( modelViewEntity.children, function( mVEChildren ) {
                    if( _.isUndefined( mVEChildren.checkbox ) ) {
                        widgetsProperties.checkbox.dispValue = mVEChildren.value;
                        widgetsProperties.checkbox.dbValue = mVEChildren.isVisibilityOn;
                        mVEChildren.checkbox = modelPropertySvc.createViewModelProperty( widgetsProperties.checkbox );
                    }
                } );
            }
        } );

        return self.pmiModelViewData;
    }

    /**
     * Method to process when Model View is checked/unchecked i.e visibility is on/off. If the node is already
     *        selected then highlight it as soon as visbility is on
     *
     * @param  {Object} input specific node checked/unchecked
     *
     */

    pmiModelViewEntityChecked( input ) {
        let self = this;
        if( self.operationInProgressFlag ) {
            logger.info( 'PmiToolService: Ignoring this opeartion as Viewer is still working on old.' );
            input.checkbox.dbValue = !input.checkbox.dbValue;
            return;
        }
        if( input.checkbox.dbValue ) {
            self.updateModelViewVisbility( input );
        } else {
            // remove checked
            self.changeModelViewVisibility( input.modelViewId, false )
                .then( function() {
                    self.changeMVChildrenCheckState( input );
                    self.previousCheckedModelView = null;
                } );
        }
    }

    /**
     * Change model view children check state  (false)
     * @param  {Object} input input model view view model
     */
    // eslint-disable-next-line class-methods-use-this
    changeMVChildrenCheckState( input ) {
        _.forEach( input.children, function( mvViewModel ) {
            if( !mvViewModel.isGroup && mvViewModel.checkbox.dbValue !== input.checkbox.dbValue ) {
                mvViewModel.checkbox.dbValue = input.checkbox.dbValue;
                mvViewModel.isPropagatedFromModelViewParent = true;
            }
        } );
    }

    /**
     * Change model view visibility
     * @param  {string} modelViewId model view id
     * @param  {boolean} visibility true/false
     */
    // eslint-disable-next-line class-methods-use-this
    changeModelViewVisibility( modelViewId, visibility ) {
        let viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
        let modelViewVisbility = [ {
            name: viewerPreferenceService.ModelViewProperties.VISIBLE,
            index: modelViewId,
            value: visibility
        } ];
        return viewerSecondaryModelService.setPropertiesOnModelViews( viewerCtxNameSpace, modelViewVisbility );
    }

    /**
     * Update Model View Visbility
     * @param  {Object} input input entity
     * @param  {Object} viewModel View model
     */
    updateModelViewVisbility( input, viewModel ) {
        let self = this;
        logger.info( 'PmiToolService: Setting to wait for Viewer opearation.' );
        self.operationInProgressFlag = true;
        if( self.previousCheckedModelView ) {
            self.previousCheckedModelView.checkbox.dbValue = false;
            self.previousCheckedModelView.isPropagatedFromModelViewSibling = true;
            if( self.previousCheckedModelView.children.length > 0 ) {
                self.changeMVChildrenCheckState( self.previousCheckedModelView );
            }
            //if previous selection is present, clear it and select new selection
            self.setPropertiesOnModelViews( input.modelViewId )
                .then( function() {
                    if( input.children.length > 0 ) {
                        self.checkedChildEntities( input, viewModel );
                    } else {
                        self.operationInProgressFlag = false;
                        self.previousCheckedModelView = input;
                        pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
                    }
                }, function( reason ) {
                    self.operationInProgressFlag = false;
                    input.checkbox.dbValue = !input.checkbox.dbValue;
                    logger.error( 'ModelView Visibility operation failed: ' + reason );
                    pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
                } );
        } else {
            self.updateChildEntitiesVisbility( input, viewModel );
        }
    }

    /**
     * Set the Model view properties indicated by the array of objects
     *
     * @param {Number} modelViewToSelectId Model view id to select
     *
     * @returns {Promise} Resolved by setting the properties in Model Views
     */
    setPropertiesOnModelViews( modelViewToSelectId ) {
        let self = this;
        let viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
        let modelViewList = [];
        let toDeselect = {
            name: viewerPreferenceService.ModelViewProperties.VISIBLE,
            index: self.previousCheckedModelView.modelViewId,
            value: false
        };
        let toSelect = {
            name: viewerPreferenceService.ModelViewProperties.VISIBLE,
            index: modelViewToSelectId,
            value: true
        };
        modelViewList.push( toDeselect );
        modelViewList.push( toSelect );
        return viewerSecondaryModelService.setPropertiesOnModelViews( viewerCtxNameSpace, modelViewList );
    }

    /**
     * Check/uncheck child entities of Model View
     * @param  {Object} input model view node
     */
    checkedChildEntities( input ) {
        let self = this;
        let viewerCtxNameSpace = pmiToolUtil.getActiveViewerCmdCtxPartPath();
        self.previousCheckedModelView = input;
        viewerSecondaryModelService.requestModelViewElementsData( viewerCtxNameSpace, input.modelViewId ).then( function( data ) {
            input.children.forEach( ( value, index ) => {
                value.isVisibilityOn = data[ index ][ 3 ] === 'true';
                if( value.checkbox.dbValue !== value.isVisibilityOn ) {
                    value.checkbox.dbValue = value.isVisibilityOn;
                    value.isPropagatedFromModelViewParent = true;
                }
            } );
            self.operationInProgressFlag = false;
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
        }, function( reason ) {
            logger.debug( 'PmiToolService: UnSetting to wait for Viewer opearation.' );
            logger.error( 'PmiToolService: requestModelViewElementsData opeartion failed: ' + reason );
            self.operationInProgressFlag = false;
            pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
        } );
    }

    /**
     * Update Child Entity Visibility
     * @param  {Object} input model view node
     */
    updateChildEntitiesVisbility( input ) {
        let self = this;
        self.changeModelViewVisibility( input.modelViewId, true ).then( function() {
            if( input.children.length > 0 ) {
                self.checkedChildEntities( input );
            } else {
                self.operationInProgressFlag = false;
                self.previousCheckedModelView = input;
                pmiToolUtil.updateActiveViewerCmdCtx( 'pmiToolCtx.visibilityProcessing', false );
            }
        } );
    }

    /**
     * Move to next model view
     *
     */
    moveToNextModelView() {
        let self = this;
        if( _.isEmpty( self.pmiModelViewData ) ) {
            return;
        }

        let toGoAt = 0; // 0 is default

        if( self.previousCheckedModelView !== null ) {
            let at = _.findIndex( self.pmiModelViewData, function( mv ) {
                return mv.modelViewId === self.previousCheckedModelView.modelViewId;
            } );

            if( at < self.pmiModelViewData.length - 1 ) {
                toGoAt = at + 1;
            }
        }
        self.focusOnModelView( toGoAt );
    }

    /**
     * Focus on ModelView
     *
     * @param {...number} toGoAt index of model view for next/prev
     *
     */
    focusOnModelView( toGoAt ) {
        let self = this;
        let modelViewIdToShow = self.pmiModelViewData[ toGoAt ].modelViewId;
        let idx = _.findIndex( self.pmiModelViewData, function( mvViewModel ) {
            return mvViewModel.modelViewId === modelViewIdToShow;
        } );
        let mvViewModel = self.pmiModelViewData[ idx ];

        mvViewModel.checkbox.dbValue = true;
    }

    /**
     * Move to previous model view
     */
    moveToPrevModelView() {
        let self = this;
        if( _.isEmpty( self.pmiModelViewData ) ) {
            return;
        }

        let toGoAt = self.pmiModelViewData.length - 1; // 0 is default

        if( self.previousCheckedModelView !== null ) {
            let at = _.findIndex( self.pmiModelViewData, function( mv ) {
                return mv.modelViewId === self.previousCheckedModelView.modelViewId;
            } );

            if( at > 0 ) {
                toGoAt = at - 1;
            }
        }

        self.focusOnModelView( toGoAt );
    }
}
