// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.ObjectNavSubLocationCtrl}
 *
 * @module js/aw.objectNav.sublocation.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';
import 'soa/kernel/clientDataModel';
import 'js/selection.service';
import 'js/localeService';
import 'soa/dataManagementService';
import 'js/objectNavigationTreeService';
import 'js/selectionModelFactory';
import AwStateService from 'js/awStateService';

/**
 * Object navigation controller. Extends the {@link  NgControllers.NativeSubLocationCtrl}.
 *
 * @class NgControllers.ObjectNavSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'ObjectNavSubLocationCtrl', [
    '$scope',
    '$controller',
    '$q',
    'appCtxService',
    'soa_kernel_clientDataModel',
    'selectionService',
    'localeService',
    'soa_dataManagementService',
    'objectNavigationTreeService',
    'selectionModelFactory',
    function( $scope, $controller, $q, appCtxService, cdm, selectionService, localeService, dms, objectNavigationTreeService, selectionModelFactory ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        //Navigate context key
        var _navigateContext = 'navigate';

        //Setup the navigate context and clear it when sublocation is removed
        appCtxService.registerCtx( _navigateContext, {} );
        $scope.$on( '$destroy', function() {
            appCtxService.unRegisterCtx( _navigateContext );
        } );

        /**
         * How the object navigation sublocation tracks selection. The PWA selection model will track selection.
         *
         * @param {Any} input - The object that needs to be tracked.
         * @returns {String} - Returns uid string
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

        $scope.pwaContext = {
            selectionModel: $scope.pwaSelectionModel,
            pwaSelectionModel: $scope.pwaSelectionModel,
            editSupportParamKeys: $scope.editSupportParamKeys
        };

        //Utility to add newly created objects to context
        var updateNavigateContext = function( uid, newObjects, cutObjects ) {
            var ctx = _navigateContext + '.' + uid;
            var currentCtx = appCtxService.getCtx( ctx ) || [];
            //If new objects were added, add them into the context
            if( newObjects ) {
                var newUids = newObjects.map( function( mo ) {
                    return mo.alternateID ? mo.alternateID : mo.uid;
                } );
                currentCtx = currentCtx.concat( newUids.filter( function( x ) {
                    return currentCtx.indexOf( x ) === -1;
                } ) );
            }
            //If objects were cut remove them from the context
            if( cutObjects ) {
                var cutUids = cutObjects.map( function( mo ) {
                    return mo.alternateID ? mo.alternateID : mo.uid;
                } );
                currentCtx = currentCtx.filter( function( uid ) {
                    return cutUids.indexOf( uid ) === -1;
                } );
            }
            appCtxService.updatePartialCtx( ctx, currentCtx );
        };

        //Utility to create relation info object
        var getRelationInfo = function( baseSelection, childSelections ) {
            var navigableProps = [ 'contents' ];
            return childSelections.map( function( mo ) {
                    return navigableProps.map( function( prop ) {
                        return {
                            primaryObject: objectNavigationTreeService.getParentOfSelection( $scope.view, baseSelection, [ mo ] ),
                            relationObject: null,
                            relationType: prop,
                            secondaryObject: mo
                        };
                    } );
                } )
                //Flatten
                .reduce( function( acc, nxt ) {
                    return acc.concat( nxt );
                }, [] );
        };

        //Listen for any related data modified events
        var modelObjectRelatedDataModifiedEventListener = eventBus.subscribe( 'cdm.relatedModified', function(
            data ) {
            let relatedModifiedInfo = {
                createdObjects: data.createdObjects,
                childObjects: data.childObjects,
                isPinnedFlag: data.isPinnedFlag,
                refreshLocationFlag: data.refreshLocationFlag,
                relatedModified: data.relatedModified,
                relations: data.relations
            };
            if( objectNavigationTreeService.isTreeViewMode( $scope.view ) ) {
                relatedModifiedInfo.viewMode = 'Tree';
                eventBus.publish( 'objNav.relatedModifiedTree', relatedModifiedInfo );
            } else {
                eventBus.publish( 'objNav.relatedModifiedNonTree', relatedModifiedInfo );
            }
        } );
        //And remove it when the scope is destroyed
        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( modelObjectRelatedDataModifiedEventListener );
        } );

        //Add additional information into the context
        //Triggered when URL changes
        $scope.addSearchContext = function( searchContext ) {
            if( !searchContext.criteria ) {
                searchContext.criteria = {};
            }
            searchContext.criteria.objectSet = 'contents.WorkspaceObject';
            searchContext.criteria.parentUid = AwStateService.instance.params.uid;
            searchContext.criteria.returnTargetObjs = 'true';

            var showConfiguredRev = 'true';
            if( appCtxService.ctx.preferences.AWC_display_configured_revs_for_pwa ) {
                showConfiguredRev = appCtxService.ctx.preferences.AWC_display_configured_revs_for_pwa[ 0 ];
            }
            searchContext.criteria.showConfiguredRev = showConfiguredRev;
            if( AwStateService.instance.params.d_uids && !objectNavigationTreeService.isTreeViewMode( $scope.view ) ) {
                var d_uids = AwStateService.instance.params.d_uids.split( '^' );
                searchContext.criteria.parentUid = d_uids[ d_uids.length - 1 ];
            }
            if( $scope.baseSelection.uid !== searchContext.criteria.parentUid ) {
                //Note - This should not result in a SOA call in most cases because
                //show object location controller has been modified to ensure d_uids are also loaded before revealing sublocation
                return dms.loadObjects( [ searchContext.criteria.parentUid ] ).then(
                    function() {
                        appCtxService.updatePartialCtx( 'locationContext.modelObject', cdm
                            .getObject( searchContext.criteria.parentUid ) );
                    } ).then( function() {
                    return searchContext;
                } );
            }
            return $q.when( searchContext );
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
            //If the parent object is displayed in SWA
            if( $scope.baseSelection === $scope.modelObjects[ 0 ] ) {
                //If everything was deselected
                if( !selection || selection.length === 0 ) {
                    //Revert to the previous selection (parent)
                    //Don't create relation between same object
                    selectionService.updateSelection( $scope.baseSelection );
                } else {
                    //Update the current selection with primary selection as parent
                    selectionService.updateSelection( selection, $scope.baseSelection, relationInfo );
                }
            } else {
                //If everything was deselected
                if( !selection || selection.length === 0 ) {
                    if( $scope.modelObjects.length > 0 && $scope.baseSelection.uid === $scope.modelObjects[ 0 ].alternateID ) {
                        $scope.updateisSelectionTypeFolder( $scope.baseSelection );
                        selectionService.updateSelection( $scope.baseSelection );
                    } else {
                        $scope.updateisSelectionTypeFolder( $scope.modelObjects[0] );
                        //Revert to the previous selection (primary workarea)
                        selectionService.updateSelection( $scope.modelObjects, objectNavigationTreeService.getParentOfSelection( $scope.view, $scope.baseSelection, $scope.modelObjects ),
                            getRelationInfo( $scope.baseSelection, $scope.modelObjects ) );
                    }
                } else {
                    $scope.updateisSelectionTypeFolder( null, true );
                    //Update the current selection with primary workarea selection as parent
                    selectionService.updateSelection( selection, $scope.modelObjects[ 0 ], relationInfo );
                }
            }
        };

        /**
         * Sublocation specific override to update the primary workarea selection. Includes relation information
         * that connects the selected object to the current folder.
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        $scope.updatePrimarySelection = function( selection ) {
            appCtxService.unRegisterCtx( 'showConfiguredRev' );
            //If selection is empty revert to base selection
            if( selection.length === 0 ) {
                objectNavigationTreeService.updateParentHierarchyInURL( $scope.view, $scope.baseSelection );
                selectionService.updateSelection( $scope.baseSelection );
                ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                    [ $scope.baseSelection ] : [] );
            } else {
                objectNavigationTreeService.updateDUidParamForTreeSelection( $scope.view, selection );
                // Tree view mode supports recursive folder behaviour. If root folder is recursively added in child folders
                // then adding item to nth root folder will auto expand the respective level folder and select the added child object.
                if( selection.length === 1 && $scope.baseSelection.uid === selection[ 0 ].alternateID ) {
                    selectionService.updateSelection( $scope.baseSelection );
                } else {
                    //Otherwise use as parent selection
                    selectionService.updateSelection( selection, objectNavigationTreeService.getParentOfSelection( $scope.view, $scope.baseSelection, selection ), getRelationInfo(
                        $scope.baseSelection, selection ) );
                }
                //And update which model objects are selected
                ctrl.setSelection( selection ? selection.map( function( object ) {
                    return objectNavigationTreeService.checkViewModeAndSetSelection( $scope.view, object );
                } ) : [] );
            }
        };

        /**
         * Sets the selected node by mapping uid to alternateID and alternateID to uid based on view mode.
         */
        $scope.$on( 'viewModeChanged', () => {
            var mSelectedNodes = objectNavigationTreeService.getSelectedObjectsOnViewModeChange( $scope.view );
            if( mSelectedNodes && mSelectedNodes.length > 0 ) {
                $scope.pwaSelectionModel.setSelection( mSelectedNodes );
            }
        } );

        /**
         * Get the uid of the object that will be opened.
         * @return {String} Returns uid
         */
        $scope.getParentUid = function() {
            var d_uids = AwStateService.instance.params.d_uids ? AwStateService.instance.params.d_uids.split( '^' ) : [];
            return d_uids[ 0 ] ? d_uids[ d_uids.length - 1 ] : AwStateService.instance.params.uid;
        };
    }
] );
