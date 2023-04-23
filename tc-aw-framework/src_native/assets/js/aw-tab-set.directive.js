// Copyright (c) 2020 Siemens

/**
 * Directive to display list of tabs
 *
 * @module js/aw-tab-set.directive
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import $ from 'jquery';
import ngUtils from 'js/ngUtils';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import { registerTabSet, unregisterTabSet } from 'js/tabRegistry.service';
import 'js/aw-tab.directive';
import 'js/aw-tab-container.directive';
import 'js/aw-command-sub-panel.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/viewModelService';
import 'js/NgTab';
import 'js/conditionService';
import 'js/wysiwygModeService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display list of tabs. It support two modes to bring up tab pages, (1) inline mode and (2)
 * external mode. Inline mode is used for simple tab pages, and all tab pages will be loaded one time. External
 * mode is used for complex tab pages, tab page will be delay loaded when tab is selected.
 *
 * To get good layout of tab pages, aw-tab-set should be enclosed inside aw-panel-body or it's container element
 * should have 'aw-panel-body' CSS class.
 *
 * tabs: array of tab model. A tab model have below properties: <BR>
 * "panelId": the tab page panel ID, required for external mode. <BR>
 * "name": the tab title <BR>
 * "selectedTab": boolean, set true to select this tab by default <BR>
 * "recreatePanel": boolean, set true to recreate tab page every time, means not to retain page state.<BR>
 * "visibleWhen": string, condition expression to control tab visibility
 *
 *
 * 1. Inline mode, all the tab pages are directly put inside <aw-tab-set> element. Tab page visibility is
 * controlled by visible-when condition by using pageId or tabKey.
 *
 * <pre>
 * @example control tab visibility by page ID
 * <BR>
 *  (aw-tab-set tabs=''tabsModel'')
 *      (aw-panel-body visible-when=''selectedTab.pageId==0'')Tab Page #1(/aw-panel-body
 *      (aw-panel-body visible-when=''selectedTab.pageId==1'')Tab Page #2(/aw-panel-body
 *  (/aw-tab-set)
 * or
 * @example control tab visibility by tab key
 * (aw-tab-set tabs=''tabsModel'')
 *      (aw-panel-body visible-when=''selectedTab.tabKey=='new''')Tab Page #1(/aw-panel-body
 *      (aw-panel-body visible-when=''selectedTab.tabKey=='palette''')Tab Page #2(/aw-panel-body
 * (/aw-tab-set)
 * tabsModel is array of tab model, for example:
 * [
 *       {
 *           ''name'': ''{{i18n.new}}'',
 *           ''tabKey'': ''new'',
 *           ''recreatePanel'': true
 *       },
 *       {
 *           ''name'': ''{{i18n.palette}}'',
 *           ''tabKey'': ''palette'',
 *           ''selectedTab'': true,
 *           ''recreatePanel'': true
 *       }
 *  ]
 * 2. External mode, view and viewmodel must be defined for each tab panel, tab pages are loaded by panel ID.
 *  @example (aw-tab-set tabs=''tabsModel'')(/aw-tab-set)
 *  [
 *       {
 *           ''panelId'': ''newObjectSub'',
 *           ''name'': ''{{i18n.new}}'',
 *           ''recreatePanel'': true
 *       },
 *       {
 *           ''panelId'': ''paletteSub'',
 *           ''name'': ''{{i18n.palette}}'',
 *           ''selectedTab'': true
 *       }
 *  ]
 * </pre>
 *
 * @member aw-tab-set
 * @memberof NgElementDirectives
 */

app.directive( 'awTabSet', [
    'viewModelService',
    'conditionService',
    'wysModeSvc',
    function( viewModelSvc, conditionService, wysModeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                tabs: '=',
                tabSetId: '@?',
                viewModel: '=?',
                action: '@'
            },
            controller: [ '$scope', function( $scope ) {
                if( !$scope.tabs ) {
                    logger.warn( '$scope.tabs is undefined...Unable to bind aw-tab-set.' );
                }
            } ],
            link: function( $scope, $element ) {
                var isWysiwygMode = wysModeSvc.isWysiwygMode( $scope );
                $element.addClass( 'aw-layout-panelContent' );

                var declViewModel = $scope.viewModel ? $scope.viewModel : viewModelSvc.getViewModel( $scope, true );

                /**
                 * Filter tabs if they have a visibleWhen condition attached.
                 */

                $scope.conditionFilter = function( tab ) {
                    return !tab.visibleWhen || conditionService.evaluateCondition( declViewModel, tab.visibleWhen, $scope ) ||
                        _.get( declViewModel.getConditionStates(), declUtils.getConditionName( tab.visibleWhen.condition ) ) || isWysiwygMode;
                };

                $scope.selectWhenFilter = function( tab ) {
                    return conditionService.evaluateCondition( declViewModel, tab.selectWhen, $scope ) ||
                        _.get( declViewModel.getConditionStates(), declUtils.getConditionName( tab.selectWhen.condition ) );
                };

                $scope.hasSelectWhenInAllTabs = function() {
                    return $scope.tabs && $scope.tabs.length > 0 && $scope.tabs.reduce( function( acc, tab ) {
                        var hasSelectWhen = tab.selectWhen || false;
                        return acc && hasSelectWhen;
                    }, true );
                };

                /**
                 * $scope.hasSelectWhenInAllTabs() function checks if select-when condition is applied in all the tabs.
                 * if it applied to all the tabs, then only we register the watch.
                 *
                 * select-when condition will not be honored if it is not applied to all the tabs.
                 *
                 * $watchCollection triggers when the select when condition on  any tab changes
                 * whose ever selected tab is satisfied that tab becomes the current selected one.
                 * If more than one tab satisfies condition, first one will get priority
                 */
                var updateWatcherOfSelectWhen = function() {
                    if( $scope.hasSelectWhenInAllTabs() ) {
                        $scope.$watchCollection( function getCurrentTab() {
                            return $scope.visibleTabs.filter( $scope.selectWhenFilter );
                        }, function handleSelectWhen( selectedTabs ) {
                            if( selectedTabs && selectedTabs.length > 0 ) {
                                $scope.selectedTab = selectedTabs[ 0 ];
                                $scope.$broadcast( 'NgTabSelectionUpdate', $scope.selectedTab );
                            }
                        } );
                    }
                };

                /**
                 * $watchCollection triggers when list or any object in list changes
                 * safer than watching length which is not guaranteed to when given a new tab set
                 */

                $scope.$watchCollection( 'tabs', function() {
                    declViewModel.selectedTab = null;
                    var hasSelected = false;
                    if( $scope.tabs ) {
                        $scope.tabs.forEach( function( tab, idx ) {
                            if( tab.selectedTab ) {
                                hasSelected = true;
                             declViewModel.selectedTab = tab;
                            }
                            tab.pageId = idx;
                        } );
                        // set the first tab selected if none selected
                        if( !hasSelected && $scope.tabs.length > 0 ) {
                            var initialTab = $scope.tabs.filter( $scope.conditionFilter )[ 0 ] || $scope.tabs[ 0 ];
                            initialTab.selectedTab = true;
                            $scope.selectedTab = initialTab;
                        }
                        updateWatcherOfSelectWhen();
                    }
                } );

                const forceTabChange = function( tab ) {
                    $scope.$broadcast( 'NgTabSelectionUpdate', tab );
                };

                const highlightTab = function( targetTab ) {
                    const tabModel = $scope.tabsModel.filter( tab => tab.tabKey === targetTab.tabKey )[0];
                    if( tabModel && tabModel.displayTab === true ) {
                        var tabContainerDomEl = $scope.tabBarContentElement;
                        if( tabContainerDomEl.children.length > 0 ) {
                            for( var tabNdx = 0; tabNdx < tabContainerDomEl.children.length; tabNdx++ ) {
                                if( tabContainerDomEl.children[tabNdx].innerText === targetTab.name ) {
                                    var tabEl =  tabContainerDomEl.children[tabNdx];
                                    if( tabEl ) {
                                        var tabElFocus = $( tabEl ).find( 'a' );
                                        if( tabElFocus[0] ) {
                                            wcagSvc.afxFocusElement( tabElFocus );
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    else if( tabModel && tabModel.displayTab === false ) {
                        if( $scope.showArrow ) {
                            var arrowChevron = $scope.tabContainer.find( 'div.aw-jswidget-tabContainer .aw-jswidget-controlArrow' );
                            if( arrowChevron[0] ) {
                                wcagSvc.afxFocusElement( arrowChevron );
                            }
                        }
                    }
                };

                $scope.$watchCollection( function getVisibleTabs() {
                    return $scope.tabs ? $scope.tabs.filter( $scope.conditionFilter ) : [];
                }, function handleVisibleTabChange( visibleTabs ) {
                    $scope.visibleTabs = visibleTabs;
                    if( $scope.tabSetId ) {
                        unregisterTabSet( $scope.tabSetId );
                        registerTabSet( $scope.tabSetId, {
                            changeTab: forceTabChange,
                            highlightTab: highlightTab,
                            tabs: visibleTabs
                        } );
                    }
                } );

                $scope.$watch( function() {
                    return $scope.selectedTab ? $scope.conditionFilter( $scope.selectedTab ) : false;
                }, function( isSelectedTabVisible, oldVal ) {
                    // Ignore the first call
                    // Technically the logic to select the correct initial tab should be here but that would slightly change how tab set works
                    if( isSelectedTabVisible !== oldVal ) {
                        if( !isSelectedTabVisible ) {
                            // If the tab that is currently selected is hidden auto select the first visible tab
                            var firstVisibleTab = $scope.tabs.filter( $scope.conditionFilter )[ 0 ];
                            forceTabChange( firstVisibleTab );
                        }
                    }
                } );
                // callback function for tab selected
                $scope.onTabSelected = function( pageId, tabTitle ) {
                    if( $scope.action ) {
                        declViewModel.pageId = pageId;
                        declViewModel.tabTitle = tabTitle;
                        viewModelSvc.executeCommand( declViewModel, $scope.action, $scope ).then( function() {
                            // notify tab selected event
                            eventBus.publish( 'awTab.selected', {
                                scope: $scope
                            } );

                            $scope.$emit( 'awTab.selected', {
                                selectedTab: $scope.selectedTab
                            } );
                        } );
                    } else {
                        // Before updating the current scope.selected tab, this value contains the last selected tab
                        var lastSelected = $scope.selectedTab;

                        // find out selected tab
                        for( var i = 0; i < $scope.tabs.length; i++ ) {
                            if( $scope.tabs[ i ].pageId === pageId ) {
                                $scope.tabs[ i ].selectedTab = true;
                                $scope.selectedTab = $scope.tabs[ i ];
                                declViewModel.selectedTab = $scope.tabs[ i ];
                                break;
                            }
                        }

                        var selectedTab = $scope.selectedTab;
                        if( !selectedTab ) {
                            return;
                        }

                        // Remove the old panel, if 'recreatePanel' is true
                        // Remove the old panel, if 'recreatePanel' is true
                        if( lastSelected && lastSelected.recreatePanel ) {
                            var oldPanel = $( 'form[panel-id=' + lastSelected.panelId + ']' );
                            var childPanels = oldPanel.find( 'form[name=subPanelForm]' );
                            _.forEach( childPanels, function( childPanel ) {
                                if( childPanel ) {
                                    var childPanelId = childPanel.getAttribute( 'panel-id' );
                                    if( childPanelId ) {
                                        declViewModel.removeSubPanel( childPanelId );
                                    }
                                    $( childPanel ).scope().data = null;
                                }
                            } );

                            var panelScope = oldPanel.scope();
                            if( panelScope ) {
                                panelScope.data = null;
                                panelScope.$destroy();
                            }
                            oldPanel.remove();
                            declViewModel.removeSubPanel( lastSelected.panelId );
                        }

                        // dynamically load tab page
                        if( selectedTab.panelId && ( !selectedTab.isLoaded || selectedTab.recreatePanel ) ) {
                            selectedTab.isLoaded = true;
                            var content = '<aw-command-sub-panel panel-id=\'{panelId}\' visible-when="selectedTab.panelId==\'{panelId}\'" ></aw-command-sub-panel>';
                            content = content.replace( /\{panelId\}/g, selectedTab.panelId );
                            var $ele = ngModule.element( content );
                            var tabPageEle = $element.find( '.aw-jswidget-tabPage' );
                            $( tabPageEle[ 0 ] ).append( $ele[ 0 ] );
                            ngUtils.include( tabPageEle[ 0 ], $ele );
                        }

                        // notify tab selected event
                        eventBus.publish( 'awTab.selected', {
                            scope: $scope
                        } );

                        $scope.$emit( 'awTab.selected', {
                            selectedTab: $scope.selectedTab
                        } );
                    }
                };

                var selectTabEventReg = eventBus.subscribe( 'awTab.setSelected', function( context ) {
                    var tabToSelect = _.find( $scope.tabs, function( tab ) {
                        return tab.tabKey && tab.tabKey === context.tabKey || tab.pageId &&
                            tab.pageId === context.pageId || tab.panelId &&
                            tab.panelId === context.panelId;
                    } );

                    if( tabToSelect ) {
                        tabToSelect.selectedTab = true;
                        $scope.$broadcast( 'NgTabSelectionUpdate', tabToSelect );
                    }
                } );

                updateWatcherOfSelectWhen();

                $scope.$on( '$destroy', function() {
                    if( $scope.tabSetId ) {
                        unregisterTabSet( $scope.tabSetId );
                    }
                    if( selectTabEventReg ) {
                        eventBus.unsubscribe( selectTabEventReg );
                    }
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-tab-set.directive.html'
        };
    }
] );
