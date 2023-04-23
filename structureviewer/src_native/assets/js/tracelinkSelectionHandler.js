// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * This manages the SDPD selection tracelink traversal
 *
 * @module js/tracelinkSelectionHandler
 */
import app from 'app';
import AwBaseService from 'js/awBaseService';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import preferenceService from 'soa/preferenceService'; 
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';

export default class TracelinkSelectionHandler extends AwBaseService {
    constructor() {
        super();
        this._useSubclasses = false;
        this._typeNameList = [];

        this._viewerContextData = null;
        this._typeNameListPref = null;

        /*
         * This service is used to find if the objects selected are tracelinked traversal objects
         */

        this._typeNameListPref = AwPromiseService.instance.defer();

        preferenceService.getStringValues( [ 'ASE0_Show_3D_Data_On_Selection' ] ).then( ( types ) => {
            if( types ) {
                for( var i = 0; i < types.length; i++ ) {
                    this._typeNameList.push( types[ i ] );
                }
            }
            this._typeNameListPref.resolve();
        } );

        preferenceService.getLogicalValue( 'ASE0_Show_3D_Data_For_Subclasses' ).then(
            ( result ) => {
                if( result !== null && result.length > 0 && result.toUpperCase() === 'TRUE' ) {
                    this._useSubclasses = true;
                } else {
                    this._useSubclasses = false;
                }
            } );
    }
    /**
     * Notes for SDPD selection change
     *
     *  on ACE selection changed
     *  if any selected object in ACE is a tracelink type
     *         (call isSelectionTracelinkTraversalType to check if it is)
     *     if selection type is OCC_SELECTED or ROOT_PRODUCT_SELECTED
     *     then call show only
     *  else if is selected object a 3D part
     *     then call current 3d selection code in StructureViewerSelectionHandler.js
     *     NOTE: need to find a better way to do this check if selected obj is a 3D part
     *           current implementation checks hard coded types
     *  else
     *     turn everything off
     */

    isRootSelectionTracelinkType() {
        var occmgmtContext = appCtxService.getCtx( 'occmgmtContext' );
        var root = [];
        if( occmgmtContext && occmgmtContext.topElement) {
            root.push( occmgmtContext.topElement );
        }
        return this.isSelectionTracelinkTraversalType( root, false );
    }

    setCtxData( tracelinkTraversalTypeSelected ) {
        if( this._viewerContextData !== null ) {
            var svc = this._viewerContextData.getViewerCtxSvc();
            var namespace = this._viewerContextData.getViewerCtxNamespace();
            svc.updateViewerApplicationContext( namespace, 'isSelectionTracelinkTraversalType',
                tracelinkTraversalTypeSelected );

            svc.updateViewerApplicationContext( namespace, 'disablePMI',
                tracelinkTraversalTypeSelected );

            svc.updateViewerApplicationContext( namespace, 'disableImageCapture',
                tracelinkTraversalTypeSelected );

            svc.updateViewerApplicationContext( namespace, 'disableGeoAnalysis',
                tracelinkTraversalTypeSelected );

            svc.updateViewerApplicationContext( namespace, 'isLogicalSelected',
                tracelinkTraversalTypeSelected );
        }
    }

    arePrefsFilled() {
        return this._typeNameListPref.promise;
    }

    /**
     * Check if any of the input objects are a tracelink traversal type
     *
     * @param {ObjectArray} selections ModelObject array
     * @param {Boolean} forSelection flag used to update the context for selection
     * @return {boolean} true if input object is a tracelink traversal type
     */
    isSelectionTracelinkTraversalType( selections, forSelection ) {
        if( selections !== null ) {
            for( var i = 0; i < selections.length; i++ ) {
                for( var j = 0; j < this._typeNameList.length; j++ ) {
                    if( this._useSubclasses ) {
                        if( cmm.isInstanceOf( this._typeNameList[ j ], selections[ i ].modelType ) ) {
                            if( forSelection ) {
                                this.setCtxData( true );
                            }
                            return true;
                        }
                    } else {
                        if( selections[ i ] !== null ) {
                            if( selections[ i ].type === this._typeNameList[ j ] ) {
                                if( forSelection ) {
                                    this.setCtxData( true );
                                }
                                return true;
                            }
                        }
                    }
                }
            }
        }
        if( forSelection ) {
            this.setCtxData( false );
        }

        return false;
    }

    /**
     * Check if selected objects are a tracelink traversal type
     *
     * @return {boolean} true if selected object is a tracelink traversal type
     */
    isTracelinkTraversalObjectSelectedInAce() {
        if( appCtxService.ctx.mselected !== null ) {
            return this.isSelectionTracelinkTraversalType( appCtxService.ctx.mselected, true );
        }

        return false;
    }

    createVisibilityHandler( ParentVisibilityHandler, viewerContextData ) {
        this._viewerContextData = viewerContextData;

        var VisibilityHandlerFn = function( viewerContextData ) {
            // Call Parent constructor
            ParentVisibilityHandler.call( this, viewerContextData );
        };

        // Set Parent as prototype for this object to inherit Parents functions
        VisibilityHandlerFn.prototype = Object.create( ParentVisibilityHandler.prototype );

        // Set it to use our constructor
        VisibilityHandlerFn.prototype.constructor = VisibilityHandlerFn;

        // Override function getOccVisibility
        VisibilityHandlerFn.prototype.getOccVisibility = function( viewerCtxData, vmo ) {
            if( vmo !== null ) {
                var modelObjects = [];
                modelObjects.push( vmo );

                if( TracelinkSelectionHandler.instance.isSelectionTracelinkTraversalType( modelObjects, false ) ) {
                    return true;
                }

                if( cmm.isInstanceOf( 'Arm0RequirementElement', vmo.modelType ) ||
                    cmm.isInstanceOf( 'Ase0FunctionalElement', vmo.modelType ) ) {
                    return true;
                }

                return ParentVisibilityHandler.prototype.getOccVisibility( viewerCtxData, vmo );
            }

            return true;
        };

        // Override function toggleOccVisibility
        VisibilityHandlerFn.prototype.toggleOccVisibility = function( viewerCtxData, vmo ) {
            if( vmo !== null ) {
                var modelObjects = [];
                modelObjects.push( vmo );
                if( !TracelinkSelectionHandler.instance.isSelectionTracelinkTraversalType( modelObjects, false ) ) {
                    ParentVisibilityHandler.prototype.toggleOccVisibility( viewerCtxData, vmo );
                }
            }
        };

        // return new handler
        return new VisibilityHandlerFn( viewerContextData );
    }

    createSelectionHandler( ParentSelectionHandler, viewerContextData ) {
        this._viewerContextData = viewerContextData;
        var SelectionHandlerFn = function( viewerContextData ) {
            // Call Parent constructor
            ParentSelectionHandler.call( this, viewerContextData );
        };

        // Set Parent as prototype for this object to inherit Parents functions
        SelectionHandlerFn.prototype = Object.create( ParentSelectionHandler.prototype );

        // Set it to use our constructor
        SelectionHandlerFn.prototype.constructor = SelectionHandlerFn;

        // Override function getSelectionChangeEventHandler
        SelectionHandlerFn.prototype.getSelectionChangeEventHandler = function() {
            var self = this;

            // create custom selection handler
            var selectionChangeEventHandler = function( eventData ) {
                var selectionUids = eventData.selectionModel.getSelection();
                var selections = cdm.getObjects( selectionUids );

                if( TracelinkSelectionHandler.instance.isSelectionTracelinkTraversalType( selections, true ) ) {
                    self.selectInViewer( [], [] );
                } else {
                    // Use Parent selection handler
                    self.selectionChangeEventHandler( eventData );
                }
            };

            return selectionChangeEventHandler;
        };

        // Override function determineAndSelectPackedOccs
        SelectionHandlerFn.prototype.determineAndSelectPackedOccs = function( modelObjects, determinedCSIds ) {
            var self = this;

            if( TracelinkSelectionHandler.instance.isSelectionTracelinkTraversalType( modelObjects, true ) ) {
                self.selectInViewer( [], [] );
                var deferred = AwPromiseService.instance.defer();
                deferred.resolve();
                return deferred.promise;
            }

            // Call Parent function determineAndSelectPackedOccs for non-logical objects
            return ParentSelectionHandler.prototype.determineAndSelectPackedOccs.call( this, modelObjects, determinedCSIds );
        };
        // return new handler
        return new SelectionHandlerFn( viewerContextData );
    }
}

app.factory( 'tracelinkSelectionHandler', () => TracelinkSelectionHandler.instance );
