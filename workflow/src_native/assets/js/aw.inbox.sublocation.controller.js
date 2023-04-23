// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.InboxSubLocationCtrl}
 *
 * @module js/aw.inbox.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.default.location.controller
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import 'js/aw.native.sublocation.controller';
import 'soa/kernel/clientDataModel';
import 'js/selection.service';
import 'js/aw.inbox.service';
import 'js/appCtxService';
import 'js/localeService';
import 'soa/dataManagementService';
import 'js/viewMode.service';
import 'soa/preferenceService';
import 'js/command.service';

'use strict';

/**
 * Inbox sublocation controller. Extends the {@link  NgControllers.NativeSubLocationCtrl} to call performAction3
 * when the XRTSummaryView is displayed for the selected object in the primaryWorkArea.
 *
 * @class NgControllers.InboxSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'InboxSubLocationCtrl', [
    '$scope',
    '$controller',
    '$state',
    '$q',
    'soa_kernel_clientDataModel',
    'selectionService',
    'awInboxService',
    'appCtxService',
    'localeService',
    'soa_dataManagementService',
    'viewModeService',
    'soa_preferenceService',
    'commandService',
    function( $scope, $controller, $state, $q, cdm, selectionService, awInboxSvc, appCtxService, localeService,
        dms, viewModeService, prefService, commandService ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * This function will set the isValidViewModel when viewMode is Summary View or Table Summary View
         */
        var isViewModeIsSummaryOrTableSummary = function() {
            var isValidViewModel = false;
            var viewMode = viewModeService.getViewMode();

            if( viewMode && ( viewMode !== 'None' && viewMode !== 'SummaryView' && viewMode !== 'TableSummaryView' ) ) {
                isValidViewModel = true;
            }
            return isValidViewModel;
        };

        /**
         * This function will invoke when there is only one selection in Primary Work Area.
         */
        var singleSelectionInPrimaryWorkArea = function( isValidViewModel ) {
            //And the secondary workarea is visible

            /*Mark the task as read.
            This is needed to update the viewed by me and update badge count when user select the tasks
            in table mode or list mode.*/
            awInboxSvc.setViewedByMeIfNeeded( $scope.modelObjects[ 0 ] );

            var validEPMTask = awInboxSvc.getValidEPMTaskObject( $scope.modelObjects[ 0 ].uid );
            var currentState = validEPMTask.props.state;
            if( currentState && currentState.dbValues && currentState.dbValues[ 0 ] !== '128' ) {
                //If we are in myTasks sublocation and the active command is not object info
                var activeCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
                // If user has done start edit then we don't need to bring the complete task panel by default
                // as edit is in progress.
                var isEditInProgress = appCtxService.getCtx( 'editInProgress' );
                if( $state.current.name === 'myTasks' && !isEditInProgress &&
                    !( activeCommand && activeCommand.commandId === 'Awp0ObjectInfo' ) && isValidViewModel ) {
                    //Open the perform task panel
                    if( !activeCommand || activeCommand.commandId !== 'Awp0PerformTaskPanel' ) {
                        $scope.ctx.isPanelOpened = false;
                        commandService.executeCommand( 'Awp0PerformTaskPanel', null, $scope );
                    }
                }
            }
        };

        /**
         * This function will check Prefrence and fire the evnts.
         */
        var checkPrefAndFireEvents = function() {
            //Get the preference value and based on value show the panel by default or not
            prefService.getLogicalValue( 'WRKFLW_Hide_Perform_Task_Command_ToolAndInfo' ).then( function( result ) {
                var isComamndHidden = false;

                if( result === null || result.length > 0 && result.toUpperCase() === 'TRUE' ) {
                    isComamndHidden = true;
                } else {
                    isComamndHidden = false;
                }
                var isValidViewModel = true;
                if( isComamndHidden ) {
                    isValidViewModel = isViewModeIsSummaryOrTableSummary();
                }
                //If there is a single select in the primary workarea
                if( $scope.modelObjects && $scope.modelObjects.length === 1 ) {
                    singleSelectionInPrimaryWorkArea( isValidViewModel );
                } else if( $scope.modelObjects && $scope.modelObjects.length === 0 && isValidViewModel ) {
                    //'Close' the perform task panel
                    //May not be necessary since panel will be automatically closed because command is hidden
                    var activeCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
                    if( activeCommand && activeCommand.commandId === 'Awp0PerformTaskPanel' ) {
                        $scope.ctx.isPanelOpened = true;
                        commandService.executeCommand( 'Awp0PerformTaskPanel', null, $scope );
                    }
                }
            } );
        };

        /**
         * Handle the view changing with a single object selected - should be marked as read if the secondary work
         * area is not visible.
         */
        $scope.$watch( 'showSecondaryWorkArea', function( a, b ) {
            if( a !== b && $scope.modelObjects && $scope.modelObjects.length === 1 ) {
                //If the secondary workarea becomes visible and a single object is selected
                if( $scope.showSecondaryWorkArea ) {
                    //Mark the task as read
                    awInboxSvc.setViewedByMeIfNeeded( $scope.modelObjects[ 0 ] );
                }
            }
        } );

        /**
         * Handle the call made when we change mode to TableSummaryView to TableView mode and SummaryView to
         * ListView mode. When we change from these modes _updatePrimarySelection will not get called and therefore to
         * Auto open the panel we need this call. If we change mode from SummaryView to TableView, that usecase will be
         * handled in _updatePrimarySelection().
         */
        $scope.$watch( 'ctx.ViewModeContext.ViewModeContext', function( a, b ) {
            if( a === 'TableView' && b === 'TableSummaryView' ) {
                checkPrefAndFireEvents();
            } else if( a === 'ListView' && b === 'SummaryView' ) {
                checkPrefAndFireEvents();
            }
        } );

        /**
         * Update the primary workarea selection
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        var _updatePrimarySelection = $scope.updatePrimarySelection;
        $scope.updatePrimarySelection = function( selection ) {
            //Do the parent update which updates the current model objects
            _updatePrimarySelection( selection );
            checkPrefAndFireEvents();
        };

        /**
         * Do additional processing when updating search context
         *
         * @function addSearchContext
         * @memberOf NgControllers.InboxSubLocationCtrl
         *
         * @param {Object} searchContext - The new search context
         */
        $scope.addSearchContext = function( searchContext ) {
            var getHeaderTitle = function() {
                var property = $state.current.data.headerTitle;
                if( typeof property === 'string' ) {
                    return property;
                }
                return localeService.getLocalizedText( app.getBaseUrlPath() + property.source, property.key );
            };

            //If there was a parentUid that means we are loading remote inbox tab then
            // we need to get user for inbox need to be laoded and add it to parentUid
            if( searchContext.criteria.parentUid ) {
                var ctx = appCtxService.ctx;
                var userId =  ctx.userSession.props.user.dbValues[0];
                //If the userId parameter is set
                if( $state.params.userId ) {
                    userId = $state.params.userId;
                }
                searchContext.criteria.parentUid = userId;
            }

            //If the userId parameter is set
            if( $state.params.userId ) {
                //(Try to) load the user
                return dms.getPropertiesUnchecked( [ {
                        uid: $state.params.userId,
                        type: ''
                    } ], [ 'user_id', 'object_string' ] ) //
                    .then( function() {
                        return cdm.getObject( $state.params.userId );
                    } ) //
                    .then( function( user ) {
                        //If user exists
                        if( user ) {
                            //Update the header and search context
                            return getHeaderTitle().then( function( baseTitle ) {
                                //Get the current context
                                var ctx = appCtxService.getCtx( 'location.titles' );

                                //Update title
                                ctx.headerTitle = baseTitle + ': ' + user.props.object_string.uiValues[ 0 ];
                                appCtxService.updateCtx( 'location.titles', ctx );

                                //And update the context
                                searchContext.criteria.userId = user.props.user_id.dbValues[ 0 ];
                                return searchContext;
                            } );
                        }
                        return searchContext;
                    } );
            }
            //If there was a userId
            if( searchContext.criteria.userId ) {
                //Clear the criteria and reset the location title
                delete searchContext.criteria.userId;
                return getHeaderTitle().then( function( baseTitle ) {
                    var ctx = appCtxService.getCtx( 'location.titles' );
                    ctx.headerTitle = baseTitle;
                    appCtxService.updateCtx( 'location.titles', ctx );
                    return searchContext;
                } );
            }
            return $q.when( searchContext );
        };

        /**
         * This function will unregister the variable isPanelOpened when we leave the sublocation
         */
        $scope.$on( '$destroy', function() {
            delete $scope.ctx.isPanelOpened;
        } );
    }
] );
