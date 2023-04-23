// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define */

/**
 * Defines the {@link NgControllers.NavigatorCtrl}
 *
 * @module js/aw.navigator.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import 'js/aw.base.sublocation.controller';
import 'js/appCtxService';
import 'js/editHandlerService';
import 'js/selection.service';
import 'js/aw.narrowMode.service';
import 'js/viewMode.service';
import 'js/selectionModelFactory';
import 'js/contextStateMgmtService';
import cadBomOccurrenceAlignmentSvc from 'js/CadBomOccurrenceAlignmentService';
'use strict';

/**
 * Navigation controller.
 *
 * @class NavigatorCtrl
 * @memberOf NgControllers
 */
//
app.controller(
    'NavigatorCtrl', [
        '$scope',
        '$controller',
        'appCtxService',
        'soa_kernel_clientDataModel',
        'editHandlerService',
        'selectionService',
        'narrowModeService',
        'viewModeService',
        'selectionModelFactory',
        'contextStateMgmtService',
        function NavigatorCtrl( $scope, $controller, appCtxService, cdm, editHandlerSvc,
            selectionService, narrowModeService, viewModeService, selectionModelFactory, contextStateMgmtService ) {
            var self = this;

            ngModule.extend( self, $controller( 'BaseSubLocationCtrl', {
                $scope: $scope
            } ) );

            /**
             * {SubscriptionDefeninitionArray} Cached eventBus subscriptions.
             */
            var _eventBusSubDefs = [];

            // Ensure all edit handlers are cleaned up when initializing. This is to workaround the fact that GWT
            // does not clean up edit handlers when leaving the sublocation. Native does, so once GWT is gone this
            // can be removed
            [ 'NONE', 'TABLE_CONTEXT' ].map( function( editContext ) {
                var editHandler = editHandlerSvc.getEditHandler( editContext );

                if( editHandler ) {
                    logger.debug( 'Removing edit handler for ', editContext, ' context', editHandler );

                    editHandlerSvc.removeEditHandler( editContext );
                }
            } );

            /**
             * The base view to use for the primary workarea. Makes it possible to reuse view models.
             *
             * @member viewBase
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.viewBase = $scope.provider.viewBase ? $scope.provider.viewBase : $scope.provider.name;

            /**
             * The Selection QueryParam Key by default is s_uid
             *
             * @member selectionQueryParamKey
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.selectionQueryParamKey = $scope.provider.selectionQueryParamKey ? $scope.provider.selectionQueryParamKey :
                's_uid';

            /**
             * The editSupportParamKeys by default is [ selectionQueryParamKey ]
             *
             * @member editSupportParamKeys
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.editSupportParamKeys = $scope.provider.editSupportParamKeys ? $scope.provider.editSupportParamKeys : [ $scope.selectionQueryParamKey ];

            $scope.viewConfig = {};

            /**
             * The parent selection. Passed in through the scope when using this controller as a directive.
             *
             * @member baseSelection
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.baseSelection;

            /**
             * Whether to display the parent selection when nothing is selected. Passed in through the scope when
             * using this controller as a directive. Defaults to true.
             *
             * @member baseSelection
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.showBaseSelection = $scope.hasOwnProperty( 'showBaseSelection' ) ? $scope.showBaseSelection :
                true;

            /**
             * The currently selected modelObjects. Checked by the dataProviderFactory, do not rename.
             *
             * @member modelObjects
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.modelObjects = [];

            /**
             * Contains pwaSelectionModel, required by primary workarea.
             *
             * @member pwaContext
             * @memberOf NgControllers.NavigatorCtrl
             */

            $scope.pwaContext = {};

            /**
             * The bread crumb configuration - search or navigate, that the sub location uses. It is a configuration
             * in states.json. By default it always shows search bread crumb.
             *
             * @member breadcrumbConfig
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.breadcrumbConfig = $scope.provider.breadcrumbConfig;

            // If breadcrumb id is not defined default to 'wabc'
            if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.id ) {
                $scope.breadcrumbConfig.id = 'wabc';
            }
            var isSplitViewMode = appCtxService.ctx.splitView ? appCtxService.ctx.splitView.mode : false;
            if( !isSplitViewMode ) {
                appCtxService.registerCtx( 'breadCrumbConfig', $scope.breadcrumbConfig );
            }
            /**
             * The supported view modes. Defines the primary work area view and whether secondary work area is
             * visible for each. Defaults to list / list with summary / table / table with summary / image
             *
             * @member viewModes
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.viewModes = $scope.provider.viewModes ? $scope.provider.viewModes : {
                TreeView: {
                    primaryWorkArea: 'tree',
                    secondaryWorkArea: false
                },
                TreeSummaryView: {
                    primaryWorkArea: 'tree',
                    secondaryWorkArea: true
                }
            };

            /**
             * How the sublocation tracks selection. The PWA selection model will use just the uid to track
             * selection.
             *
             * @param {Any} input - The object that needs to be tracked.
             *
             * @returns {String} Tracking ID of the object being tracked.
             */
            var selectionTracker = function( input ) {
                if( typeof input === 'string' ) {
                    return input;
                }
                return input.uid;
            };

            /**
             * The primary workarea selection model. Stored at the sublocation level as it is shared between
             * multiple data providers and sublocation must access to change PWA selection.
             *
             * @member pwaSelectionModel
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope.pwaSelectionModel = selectionModelFactory.buildSelectionModel(
                $scope.provider.selectionMode ? $scope.provider.selectionMode : 'multiple',
                selectionTracker );

            $scope.commandContext = $scope.commandContext || {};
            $scope.commandContext.pwaSelectionModel = $scope.pwaSelectionModel;

            /**
             * Display mode to use when encountering an unknown display or when preference is not set.
             *
             * @member _defaultDisplayMode
             * @memberOf NgControllers.NavigatorCtrl
             */
            self._defaultDisplayMode = $scope.provider.defaultDisplayMode ? $scope.provider.defaultDisplayMode :
                'TreeSummaryView';

            /**
             * Display mode to use in narrow mode or mobile devices
             *
             * @member _defaultNarrowDisplayMode
             * @memberOf NgControllers.NavigatorCtrl
             */
            self._defaultNarrowDisplayMode = $scope.provider.defaultNarrowDisplayMode ? $scope.provider.defaultNarrowDisplayMode : {
                primaryWorkArea: 'list',
                secondaryWorkArea: true
            };

            /**
             * Track if there is a pending selection in the PWA
             *
             * @member _pendingSelection
             * @memberOf NgControllers.NavigatorCtrl
             */
            $scope._pendingSelection = false;

            /**
             * Update the primary workarea selection
             *
             * @function updatePrimarySelection
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @param {ViewModelObject[]} selection - The new selection
             */
            $scope.updatePrimarySelection = function( selection ) {
                //TODO: Should never have null selection - need to track down source
                if( !selection ) {
                    selection = [];
                }

                let selectionSentFromHost = appCtxService.getCtx( 'aw_selection_sent_from_host' );
                //check for aligned lines if hosting is enabled
                if( appCtxService.getCtx( 'aw_hosting_enabled' ) && ( appCtxService.ctx.aw_host_type === 'NX' || appCtxService.ctx.aw_host_type === 'TcIC' ) && !selectionSentFromHost ) {
                    cadBomOccurrenceAlignmentSvc.getAlignedDesigns( selection, appCtxService.ctx.aw_host_type ).then( function() {
                        return processSelections( selection );
                    } );
                } else {
                    if ( appCtxService.getCtx( 'aw_hosting_enabled' ) ) {
                        appCtxService.registerPartialCtx( 'aw_selection_sent_from_host', false );
                    }
                    return processSelections( selection );
                }
            };

            var processSelections = function( selection ) {
                //If selection is empty revert to base selection
                if ( selection.length === 0 ) {
                    updateSelectionIfApplicable( $scope.baseSelection, $scope.baseSelection );
                    self.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                        [ $scope.baseSelection ] : [] );
                } else {
                    updateSelectionIfApplicable( selection, $scope.baseSelection );
                    //And update which model objects are selected
                    self.setSelection( selection.map( function( object ) {
                        return cdm.getObject( object.uid );
                    } ).filter( function( mo, idx ) {
                        if ( !mo ) {
                            logger.error( selection[idx].uid + ' was selected but is not in CDM!' );
                        }
                        return mo;
                    } ) );
                }
            };

            var updateSelectionIfApplicable = function( selection, parentSelection ) {
                if( !appCtxService.ctx[ $scope.contextKey ].silentReload && appCtxService.ctx.aceActiveContext.key === $scope.contextKey ) {
                    selectionService.updateSelection( selection, parentSelection );
                } else {
                    delete appCtxService.ctx[ $scope.contextKey ].silentReload;
                }
            };

            /**
             * Update the secondary workarea selection
             *
             * @function updateSecondarySelection
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @param {ViewModelObject[]} selection - The new selection
             * @param {Object[]} relationInfo - Any relation information
             */
            $scope.updateSecondarySelection = function( selection, relationInfo ) {
                //If everything was deselected
                if( !selection || selection.length === 0 ) {
                    //Revert to the previous selection (primary workarea)
                    selectionService.updateSelection( $scope.modelObjects, $scope.baseSelection );
                    $scope.secondarySelection = [];
                } else {
                    //Update the current selection with primary workarea selection as parent
                    selectionService.updateSelection( selection, $scope.modelObjects[ 0 ], relationInfo );
                    $scope.secondarySelection = selection;
                }
            };

            /**
             * Update the current selection based on the selection change event
             *
             * @function updateSelection
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @param {Object} data - The selection event data
             */
            $scope.updateSelection = function( data ) {
                if( data ) {
                    if( data.source === 'primaryWorkArea' ) {
                        $scope.updatePrimarySelection( data.selected );
                        $scope._pendingSelection = false;
                        if( self._pendingSelectionAction ) {
                            self._pendingSelectionAction();
                            delete self._pendingSelectionAction;
                        }

                        /**
                         * LCS-174734: When we get a selection from the 'primaryWorkArea' we assume the processing
                         * is complete and it is OK to start sending selections back to the host.
                         */
                        if( appCtxService.getCtx( 'aw_hosting_enabled' ) ) {
                            appCtxService.updatePartialCtx( 'aw_hosting_state.ignoreSelection', false );
                        }
                    } else if( data.source === 'secondaryWorkArea' ) {
                        //If PWA selection is currently changing stick wait to process SWA selections
                        appCtxService.updatePartialCtx( $scope.contextKey + '.swaSelectionContext', data );
                        if( $scope._pendingSelection ) {
                            self._pendingSelectionAction = function() {
                                $scope.updateSecondarySelection( data.selected, data.relationContext );
                            };
                        } else {
                            $scope.updateSecondarySelection( data.selected, data.relationContext );
                        }
                    } else {
                        logger.trace( 'Ignored selection', data );
                        return;
                    }

                    //aw-page listens to this event when in narrow mode
                    eventBus.publish( 'gwt.SubLocationContentSelectionChangeEvent', {
                        isPrimaryWorkArea: data.source === 'primaryWorkArea',
                        selected: data.selected,
                        haveObjectsSelected: data.selected && data.selected.length > 0
                    } );
                } else {
                    //If no data just clear the selection
                    selectionService.updateSelection( [ $scope.baseSelection ] );
                }
            };

            /**
             * Update selection on $scope
             *
             * @param {ModelObject[]} mos - Model objects that should be selected
             */
            self.setSelection = function( mos ) {
                var currentContext = appCtxService.getCtx( $scope.contextKey );
                $scope.modelObjects = mos;
                if( !_.isEqual( mos, currentContext.selectedModelObjects ) ) {
                    if( currentContext.vmc ) {
                        const pwaEditHandler = editHandlerSvc.getEditHandler( currentContext.vmc.name );
                        if( !pwaEditHandler || !pwaEditHandler.editInProgress() ) {
                            editHandlerSvc.leaveConfirmation().then( function() {
                                appCtxService.updatePartialCtx( $scope.contextKey + '.selectedModelObjects', $scope.modelObjects );
                            } );
                        } else {
                            appCtxService.updatePartialCtx( $scope.contextKey + '.selectedModelObjects', $scope.modelObjects );
                        }
                    } else {
                        appCtxService.updatePartialCtx( $scope.contextKey + '.selectedModelObjects', $scope.modelObjects );
                    }
                }
            };

            /**
             * Change the display mode.
             *
             * @function changeViewMode
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @param {String} newViewMode - The new view mode. Must be defined in
             *            {@link NgControllers.NavigatorCtrl#_viewModes}
             */
            self.changeViewMode = function( newViewMode ) {
                editHandlerSvc.leaveConfirmation().then( function() {
                    var shouldBroadcastUpdate = $scope.viewConfig.view !== newViewMode.primaryWorkArea;
                    $scope.viewConfig.view = newViewMode.primaryWorkArea;
                    $scope.viewConfig.showSecondaryWorkArea = newViewMode.secondaryWorkArea;
                    if( shouldBroadcastUpdate ) {
                        $scope.$broadcast( 'viewModeChanged', newViewMode );
                    }
                } );
            };

            /**
             * Get the name of the preference that contains the current sublocation view mode
             *
             * @function getViewModePref
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @returns {String} Name of the preference that contains the current sublocation view mode.
             */
            self.getViewModePref = function() {
                return 'AW_SubLocation_' +
                    ( $scope.provider.nameToken.indexOf( ':' ) !== -1 ? $scope.provider.nameToken
                        .split( ':' )[ 1 ] : 'Generic' ) + '_ViewMode';
            };

            /**
             * Get the viewMode from Preference
             *
             * @function getViewModeFromPref
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @returns {String} The viewMode from Preference.
             */
            self.getViewModeFromPref = function() {
                var viewModePref = appCtxService.getCtx( 'preferences.' + self.getViewModePref() );

                if( viewModePref ) {
                    return viewModePref[ 0 ];
                }

                return viewModePref;
            };

            /**
             * Update the viewMode to Preference
             *
             * @function setViewModeToPref
             * @memberOf NgControllers.NavigatorCtrl
             *
             * @param {String} viewMode - The mode to set in the app context.
             */
            self.setViewModeToPref = function( viewMode ) {
                appCtxService.updatePartialCtx( 'preferences.' + self.getViewModePref(), [ viewMode ] );
            };

            /**
             * Create event listeners and remove them on $destroy
             */
            var handleEventListeners = function() {
                _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.register',
                    function( context ) {
                        //When the view mode context changes
                        if( context.name === viewModeService._viewModeContext &&
                            context.value.ViewModeContext ) {
                            //And it is a known view mode
                            if( context.value.ViewModeContext !== 'None' ) {
                                var newViewMode = $scope.viewModes[ context.value.ViewModeContext ];
                                if( !newViewMode ) {
                                    logger.warn( 'Unknown view mode', context.value.ViewModeContext,
                                        'defaulting to', self._defaultDisplayMode );
                                    context.value.ViewModeContext = self._defaultDisplayMode;
                                    newViewMode = $scope.viewModes[ context.value.ViewModeContext ];
                                }

                                if( self.getViewModeFromPref() !== context.value.ViewModeContext ) {
                                    self.setViewModeToPref( context.value.ViewModeContext );
                                }

                                //And change the view mode
                                self.changeViewMode( newViewMode );
                            }
                        }
                    } ) );
                if( !browserUtils.isMobileOS ) {
                    _eventBusSubDefs.push( eventBus.subscribe( 'narrowModeChangeEvent', function( data ) {
                        //When entering narrow mode
                        if( data.isEnterNarrowMode ) {
                            // Switch to default view mode

                            self.changeViewMode( self._defaultNarrowDisplayMode );
                        } else {
                            //When leaving narrow mode Change back to the view mode stored in the preference
                            var viewMode = self.getViewModeFromPref();
                            viewMode = viewMode && $scope.viewModes.hasOwnProperty( viewMode ) ? viewMode : self._defaultDisplayMode;
                            viewModeService.changeViewMode( viewMode );
                        }
                    } ) );
                }

                /**
                 * Handle when a hosting selection request is announced.
                 * <P>
                 * Note: This event is for the exclusive use of hosting. It is invalid to be published by any
                 * non-hosting related code.
                 */
                _eventBusSubDefs.push( eventBus.subscribe( 'hosting.changeSelection', function( eventData ) {
                    if( appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.key === $scope.contextKey ) {
                        if( eventData.selected ) {
                            if( eventData.operation === 'replace' ) {
                                if( eventData.selected.length < 2 ) {
                                    $scope.pwaSelectionModel.setMultiSelectionEnabled( false );
                                }

                                // Check to make sure the selection has changed
                                var newSelection = true;
                                for( var i = 0; i < eventData.selected.length; i++ ) {
                                    if( $scope.pwaSelectionModel.isSelected( eventData.selected[ i ] ) ) {
                                        newSelection = false;
                                        break;
                                    }
                                }

                                if( newSelection ) {
                                    /**
                                     * LCS-174734: When we get a selection request from a host we want to stop sending
                                     * that 'host' any selections from this 'client' until this selection is reflected
                                     * in the 'primaryWorkArea'.
                                     */
                                    appCtxService.registerPartialCtx( 'aw_hosting_state.ignoreSelection', true );
                                    appCtxService.registerPartialCtx( 'aw_selection_sent_from_host', true );
                                }

                                $scope.pwaSelectionModel.setSelection( eventData.selected );
                            } else if( eventData.operation === 'add' ) {
                                $scope.pwaSelectionModel.addToSelection( eventData.selected );
                            } else {
                                /**
                                 * Note: This default case is required to keep some non-hosting use of this hosting
                                 * event. This default case will be removed once those uses are moved over to use
                                 * another way to handle their selection.
                                 */
                                $scope.pwaSelectionModel.setSelection( eventData.selected );
                            }

                            $scope.$evalAsync();
                        }
                    }
                } ) );
            };

            $scope.$on( 'PWAFocused', function( event, data ) {
                if( !appCtxService.ctx.splitView ) {
                    let currentSelected = selectionTracker( appCtxService.getCtx( 'selected' ) );
                    let pwaSelection = $scope.pwaSelectionModel.getSelection()[ 0 ];
                    if( currentSelected && pwaSelection && currentSelected !== pwaSelection ) {
                        $scope.$broadcast( 'dataProvider.selectionChangeEvent', { clearSelections: true } );
                    }
                } else if( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode === true ) {
                    const contextKey = event.currentScope.contextKey;
                    const currContext = appCtxService.getCtx( contextKey );
                    const currSelected = currContext.selectedModelObjects[ 0 ];
                    const swaSelectionContext = currContext.swaSelectionContext;
                    const swaSelection = swaSelectionContext && currContext.swaSelectionContext.selected;
                    if( currSelected && swaSelection && swaSelection.length > 0 ) {
                        $scope.$broadcast( 'dataProvider.selectionChangeEvent', { clearSelections: true } );
                    }
                }
            } );

            //Remove the supported view modes on destroy
            $scope.$on( '$destroy', function() {
                //Remove listeners on destroy
                _.forEach( _eventBusSubDefs, function( subDef ) {
                    eventBus.unsubscribe( subDef );
                } );
                viewModeService.changeViewMode( 'None' );
                viewModeService.setAvailableViewModes( [] );

                if( !isSplitViewMode ) {
                    appCtxService.unRegisterCtx( 'breadCrumbConfig' );
                }
                appCtxService.unRegisterCtx( 'pwaSelectionInfo' );

                if( appCtxService.getCtx( 'aw_hosting_enabled' ) ) {
                    appCtxService.unRegisterCtx( 'aw_hosting_state.ignoreSelection' );
                }
            } );

            //Initialize the sublocation
            self.init.then( function() {
                //The presenter will reset the display mode context to null when it is hidden This listener is
                //created before presenter is hidden, so there's multiple events Don't want to setView multiple
                //times (SOA calls) so $evalAsync (hiding presenter is sync, but behind a single promise that is
                //resolved next digest)
                $scope
                    .$evalAsync( function() {
                        //Set the available view modes
                        viewModeService.setAvailableViewModes( Object.keys( $scope.viewModes ) );

                        //Set initial sublocation selection
                        self.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                            [ $scope.baseSelection ] : [] );

                        //Ensure uid is in sync with selection model
                        $scope.$watchCollection( 'pwaSelectionModel.getSelection()', function(
                            newSelection, oldSelection ) {
                            if( !_.isEqual( newSelection, oldSelection ) ) {
                                $scope.onPWASelectionChange( newSelection, oldSelection );
                            }
                        } );
                        //Pass selection model to PWA (which passes to data providers)
                        $scope.pwaContext.selectionModel = $scope.pwaSelectionModel;
                        $scope.pwaContext.pwaSelectionModel = $scope.pwaSelectionModel;
                        $scope.pwaContext.viewKey = $scope.contextKey;
                        $scope.pwaContext.editSupportParamKeys = $scope.editSupportParamKeys;

                        //Setup event listeners
                        handleEventListeners();

                        //If there's a specific default display mode use that instead of the preference
                        if( $scope.provider.defaultDisplayMode ) {
                            viewModeService.changeViewMode( $scope.provider.defaultDisplayMode );
                        } else {
                            //If in narrow just use the default display mode (list with summary unless it was
                            //manually set)
                            if( narrowModeService.isNarrowMode() ) {
                                //Set the display mode without modifying the preference

                                self.changeViewMode( self._defaultNarrowDisplayMode );
                            } else {
                                //Otherwise load from the context
                                var viewMode = self.getViewModeFromPref();
                                viewMode = viewMode && $scope.viewModes.hasOwnProperty( viewMode ) ? viewMode : self._defaultDisplayMode;
                                viewModeService.changeViewMode( viewMode );
                            }
                        }
                    } );
            } );
        }
    ] );
