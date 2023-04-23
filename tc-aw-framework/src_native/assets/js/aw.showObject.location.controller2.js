// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.ShowObjectLocationCtrl}
 *
 * @module js/aw.showObject.location.controller2
 */
import * as app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/aw-showobject-page.directive';
import 'js/aw-include.directive';
import 'soa/kernel/propertyPolicyService';
import 'soa/kernel/clientDataModel';
import 'soa/dataManagementService';
import 'js/appCtxService';
import 'js/localeService';
import 'js/contribution.service';
import 'js/viewModelObjectService';
import 'js/xrtParser.service';
import 'js/command.service';
import 'js/editHandlerService';
import 'js/typeDisplayName.service';
import 'js/keyboardService';
import 'js/viewMode.service';
import 'js/aw-xrt-sublocation.directive';
import 'js/aw-showobject-header.directive';
import { updateRedlineProps } from 'js/Awp0ShowSaveAsService';

/**
 * Show object location controller. Dynamically creates tabs and presenter based on the XRT for the given uid.
 *
 * @class ShowObjectLocationCtrl
 * @memberOf NgControllers
 */
app.controller( 'ShowObjectLocationCtrl2', [
    '$scope',
    '$state',
    '$timeout',
    '$q',
    'soa_kernel_propertyPolicyService',
    'soa_kernel_clientDataModel',
    'soa_dataManagementService',
    'appCtxService',
    'localeService',
    'contributionService',
    'viewModelObjectService',
    'xrtParserService',
    'commandService',
    'editHandlerService',
    'typeDisplayNameService',
    'keyboardService',
    'viewModeService',
    function( $scope, $state, $timeout, $q, propertyPolicyService, clientDataModel,
        dataManagementService, appCtxService, localeService, contributionService, viewModelObjectSvc,
        xrtParserService, commandService, editHandlerService, typeDisplayNameSvc, keyboardSvc,
        viewModeSvc ) {
        var ctrl = this;

        /**
         * The id of the context for the location
         *
         * @private
         * @member _locationContext
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var _locationContext = 'locationContext';

        /**
         * Contexts that should be cleared when the sublocation is removed
         *
         * @private
         * @member _contextsToClear
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var _contextsToClear = [ 'activeToolsAndInfoCommand', 'activeNavigationCommand',
            _locationContext, 'xrtPageContext', 'objectSetDefaultSelection'
        ];

        /**
         * Static XRT commands that should be active when the view model is visible.
         *
         * @private
         * @member _staticXrtCommandIds
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits',
            'Awp0CancelEdits'
        ];

        /**
         * The currently active parameters. Used to determine how the page refreshes.
         *
         * @private
         * @member _activeParams
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var _activeParams = {};

        /**
         * The context for this location. Primarily used as part of the input when loading stylesheets.
         *
         * @member context
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.context = 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation';

        /**
         * The tabs (sublocations) for the current model object
         *
         * @member subLocationTabs
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.subLocationTabs = [];

        /**
         * The tab that is currently active. Used to verify that the correct tab is selected when url
         * parameters change.
         *
         * @member activeTab
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.activeTab = null;

        /**
         * The model object that is currently opened.
         *
         * @member modelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.modelObject = null;

        /**
         * The alternative object to use as base selection
         *
         * @member _alternativeModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope._alternativeModelObject = null;

        /**
         * View model object version of the model object that is currently opened.
         *
         * @member viewModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.viewModelObject = null;

        /**
         * Data provider for show object sublocation
         *
         * @member showObjectProvider
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.showObjectProvider = {
            clientScopeURI: 'Awp0ShowObject',
            nameToken: 'com.siemens.splm.clientfx.tcui.xrt.showObjectSubLocation',
            name: 'showObject'
        };

        /**
         * Utility to destroy previous xrt view model and update
         */
        var setXrtViewModel = function( newViewModel ) {
            if( $scope.xrtViewModel ) {
                $scope.xrtViewModel.destroy();
            }
            $scope.xrtViewModel = newViewModel;
        };

        /**
         * GWT does not support parameters that are not strings currently so merge the array parameter
         * into a string with the format GWT expects before sending it allows the array typed parameter
         * cmdArg to work without making major changes to GWT code
         */
        var handleCmdArg = function() {
            //GWT does not support parameters that are not strings currently
            //so merge the array parameter into a string with the format GWT expects before sending it
            //allows the array typed parameter cmdArg to work without making major changes to GWT code
            if( $state.params.cmdArg && _.isArray( $state.params.cmdArg ) ) {
                $state.params.cmdArg = $state.params.cmdArg.join( '&' );
            }
        };

        /**
         * Utility to update the sub panel context
         *
         * @private
         * @method updateSubPanelContext
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var updateSubPanelContext = function() {
            $scope.subPanelContext = {
                defaultSelections: $scope.defaultSelections,
                //Override the model object if an alternative object was provider
                modelObject: $scope._alternativeModelObject ? $scope._alternativeModelObject : $scope.viewModelObject,
                params: $state.params
            };
        };

        /**
         * Utility to update ViewModelObject
         *
         * @private
         * @param modelObject {Object} - Model object used to update ViewModelObject
         *
         * @method updateViewModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var updateViewModelObject = function( modelObject ) {
            if( modelObject ) {
                //Update viewModelObject if already existing
                if( $scope.viewModelObject && $scope.viewModelObject.uid === modelObject.uid ) {
                    var updatedVmo = viewModelObjectSvc.createViewModelObject( modelObject, null );
                    viewModelObjectSvc.updateSourceObjectPropertiesByViewModelObject( updatedVmo, [ $scope.viewModelObject ] );
                } else {
                    $scope.viewModelObject = viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject, null );
                }
            } else {
                $scope.viewModelObject = null;
            }
        };

        /**
         * Utility for setting model object on scope and updating context
         *
         * @private
         *
         * @param modelObject {Object} - Model object to set
         *
         * @method setModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var setModelObject = function( modelObject ) {
            //Set the model object
            $scope.modelObject = modelObject;
            //Clear the alternate
            $scope._alternativeModelObject = null;
            //Update ViewModelObject
            updateViewModelObject( $scope.modelObject );
            //Update the context
            var locationCtx = appCtxService.getCtx( _locationContext );
            locationCtx.modelObject = $scope.modelObject;
            appCtxService.updateCtx( _locationContext, locationCtx );
            updateSubPanelContext();
        };

        /**
         * Utility to update display name based on the current model object.
         *
         * @private
         * @method updateHeaderTitle
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var updateHeaderTitle = function() {
            updateViewModelObject( $scope.modelObject );
            if( $scope.headerProperties ) {
                for( const propConfig of $scope.headerProperties ) {
                    const propertyName = propConfig.property.propertyName;
                    propConfig.property = $scope.viewModelObject.props[propertyName];
                }
            }
            var objectDisplayName = ctrl.getDisplayName( $scope.modelObject );
            $scope.headerTitle = objectDisplayName;
            $scope.browserSubTitle = objectDisplayName;
            //Update view model object
            $scope.headerViewModel = $scope.viewModelObject;
        };

        /**
         * Synchronize the current view with the current state
         *
         * @method synchronizeState
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var synchronizeState = function() {
            handleCmdArg();

            //Get which parameters have changed
            var changedParams = {};
            for( var i in $state.params ) {
                if( $state.params[ i ] !== _activeParams[ i ] ) {
                    changedParams[ i ] = $state.params[ i ];
                }
            }
            logger.trace( changedParams );

            //If the uid changes refresh the whole page
            if( changedParams.hasOwnProperty( 'uid' ) ) {
                ctrl.openNewModelObject( $state.params.uid );
            } else {
                //If the page parameter and the wrong page is selected switch to correct tab
                if(  changedParams.hasOwnProperty( 'page' ) || changedParams.hasOwnProperty( 'pageId' )  ) {
                    ctrl.selectTab();
                }
            }

            _activeParams = ngModule.copy( $state.params );
            updateSubPanelContext();
        };

        /**
         * Register/unregister the property policies for the static sublocations.
         *
         * @private
         *
         * @param propertyPolicies {Object[]} - Policies to register/unregister on destroy
         *
         * @method handleObjectPropertyPolicies
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleObjectPropertyPolicies = function( propertyPolicies ) {
            var activePropertyPolicies = [];

            //Register the required property policies
            propertyPolicies.forEach( function( policy ) {
                if( policy ) {
                    activePropertyPolicies.push( propertyPolicyService.register( policy ) );
                }
            } );

            //Unregister the property policies on destroy
            $scope.$on( '$destroy', function() {
                activePropertyPolicies.forEach( function( propertyPolicyId ) {
                    propertyPolicyService.unregister( propertyPolicyId );
                } );
            } );
        };

        /**
         * If the object that is currently loaded is deleted clear the location
         *
         * @private
         * @method handleObjectDeletedListener
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleObjectDeletedListener = function() {
            //Add an object deleted listener
            var onObjectsDeletedListener = eventBus.subscribe( 'cdm.deleted', function( data ) {
                if( data.deletedObjectUids && data.deletedObjectUids.length > 0 ) {
                    data.deletedObjectUids.forEach( function( uid ) {
                        if( uid === $state.params.uid ) {
                            $scope.$evalAsync( function() {
                                setModelObject( null );
                                ctrl.refreshModelObject();
                            } );
                        }
                    } );
                }
            } );

            //And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( onObjectsDeletedListener );
            } );
        };

        /**
         * If the object currently loaded is modified update the title
         *
         * @private
         * @method handleObjectsModifiedListener
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleObjectsModifiedListener = function() {
            //Add listener
            var onObjectsModifiedListener = eventBus.subscribe( 'cdm.modified', function( data ) {
                if( data.modifiedObjects && data.modifiedObjects.length > 0 ) {
                    data.modifiedObjects.forEach( function( mo ) {
                        if( mo.uid === $state.params.uid ) {
                            $scope.$evalAsync( updateHeaderTitle );
                        }
                    } );
                }
            } );

            //And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( onObjectsModifiedListener );
            } );
        };

        /**
         * If the object currently loaded is modified refresh the location if necessary
         *
         * @private
         * @method handleModelObjectRelatedDataModifiedListener
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleModelObjectRelatedDataModifiedListener = function() {
            //Add listener
            //TODO: Ideally this would listen for "cdm.relatedModified" instead of a GWT based event
            //It appears that "ModelObjectRelatedDataModifiedEvent" is manually fired in GWT code, so that may not work
            var listener = eventBus.subscribe( 'cdm.relatedModified', function( data ) {
                var matches = data.relatedModified.filter( function( mo ) {
                    return mo.uid === $state.params.uid;
                } );

                //If location should reload for the current model object
                if( data.refreshLocationFlag && matches.length ) {
                    //Then reload
                    ctrl.refreshModelObject();
                }
            } );

            //And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( listener );
            } );
        };

        //TODO: CreateOrAddObjectCompleteEvent listener does not appear to be necessary - handled by ModelObjectRelatedDataModifiedEvent instead

        /**
         * When new objects are created set the default selection to those objects
         *
         * @private
         * @method handleCreateOrAddObjectCompleteListener
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleLocationModelObjectChangeListener = function() {
            //When something updates the model object in the location context
            var locationModelObjectChangeListener = eventBus.subscribe( 'appCtx.update',
                function( data ) {
                    if( data.name === 'editInProgress' && data.value === true ) {
                        updateRedlineProps();
                    }
                    if( data.name === _locationContext && data.target === 'modelObject' ) {
                        $scope.$evalAsync( function() {
                            //Use that model object as the base selection instead
                            //Only updates the base selection - not the current model object
                            $scope._alternativeModelObject = data.value[ _locationContext ].modelObject;
                            updateSubPanelContext();
                        } );
                    }
                } );

            //And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( locationModelObjectChangeListener );
            } );
        };

        /**
         * Get the display name for a model object
         *
         * @private
         *
         * @param modelObject {Object} - Model object to get display name for
         *
         * @method getDisplayName
         * @memberOf NgControllers.ShowObjectLocationCtrl
         * @return {String} Display name to use
         */
        ctrl.getDisplayName = function( modelObject ) {
            return typeDisplayNameSvc.getDisplayName( modelObject );
        };

        /**
         * Check if there are any URL commands to run and run them
         *
         * @method checkUrlCommand
         * @memberOf NgControllers.ShowObjectLocationCtrl
         * @return {Promise} A promise resolved once the command has started
         */
        ctrl.checkUrlCommand = function() {
            handleCmdArg();

            if( $state.params.cmdId ) {
                return commandService
                    .executeCommand( $state.params.cmdId, $state.params.cmdArg, $scope )
                    //Log error or success message
                    .then(
                        function() {
                            logger.trace( 'Executed command: ' + $state.params.cmdId + ' with args ' +
                                $state.params.cmdArg + ' from url' );
                        },
                        function( errorMessage ) {
                            logger.error( errorMessage );
                        } )
                    //clear cmdId and cmdArg
                    .then( function() {
                        return $state.go( '.', {
                            cmdId: null,
                            cmdArg: null
                        }, {
                            location: 'replace'
                        } );
                    } );
            }
        };

        /**
         * Check if the page should enter edit mode
         *
         * @method checkEdit
         * @memberOf NgControllers.ShowObjectLocationCtrl
         * @return {Promise} A promise resolved once the edit has started
         */
        ctrl.checkEdit = function() {
            if( $state.params.edit === 'true' ) {
                var eh = editHandlerService.getActiveEditHandler();
                if( eh && eh.canStartEdit() ) {
                    return eh.startEdit();
                }
            }
            return $q.resolve();
        };

        /**
         * Get the index of the tab that should be selected based on the page and pageId parameters.
         * Will clear the page and pageId parameters if the page is not found.
         *
         * @method getMatchingTabIndex
         * @memberOf NgControllers.ShowObjectLocationCtrl
         *
         * @param pageId {String} - Page id to search for
         * @param page {String} - Page name to search for
         * @param subLocationTabs {Object[]} - Tab objects to search
         *
         * @return {Number} The index of the tab that should be selected. -1 if no valid tabs.
         */
        ctrl.getMatchingTabIndex = function( pageId, page, subLocationTabs ) {
            //If there is a page parameter
            if( pageId || page ) {
                //Try to find that page
                var matchingPages = subLocationTabs.filter( function( tab ) {
                    return  pageId && tab.id === pageId  ||  page && tab.name === page;
                } );
                if( matchingPages.length > 0 ) {
                    return subLocationTabs.indexOf( matchingPages[ 0 ] );
                }

                //If the page was not a valid page clear the state parameter
                $state.go( '.', {
                    page: null,
                    pageId: null
                }, {
                    location: 'replace'
                } );
            }

            //If page not set or not found return the first tab that can be default
            var potentialDefaults = subLocationTabs.filter( function( t ) {
                //canBeDefault default is true
                return t.canBeDefault !== false;
            } );

            //-1 if no valid tab found
            return potentialDefaults.length > 0 ? subLocationTabs.indexOf( potentialDefaults[ 0 ] ) : -1;
        };

        /**
         * Select that tab that is meant to be selected according to $state parameters. Debounced to
         * support quick tab navigation.
         *
         * @method selectTab
         * @memberOf NgControllers.ShowObjectLocationCtrl
         *
         * @param {Boolean} haveCheckedSelectedTab Flag to prevent infinite recursion
         */
        ctrl.selectTab = function( haveCheckedSelectedTab ) {
            //Get the tab that should be selected
            var tabId = ctrl.getMatchingTabIndex( $state.params.pageId, $state.params.page,
                $scope.subLocationTabs );

            //If no tabs are valid force selection of first tab
            tabId = tabId === -1 ? 0 : tabId;

            var tabToSelect = $scope.subLocationTabs[ tabId ];

            //Ensure the correct tab appears as selected
            if( !tabToSelect.selectedTab ) {
                $scope.$broadcast( 'NgTabSelectionUpdate', tabToSelect );
            }

            if( tabToSelect.id ) {
                // Update the context with primary XRT page ID.
                appCtxService.updateCtx( 'xrtPageContext', {
                    primaryXrtPageID: tabToSelect.id
                } );
            }

            //And update the view
            $scope.activeTab = tabToSelect;

            /**
             * Trigger getDeclarativeStyleSheets and build viewModel if its XRT tab
             */
            if( $scope.activeTab && !$scope.activeTab.view ) {
                //Update provider
                $scope.showObjectProvider.label = $scope.activeTab.name;

                //If the page that is selected is same as active tab do not reload view model
                if( !$scope.xrtViewModel ||
                    $scope.xrtViewModel.renderedPage !== $scope.activeTab.page ) {
                    //Make a function scoped copy to check once server call returns
                    var tabKey = $scope.activeTab.tabKey;
                    var modelObject = $scope.modelObject;

                    //Hide view and reveal once complete (same as GWT)
                    setXrtViewModel( null );

                    //Set sublocation context before loading XRT
                    appCtxService.registerCtx( _locationContext, {
                        'ActiveWorkspace:Location': $scope.context,
                        'ActiveWorkspace:SubLocation': $scope.showObjectProvider.name
                    } );

                    //Get a view model containing data for a single page
                    xrtParserService.getXrtViewModel( 'SUMMARY', tabKey, modelObject,
                        _staticXrtCommandIds ).then(
                        function( xrtViewModel ) {
                            if( $scope.activeTab.tabKey !== tabKey ||
                                $scope.modelObject !== modelObject ) {
                                //If the tabKey or model object has changed while xrt is loading ignore the new data
                            } else {
                                //Hide the loading message
                                $scope.loading = false;

                                //Ensure alternative object is reset
                                setModelObject( $scope.modelObject );

                                //Update view
                                setXrtViewModel( xrtViewModel );

                                $scope.headerViewModel = $scope.viewModelObject;

                                //Update the data passed to sublocation
                                updateSubPanelContext();

                                //Get the contributed sublocations that should be visible
                                var visibleContributedSubLocations = $scope.contributedSubLocations
                                    .filter( function( subLoc ) {
                                        //Evaluate whether the tab should be visible for this model object
                                        if( subLoc.visibleWhen ) {
                                            return subLoc.visibleWhen( $scope.modelObject );
                                        }
                                        return true;
                                    } );

                                //Get the XRT pages
                                var visiblePages = xrtParserService
                                    .getDeclVisiblePages( xrtViewModel.viewModel );

                                //Build tabs for any sublocation that should be visible
                                ctrl.buildSublocationTabs( visibleContributedSubLocations, visiblePages ).then(
                                    function( result ) {
                                        $scope.subLocationTabs = result;
                                        var newActiveTab = result.filter( function( nxt ) {
                                            return nxt.id === $scope.activeTab.id;
                                        } )[ 0 ];
                                        //if the tab that was clicked is not valid
                                        if( !newActiveTab ) {
                                            //prevent potential infinite loop when no valid tabs
                                            if( !haveCheckedSelectedTab ) {
                                                //redo the tab selection logic
                                                ctrl.selectTab( true );
                                            }
                                        } else {
                                            //Replace the previous active tab and mark as selected
                                            $scope.activeTab = newActiveTab;
                                            $scope.activeTab.selectedTab = true;
                                        }
                                    } );

                                //Allow the event queue to clear and check if command or edit is necessary
                                $timeout() //
                                    .then( ctrl.checkUrlCommand ) //
                                    .then( ctrl.checkEdit );
                            }
                        } );
                } else {
                    //Allow the event queue to clear and check URL again
                    $timeout() //
                        .then( ctrl.checkUrlCommand ) //
                        .then( ctrl.checkEdit );
                }
            } else {
                // setting XrtViewModel to null for contributed tabs
                setXrtViewModel( null );

                //Ensure alternative object is reset
                setModelObject( $scope.modelObject );

                //Allow the event queue to clear and check URL again
                $timeout() //
                    .then( ctrl.checkEdit );
            }
        };

        /**
         * Open a new model object. Debounced for when users want to go crazy with back button.
         *
         * @method openModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         * @param uid {String} - UID of the objec to open
         */
        ctrl.openNewModelObject = function( uid ) {
            if( this.promise ) {
                $timeout.cancel( this.promise );
            }
            this.promise = $timeout(
                function() {
                    if( uid ) {
                        //The model object is about to change so remove active model object from parent selection
                        if( $scope.modelObject ) {
                            logger.trace( 'Removing ' + $scope.modelObject.uid +
                                ' from parent selection' );
                            propertyPolicyService.removeFromParentSelection( $scope.modelObject.uid );
                        }
                        //Reevaluate 'RedLineMode' each time we open object
                        appCtxService.unRegisterCtx( 'isRedLineMode' );
                        //Get or load the object and refresh
                        var modelObject = clientDataModel.getObject( uid );
                        if( !modelObject ) {
                            var uidsToLoad = [ uid ];

                            //Performance improvement for Navigate page
                            //Instead of waiting for the sublocation to load before realizing that nested folders need to be loaded
                            //just ensure they are loaded here
                            //Eventually getStyleSheet could be modified so it "knows" to automatically return nested folders in this case
                            if( $state.params.d_uids ) {
                                uidsToLoad = uidsToLoad.concat( $state.params.d_uids.split( '^' ) );
                            }

                            dataManagementService.loadObjects( uidsToLoad ).then( function() {
                                setModelObject( clientDataModel.getObject( uid ) );
                                ctrl.refreshModelObject();
                            }, function() {
                                $scope.errorMessage = $scope.xrtMessages.FailureLoadingSummary;
                            } );
                        } else {
                            setModelObject( modelObject );
                            ctrl.refreshModelObject();
                        }
                    } else {
                        $scope.errorMessage = $scope.xrtMessages.uidParameterMissingInURL;
                    }
                }, 100 );
        };

        /**
         * Build the tabs to use in the sublocation
         *
         * @method buildSublocationTabs
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        ctrl.buildSublocationTabs = function( visibleContributedSubLocations, visiblePages ) {
            var loadPromises = [];
            var contributedTabs = null;
            var xrtTabs = null;

            //Make a tab for the contributed sublocations
            contributedTabs = visibleContributedSubLocations.map( function( subLoc, index ) {
                var newTab = {
                    canBeDefault: subLoc.canBeSelectedByDefault,
                    classValue: 'aw-base-tabTitle',
                    displayTab: true,
                    id: subLoc.id,
                    nameToken: subLoc.nameToken,
                    pageId: index,
                    //Priority is pre defined
                    priority: subLoc.priority,
                    selectedTab: false,
                    view: subLoc.pageNameToken,
                    visible: true
                };

                //Setting the label is async - may be object containing localization info
                var label = subLoc.label;
                if( typeof label === 'string' ) {
                    newTab.name = label;
                } else {
                    loadPromises.push( localeService.getLocalizedText(
                        app.getBaseUrlPath() + label.source, label.key ).then( function( result ) {
                        newTab.name = result;
                    } ) );
                }

                return newTab;
            } );

            //Only the contributed sublocations need to be sorted
            contributedTabs.sort( function( t1, t2 ) {
                return t1.priority - t2.priority;
            } );

            if( visiblePages ) {
                //Make a tab for xrt pages
                xrtTabs = visiblePages.map(
                        function( page, index ) {
                            var newTab = {
                                classValue: 'aw-base-tabTitle',
                                displayTab: true,
                                id: page.titleKey,
                                name: page.displayTitle,
                                pageId: index,
                                page: page,
                                selectedTab: false,
                                visible: true,
                                view: page.pageNameToken,
                                tabKey: page.titleKey
                            };

                            if( page.pageNameToken ) {
                                var matchingContributions = visibleContributedSubLocations
                                    .filter( function( p ) {
                                        return p.pageNameToken === page.pageNameToken;
                                    } );
                                if( matchingContributions.length === 0 ) {
                                    return newTab;
                                }
                                //Don't return anything if a matching contributed tab already exists
                            } else {
                                return newTab;
                            }
                        } )
                    //Remove XRT pages that didn't need a tab
                    .filter( function( t ) {
                        return t;
                    } );
            }

            var tabs = xrtTabs;

            if( contributedTabs ) {
                if( xrtTabs ) {
                    tabs = contributedTabs.concat( xrtTabs );
                } else {
                    tabs = contributedTabs;
                }
            }

            if( tabs ) {
                //Tab order sort order will be correct so set priority to index
                tabs = tabs.map( function( tab, idx ) {
                    tab.priority = idx;
                    return tab;
                } );
            }

            //Ensure the localized titles are loaded for contributed tabs
            return $q.all( loadPromises ).then( function() {
                return tabs;
            } );
        };

        /**
         * Refresh the location based on model object changes. Resets all $scope properties to the
         * default and rebuilds from the current model object.
         *
         * @method refreshModelObject
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        ctrl.refreshModelObject = function() {
            //Clear the sublocation context
            var locationCtx = appCtxService.getCtx( _locationContext );
            delete locationCtx[ 'ActiveWorkspace:SubLocation' ];
            appCtxService.updateCtx( _locationContext, locationCtx );

            //Set initial header title
            $scope.headerTitle = $scope.xrtMessages.ShowObjectLocationTitle;
            $scope.browserSubTitle = $scope.xrtMessages.ShowObjectLocationTitle;

            //Clear the tabs and active tab
            $scope.subLocationTabs = [];
            $scope.activeTab = null;

            //Clear the header properties
            $scope.headerProperties = null;

            //If the object is not set show error
            if( !$scope.modelObject ) {
                $scope.errorMessage = $scope.xrtMessages.objectNotFound;
            } else {
                //Update the display name
                updateHeaderTitle();

                //Add to parent selection
                logger.trace( 'Adding ' + $scope.modelObject.uid + ' to parent selection' );
                propertyPolicyService.addToParentSelection( $scope.modelObject.uid );

                //Show the loading message
                $scope.loading = true;

                var pageId = $state.params.pageId ? $state.params.pageId : $state.params.page;

                //Set showObject in SubLocation at initial Summary page load
                if( locationCtx[ 'ActiveWorkspace:Location' ] === $scope.context && !locationCtx[ 'ActiveWorkspace:SubLocation' ] ) {
                    locationCtx[ 'ActiveWorkspace:SubLocation' ] = $scope.showObjectProvider.name;
                    appCtxService.updateCtx( _locationContext, locationCtx );
                }

                //Get a view model containing data for a single page
                xrtParserService.getXrtViewModel( 'SUMMARY', pageId, $scope.modelObject,
                    _staticXrtCommandIds ).then(
                    function( xrtViewModel ) {
                        //Hide the loading message
                        $scope.loading = false;

                        //Update view
                        setXrtViewModel( xrtViewModel );

                        setModelObject( $scope.modelObject );

                        $scope.headerViewModel = $scope.viewModelObject;

                        //Add the header properties to the header
                        var headerProps = xrtParserService
                            .getDeclHeaderProperties( xrtViewModel.viewModel );
                        $scope.headerProperties = headerProps ? headerProps.filter(
                            function( headerProp ) {
                                return headerProp.prop;
                            } ).map( function( headerProp ) {
                            return {
                                property: headerProp.prop,
                                renderingHint: headerProp.renderingHint,
                                renderingStyle: headerProp.renderingStyle
                            };
                        } ) : [];

                        //Update the data passed to sublocation
                        updateSubPanelContext();

                        //Get the contributed sublocations that should be visible
                        var visibleContributedSubLocations = $scope.contributedSubLocations
                            .filter( function( subLoc ) {
                                //Evaluate whether the tab should be visible for this model object
                                if( subLoc.visibleWhen ) {
                                    return subLoc.visibleWhen( $scope.modelObject );
                                }
                                return true;
                            } );

                        //Get the XRT pages
                        var visiblePages = xrtParserService
                            .getDeclVisiblePages( xrtViewModel.viewModel );

                        //Build tabs for any sublocation that should be visible
                        ctrl.buildSublocationTabs( visibleContributedSubLocations, visiblePages ).then(
                            function( result ) {
                                $scope.subLocationTabs = result;
                                ctrl.selectTab();
                            } );
                    } );
            }
        };

        /**
         * Callback from the tab widget. Activates the tab with the given name / id.
         *
         * @param idx {Number} - Index of the tab to select. Changes when the tab widget rotates.
         * @param tabTitle {String} - Title of the tab to select.
         *
         * @method activateTab
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.api = function( idx, tabTitle ) {
            //Determine which tab to select based on the name
            var tabToSelect = $scope.subLocationTabs.filter( function( tab ) {
                return tab.name === tabTitle;
            } )[ 0 ];

            if( !tabToSelect ) {
                logger.error( 'Tab with the given title ' + tabTitle + ' not found.' );
            }

            //If this is first time visitng new tab only set uid and page / pageId
            var newParams = tabToSelect.cachedParams ? tabToSelect.cachedParams : {
                uid: $state.params.uid
            };

            //Cache the parameters that were active on previous tab
            if( $scope.activeTab ) {
                $scope.activeTab.cachedParams = ngModule.copy( $state.params );
            } else {
                //If this is the first tab to become active don't change state params
                newParams = ngModule.copy( $state.params );
            }

            //Update the page and pageId parameters
            //If we are selecting the default page clear the page and pageId instead - prevents history loop
            if( $scope.subLocationTabs.indexOf( tabToSelect ) === ctrl.getMatchingTabIndex( null, null,
                    $scope.subLocationTabs ) ) {
                newParams.pageId = null;
                newParams.page = null;
            } else {
                newParams.pageId = tabToSelect.id;
                newParams.page = tabToSelect.name;
            }

            $state.go( '.', newParams, {
                inherit: false
            } );
        };

        /**
         * Load necessary information before doing anything else
         */
        $q.all( {
            //Localized text
            FailureLoadingSummary: localeService.getLocalizedTextFromKey( 'XRTMessages.FailureLoadingSummary' ),
            uidParameterMissingInURL: localeService.getLocalizedTextFromKey( 'XRTMessages.uidParameterMissingInURL' ),
            ShowObjectLocationTitle: localeService.getLocalizedTextFromKey( 'XRTMessages.ShowObjectLocationTitle' ),
            objectNotFound: localeService.getLocalizedTextFromKey( 'XRTMessages.objectNotFound' ),

            //Statically contributed sublocations
            contributedSubLocations: contributionService.require( 'showObjectSubLocation' )
        } ).then( function( resolved ) {
            $scope.xrtMessages = {};
            $scope.xrtMessages.FailureLoadingSummary = resolved.FailureLoadingSummary;
            $scope.xrtMessages.uidParameterMissingInURL = resolved.uidParameterMissingInURL;
            $scope.xrtMessages.ShowObjectLocationTitle = resolved.ShowObjectLocationTitle;
            $scope.xrtMessages.objectNotFound = resolved.objectNotFound;

            $scope.contributedSubLocations = resolved.contributedSubLocations;

            //Register the location context
            appCtxService.registerCtx( _locationContext, {
                'ActiveWorkspace:Location': $scope.context,
                'ActiveWorkspace:SubLocation': null
            } );

            var policies = $scope.contributedSubLocations.map( function( a ) {
                return a.propertyPolicy;
            } );

            //Register the property policies from the contributed sub locations
            handleObjectPropertyPolicies( policies );

            //Setup the event listeners
            handleObjectDeletedListener(); //ModelObjectDeletedEvent
            handleObjectsModifiedListener(); //ModelObjectModifiedEvent
            handleModelObjectRelatedDataModifiedListener(); //ModelObjectRelatedDataModifiedEvent
            handleLocationModelObjectChangeListener(); //Changing location model object
            keyboardSvc.registerKeyDownEvent(); // registering events to perform keyboard shortcuts

            //Setup a listener for URL changes
            $scope.$on( '$locationChangeSuccess', synchronizeState );
            //And trigger the initial synchronization
            synchronizeState();

            viewModeSvc.changeViewMode( 'None' );

            //Clear some specific contexts on destroy
            $scope.$on( '$destroy', function() {
                setXrtViewModel( null );

                _contextsToClear.forEach( appCtxService.unRegisterCtx );
                //Remove keydown event listener when leaving location
                keyboardSvc.unRegisterKeyDownEvent();
            } );
        } );
    }
] );
