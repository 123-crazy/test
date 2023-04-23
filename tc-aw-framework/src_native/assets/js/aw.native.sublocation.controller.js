// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.NativeSubLocationCtrl}
 *
 * @module js/aw.native.sublocation.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import 'js/aw-sublocation.directive';
import 'js/aw-primary-workarea.directive';
import 'js/aw-secondary-workarea.directive';
import 'js/aw-workarea-title.directive';
import 'js/aw.base.sublocation.controller';
import 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import 'js/editHandlerService';
import 'js/selection.service';
import 'js/aw.searchFilter.service';
import 'js/awTableStateService';
import 'js/aw.navigateBreadCrumbService';
import 'js/aw.narrowMode.service';
import 'js/viewMode.service';
import 'js/aw-splitter.directive';
import 'js/selectionModelFactory';
import 'js/command.service';
import 'js/conditionService';
import 'js/localeService';
import 'js/breadCrumbService';

/**
 * Native sublocation controller.
 *
 * @class NativeSubLocationCtrl
 * @memberOf NgControllers
 */
app.controller( 'NativeSubLocationCtrl', [
    '$scope',
    '$q',
    '$controller',
    '$state',
    '$location',
    '$timeout',
    'appCtxService',
    'soa_kernel_clientDataModel',
    'editHandlerService',
    'selectionService',
    'searchFilterService',
    'narrowModeService',
    'viewModeService',
    'selectionModelFactory',
    'commandService',
    'conditionService',
    'localeService',
    'breadCrumbService',
    function( $scope, $q, $controller, $state, $location, $timeout, appCtxService, cdm, editHandlerSvc,
        selectionService, searchFilterService, narrowModeService, viewModeService, selectionModelFactory,
        commandService, conditionService, localeService, breadCrumbSvc ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'BaseSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * {SubscriptionDefeninitionArray} Cached eventBus subscriptions.
         */
        var _eventBusSubDefs = [];

        // Ensure all edit handlers are cleaned up when initializing
        // This is to workaround the fact that GWT does not clean up edit handlers when leaving the sublocation
        // Native does, so once GWT is gone this can be removed
        [ 'NONE', 'TABLE_CONTEXT' ].forEach( function( editContext ) {
            var editHandler = editHandlerSvc.getEditHandler( editContext );

            if( editHandler ) {
                logger.debug( 'Removing edit handler for ', editContext, ' context', editHandler );

                editHandlerSvc.removeEditHandler( editContext );
            }
        } );

        /**
         * Whether XRT should be used in the secondary workarea of this sublocation
         */
        $scope.swaContext = {
            isXrtApplicable: $scope.provider.hasOwnProperty( 'isXrtApplicable' ) ? $scope.provider.isXrtApplicable : !_.isUndefined( appCtxService.ctx.tcSessionData )
        };

        /**
         * The base view to use for the primary workarea. Makes it possible to reuse view models.
         *
         * @member viewBase
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.viewBase = $scope.provider.viewBase ? $scope.provider.viewBase : $scope.provider.name;

        /**
         * The view to use for the secondary workarea. Makes it possible to reuse view models.
         *
         * @member secondaryView
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.secondaryView = $scope.provider.secondaryView ? $scope.provider.secondaryView : '';

        /**
         * The Selection QueryParam Key by default is s_uid
         *
         * @member selectionQueryParamKey
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.selectionQueryParamKey = $scope.provider.selectionQueryParamKey ? $scope.provider.selectionQueryParamKey :
            's_uid';

        /**
         * The editSupportParamKeys by default is [ selectionQueryParamKey ]
         *
         * @member editSupportParamKeys
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.editSupportParamKeys = $scope.provider.editSupportParamKeys ? $scope.provider.editSupportParamKeys : [ $scope.selectionQueryParamKey ];

        /**
         * Whether to show the secondary workarea
         *
         * @member showSecondaryWorkArea
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.showSecondaryWorkArea;

        /**
         * The parent selection. Passed in through the scope when using this controller as a directive.
         *
         * @member baseSelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.baseSelection;

        $scope.ctx = appCtxService.ctx;

        /**
         * Whether to display the parent selection when nothing is selected. Passed in through the scope
         * when using this controller as a directive. Defaults to true.
         *
         * @member baseSelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.showBaseSelection = $scope.hasOwnProperty( 'showBaseSelection' ) ? $scope.showBaseSelection :
            true;

        /**
         * The currently selected modelObjects. Checked by the dataProviderFactory, do not rename.
         *
         * @member modelObjects
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.modelObjects = [];

        /**
         * The bread crumb configuration - search or navigate, that the sub location uses. It is a
         * configuration in states.json. By default it always shows search bread crumb.
         *
         * @member breadcrumbConfig
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.breadcrumbConfig = $scope.provider.breadcrumbConfig;

        // If breadcrumb id is not defined default to 'wabc'
        if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.id ) {
            $scope.breadcrumbConfig.id = 'wabc';
        }

        appCtxService.registerCtx( 'breadCrumbConfig', $scope.breadcrumbConfig );

        /**
         * Put ctx on scope so it can be used in conditions and views
         *
         * @member ctx
         * @memberof NgControllers.NativeSubLocationCtrl
         */
        $scope.ctx = appCtxService.ctx;

        /**
         * The supported view modes. Defines the primary work area view and whether secondary work area
         * is visible for each. Defaults to list / list with summary / table / table with summary /
         * image
         *
         * @member viewModes
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.viewModes = $scope.provider.viewModes ? $scope.provider.viewModes : {
            SummaryView: {
                primaryWorkArea: 'list',
                secondaryWorkArea: true
            },
            TableSummaryView: {
                primaryWorkArea: 'table',
                secondaryWorkArea: true
            },
            ListView: {
                primaryWorkArea: 'list',
                secondaryWorkArea: false
            },
            TableView: {
                primaryWorkArea: 'table',
                secondaryWorkArea: false
            },
            ImageView: {
                primaryWorkArea: 'image',
                secondaryWorkArea: false
            }
        };

        /**
         * How the sublocation tracks selection. The PWA selection model will use just the uid to track
         * selection.
         *
         * @param input {Any} - The object that needs to be tracked.
         */
        var selectionTracker = function( input ) {
            if( typeof input === 'string' ) {
                return input;
            }
            return input.alternateID ? input.alternateID : input.uid;
        };

        /**
         * The primary workarea selection model. Stored at the sublocation level as it is shared between
         * multiple data providers and sublocation must access to change PWA selection.
         *
         * @member pwaSelectionModel
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope.pwaSelectionModel = selectionModelFactory.buildSelectionModel(
            $scope.provider.selectionMode ? $scope.provider.selectionMode : 'multiple',
            selectionTracker );

        $scope.commandContext = $scope.commandContext || {};
        $scope.commandContext.pwaSelectionModel = $scope.pwaSelectionModel;
        // Pass selection model to PWA (which passes to data providers)
        $scope.pwaContext = {
            selectionModel: $scope.pwaSelectionModel,
            pwaSelectionModel: $scope.pwaSelectionModel,
            editSupportParamKeys: $scope.editSupportParamKeys
        };

        /**
         * The currently active parameters. Used to determine how the page refreshes.
         *
         * @private
         * @member _activeParams
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        var _activeParams = ngModule.copy( $state.params );

        /**
         * Parameters that should trigger a command context change event
         *
         * @private
         * @member _commandContextParams
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        var _commandContextParams = $scope.provider.context &&
            $scope.provider.context.commandContextParameters ? $scope.provider.context.commandContextParameters : [];

        /**
         * Display mode to use when encountering an unknown display or when preference is not set.
         *
         * @member _defaultDisplayMode
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        ctrl._defaultDisplayMode = $scope.provider.defaultDisplayMode ? $scope.provider.defaultDisplayMode :
            'SummaryView';

        /**
         * Whether to select the first object after search completes. Flag will be reset after this
         * happens once.
         *
         * @member selectFirstObject
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        ctrl.selectFirstObject = false;

        /**
         * To retrieve the preference value on selecting the first object on search.
         *
         * @member getSelectFirstObjectPreference
         * @memberOf NgControllers.NativeSubLocationCtrl
         * @return {BOOLEAN} true if the preference for selecting the first object is true
         */
        $scope.getSelectFirstObjectPreference = function() {
            return appCtxService.getCtx( 'preferences.AWC_select_firstobject_onSearch.0' ) === 'TRUE';
        };
        /**
         * Track if there is a pending selection in the PWA
         *
         * @member _pendingSelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        $scope._pendingSelection = false;

        /**
         * Update the primary workarea selection
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        $scope.updatePrimarySelection = function( selection ) {
            // TODO: Should never have null selection - need to track down source
            if( !selection ) {
                selection = [];
            }

            // If selection is empty revert to base selection
            if( selection.length === 0 ) {
                selectionService.updateSelection( $scope.baseSelection, $scope.baseSelection );

                ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                    [ $scope.baseSelection ] : [] );
            } else {
                // Otherwise use as parent selection
                selectionService.updateSelection( selection, $scope.baseSelection );

                // And update which model objects are selected
                ctrl.setSelection( selection );
            }
        };

        /**
         * Handler when selection in the primary workarea changes
         *
         * @param {String[]} selection - The list of selected uids
         * @param {Boolean} initial - TRUE if location option should be is 'replace'.
         */
        $scope.onPWASelectionChange = function( selection, initial ) {
            // If the state supports s_uid
            if( $state.params.hasOwnProperty( $scope.selectionQueryParamKey ) ) {
                var newParams = {};

                // If a single object is selected update s_uid
                if( selection.length === 1 ) {
                    newParams[ $scope.selectionQueryParamKey ] = selection[ 0 ];
                } else if( selection.length === 0 ) {
                    // If nothing is selected use base selection
                    newParams[ $scope.selectionQueryParamKey ] = $scope.getParentUid ? $scope
                        .getParentUid() : null;
                } else {
                    // Otherwise clear parameter
                    newParams[ $scope.selectionQueryParamKey ] = null;
                }

                $state.go( '.', newParams, {
                    location: initial ? 'replace' : true
                } );
            }
        };

        /**
         * Ensure the correct object is selected
         *
         * @param {String} uidToSelect - The uid of the object that should be selected
         */
        $scope.updatePWASelection = function( uidToSelect ) {
            // If uid parameter was cleared clear selection (unless multi select)
            // If uid parameter was set to base selection also clear selection
            if( !uidToSelect || $scope.getParentUid && uidToSelect === $scope.getParentUid() ) {
                //dont update the selection based on multiSelectionEnabled.
                //if selection count more than 2 meaning, multiple objects in selection and hence dont clear our selection.
                if( $scope.pwaSelectionModel.getCurrentSelectedCount() < 2 ) {
                    $scope.pwaSelectionModel.setSelection( [] );
                }
            } else {
                // Otherwise set new uid as selection
                $scope.pwaSelectionModel.setSelection( [ uidToSelect ] );
            }

            appCtxService.registerCtx( 'pwaSelectionInfo', {
                multiSelectEnabled: $scope.pwaSelectionModel.multiSelectEnabled,
                currentSelectedCount: $scope.pwaSelectionModel.getCurrentSelectedCount()
            } );
        };

        /**
         * Update the secondary workarea selection
         *
         * @function updateSecondarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         * @param {Object[]} relationInfo - Any relation information
         */
        $scope.updateSecondarySelection = function( selection, relationInfo ) {
            // If everything was deselected
            if( !selection || selection.length === 0 ) {
                $scope.updateisSelectionTypeFolder( $scope.baseSelection );
                // Revert to the previous selection (primary workarea)
                selectionService.updateSelection( $scope.modelObjects, $scope.baseSelection );
            } else {
                $scope.updateisSelectionTypeFolder( null, true );
                // Update the current selection with primary workarea selection as parent
                selectionService.updateSelection( selection, $scope.modelObjects[ 0 ], relationInfo );
            }
        };

        $scope.$on( 'PWAFocused', function( event, data ) {
            let ctxSelection = appCtxService.getCtx( 'selected' );
            let currentSelected = ctxSelection && selectionTracker( ctxSelection );
            let pwaSelection = $scope.pwaSelectionModel.getSelection()[ 0 ];
            if( currentSelected && pwaSelection && currentSelected !== pwaSelection ) {
                $scope.$broadcast( 'dataProvider.selectionChangeEvent', { clearSelections: true } );
            }
        } );

        /**
         * Get what the sublocation believes will be selected once everything is finished
         * and where it will be selected (base / PWA / SWA)
         *
         * The selected object does not have to be a real object. If the selected object
         * ends up not being what is actually selected it should not cause any failures,
         * although there may be an extra server call to get server visibility
         *
         * @return {Object} A selection event with "source" and "selected"
         */
        $scope.getInitialSelection = function() {
            var puid = $scope.getParentUid ? $scope.getParentUid() : '';
            if( $scope.selectionQueryParamKey && $state.params[ $scope.selectionQueryParamKey ] ) {
                var source = puid === $state.params[ $scope.selectionQueryParamKey ] ? 'base' : 'primaryWorkArea';
                return {
                    selected: [ {
                        uid: $state.params[ $scope.selectionQueryParamKey ]
                    } ],
                    source: source
                };
            } else if( puid ) {
                return {
                    selected: [ {
                        uid: puid
                    } ],
                    source: 'base'
                };
            }
        };

        $scope.updateisSelectionTypeFolder = ( selection, unRegisterCtx ) => {
            const isSelectionTypeFolder = 'isSelectionTypeFolder';
            if( unRegisterCtx ) {
                appCtxService.unRegisterCtx( isSelectionTypeFolder );
                return;
            }

            if( !selection || !selection.modelType || !selection.modelType.typeHierarchyArray ) {
                return;
            }
            let prevSelectionTypeFolder = appCtxService.getCtx( isSelectionTypeFolder );
            let currSelectionTypeFolder = selection.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1;
            if( currSelectionTypeFolder !== prevSelectionTypeFolder ) {
                appCtxService.registerCtx( isSelectionTypeFolder, currSelectionTypeFolder );
            }
        };

        /**
         * Update the current selection based on the selection change event
         *
         * @function updateSelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {Object} data - The selection event data
         */
        $scope.updateSelection = function( data ) {
            if( data ) {
                if( data.source === 'primaryWorkArea' ) {
                    if( data.selected && data.selected.length === 1 ) {
                        $scope.updateisSelectionTypeFolder( data.selected[0] );
                    } else if( $scope.baseSelection ) {
                        $scope.updateisSelectionTypeFolder( $scope.baseSelection );
                    } else {
                        $scope.updateisSelectionTypeFolder( null, true );
                    }

                    $scope.updatePrimarySelection( data.selected );
                    // If we have a selection model instead of simple selection
                    if( $scope.pwaSelectionModel ) {
                        // Update the breadcrumb
                        var searchFilterCategories = appCtxService.getCtx( 'search.filterCategories' );
                        var searchFilterMap = appCtxService.getCtx( 'search.filterMap' );
                        ctrl.refreshBreadcrumbProvider( searchFilterCategories, searchFilterMap );

                        if( ctrl.selectFirstObject &&
                            $scope.pwaSelectionModel.getSelection().length === 0 ) {
                            ctrl.selectFirstObject = false;
                            var firstObject = data.dataProvider.viewModelCollection
                                .getLoadedViewModelObjects()[ 0 ];
                            if( firstObject ) {
                                $scope.pwaSelectionModel.addToSelection( firstObject );
                            }
                        }
                    }
                    $scope._pendingSelection = false;
                    if( ctrl._pendingSelectionAction ) {
                        ctrl._pendingSelectionAction();
                        delete ctrl._pendingSelectionAction;
                    }
                } else if( data.source === 'secondaryWorkArea' ) {
                    // If PWA selection is currently changing stick wait to process SWA selections
                    if( $scope._pendingSelection ) {
                        ctrl._pendingSelectionAction = function() {
                            $scope.updateSecondarySelection( data.selected, data.relationContext );
                        };
                    } else {
                        $scope.updateSecondarySelection( data.selected, data.relationContext );
                    }
                } else if( data.source === 'base' ) {
                    $scope.updateisSelectionTypeFolder( $scope.baseSelection );
                    selectionService.updateSelection( $scope.baseSelection );
                } else {
                    logger.trace( 'Ignored selection', data );
                    return;
                }
                // aw-page listens to this event when in narrow mode
                eventBus.publish( 'gwt.SubLocationContentSelectionChangeEvent', {
                    isPrimaryWorkArea: data.source === 'primaryWorkArea',
                    selected: data.selected,
                    haveObjectsSelected: data.selected && data.selected.length > 0
                } );
            } else {
                $scope.updateisSelectionTypeFolder( $scope.baseSelection );
                // If no data revert to base selection (null if not provided)
                selectionService.updateSelection( $scope.baseSelection );
                eventBus.publish( 'resetBreadCrumb' );
            }
        };

        /**
         * Update selection on $scope
         *
         * @param {ModelObject[]} mos - Model objects that should be selected
         */
        ctrl.setSelection = function( mos ) {
            $scope.modelObjects = mos;
        };

        /**
         * Change the display mode.
         *
         * @function changeViewMode
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {String} newViewMode - The new view mode. Must be defined in
         *            {@link NgControllers.NativeSubLocationCtrl#_viewModes}
         */
        ctrl.changeViewMode = function( newViewMode ) {
            editHandlerSvc.leaveConfirmation().then( function() {
                var shouldBroadcastUpdate = $scope.view !== newViewMode.primaryWorkArea;
                $scope.view = newViewMode.primaryWorkArea;
                //Reset selection back to base when SWA is hidden
                if( !newViewMode.secondaryWorkArea && $scope.showSecondaryWorkArea ) {
                    $scope.updateSecondarySelection( [], null );
                }
                $scope.showSecondaryWorkArea = newViewMode.secondaryWorkArea;
                if( shouldBroadcastUpdate ) {
                    $scope.$broadcast( 'viewModeChanged', newViewMode );
                }
            } );
        };

        /**
         * Refresh the breadcrumb provider
         *
         * @function refreshBreadcrumbProvider
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {Object} searchFilterCategories - search filter categories
         * @param {Object} searchFilterMap - search filter map
         */
        ctrl.refreshBreadcrumbProvider = function( searchFilterCategories, searchFilterMap ) {
            eventBus.publish( 'refreshBreadCrumb', {
                searchFilterCategories: searchFilterCategories,
                searchFilterMap: searchFilterMap
            } );

            $scope.breadCrumbProvider = breadCrumbSvc.refreshBreadcrumbProvider( $scope.breadcrumbConfig, $scope.pwaSelectionModel,
                searchFilterCategories, searchFilterMap, $scope.provider.params.searchCriteria, $scope.provider.label, true );

            $scope.objFound = Boolean( appCtxService.getCtx( 'search.totalFound' ) );
        };

        /**
         * Default location change behavior. Updates the search context with some glue code. Only
         * reloads when search context changes. Minor extension point available in
         * $scope.addSearchContext
         *
         * @param {Object} changedParams - The state parameters that have changed
         *
         * @return {Promise} A promise resolved with object determining which events should be fired.
         */
        $scope.onLocationChange = function( changedParams ) {
            // Build up filter map and array
            var searchContext = searchFilterService.buildSearchFilters( $scope.provider.context );

            // Put the searchCriteria property on the state into the params
            if( $scope.provider.params.hasOwnProperty( 'searchCriteria' ) ) {
                if( !searchContext.criteria ) {
                    searchContext.criteria = {};
                }

                searchContext.criteria.searchString = $scope.provider.params.searchCriteria ? $scope.provider.params.searchCriteria :
                    '';
            }

            // If the sublocation is extended to include additional context in search
            if( $scope.addSearchContext ) {
                // Add it in
                return $scope.addSearchContext( searchContext, changedParams ).then( function( updatedSearchContext ) {
                    // And update the context
                    var contextChanged = !ngModule.equals( appCtxService.getCtx( 'search' ),
                        updatedSearchContext );
                    if( contextChanged ) {
                        appCtxService.registerCtx( 'search', updatedSearchContext );
                    }
                    var retVal = {};
                    if( contextChanged ) {
                        retVal[ 'primaryWorkarea.reset' ] = {};
                    }
                    return retVal;
                } );
            }

            // Otherwise just update the context
            var contextChanged = !ngModule.equals( appCtxService.getCtx( 'search' ), searchContext );
            if( contextChanged ) {
                appCtxService.registerCtx( 'search', searchContext );
            }
            var retVal = {};
            if( contextChanged ) {
                retVal[ 'primaryWorkarea.reset' ] = {};
            }
            return $q.when( retVal );
        };

        /**
         * Get the name of the preference that contains the current sublocation view mode
         *
         * @function getViewModePref
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        ctrl.getViewModePref = function() {
            return 'AW_SubLocation_' +
                ( $scope.provider.nameToken.indexOf( ':' ) !== -1 ? $scope.provider.nameToken
                    .split( ':' )[ 1 ] : 'Generic' ) + '_ViewMode';
        };

        /**
         * Get the viewMode from Preference
         *
         * @function getViewModeFromPref
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        ctrl.getViewModeFromPref = function() {
            var viewModePref = appCtxService.getCtx( 'preferences.' + ctrl.getViewModePref() );
            if( viewModePref ) {
                return viewModePref[ 0 ];
            }
            return viewModePref;
        };

        /**
         * Update the viewMode to Preference
         *
         * @function setViewModeToPref
         * @memberOf NgControllers.NativeSubLocationCtrl
         */
        ctrl.setViewModeToPref = function( viewMode ) {
            appCtxService.updatePartialCtx( 'preferences.' + ctrl.getViewModePref(), [ viewMode ] );
        };

        /**
         * Check if there are any URL commands to run and run them
         *
         * @method checkUrlCommand
         * @memberOf NgControllers.ShowObjectLocationCtrl
         * @return {Promise} A promise resolved once the command has started
         */
        ctrl.checkUrlCommand = function() {
            if( !ctrl._urlCommandCheckPromise ) {
                ctrl._urlCommandCheckPromise = $timeout().then( function() {
                    // GWT does not support parameters that are not strings currently
                    // so merge the array parameter into a string with the format GWT expects before sending it
                    // allows the array typed parameter cmdArg to work without making major changes to GWT code
                    if( $state.params.cmdArg && _.isArray( $state.params.cmdArg ) ) {
                        $state.params.cmdArg = $state.params.cmdArg.join( '&' );
                    }

                    if( $state.params.cmdId ) {
                        return commandService.executeCommand( $state.params.cmdId,
                                $state.params.cmdArg, $scope )
                            // Log error or success message
                            .then(
                                function() {
                                    logger.trace( 'Executed command: ' + $state.params.cmdId +
                                        ' with args ' + $state.params.cmdArg + ' from url' );
                                },
                                function( errorMessage ) {
                                    logger.error( errorMessage );
                                } )
                            // clear cmdId and cmdArg
                            .then( function() {
                                return $state.go( '.', {
                                    cmdId: null,
                                    cmdArg: null
                                }, {
                                    location: 'replace'
                                } );
                            } ).then( function() {
                                ctrl._urlCommandCheckPromise = null;
                            } );
                    }
                } );
            }
            return ctrl._urlCommandCheckPromise;
        };

        /**
         * Create event listeners and remove them on $destroy
         */
        var handleEventListeners = function() {
            // This is a point fix( adding hasTcSessionData ) to stop the setPreference SOA call for other than TC.
            // In next sprint 1902, we have story planned for it, where we have take out TC specific
            // stuffs from this controller.
            var hasTcSessionData = !_.isUndefined( $scope.ctx.tcSessionData );
            _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.register',
                function( context ) {
                    // When the view mode context changes
                    if( context.name === viewModeService._viewModeContext &&
                        context.value.ViewModeContext ) {
                        // And it is a known view mode
                        if( context.value.ViewModeContext !== 'None' ) {
                            var newViewMode = $scope.viewModes[ context.value.ViewModeContext ];
                            if( !newViewMode ) {
                                logger.warn( 'Unknown view mode', context.value.ViewModeContext,
                                    'defaulting to', ctrl._defaultDisplayMode );
                                context.value.ViewModeContext = ctrl._defaultDisplayMode;
                                newViewMode = $scope.viewModes[ context.value.ViewModeContext ];
                            }

                            if( ctrl.getViewModeFromPref() !== context.value.ViewModeContext && hasTcSessionData ) {
                                ctrl.setViewModeToPref( context.value.ViewModeContext );
                            }

                            // And change the view mode
                            ctrl.changeViewMode( newViewMode );
                        }
                    }
                } ) );

            // LCS-284850 - Dont force mobile devices to change view mode when put into narrow mode
            if( !browserUtils.isMobileOS ) {
                _eventBusSubDefs.push( eventBus.subscribe( 'narrowModeChangeEvent', function( data ) {
                    // When entering narrow mode
                    if( data.isEnterNarrowMode ) {
                        // Switch to default view mode
                        var defaultMode = $scope.viewModes[ ctrl._defaultDisplayMode ];
                        ctrl.changeViewMode( defaultMode );
                    } else {
                        // When leaving narrow mode
                        // Change back to the view mode stored in the preference
                        var viewMode = ctrl.getViewModeFromPref();
                        if( viewMode ) {
                            viewModeService.changeViewMode( viewMode );
                        }
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
                if( eventData.selected ) {
                    if( eventData.operation === 'replace' ) {
                        if( eventData.selected.length < 2 ) {
                            $scope.pwaSelectionModel.setMultiSelectionEnabled( false );
                        }

                        $scope.pwaSelectionModel.setSelection( eventData.selected );
                    } else if( eventData.operation === 'add' ) {
                        $scope.pwaSelectionModel.addToSelection( eventData.selected );
                    } else {
                        /**
                         * Note: This default case is required to keep some non-hosting use of this hosting event.
                         * This default case will be removed once those uses are moved over to use another way to
                         * handle their selection.
                         */
                        $scope.pwaSelectionModel.setSelection( eventData.selected );
                    }

                    $scope.$evalAsync();
                }
            } ) );

            // When reloading the primary workarea
            _eventBusSubDefs.push( eventBus.subscribe( 'primaryWorkarea.reset', function() {
                // Select first object when preference is set and in list with summary mode
                ctrl.selectFirstObject = ( viewModeService.getViewMode() === 'TableSummaryView' || //
                        viewModeService.getViewMode() === 'SummaryView' ) && !$scope.baseSelection &&
                    $scope.getSelectFirstObjectPreference();
            } ) );
        };

        // When a state parameter changes
        $scope.$on( '$locationChangeSuccess', function() {
            // Get which parameters have changed
            var changedParams = {};
            for( var i in $state.params ) {
                if( $state.params[ i ] !== _activeParams[ i ] ) {
                    changedParams[ i ] = $state.params[ i ];
                }
            }

            var hasPageChanged = ( function() {
                // If page and pageId changed then ignore
                // If only one changed check if it was the only thing determining which page was opened
                if( changedParams.hasOwnProperty( 'page' ) ) {
                    if( changedParams.hasOwnProperty( 'pageId' ) ) {
                        return true;
                    }
                    return !_activeParams.pageId;
                }
                if( changedParams.hasOwnProperty( 'pageId' ) ) {
                    if( changedParams.hasOwnProperty( 'page' ) ) {
                        return true;
                    }
                    return !_activeParams.page;
                }
            } )();

            /**
             * Fix for show object specifically - controller about to be removed, location can't tell
             * sublocation to ignore $locationChangeSucess, so sublocation has to do a check specific to
             * location
             *
             * Not clean but only solution that doesn't involve timer
             */
            if( $state.current.name === 'com_siemens_splm_clientfx_tcui_xrt_showObject' &&
                ( changedParams.hasOwnProperty( 'uid' ) || hasPageChanged ) ) {
                return;
            }

            _activeParams = ngModule.copy( $state.params );

            // Ignore the event if state is about to change
            if( !$state.$current.url.exec( $location.path() ) ) {
                return;
            }

            // Update the context with new state data
            $scope.onLocationChange( changedParams ).then( function( data ) {
                // Check cmdId
                ctrl.checkUrlCommand();

                // Fire any events necessary
                var events = Object.keys( data );
                if( events.length > 0 ) {
                    events.forEach( function( eventName ) {
                        eventBus.publish( eventName, data[ eventName ] );
                    } );
                }

                // Update (future) selection
                // Must happen after events are fired as selection model will be detached so no selection updates happen until load completes
                if( changedParams.hasOwnProperty( $scope.selectionQueryParamKey ) ||
                    data.hasOwnProperty( 'primaryWorkarea.reset' ) ) {
                    $scope.updatePWASelection( $state.params[ $scope.selectionQueryParamKey ] );
                }

                var hasCommandContextChanged = Object.keys( changedParams ).filter(
                    function( param ) {
                        return _commandContextParams.indexOf( param ) !== -1;
                    } ).length > 0;
                if( hasCommandContextChanged ) {
                    selectionService.updateCommandContext();
                }
            } );
        } );

        // Remove the supported view modes on destroy
        $scope.$on( '$destroy', function() {
            // Remove listeners on destroy
            _.forEach( _eventBusSubDefs, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );

            appCtxService.unRegisterCtx( 'searchResponseInfo' );
            appCtxService.unRegisterCtx( 'breadCrumbConfig' );
            appCtxService.unRegisterCtx( 'pwaSelectionInfo' );
            appCtxService.unRegisterCtx( 'sublocationTitleErrorMessage' );
            appCtxService.unRegisterCtx( 'isSelectionTypeFolder' );

            viewModeService.changeViewMode( 'None' );
            viewModeService.setAvailableViewModes( [] );
        } );

        // When show base selection flag changes make sure base selection is displayed
        $scope.$watch( 'showBaseSelection', function( newVal, oldVal ) {
            if( newVal !== oldVal ) {
                // If the base selection changes and the base object is currently selected
                // And there is no selection tracked in URL
                if( !$scope.modelObjects.length && !$state.params[ $scope.selectionQueryParamKey ] ) {
                    // Select the new base object
                    selectionService.updateSelection( $scope.baseSelection );
                    ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                        [ $scope.baseSelection ] : [] );
                    // Ensure selection query param is correct
                    var newParams = {};
                    newParams[ $scope.selectionQueryParamKey ] = $scope.baseSelection.uid;
                    $state.go( '.', newParams, {
                        location: 'replace'
                    } );
                }
            }
        } );

        // If there is some validation of the current page required ensure it is done
        if( $scope.provider.validation ) {
            $scope.$watch( function _validateSublocationStateWatch() {
                // Check each validation string in order (L -> R) and return the message of the first one that fails
                return $scope.provider.validation.reduce( function( acc, nxt ) {
                    if( acc ) {
                        return acc;
                    }
                    if( !conditionService.evaluateCondition( $scope, nxt.condition ) ) {
                        return nxt.message;
                    }
                    return null;
                }, null );
            }, function( errorMessage ) {
                if( errorMessage && typeof errorMessage === 'object' ) {
                    // Set immediately to ensure PWA load does not start
                    $scope.validationErrorMessage = ' ';
                    // Get the error from the localized file
                    localeService.getLocalizedText( errorMessage.source, errorMessage.key ).then( function( result ) {
                        $scope.validationErrorMessage = result;
                        appCtxService.registerCtx( 'sublocationTitleErrorMessage', $scope.validationErrorMessage );
                    } );
                } else {
                    $scope.validationErrorMessage = errorMessage;
                }
                appCtxService.registerCtx( 'sublocationTitleErrorMessage', $scope.validationErrorMessage );
            } );
        } else {
            appCtxService.registerCtx( 'sublocationTitleErrorMessage', null );
        }
        // When base selection changes update selection service
        $scope.$watch( 'baseSelection', function( newVal, oldVal ) {
            if( newVal !== oldVal ) {
                // Disable first object selection if base selection
                ctrl.selectFirstObject = false;
                // If the base selection changes and the base object is currently selected
                // And there is no selection tracked in URL
                if( $scope.modelObjects.length === 1 && $scope.modelObjects[ 0 ] === oldVal &&
                    !$state.params[ $scope.selectionQueryParamKey ] ) {
                    // Select the new base object
                    selectionService.updateSelection( $scope.baseSelection );
                    ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                        [ $scope.baseSelection ] : [] );
                    // Ensure selection query param is correct
                    var newParams = {};
                    newParams[ $scope.selectionQueryParamKey ] = newVal.uid;
                    $state.go( '.', newParams, {
                        location: 'replace'
                    } );
                }
            }
        } );

        // Initialize the sublocation
        ctrl.init.then( function() {
            // Set the sort criteria for sublocation if its not already populated in ctx.ClientScopeURI.sortCriteria
            // This sort criteria will be shared across all views in a sublocation in a given session.
            var sortCriteria = appCtxService.getCtx( $scope.provider.clientScopeURI + '.sortCriteria' );
            if( sortCriteria === undefined || sortCriteria === '' ) {
                appCtxService.updatePartialCtx( $scope.provider.clientScopeURI + '.sortCriteria', [] );
                appCtxService.updatePartialCtx( 'sublocation.sortCriteria', [] );
            } else {
                appCtxService.updatePartialCtx( 'sublocation.sortCriteria', sortCriteria );
            }
            return $scope.onLocationChange( $state.params );
        } ).then( function() {
            // The presenter will reset the display mode context to null when it is hidden
            // This listener is created before presenter is hidden, so there's multiple events
            // Don't want to setView multiple times (SOA calls) so $evalAsync (hiding presenter is sync, but behind a single promise that is resolved next digest)
            $scope.$evalAsync( function() {
                // Set the available view modes
                viewModeService.setAvailableViewModes( Object.keys( $scope.viewModes ) );

                // Set initial PWA selection
                if( $state.params[ $scope.selectionQueryParamKey ] ) {
                    $scope.updatePWASelection( $state.params[ $scope.selectionQueryParamKey ] );
                } else {
                    // Set initial sublocation selection
                    ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                        [ $scope.baseSelection ] : [] );
                }
                // Ensure uid is in sync with selection model
                $scope.$watchCollection( 'pwaSelectionModel.getSelection()', function(
                    newSelection, oldSelection ) {
                    $scope.onPWASelectionChange( newSelection, newSelection === oldSelection );
                } );

                // Setup event listeners
                handleEventListeners();

                // Check cmdId
                ctrl.checkUrlCommand();
                // get viewMode
                var viewMode = ctrl.getViewModeFromPref();
                // If there's a specific default display mode use that instead of the preference
                if( $scope.provider.defaultDisplayMode && ( !viewMode || !$scope.viewModes[ viewMode ] ) )  {
                    viewModeService.changeViewMode( $scope.provider.defaultDisplayMode );
                } else {
                    // If in narrow just use the default display mode (list with summary unless it was manually set)
                    if( narrowModeService.isNarrowMode() ) {
                        // Set the display mode without modifying the preference
                        var newViewMode = $scope.viewModes[ ctrl._defaultDisplayMode ];
                        ctrl.changeViewMode( newViewMode );
                    } else {
                        var actualViewMode = viewMode ? viewMode : ctrl._defaultDisplayMode;
                        // Select first object when preference is set and in list with summary mode
                        ctrl.selectFirstObject = ( actualViewMode === 'TableSummaryView' || actualViewMode === 'SummaryView' ) &&
                            !$scope.baseSelection && $scope.getSelectFirstObjectPreference();
                        viewModeService.changeViewMode( viewMode ? viewMode :
                            ctrl._defaultDisplayMode );
                    }
                }
            } );
        } );
    }
] );
