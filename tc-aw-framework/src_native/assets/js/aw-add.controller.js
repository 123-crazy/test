// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines controller for <aw-command> directive.
 *
 * @module js/aw-add.controller
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import dsmUtils from 'js/dsmUtils';
import logger from 'js/logger';
import { updateViewModelProperty } from 'js/uwPropertyService';
import 'js/panelContentService';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/listBoxService';
import 'js/addObjectUtils';
import 'soa/kernel/clientMetaModel';
import 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';

/**
 * Defines awAdd controller
 *
 * @member awAddController
 * @memberof NgControllers
 */
app.controller( 'awAddController', [
    '$scope',
    '$element',
    'viewModelService',
    'appCtxService',
    'listBoxService',
    'addObjectUtils',
    'soa_kernel_clientMetaModel',
    'soa_kernel_soaService',
    'soa_kernel_propertyPolicyService',
    function( $scope, $element, viewModelSvc, appCtxSrv, listBoxSrv,
        addObjectUtils, cmm, soaSvc, propPolicySvc ) {
        // By default, show 3 types in Recent section
        var MAX_RECENT_TYPE_COUNT = 3;
        // Threshold number of types required in order to see the recent types and filter fields
        var RECENTTYPES_VIEW_THRESHOLD = 10;

        var ctx = appCtxSrv.ctx;
        $element.addClass( 'aw-layout-flexColumn' );

        var declViewModelTarget = viewModelSvc.getViewModel( $scope, true );
        declViewModelTarget.targetObject = $scope.targetObject;

        // Ensure relation types are loaded
        const relations = $scope.relations ? $scope.relations.split( ',' ) : [];
        // Need to "preload" all relation information instead of loading on selection because some panels manually manage relation data
        if( relations.length > 0 ) {
            soaSvc.ensureModelTypesLoaded( relations );
        }
        declViewModelTarget.relationList = [];
        if( !$scope.relationMap ) {
            $scope.relationMap = [ ...( $scope.typeFilter || '' ).split( ',' ), ...( $scope.includeTypes || '' ).split( ',' ) ].reduce( ( acc, nxt ) => {
                acc[ nxt ] = relations;
                acc[ `${nxt}Revision` ] = relations;
                return acc;
            }, {} );
        }
        declViewModelTarget.relationMap = $scope.relationMap;
        declViewModelTarget.includeTypes = $scope.includeTypes;
        if( $scope.includeTypes && $scope.includeTypes.indexOf( 'Dataset' ) > -1 &&
            ctx.mselected !== null ) {
            if( !appCtxSrv.ctx.addObject ) {
                appCtxSrv.registerCtx( 'addObject', {} );
            }
            ctx.addObject.showDataSetUploadPanel = true;
        }
        // By default, load the sub types. Only in specific cases when asked for, set loadSubTypes to false
        declViewModelTarget.loadSubTypes = $scope.loadSubTypes === undefined || $scope.loadSubTypes;

        declViewModelTarget.isIncludeSubTypes = $scope.isIncludeSubTypes;

        declViewModelTarget.typeOverrideId = $scope.typeOverrideId;

        // Only when asked for, set auto-select to true
        declViewModelTarget.autoSelectOnUniqueType = $scope.autoSelectOnUniqueType;

        declViewModelTarget.typeFilter = $scope.typeFilter;
        declViewModelTarget.searchFilter = $scope.searchFilter;
        declViewModelTarget.activeView = 'addObjectPrimarySub';
        declViewModelTarget.maxRecentTypeCount = MAX_RECENT_TYPE_COUNT;
        declViewModelTarget.recentTypesViewThreshold = RECENTTYPES_VIEW_THRESHOLD;
        // for test group, More Link is shown by default
        declViewModelTarget.isMoreLinkShown = true;
        if( $scope.selectionMode ) {
            declViewModelTarget.selectionMode = $scope.selectionMode;
        } else if( ctx.panelContext &&
            ctx.panelContext.viewModelProperty ) {
            declViewModelTarget.selectionMode = ctx.panelContext.viewModelProperty.isArray === true ? 'multiple' : 'single';
        }

        if( $scope.preferredType ) {
            declViewModelTarget.preferredType = $scope.preferredType;
        }

        if( $scope.maxRecentCount ) {
            try {
                declViewModelTarget.maxRecentTypeCount = parseInt( $scope.maxRecentCount );
            } catch ( exception ) {
                logger.error( 'aw-add.controller: attribute \'maxRecentTypeCount\' is not a valid integer.' );
            }
        }

        $scope.data.visibleAddPanelTabKeys = $scope.visibleTabs ? $scope.visibleTabs.split( ',' ) : [ 'new', 'palette', 'search' ];
        $scope.data.visibleSearchFilterPanelTabKeys = [ 'results', 'filters' ];

        $scope.$watch( 'visibleTabs', function() {
            $scope.data.visibleAddPanelTabKeys = $scope.visibleTabs ? $scope.visibleTabs.split( ',' ) : [ 'new', 'palette', 'search' ];
        } );

        $scope.data.isDSMUsable = dsmUtils.isDSMUsable();

        $scope.data.clearSelectedType = function() {
            $scope.data.creationType = null;
            $scope.data.objCreateInfo = null;
            $scope.data.isDatasetCreate = false;
            $scope.data.isProjectAssignable = false;
        };
        // hide the More Link when click on the More... link
        $scope.data.showMoreLinkStyles = function() {
            $scope.data.isMoreLinkShown = false;
        };

        /**
         * Callback function when a new type is selected from either Type Selector of Recent Selector
         *
         * @param{Object} context The selection context object
         */
        function onTypeSelected( context ) {
            $scope.data.isProjectAssignable = false;
            if( context.selectedObjects.length > 0 ) {
                $scope.data.creationType = context.selectedObjects[ 0 ];
                $scope.data.isDatasetCreate = $scope.data.creationType &&
                    $scope.data.creationType.uid.indexOf( 'Dataset' ) > -1;

                // Decide visibility of Projects section
                $scope.data.creationType.props.type_name.propertyDisplayName = $scope.data.creationType.props.type_name.uiValue;
                var typeName = $scope.data.creationType.props.type_name.dbValue;
                var promise = soaSvc.ensureModelTypesLoaded( [ typeName ] );
                promise.then( function() {
                    var typeNameType = cmm.getType( typeName );
                    if( typeNameType ) {
                        var wso = 'WorkspaceObject';
                        var isWso = typeName === wso ||
                            typeNameType.typeHierarchyArray &&
                            typeNameType.typeHierarchyArray.indexOf( wso ) > -1;
                        var creI = typeNameType.constantsMap.CreateInput;
                        if( creI ) {
                            var creIType = cmm.getType( creI );
                            if( creIType ) {
                                var projectsEnabled = creIType.constantsMap.Fnd0EnableAssignProjects;
                                $scope.data.isProjectAssignable = isWso &&
                                    projectsEnabled === 'true';
                            } else {
                                soaSvc.ensureModelTypesLoaded( [ creI ] ).then( function() {
                                    var creIType = cmm.getType( creI );
                                    if( creIType ) {
                                        var projectsEnabled = creIType.constantsMap.Fnd0EnableAssignProjects;
                                        $scope.data.isProjectAssignable = isWso &&
                                            projectsEnabled === 'true';
                                    }
                                } );
                            }
                        }
                    }
                } );
            } else {
                $scope.data.creationType = null;
                $scope.data.isDatasetCreate = false;
            }
        }

        var typeSelectEventReg = eventBus.subscribe( 'awTypeSelector.selectionChangeEvent', onTypeSelected );
        var recentTypeSelectEventReg = eventBus.subscribe( 'getRecentTypesProvider.selectionChangeEvent', onTypeSelected );

        var clipboardEventReg = eventBus.subscribe( 'getClipboardProvider.modelObjectsUpdated', function( event ) {
            if( event.viewModelObjects.length > 0 && ctx.getClipboardProvider ) {
                var selectionModel = ctx.getClipboardProvider.selectionModel;
                if( selectionModel.mode === 'single' ) {
                    // Select first object in clipboard by default in single selection mode
                    selectionModel.setMode( declViewModelTarget.selectionMode );
                    if( ctx.getClipboardProvider.getViewModelCollection()
                        .getTotalObjectsLoaded() > 0 ) {
                        ctx.getClipboardProvider.changeObjectsSelection( 0, 0, true );
                    }
                } else {
                    // Select all objects in clipboard by default in multiselect mode
                    if( ctx.getClipboardProvider.selectedObjects.length === 0 ) {
                        ctx.getClipboardProvider.selectAll();
                    }
                }
            }
        } );

        // This function handles selection from any of the clipboard/favorites/Recents dataProvider.
        var lastContext = {
            getClipboardProvider: null,
            getFavoriteProvider: null,
            getRecentObjsProvider: null
        };
        $scope.handleSelection = async function( dataProviderId, context ) {
            if( context._refire ) {
                return;
            }

            var dataProviderSet = Object.keys( lastContext );
            lastContext[ dataProviderId ] = context;
            var otherDataProviders = _.pull( dataProviderSet, dataProviderId );

            // Clear the selections on other two sections
            if( context.selectedObjects.length > 0 ) {
                for( var i = 0; i < otherDataProviders.length; i++ ) {
                    if( ctx[ otherDataProviders[ i ] ] !== undefined ) {
                        var dp = ctx[ otherDataProviders[ i ] ];
                        if( dp.selectedObjects.length > 0 ) {
                            dp.selectionModel.setSelection( [] );
                        }
                    }
                }

                $scope.data.sourceObjects = context.selectedObjects;
            } else {
                $scope.data.sourceObjects = [];

                // Get selected objects from the other section when no selected in context
                for( i = 0; i < otherDataProviders.length; i++ ) {
                    if( ctx[ otherDataProviders[ i ] ] !== undefined ) {
                        dp = ctx[ otherDataProviders[ i ] ];
                        if( dp.selectedObjects.length > 0 ) {
                            $scope.data.sourceObjects = dp.selectedObjects;
                            /**
                             * Selection in one section may cause empty selection event for any area that previously had selection.
                             * As consumers of aw-add are listening directly to the dataproviders change events to do things consumers
                             * will end up in a state where they believe nothing is selected (as final event was empty selection). To
                             * workaround this aw-add will refire the selection change event for the data provider that actually has
                             * something selected.
                             *
                             * Note: This is not needed for aw-add since aw-add checks all data providers for selected objects. It is
                             * for external consumers of aw-add (such as Ads1AttachStdNoteViewModel.json)
                             */
                            context._refire = true;
                            eventBus.publish( otherDataProviders[ i ] + '.selectionChangeEvent', lastContext[ otherDataProviders[ i ] ] );
                            break;
                        }
                    }
                }
            }

            // If target object is defined, then get the source and target model objects for creating relation
            if( $scope.data.targetObject ) {
                const prevSourceObjects = $scope.data.sourceObjects;
                const relationInputs = $scope.data.sourceObjects.map( ( { type: secondaryType } ) => {
                    return {
                        primaryType: $scope.data.targetObject.type,
                        secondaryType
                    };
                } );
                if( $scope.data.sourceObjects[ 0 ] ) {
                    //Add reference tab also has palette tab with the same data provider names but should not update relation list on selection
                    if( $scope.data.activeView !== 'addReferenceSub' ) {
                        await addObjectUtils.updateRelationList( $scope.data, $scope.data.sourceObjects[ 0 ].type );
                        soaSvc.postUnchecked( 'Internal-AWS2-2016-12-DataManagement', 'getDefaultRelation', {
                            input: relationInputs
                        } ).then( response => {
                            //throw away response if view or selection has changed while loading
                            if( !$scope.$$destroyed && $scope.data.sourceObjects === prevSourceObjects ) {
                                //use default from first selected item (only one relation picker for multiple objects)
                                //future refactor work will update UX to hide if multiple types selected
                                const configuredDefault = response.output[ 0 ].defaultRelation.name;
                                const defaultListVal = $scope.data.relationList.filter( x => x.propInternalValue === configuredDefault )[ 0 ];
                                const updateRelData = () => {
                                    var mos = addObjectUtils.getModelObjectsForCreateRelation( $scope.data.sourceObjects, [ $scope.data.targetObject ], $scope.data
                                        .creationRelation
                                        .dbValue );
                                    $scope.data.sourceModelObjects = mos.sourceModelObjects;
                                    $scope.data.targetModelObjects = mos.targetModelObjects;
                                };
                                if( defaultListVal ) {
                                    $scope.data.creationRelation.dbValue = defaultListVal.propInternalValue;
                                    $scope.data.creationRelation.uiValue = defaultListVal.propDisplayValue;
                                    return AwPromiseService.instance.resolve( updateViewModelProperty( $scope.data.creationRelation ) )
                                        .then( updateRelData );
                                }
                                updateRelData();
                            }
                        } ).catch( () => {
                            //throw away response if view or selection has changed while loading
                            if( !$scope.$$destroyed && $scope.data.sourceObjects === prevSourceObjects ) {
                                //use first selected as default (no default configured on server)
                                const defaultListVal = $scope.data.relationList[ 0 ];
                                const updateRelData = () => {
                                    var mos = addObjectUtils.getModelObjectsForCreateRelation( $scope.data.sourceObjects, [ $scope.data.targetObject ], $scope.data
                                        .creationRelation
                                        .dbValue );
                                    $scope.data.sourceModelObjects = mos.sourceModelObjects;
                                    $scope.data.targetModelObjects = mos.targetModelObjects;
                                };
                                if( defaultListVal ) {
                                    $scope.data.creationRelation.dbValue = defaultListVal.propInternalValue;
                                    $scope.data.creationRelation.uiValue = defaultListVal.propDisplayValue;
                                    return AwPromiseService.instance.resolve( updateViewModelProperty( $scope.data.creationRelation ) )
                                        .then( updateRelData );
                                }
                                updateRelData();
                            }
                        } );
                    }
                }
            }
        };

        var clipSelectionEventReg = eventBus.subscribe( 'getClipboardProvider.selectionChangeEvent',
            function( context ) {
                $scope.handleSelection( 'getClipboardProvider', context );
            } );

        var favSelectionEventReg = eventBus.subscribe( 'getFavoriteProvider.selectionChangeEvent',
            function( context ) {
                $scope.handleSelection( 'getFavoriteProvider', context );
            } );

        var recentSelectionEventReg = eventBus.subscribe( 'getRecentObjsProvider.selectionChangeEvent',
            function( context ) {
                $scope.handleSelection( 'getRecentObjsProvider', context );
            } );

        var searchResultSelectionEventReg = eventBus.subscribe( 'performSearch.selectionChangeEvent',
            function( context ) {
                $scope.data.sourceObjects = context.selectedObjects;
                if( $scope.data.targetObject ) {
                    var mos = addObjectUtils.getModelObjectsForCreateRelation(
                        $scope.data.sourceObjects, [ $scope.data.targetObject ],
                        $scope.data.creationRelation.dbValue );
                    $scope.data.sourceModelObjects = mos.sourceModelObjects;
                    $scope.data.targetModelObjects = mos.targetModelObjects;
                }

                if( !appCtxSrv.ctx.performSearch ) {
                    appCtxSrv.registerCtx( 'performSearch', context.scope.dataprovider );
                }
            } );

        $scope.$watch( 'targetObject', function _watchTargetObject( newValue, oldValue ) {
            declViewModelTarget.targetObject = newValue;
        } );

        var searchResultKeyKeyWordEventReg = eventBus.subscribe( 'awPanel.reveal',
            function( context ) {
                //if the selected tab panelID !== 'filtersTabPageSub',then do the reset behavior, which is used for set for search panel
                if( context.scope && context.scope.panelId &&
                    context.scope.panelId !== 'filtersTabPageSub' ) {
                    if( context.scope.data ) {
                        if( context.scope.data.showSearchFilter ) {
                            context.scope.data.showSearchFilter = false;
                        }
                        if( context.scope.data.searchResults ) {
                            context.scope.data.searchResults = [];
                        }
                        if( context.scope.data.keyWord && context.scope.data.keyWord.uiValue !== '' ) {
                            context.scope.data.keyWord.uiValue = '';
                        }

                        if( context.scope.panelId === 'resultsTabPageSub' ) {
                            $scope.data.sourceObjects = context.selectedObjects;
                            if( $scope.data.targetObject ) {
                                var mos = addObjectUtils.getModelObjectsForCreateRelation(
                                    $scope.data.sourceObjects, [ $scope.data.targetObject ],
                                    $scope.data.creationRelation.dbValue );
                                $scope.data.sourceModelObjects = mos.sourceModelObjects;
                                $scope.data.targetModelObjects = mos.targetModelObjects;
                            }
                        }
                    }
                }
            } );

        function unregisterContextRegistrations() {
            appCtxSrv.unRegisterCtx( 'performSearch' );
            if( ctx.addObject && ctx.addObject.showDataSetUploadPanel ) {
                delete ctx.addObject.showDataSetUploadPanel;
            }
        }

        //ensure the ImanType objects are loaded
        var policyId = propPolicySvc.register( {
            types: [ {
                name: 'ImanType',
                properties: [ {
                    name: 'parent_types'
                }, {
                    name: 'type_name'
                } ]
            } ]
        } );

        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( typeSelectEventReg );
            eventBus.unsubscribe( recentTypeSelectEventReg );

            eventBus.unsubscribe( clipboardEventReg );

            eventBus.unsubscribe( clipSelectionEventReg );
            eventBus.unsubscribe( favSelectionEventReg );
            eventBus.unsubscribe( recentSelectionEventReg );
            eventBus.unsubscribe( searchResultSelectionEventReg );
            eventBus.unsubscribe( searchResultKeyKeyWordEventReg );

            unregisterContextRegistrations();
            propPolicySvc.unregister( policyId );
        } );
    }
] );
