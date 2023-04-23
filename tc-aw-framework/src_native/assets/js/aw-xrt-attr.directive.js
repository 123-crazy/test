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
 * Directive to display tree of nodes
 * 
 * @module js/aw-xrt-attr.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/appCtxService';

/**
 * Directive to display tree of nodes
 * 
 * @example <aw-tree nodes="myNodes"><div>Sample tree item</div></aw-tree>
 * 
 * @member aw-tree
 * @memberof NgElementDirectives
 */
app.directive( 'awXrtAttr', [ function() {
    /**
     * @param {Object} $scope - scope
     * @param {Object} appCtxService - Application Context service
     */
    function Controller( $scope, appCtxService ) {
        //Value for

        $scope.editing = false;
        var ctx = appCtxService.getCtx( 'XRTEditor.edit' );
        if( ctx ) {
            $scope.editing = ctx.editing;
        }

        var contextUpdateSub = eventBus.subscribe( 'appCtx.update', function( data ) {
            if( data.name === 'XRTEditor.edit' ) {
                $scope.editing = data.value.editing;
            }
        } );

        //Remove the context and event bus sub when scope destroyed
        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( contextUpdateSub );
        } );
    }

    Controller.$inject = [ '$scope', 'appCtxService' ];

    return {
        restrict: 'E',
        scope: {
            attr: '='
        },
        controller: Controller,
        templateUrl: app.getBaseUrlPath() + '/html/aw-xrteditor-xrtEditorAttr.directive.html'
    };
} ] );
