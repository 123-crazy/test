// Copyright (c) 2020 Siemens

/**
 * Directive to display the selection summary of multiple objects.
 *
 * @module js/aw-selection-summary.directive
 */
import app from 'app';
import 'js/localeService';
import 'js/configurationService';
import 'js/conditionService';
import 'js/appCtxService';
import 'js/editHandlerService';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';
import 'js/aw-include.directive';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to display the selection summary of multiple objects.
 *
 * @example <aw-selection-summary selection="selected"></aw-selection-summary>
 *
 * @member aw-selection-summary
 * @memberof NgElementDirectives
 */
app.directive( 'awSelectionSummary', [
    'localeService', 'configurationService', 'conditionService', 'appCtxService', 'editHandlerService',
    function( localeService, configurationService, conditionService, appCtxService, editHandlerService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-selection-summary.directive.html',
            scope: {
                // The selected view model objects
                selection: '=',
                context: '<?'
            },
            controller: [ '$scope', function( $scope ) {
                /**
                 * The tabs to display
                 */
                $scope.tabs = [];

                /**
                 * Filter tabs if they have a condition attached
                 *
                 * @param {Object} tab - The tab model
                 * @returns {Boolean} Whether the tab should be displayed
                 */
                $scope.conditionFilter = function( tab ) {
                    tab.displayTab = true;
                    if( tab.visibleWhen ) {
                        tab.displayTab = conditionService.evaluateCondition( {
                            ctx: appCtxService.ctx,
                            selection: $scope.selection,
                            context: $scope.context
                        }, tab.visibleWhen );
                    }
                    return tab.displayTab;
                };

                /**
                 * Callback from the tab widget. Activates the tab with the given pageId.
                 *
                 * @param {Number} pageId - Page id of the selected tab
                 */
                $scope.api = function( pageId ) {
                    var tabToMakeActive = $scope.tabs.filter( function( tab ) {
                        return tab.pageId === pageId;
                    } )[ 0 ];

                    // Call leave confirmation before switching tab if pwa is not editing
                    const pwaEdithandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
                    const pwaEditHandlerInProgress = pwaEdithandler && pwaEdithandler.editInProgress();
                    if( pwaEditHandlerInProgress ) {
                        $scope.activeTab = tabToMakeActive;
                    } else {
                        editHandlerService.leaveConfirmation().then( function() {
                            $scope.activeTab = tabToMakeActive;
                        } );
                    }
                };
            } ],
            link: function( $scope ) {
                /**
                 * Load the localized string for the tab title if necesssary
                 *
                 * @param {Object} tab The tab object
                 */
                var loadTabTitle = function( tab ) {
                    if( typeof tab.name !== 'string' ) {
                        localeService.getLocalizedText( tab.name.source, tab.name.key ).then( function( result ) {
                            tab.name = result;
                        } );
                    }
                };

                /**
                 * Select the first visible tab
                 */
                var selectFirstVisibleTab = function() {
                    var tabToSelect = $scope.tabs.filter( $scope.conditionFilter )[ 0 ];
                    if( tabToSelect ) {
                        tabToSelect.selectedTab = true;
                        $scope.$broadcast( 'NgTabSelectionUpdate', tabToSelect );
                    }

                    // Call leave confirmation before switching tab if pwa is not editing
                    const pwaEdithandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
                    const pwaEditHandlerInProgress = pwaEdithandler && pwaEdithandler.editInProgress();
                    if( pwaEditHandlerInProgress ) {
                        $scope.activeTab = tabToSelect;
                    } else {
                        editHandlerService.leaveConfirmation().then( function() {
                            $scope.activeTab = tabToSelect;
                        } );
                    }
                };

                // Load the tabs from the configuration service
                configurationService.getCfg( 'secondaryWorkareaTabs' ).then(
                    function( tabs ) {
                        // Sort by priority
                        tabs.sort( function( t1, t2 ) {
                            return t1.priority - t2.priority;
                        } );
                        tabs.forEach( function( tab, idx ) {
                            tab.pageId = idx;
                        } );
                        tabs.forEach( loadTabTitle );
                        // Show the tabs
                        $scope.tabs = tabs;
                    } );

                $scope.$watchCollection( function getVisibleTabs() {
                    return $scope.tabs.filter( $scope.conditionFilter );
                }, function handleVisibleTabChange( visibleTabs ) {
                    let tabContainer = [];
                    $scope.visibleTabs = visibleTabs;
                    for( const visibleTab of visibleTabs ) {
                        if( visibleTab.isExclusive === true ) {
                            tabContainer.push( visibleTab );
                        }
                    }
                    if( tabContainer.length > 0 ) {
                        $scope.activeTab = tabContainer[0];
                    }
                    if( !$scope.activeTab ) {
                        selectFirstVisibleTab();
                    }
                } );

                /**
                 * Pass selection to nested view models
                 */
                $scope.subPanelContext = {};

                $scope.$watch( 'selection', function() {
                    $scope.subPanelContext.selection = $scope.selection;
                } );

                /**
                 * If the currently displayed tab is hidden for any reason select the next valid tab
                 */
                $scope.$watch( 'activeTab.displayTab', function( newVal, oldVal ) {
                    if( !newVal && newVal !== oldVal ) {
                        selectFirstVisibleTab();
                    }
                } );
            }
        };
    }
] );
