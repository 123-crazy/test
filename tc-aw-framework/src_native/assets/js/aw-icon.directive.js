// Copyright (c) 2020 Siemens

/**
 * Directive to display an icon from the icon service.
 *
 * @module js/aw-icon.directive
 * @requires app
 * @requires js/awIconService
 */
import app from 'app';
import 'js/awIconService';

/**
 * @param {String} iconId -
 * @param {DOMElement} $element -
 * @param {awIconService} awIconSvc -
 */
function _watchIconId( iconId, $element, awIconSvc ) {
    // Get the icon contents from the icon service
    var iconDef = awIconSvc.getIconDef( iconId );

    // Update the element contents
    $element.empty();
    $element.append( iconDef );
}

// eslint-disable-next-line valid-jsdoc
/**
 * Directive to display an icon with the given id.
 *
 * @example <aw-icon icon-id="[id]"></aw-icon>
 *
 * @member aw-icon
 * @memberof NgDirectives
 */
app.directive( 'awIcon', [ 'awIconService', function( awIconSvc ) {
    return {
        restrct: 'E',
        scope: {
            id: '@',
            iconId: '@'
        },
        link: function( $scope, $element ) {
            $scope.$watchCollection( '[iconId, id]', function( newId ) {
                var updatedId;
                newId[ 0 ] !== undefined ? updatedId = newId[ 0 ] : updatedId = newId[ 1 ];
                _watchIconId( updatedId, $element, awIconSvc );
            } );
        }
    };
} ] );
