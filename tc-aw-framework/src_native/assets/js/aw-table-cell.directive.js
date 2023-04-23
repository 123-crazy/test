// Copyright (c) 2020 Siemens

/**
 * TODO: unify with aw-property-native-table-prop-val
 *
 * @module js/aw-table-cell.directive
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import 'js/awTableService';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-val.directive';
import 'js/aw-property-non-edit-array-val.directive';

/**
 *
 * @param {Object} $scope - Cuttent data context.
 * @param {ObjectMap} listeners - Currently registered listeners
 */
function _handleObjectLov( $scope, listeners ) {
    /**
     * For non-LOV object reference property stay on edit widget until object Reference panel is active
     */
    if( $scope.prop.type === 'OBJECT' && !$scope.prop.hasLov ) {
        listeners.addObject = $scope.$on( 'awProperty.addObject',
            function() {
                $scope.referencePanelLoaded = true;

                listeners.addObjectSubDef = eventBus.subscribe( 'complete',
                    function() {
                        $scope.referencePanelLoaded = false;

                        // trigger any existing stopEdit event
                        $( 'body' ).triggerHandler( 'click' );

                        if( listeners.addObjectSubDef ) {
                            eventBus.unsubscribe( listeners.addObjectSubDef );
                            listeners.addObjectSubDef = null;
                        }

                        if( listeners.addObject ) {
                            listeners.addObject();
                            listeners.addObject = null;
                        }
                    } );
            } );
    }
}

/**
 * @param {ObjectMap} listeners - Currently registered listeners
 */
function _cleanUp( listeners ) {
    if( listeners.objRefDef ) {
        eventBus.unsubscribe( listeners.objRefDef );

        listeners.objRefDef = null;
    }

    if( listeners.addObject ) {
        listeners.addObject();
        listeners.addObject = null;
    }
}

// eslint-disable-next-line valid-jsdoc
/**
 * Definition for the 'aw-table-cell' directive used for as a container for the edit & non-edit property
 * directives.
 *
 * @example <aw-table-cell>
 *
 * @member aw-table-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awTableCell', [ 'awTableService', function( awTableSvc ) {
    /**
     * Controller used for prop update or pass in using &?
     *
     * @param {Object} $scope - The allocated scope for this controller
     * @param {DOMElement} $element - The DOM Element this controller is attached to,
     */
    function myController( $scope, $element ) {
        var _listeners = {};

        $scope.startEdit = function( event ) {
            awTableSvc.handleCellStartEdit( $scope, $element, event );

            _handleObjectLov( $scope, _listeners );
        };

        $scope.$on( '$destroy', function() {
            _cleanUp( _listeners );
        } );
    }

    myController.$inject = [ '$scope', '$element' ];

    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            rowindex: '=',
            hint: '@?',
            modifiable: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-table-cell.directive.html',
        controller: myController
    };
} ] );
