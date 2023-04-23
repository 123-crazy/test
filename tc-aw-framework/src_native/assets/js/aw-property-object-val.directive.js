// Copyright (c) 2020 Siemens

/**
 * Definition for the <aw-property-object-val> directive.
 *
 * @module js/aw-property-object-val.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/uwPropertyService';
import 'js/aw-property-error.directive';
import 'js/aw-property-image.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-autofocus.directive';
import 'js/localeService';
import 'js/appCtxService';
import 'js/viewModelService';
import 'js/aw-validator.directive';

/**
 * Definition for the <aw-property-object-val> directive.
 *
 * @member aw-property-object-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyObjectVal', [
    'uwPropertyService',
    'localeService',
    'appCtxService',
    'viewModelService',
    function( uwPropertySvc, localeSvc, appCtx, viewModelService ) {
        /**
         * Controller used for prop update or pass in using &?
         *
         * @param {Object} $scope - The allocated scope for this controller
         */
        function myController( $scope ) {
            if( !$scope.prop ) {
                return;
            }

            var uiProperty = $scope.prop;
            var panelID = 'addReferenceSub';
            var referencePanelLoaded = false;

            // get the add reference button title
            localeSvc.getTextPromise().then( function( localTextBundle ) {
                $scope.addButtonTitle = localTextBundle.ADD_BUTTON_TITLE;
                $scope.removeButtonTitle = localTextBundle.REMOVE_BUTTON_TITLE;
            } );

            var SELECTED_EVENT_NAME = 'selected';
            var declViewModel = viewModelService.getViewModel( $scope, false );
            var previousPanel = declViewModel ? declViewModel.activeView : null;
            var currentSelection = null;
            var selectionChangeEventSub = null;
            var selectionUpdatedEventSub = null;
            var onNavigateBackListener = null;
            /**
             * Respond to a selection change.
             *
             * @param {Object} eventData
             *
             */
            var onSelectionChanged = function( eventData ) {
                if( referencePanelLoaded &&
                    eventData.name === SELECTED_EVENT_NAME &&
                    ( !currentSelection && eventData.value || currentSelection.uid !== eventData.value.uid ) ) {
                    currentSelection = eventData.value;
                    var context = {
                        destPanelId: previousPanel
                    };
                    referencePanelLoaded = false;
                    eventBus.publish( 'awPanel.navigate', context );
                    subscribeEvents();
                }
            };
            /**
             * Respond to navigation using back button.
             *
             * @param {Object} eventData
             *
             */
            var onNavigateBack = function( eventData ) {
                if( eventData.destPanelId === previousPanel ) {
                    referencePanelLoaded = false;
                    unsubscribeEvents();
                }
            };
            /**
             * Subscribe to selection change event
             */
            var subscribeEvents = function() {
                currentSelection = appCtx.getCtx( SELECTED_EVENT_NAME );
                selectionChangeEventSub = eventBus.subscribe( 'appCtx.register', onSelectionChanged );
                selectionUpdatedEventSub = eventBus.subscribe( 'appCtx.update', onSelectionChanged );
                onNavigateBackListener = eventBus.subscribe( 'awPanel.navigate', onNavigateBack );
            };

            /**
             * Un-Subscribe to selection change event
             */
            var unsubscribeEvents = function() {
                if( selectionChangeEventSub ) {
                    eventBus.unsubscribe( selectionChangeEventSub );
                }
                if( selectionUpdatedEventSub ) {
                    eventBus.unsubscribe( selectionUpdatedEventSub );
                }
                if( onNavigateBackListener ) {
                    eventBus.unsubscribe( onNavigateBackListener );
                }
            };

            $scope.changeFunction = function( $event ) {
                if( uiProperty.isArray ) {
                    uiProperty.updateArray( $event );
                } else {
                    uwPropertySvc.updateViewModelProperty( uiProperty );
                }
                uiProperty.dirty = true;
            };

            $scope.addObject = function() {
                if( uiProperty.propApi ) {
                    referencePanelLoaded = true;
                    if( uiProperty.propApi.showAddObject ) {
                        uiProperty.propApi.showAddObject( uiProperty.propertyName );
                    } else {
                        var filterType;
                        if( uiProperty.propertyDescriptor &&
                            uiProperty.propertyDescriptor.constantsMap &&
                            uiProperty.propertyDescriptor.constantsMap.ReferencedTypeName ) {
                            filterType = uiProperty.propertyDescriptor.constantsMap.ReferencedTypeName;
                        }
                        var searchFilter;
                        if( uiProperty.parameterMap ) {
                            searchFilter = uiProperty.parameterMap.searchFilter;
                        }
                        var context = {
                            destPanelId: panelID,
                            title: uiProperty.propertyDisplayName,
                            mainPanelCaption: $scope.addButtonTitle,
                            recreatePanel: true,
                            supportGoBack: true,
                            isolateMode: true,
                            viewModelProperty: uiProperty,
                            addTypeRef: true,
                            filterTypes: filterType,
                            searchFilter: searchFilter
                        };

                        // add reference title: Add <reference property>
                        context.title = $scope.addButtonTitle + ' ' + uiProperty.propertyDisplayName;
                        $scope.$emit( 'awProperty.addObject', context );
                        subscribeEvents();
                    }
                }
            };

            var refPropUpdateEventReg = eventBus.subscribe( 'referenceProperty.update',
                function( event ) {
                    var uiProperty = $scope.prop;
                    if( event.property === uiProperty ) {
                        var selectedObjs = event.selectedObjects;
                        // Logic to pick up the first selection even if user has done multi selection. It has been behaving like that
                        // in existing GWT panel. So keeping the behavior as is for declarative reference panel
                        if( selectedObjs && selectedObjs.length > 0 ) {
                            if( uiProperty.isArray ) {
                                var dbValues = [];
                                for( var j = 0; j < selectedObjs.length; j++ ) {
                                    if( selectedObjs[ j ].uid ) {
                                        dbValues.push( selectedObjs[ j ].uid );
                                    }
                                }
                                // Add empty value to array so that it sets the dbValue correctly, for the scenario
                                // where same object is added multiple times which is also a valid use-case
                                dbValues.push( '' );

                                uwPropertySvc.setValue( uiProperty, dbValues );
                                uiProperty.updateArray();
                            } else {
                                var dbValue = selectedObjs[ 0 ].uid;
                                uwPropertySvc.setValue( uiProperty, dbValue );
                            }
                            uwPropertySvc.setDirty( uiProperty, true );
                        }
                        referencePanelLoaded = false;
                        unsubscribeEvents();
                    }
                } );

            $scope.removeObject = function( $event ) {
                $scope.prop.dbValue = '';
                $scope.prop.uiValue = '';
                $scope.changeFunction( $event );
            };

            $scope.$on( '$destroy', function() {
                if( referencePanelLoaded ) {
                    var toolsAndInfoCommand = appCtx.getCtx( 'activeToolsAndInfoCommand' );
                    if( toolsAndInfoCommand ) {
                        eventBus.publish( 'awsidenav.openClose', {
                            id: 'aw_toolsAndInfo',
                            commandId: toolsAndInfoCommand.commandId
                        } );
                    }
                    appCtx.unRegisterCtx( 'activeToolsAndInfoCommand' );
                }
                eventBus.unsubscribe( refPropUpdateEventReg );
                unsubscribeEvents();
            } );
        }

        myController.$inject = [ '$scope' ];

        return {
            restrict: 'E',
            scope: {
                // 'prop' is defined in the parent (i.e. controller's) scope
                prop: '='
            },
            controller: myController,
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-object-val.directive.html'
        };
    }
] );
