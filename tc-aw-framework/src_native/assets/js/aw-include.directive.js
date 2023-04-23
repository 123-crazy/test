// Copyright (c) 2020 Siemens

/**
 * @module js/aw-include.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/awLayoutService';
import logger from 'js/logger';
import debugService from 'js/debugService';
import viewModelSvc from 'js/viewModelService';
import syncStrategyService from 'js/syncStrategyService';
import viewDragAndDropUtils from 'js/viewDragAndDropUtils';

//eslint-disable-next-line valid-jsdoc
/**
 * Defines aw-include element.
 * <P>
 * Define an element that is used to include other layout files. The "when" attribute is optional and may be used to
 * select layouts based on predefined condition names. The "sub-panel-context" attribute is also optional, and
 * should be used, when some information needs to be passed on to the child layout file.
 *
 * @example <aw-include name="main-header"></aw-include>
 * @example <aw-include name="default-layout" when="condition-1:layout-1, conditions-2:layout-2"></aw-include>
 * @example <aw-include name="main-header" sub-panel-context="dataForSubPanel"></aw-include>
 *
 * @memberof NgDirectives
 * @member aw-include
 */
app.directive( 'awInclude', [
    '$compile',
    'awLayoutService',
    function( $compile, awLayoutService ) {
        return {
            restrict: 'E',
            scope: {
                name: '@',
                when: '@?',
                viewId: '@?',
                subPanelContext: '=?'
            },
            link: function( $scope, $element ) {
                // Automatically add class to aw-include
                // Should probably be done with aw-include element selector instead
                $element.addClass( 'aw-layout-flexbox' );

                // The scope for the current view model
                var childScope = null;
                // The element for the current view
                var childElement = null;
                let className = 'aw-layout-include aw-layout-flexbox';
                // The template that will be compiled with the view model scope
                var childElementHtml = '<div class="' + className + '"' +
                    'sub-panel-context="subPanelContext" data-ng-include="layoutViewName"></div>';
                // Highlight event subscription for view for drag and drop operation
                var isHighlightEventSub = null;
                //If view ID not defined on aw-include
                var isViewIdNotDefined = false;

                /**
                 * When the "name" changes do a full rebuild of the embedded view.
                 *
                 * This means destroy the child scope and any view models associated with it and then create a new
                 * scope and attach the new view model to it.
                 *
                 * This works similar to ng-if. See the source of that directive for more information.
                 */
                var renderCurrentView = function() {
                    // Clear out current contents and destroy child scope
                    $element.empty();
                    if( childScope ) {
                        // clearing cache + vm unload
                        if( childScope && childScope.ports ) {
                            syncStrategyService.updateVmOnMountUnmount( childScope, false );
                        }
                        childScope.$destroy();
                        awLayoutService.removeLayoutElement( childElement );
                    }
                    if( $scope.name ) {
                        // Compile the new contents with a new child scope
                        childScope = $scope.$new();
                        childElement = $compile( childElementHtml )( childScope );
                        $element.append( childElement );

                        if( $scope.viewId === undefined ) {
                            $scope.viewId = $scope.name;
                        }

                        // And initialize "when" conditions and load view / view model
                        awLayoutService.addLayoutElement( childScope, childElement, $scope.name, $scope.when, $scope.viewId );
                    }
                };

                /**
                 * There are three scenarios when the "name" changes
                 * Case 1:  when <aw-include> tag without viewId property
                 *          a) Intialize viewID property on page load with 'name' value
                 *          b) On tab switch, update viewID with 'name' value
                  * Case 2:  when <aw-include> tag with viewId property
                 *          a) On page load ,it skip below condition
                 *          b) On tab switch,it skip the below condition
                 * Case 3 : if name is constant and viewId changing
                 */
                $scope.$watch( 'name', function( newVal, oldVal ) {
                    if(  !$scope.viewId &&  newVal ) {
                        isViewIdNotDefined = true;
                    }

                    if( newVal && newVal !== oldVal && isViewIdNotDefined ) {
                            $scope.viewId = newVal;
                    }
                    renderCurrentView();
                } );


                var configChangeSub = eventBus.subscribe( 'configurationChange.viewmodel', function( data ) {
                    var viewModelName = data.path.split( '.' )[ 1 ];
                    if( viewModelName === $scope.name ) {
                        renderCurrentView();
                    }
                } );

                /**
                 * Fire the ng-include "$includeContentLoaded" angular event into the event bus
                 */
                $scope.$on( '$includeContentLoaded', function( $event ) {
                    var modelId = _.get( childScope, 'data._internal.modelId' );

                    modelId = modelId || '?';

                    if( logger.isDeclarativeLogEnabled() && childScope ) {
                        debugService.debugViewAndViewModel( 'contentLoaded', childScope.currentLayoutName, childScope.data, childScope.$parent.subPanelContext );
                    }

                    eventBus.publish( childScope.currentLayoutName + '.contentLoaded', {
                        scope: childScope,
                        _source: modelId
                    } );

                    /*
                    * Setup drag and drop on view if applicable
                    */
                    isHighlightEventSub = viewDragAndDropUtils.setupDragAndDropOnView( $element[ 0 ], childScope.data );

                    var onMountAction = _.get( childScope, 'data._internal.lifecycleHooks.onMount' );
                    if( onMountAction ) {
                        viewModelSvc.executeCommand( childScope.data, onMountAction, childScope );
                    }
                    $event.stopPropagation();

                    // vm load
                    if( childScope && childScope.ports ) {
                        syncStrategyService.updateVmOnMountUnmount( childScope, true );
                    }
                } );

                $scope.$on( '$destroy', function() {
                    // vm unload
                    if( childScope && childScope.ports ) {
                        syncStrategyService.updateVmOnMountUnmount( childScope, false );
                    }
                    eventBus.unsubscribe( configChangeSub );
                    if( isHighlightEventSub ) {
                        eventBus.unsubscribe( isHighlightEventSub );
                    }

                    // Clear child element contents and remove aw-include listeners
                    if( childElement ) {
                        awLayoutService.removeLayoutElement( childElement );
                    }
                    if( logger.isDeclarativeLogEnabled() && childScope ) {
                        debugService.debugViewAndViewModel( 'contentUnloaded', childScope.currentLayoutName );
                    }
                    if( childScope && childScope.data ) {
                        eventBus.publish( childScope.currentLayoutName + '.contentUnloaded', {
                            _source: childScope.data._internal.modelId
                        } );
                    }
                } );
            }
        };
    }
] );
