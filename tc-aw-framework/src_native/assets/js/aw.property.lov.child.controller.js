// Copyright (c) 2020 Siemens

/**
 * @module js/aw.property.lov.child.controller
 */
import app from 'app';
import $ from 'jquery';
import 'js/uwListService';
import _ from 'lodash';
/**
 * Controller for {@link NgElementDirectives.aw-property-lov-child} directive.
 *
 * @member awPropertyLovChildController
 * @memberof NgControllers
 */
app.controller( 'awPropertyLovChildController', [
    '$scope',
    function( $scope ) {
        // lov data will be held here
        $scope.expanded = false;

        /**
         * Toggle lov expansion state on hlovs
         *
         * @memberof NgControllers.awPropertyLovChildController
         *
         * @param {Object} ev - TODO
         *
         * @param {Object} parentLovEntry - TODO
         */
        $scope.toggleChildren = function( ev, parentLovEntry ) {
            ev.stopPropagation();

            parentLovEntry.expanded = typeof parentLovEntry.expanded === 'undefined' ? true :
                !parentLovEntry.expanded;

            if( parentLovEntry.expanded ) {
                parentLovEntry.indicator = 'expanded';

                // if first click, also fetch initial vals
                if( typeof parentLovEntry.children === 'undefined' ) {
                    parentLovEntry.children = parentLovEntry.getChildren();
                    let prop = $scope.prop;
                    if( prop && prop.uiValues && prop.uiValues.length > 0 ) {
                        _.forEach( parentLovEntry.children, function( lovEntry ) {
                            let foundUiValue = _.indexOf( prop.uiValues, lovEntry.propDisplayValue );
                            if ( foundUiValue > -1 ) {
                                lovEntry.sel = true;
                            }
                        } );
                    }
                }
            } else {
                parentLovEntry.indicator = '';
            }
        };

        /**
         * @memberof NgControllers.awPropertyLovChildController
         *
         * @param {Object} lovEntry -
         */
        $scope.setLovEntry = function( lovEntry, $event ) {
            // only allow selection of leaf nodes
            if( lovEntry.hasChildren ) {
                $scope.toggleChildren( $event, lovEntry );
            } else if ( $scope.pickleaf ) {
                lovEntry.sel = !lovEntry.sel;
                $scope.pickleaf( lovEntry );
            } else {
                var element = $( $event.currentTarget ).closest( '.aw-jswidgets-lovParentContainer' ).find(
                    '.aw-jswidgets-choice' );
                $scope.$parent.setLovEntry( lovEntry, element );
            }
        };
    }
] );
