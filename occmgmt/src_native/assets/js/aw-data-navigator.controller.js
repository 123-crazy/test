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
 * // * Defines the {@link NgControllers.DataNavigatorCtrl}
 *
 * @module js/aw-data-navigator.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import 'js/selection.service';
import 'js/aw.navigator.controller';
import 'js/occmgmtVisibility.service';
import 'js/backgroundWorkingContextService';
import 'js/occmgmtUpdatePwaDisplayService';
import 'soa/kernel/soaService';
import 'js/contextStateMgmtService';
import 'js/occmgmtUtils';
import 'js/editHandlerService';
import 'js/awDataNavigatorService';
import 'js/acePartialSelectionService';

'use strict';

//eslint-disable-next-line valid-jsdoc
/**
 * Data Navigation controller.
 *
 * @class DataNavigatorCtrl
 * @memberOf NgControllers
 */
app.controller( 'DataNavigatorCtrl', [
    '$scope',
    '$controller',
    'appCtxService',
    'soa_kernel_clientDataModel',
    'contextStateMgmtService',
    'occmgmtUtils',
    'tcCommandVisibilityService',
    'awDataNavigatorService',
    'acePartialSelectionService',
    function DataNavigatorCtrl( $scope, $controller, appCtxSvc, cdm,
        ctxStateMgmtService, occmgmtUtils, tcCommandVisibilityService, awDataNavigatorService, acePartialSelectionService ) {
        var self = this;

        ngModule.extend( self, $controller( 'NavigatorCtrl', {
            $scope: $scope
        } ) );

        $scope.ctx = appCtxSvc.ctx;

        appCtxSvc.updatePartialCtx( $scope.contextKey + '.pwaSelectionModel', $scope.pwaSelectionModel );

        /**
         * {EventSubscriptionArray} Collection of eventBuss subscriptions to be removed when the
         * controller is destroyed.
         */
        var _eventSubDefs = [];

        /**
         * Hide base selection initially - wait until getOcc is complete
         */
        $scope.showBaseSelection = false;

        /**
         * {Function} Cached reference to the original 'updatePrimarySelection' function that was on the
         * $scope when the controller was created.
         */
        var _originalUpdatePrimarySelection;

        /**
         * updateBreadCrumbs
         *
         * @param {IModelObject} mo -
         */
        function _updateBreadCrumbs( mo ) {
            eventBus.publish( $scope.breadcrumbConfig.vm + '.refresh', {
                id: $scope.breadcrumbConfig.id,
                lastSelectedObject: mo
            } );
        }

        /**
         * Overriding updatePrimarySelection to do post processing.
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selections - The new selections
         */
        function _occUpdatePrimarySelection( selections ) {
            //Try to pull all objects in selection model from cdm instead of just the objects in current data provider
            var actualSelection = $scope.pwaSelectionModel.getSelection().map( function( uid ) {
                    return cdm.getObject( uid );
                } )
                //Ignore selected model objects that have been unloaded
                .filter( function( mo ) {
                    return mo;
                } );

            _originalUpdatePrimarySelection( actualSelection );

            if ( acePartialSelectionService.doesContainHiddenPackedSelection() && _.isEmpty( selections ) ) {
                selections = actualSelection;
            }

            var lastSelection = null;

            if( !_.isEmpty( selections ) ) {
                lastSelection = selections[ selections.length - 1 ];
            } else {
                lastSelection = $scope.baseSelection;
            }

            //lastSelection could be ViewModelObject or ViewModelTreeNode. BreadCrumb needs IModelObject and its properties.
            var lastSelectedObject = cdm.getObject( lastSelection.uid );

            //Should be done by overriding the buildNavigateBreadcrumb method - see object nav controller
            _updateBreadCrumbs( lastSelectedObject );

            //This is needed for URL refresh case
            var productInfo = awDataNavigatorService.getProductInfoForCurrentSelection( lastSelectedObject, $scope.contextKey );

            awDataNavigatorService.syncRootElementInfoForProvidedSelection( productInfo, $scope.contextKey );

            var newState = {};
            _syncPCIOnSelectionChangeAndNotifyProductChangeIfApplicable( productInfo, newState );
            if( newState.pci_uid ) {
                ctxStateMgmtService.updateContextState( $scope.contextKey, newState, true );
            }
        } // _occUpdatePrimarySelection

        /**
         * Add/Remove $state URL parameters (if necessary) based upon the given selection set.
         *
         * @param {StringArray} selectedUids -
         * @param {StringMap} newState - The current $state URL parameters that should be used/updated.
         */
        self._occUpdateStateForSelection = function( selectedUids, newState ) {
            if( !_.isEmpty( selectedUids ) ) {
                /**
                 * Attempt to locate the single selection object
                 */
                var selObj = cdm.getObject( selectedUids[ selectedUids.length - 1 ] );

                if( selObj ) {
                    /**
                     * Set the 'o_uid' to the selected object's immediate parent if one exists
                     */
                    var parentObj = occmgmtUtils.getParentUid( selObj );
                    if( parentObj ) {
                        newState.o_uid = parentObj;
                    } else if( appCtxSvc.ctx[ $scope.contextKey ].currentState.c_uid !== newState.c_uid ) {
                        newState.o_uid = selObj.uid;
                    }
                }
            }
            _syncRootElementAndPCIOnSelectionChange( newState );
        };

        /**
         * @param {Object} productInfo - Structure containing pci and rootElement info of current active product
         */
        function _syncPCIOnSelectionChangeAndNotifyProductChangeIfApplicable( productInfo, newState ) {
            // We are not triggering either tree reload or pwa.reset for change in pci_uid
            // so make sure it has actually changed and then fire updatePartialCtx
            var currentPci_Uid = appCtxSvc.ctx[ $scope.contextKey ].currentState.pci_uid;
            if( productInfo && productInfo.newPci_uid && productInfo.newPci_uid !== currentPci_Uid ) {
                if( newState ) {
                    newState.pci_uid = productInfo.newPci_uid;
                }
                appCtxSvc.updatePartialCtx( $scope.contextKey + '.productContextInfo', cdm
                    .getObject( productInfo.newPci_uid ) );
                var occDataLoadedEventData = {
                    dataProviderActionType: 'productChangedOnSelectionChange'
                };
                eventBus.publish( 'occDataLoadedEvent', occDataLoadedEventData );

                var productChangedEventData = {
                    newProductContextUID: productInfo.newPci_uid
                };
                eventBus.publish( 'ace.productChangedEvent', productChangedEventData );
            }
        }

        /**
         * @param {StringMap} newState - The current $state URL parameters that should be used/updated.
         */
        function _syncRootElementAndPCIOnSelectionChange( newState ) {
            var currentSelectedObject = cdm.getObject( newState.c_uid );
            var productInfo = awDataNavigatorService.getProductInfoForCurrentSelection( currentSelectedObject, $scope.contextKey );

            awDataNavigatorService.syncRootElementInfoForProvidedSelection( productInfo, $scope.contextKey );
            _syncPCIOnSelectionChangeAndNotifyProductChangeIfApplicable( productInfo, newState );
        }

        /**
         * Register any event listeners necessary and unregister on destroy
         */
        function _setupEventListeners() {
            _eventSubDefs.push( eventBus.subscribe( 'appCtx.update', function( eventData ) {
                if( eventData.name === $scope.contextKey && eventData.target === 'openedElement' ) {
                    $scope.$evalAsync( function() {
                        $scope.showBaseSelection = true;
                    } );
                }
            } ) );

            //Force PWA selection to change when this event is fired.
            _eventSubDefs.push( eventBus.subscribe( 'aceElementsSelectionUpdatedEvent',
                function( event ) {
                    var viewToReact = event.viewToReact ? event.viewToReact : appCtxSvc.ctx.aceActiveContext.key;
                    if( $scope.contextKey === viewToReact ) {
                        //Select the objects provided by the event
                        $scope._pendingSelection = true;
                        $scope.pwaSelectionModel.setSelection( event.objectsToSelect );

                        // Process partial selection if any
                        if( event.objectsToHighlight ) {
                            acePartialSelectionService.setPartialSelection( event.objectsToSelect, event.objectsToHighlight );
                            if( acePartialSelectionService.doesContainPartialSelections( event.objectsToSelect ) ) {
                                _occUpdatePrimarySelection( event.objectsToSelect );
                            }
                        }
                        $scope.$evalAsync();
                    }
                } ) );

            //Fired when a presenter wants to deselect certain elements in the primary work area
            _eventSubDefs.push( eventBus.subscribe( 'aceElementsDeSelectedEvent', function( event ) {
                if( event.elementsToDeselect && event.elementsToDeselect.length > 0 ) {
                    var viewToReact = event.viewToReact ? event.viewToReact : appCtxSvc.ctx.aceActiveContext.key;
                    if( $scope.contextKey === viewToReact ) {
                        //Remove any matching objects from the model object list
                        appCtxSvc.ctx[ $scope.contextKey ].silentSelection = event ? event.silentSelection : false;
                        $scope._pendingSelection = true;
                        $scope.pwaSelectionModel.removeFromSelection( event.elementsToDeselect );
                        $scope.$evalAsync();
                    }
                }
            } ) );

            //Fired when a presenter wants to select certain elements in the primary work area
            _eventSubDefs.push( eventBus.subscribe( 'aceElementsSelectedEvent', function( event ) {
                var viewToReact = event.viewToReact ? event.viewToReact : appCtxSvc.ctx.aceActiveContext.key;
                if( $scope.contextKey === viewToReact ) {
                    appCtxSvc.ctx[ $scope.contextKey ].silentSelection = event ? event.silentSelection : false;
                    $scope._pendingSelection = true;
                    if( $scope.pwaSelectionModel.getCurrentSelectedCount() > 1 || $scope.pwaSelectionModel.multiSelectEnabled ) {
                        $scope.pwaSelectionModel.addToSelection( event.elementsToSelect );
                    } else {
                        $scope.pwaSelectionModel.setSelection( event.elementsToSelect );
                    }
                    $scope.$evalAsync();
                }
            } ) );

            //Fired when a presenter wants to select certain elements in the primary work area
            _eventSubDefs.push( eventBus.subscribe( 'focusOnElementsEvent', function( event ) {
                var viewToReact = event.viewToReact ? event.viewToReact : appCtxSvc.ctx.aceActiveContext.key;
                if( $scope.contextKey === viewToReact ) {
                    $scope._pendingSelection = true;
                    if( event.cloneStableIdChains && event.cloneStableIdChains.length === 1 ) {
                        ctxStateMgmtService.updateContextState( $scope.contextKey, {
                            c_csid: event.cloneStableIdChains
                        }, true );
                    } else if( event.elementsToFocus ) {
                        //Select the objects provided by the event
                        $scope.pwaSelectionModel.addToSelection( event.elementsToFocus );
                    }
                    $scope.$evalAsync();
                }
            } ) );

            _eventSubDefs.push( eventBus.subscribe( 'awDataNavigator.reset', function( data ) {
                var viewToReset = data && data.viewToReset ? data.viewToReset : appCtxSvc.ctx.aceActiveContext.key;
                if( $scope.contextKey === viewToReset ) {
                    if( occmgmtUtils.isTreeView() && data && data.retainTreeExpansionStates === false && appCtxSvc.ctx[ $scope.contextKey ].vmc ) {
                        eventBus.publish( appCtxSvc.ctx[ $scope.contextKey ].vmc.name + '.resetState' );
                    }
                    appCtxSvc.ctx[ $scope.contextKey ].silentReload = data ? data.silentReload : false;
                    $scope.$broadcast( 'awDataNavigator.reset' );
                }
            } ) );
        } // _setupEventListeners

        var silentlyUpdateStateForSingleSelection = function( newlySelected, newState ) {
            if( newlySelected.length <= 1 ) {
                ctxStateMgmtService.syncContextState( $scope.contextKey, newState );
            }
        };

        var induceFocusActionForMultipleSelections = function( newlySelected, newState ) {
            if( newlySelected.length > 1 ) {
                ctxStateMgmtService.updateContextState( $scope.contextKey, newState, true );
            }
        };

        /**
         * Handler when selection in the primary workarea changes
         *
         * @param {String[]} selection - The list of selected uids
         * @param {StringArray} oldSelection - The list of previously selected uids
         */
        $scope.onPWASelectionChange = function( selection, oldSelection ) {
            var newState = {};

            // update the partial selection on removed selections
            acePartialSelectionService.removePartialSelection( selection, oldSelection );

            //If a single object is selected update c_uid
            if( selection.length === 1 ) {
                newState[ $scope.selectionQueryParamKey ] = selection[ 0 ];
            } else if( selection.length === 0 ) {
                //If nothing is selected use base selection
                newState[ $scope.selectionQueryParamKey ] = awDataNavigatorService.getParentUid( { view: $scope.viewConfig.view, contextKey: $scope.contextKey } );
            } else {
                //If multiple objects selected use last selection
                var lastSelection = selection.slice( -1 )[ 0 ];
                newState[ $scope.selectionQueryParamKey ] = lastSelection;
            }
            //Otherwise leave c_uid as it is

            //Add additional info into new params
            self._occUpdateStateForSelection( selection, newState );

            var newlySelected = selection.filter( function( x ) {
                return oldSelection.indexOf( x ) === -1;
            } );

            silentlyUpdateStateForSingleSelection( newlySelected, newState );
            induceFocusActionForMultipleSelections( newlySelected, newState );
            if( !appCtxSvc.ctx[ $scope.contextKey ].silentSelection ) {
                ctxStateMgmtService.updateActiveContext( $scope.contextKey );
            } else {
                delete appCtxSvc.ctx[ $scope.contextKey ].silentSelection;
            }
        };

        // When something wants to select all or select none to primary workarea
        _eventSubDefs.push( eventBus.subscribe( 'primaryWorkarea.selectActionForAce', function(
            eventData ) {
            if( $scope.contextKey === appCtxSvc.ctx.aceActiveContext.key ) {
                $scope.$broadcast( 'awDataProvider.selectAction', eventData );
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'primaryWorkarea.multiSelectActionForAce', function(
            eventData ) {
            if( $scope.contextKey === appCtxSvc.ctx.aceActiveContext.key ) {
                $scope.$broadcast( 'dataProvider.multiSelectAction', {
                    multiSelect: eventData.multiSelect
                } );
                $scope.pwaContext.showCheckBox = eventData.multiSelect;
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'ace.activateWindow', function( eventData ) {
            if( appCtxSvc.ctx.aceActiveContext.key !== eventData.key && eventData.key === $scope.contextKey ) {
                ctxStateMgmtService.updateActiveContext( eventData.key );
            }
            if( eventData.key === $scope.contextKey ) {
                var selectionsToUpdate = $scope.pwaSelectionModel.getSelection().map( function( uid ) {
                    return cdm.getObject( uid );
                } )
                    //Fix for LCS-713656 - Ignore selected model objects that are not loaded
                    .filter( function( mo ) {
                        return mo;
                    } );
                $scope.updatePrimarySelection( selectionsToUpdate );
                if( $scope.secondarySelection && $scope.secondarySelection.length > 0 ) {
                    $scope.updateSecondarySelection( $scope.secondarySelection );
                }
            }
        } ) );

        //Remove listeners on destroy
        $scope.$on( '$destroy', function() {
            delete appCtxSvc.ctx[ 'ActiveWorkspace:xrtContext' ];
            _.forEach( _eventSubDefs, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );
        } );

        /**
         * Overriding $scope's 'updatePrimarySelection' to do post processing.
         */
        _originalUpdatePrimarySelection = $scope.updatePrimarySelection;

        $scope.updatePrimarySelection = _occUpdatePrimarySelection;

        _setupEventListeners();
    }
] );
