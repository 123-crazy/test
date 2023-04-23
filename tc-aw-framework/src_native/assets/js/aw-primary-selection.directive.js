// Copyright (c) 2020 Siemens

/**
 * @module js/aw-primary-selection.directive
 */
import app from 'app';

/**
 * Definition for the <aw-primary-selection> directive.
 *
 * @example <div aw-primary-selection></div>
 *
 * @member aw-primary-selection
 * @memberof NgElementDirectives
 */
app.directive( 'awPrimarySelection', [ function() {
    return {
        restrict: 'A',
        link: function( $scope ) {
            $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
                // Set source to primary workarea
                data.source = 'primaryWorkArea';
            } );
        }
    };
} ] );
